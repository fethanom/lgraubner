import React from 'react'
import { watch, unwatch, reactive, computed, ref, toRefs, isReactive, isRef } from '../dist/doux.esm'

let currentVdom = null

function setup(factory) {
  let vdom = React.memo((props) => {
    const update = React.useReducer((s) => s + 1, 0)[1]
    const w = React.useRef()
    const r = React.useRef()
    if (!r.current) r.current = factory(props)
    let getter = isFn(r.current) ? () => r.current(props) : () => factory(props)
    if (!w.current) {
      w.current = watch(getter, () => Promise.resolve().then(update))
    }
    currentVdom.cleanup.add(() => unwatch(w.current))
    React.useEffect(() => () => currentVdom.cleanup.forEach((c) => c()), [])
    return w.current()
  })
  currentVdom = vdom
  currentVdom.cleanup = new Set()
  return vdom
}

function effect(src, cb) {
  let oldValue = null
  let cleanup = null
  let update = () => {
    let newValue = runner()
    if (isChanged(oldValue, newValue)) {
      if (currentVdom.cleanup.has(cleanup)) {
        currentVdom.cleanup.delete(cleanup)
      }
      cleanup && cleanup()
      cb(newValue, oldValue)
    }
    oldValue = newValue
  }
  let getter = null
  if (Array.isArray(src)) {
    getter = () => src.map((s) => (isRef(s) ? s.value : s()))
  } else if (isRef(src)) {
    getter = () => src.value
  } else if (cb) {
    getter = src
  } else {
    getter = () => {
      if (currentVdom.cleanup.has(cleanup)) {
        currentVdom.cleanup.delete(cleanup)
      }
      cleanup && cleanup()
      src()
    }
    update = null
  }
  const runner = watch(getter, requestAnimationFrame(update))
  currentVdom.cleanup.add(() => unwatch(runner))
  return (cb) => {
    cleanup = cb
    currentVdom.cleanup.add(cb)
  }
}

const isChanged = (a, b) => !a || (Array.isArray(b) ? b.some((arg, index) => arg !== a[index]) : a !== b)
const isFn = (x) => typeof x === 'function'

export { setup, effect, watch, unwatch, ref, computed, reactive, toRefs, isReactive, isRef }
