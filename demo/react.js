import React from 'react'
import { watch as effect, unwatch, reactive, computed, ref, raw, isReactive, isRef } from '../dist/index'
let current = null
function setup(factory) {
  let memo = React.memo(props => {
    current = memo
    const update = React.useReducer(s => s + 1, 0)[1]
    const w = React.useRef()
    const r = React.useRef()
    if (!r.current) r.current = factory(props)
    let getter = isFn(r.current) ? () => r.current(props) : () => factory(props)
    if (!w.current) {
      w.current = effect(getter, () => update())
    }
    React.useEffect(() => {
      current.mounted.forEach(c => c())
      return () => {
        current.unmounted.forEach(c => c())
        unwatch(w.current)
      }
    }, [])
    React.useEffect(() => {
      current.updated.forEach(c => c())
      return () => {
        current.beforeUpdated.forEach(c => c())
      }
    })
    return w.current()
  })
  return memo
}

function watch(src, cb) {
  let oldValue = null
  let update = () => {
    let newValue = runner()
    isChanged(oldValue, newValue) && cb(newValue, oldValue)
    oldValue = newValue
  }
  let getter = null
  if (Array.isArray(src)) {
    getter = () => src.map(s => (isRef(s) ? s.value : s()))
  } else if (isRef(src)) {
    getter = () => src.value
  } else if (cb) {
    getter = src
  } else {
    getter = src
    update = null
  }
  const runner = effect(getter, update)

  return () => unwatch(runner)
}

function onMounted(cb) {
  return lifeCycle(cb, 'mounted')
}
function onUnmounted(cb) {
  return lifeCycle(cb, 'unmounted')
}
function onUpdated(cb) {
  return lifeCycle(cb, 'updated')
}

function onBeforeUpdated(cb) {
  return lifeCycle(cb, 'beforeUpdated')
}

function lifeCycle(cb, key) {
  current[key] = current[key] || []
  current[key].push(cb)
}
const isChanged = (a, b) => a !== b
const isFn = x => typeof x === 'function'
export { setup, watch, unwatch, ref, computed, reactive, raw, isReactive, isRef, onMounted, onUnmounted, onUpdated, onBeforeUpdated }
