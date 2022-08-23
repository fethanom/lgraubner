const targetMap = new WeakMap<Raw, EffectForRaw>()
const proxyToRaw = new WeakMap<Proxy, Raw>()
const rawToProxy = new WeakMap<Raw, Proxy>()
const isObj = (x: any): x is object => typeof x === 'object'
const hasOwnProperty = Object.prototype.hasOwnProperty
const effectStack: Effect[] = []
let activeEffect = null
const ITERATE_KEY = Symbol('iterate key')
const IS_EFFECT = Symbol('is effect')
const enum Const {
  ADD = 'add',
  DELETE = 'delete'
}

export function watch(fn: Function, options: Options = {}): Effect {
  const effect: Effect = fn[IS_EFFECT]
    ? fn
    : function effect() {
        return run(effect, fn, this, arguments)
      }
  effect[IS_EFFECT] = true
  effect.scheduler = options.scheduler
  effect()
  return effect
}

function run(effect, fn, ctx, args) {
  if (effect.unwatch) {
    return Reflect.apply(fn, ctx, args)
  }
  if (effectStack.indexOf(effect) === -1) {
    cleanup(effect)
    try {
      effectStack.push(effect)
      activeEffect = effect
      return Reflect.apply(fn, ctx, args)
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
}

export function unwatch(effect: Effect): void {
  if (!effect.unwatched) {
    effect.unwatched = true
    cleanup(effect)
  }
}

function cleanup(effect: Effect): void {
  if (effect.cleanup) {
    effect.cleanup.forEach((deps: EffectForKey) => deps.delete(effect))
  }
  effect.cleanup = []
}

export function reactive<T extends Raw>(raw: T): T {
  // todo shouldInstrument
  if (proxyToRaw.has(raw)) return raw
  const proxy = rawToProxy.get(raw)
  if (proxy) {
    return proxy as T
  }
  return createReactive(raw)
}

function createReactive<T extends Raw>(raw: T): T {
  const reactive = new Proxy(raw, baseHandlers)
  rawToProxy.set(raw, reactive)
  proxyToRaw.set(reactive, raw)
  targetMap.set(raw, new Map() as EffectForRaw)
  return reactive as T
}

const baseHandlers = {
  get(target: Raw, key: Key) {
    const result = Reflect.get(target, key)
    if (typeof key === 'symbol') return result
    track({ target, key, type: 'get' })
    const proxy = rawToProxy.get(result)
    if (isObj(result)) {
      if (proxy) return proxy
      return reactive(result)
    }
    return proxy || result
  },
  ownKeys(target: Raw) {
    track({ target, type: 'iterate' })
    return Reflect.ownKeys(target)
  },
  has(target: Raw, key: Key) {
    const result = Reflect.has(target, key)
    track({ target, key, type: 'has' })
    return result
  },
  set(target: Raw, key: Key, value: any) {
    if (isObj(value)) value = proxyToRaw.get(value) || value
    const hadKey = hasOwnProperty.call(target, key)
    const oldValue = target[key]
    const result = Reflect.set(target, key, value)

    if (!hadKey) {
      trigger({ target, key, value, type: 'add' })
    } else if (value !== oldValue) {
      trigger({ target, key, value, oldValue, type: 'set' })
    }
    return result
  },
  deleteProperty(target: Raw, key: Key) {
    const hadKey = hasOwnProperty.call(target, key)
    const oldValue = target[key]
    const result = Reflect.deleteProperty(target, key)
    if (hadKey) {
      trigger({ target, key, oldValue, type: 'delete' })
    }
    return result
  }
}

function track(operation: Operation) {
  const effect: Effect = effectStack[effectStack.length - 1]
  if (effect) {
    let { type, target, key } = operation
    if (type === 'iterate') key = ITERATE_KEY
    const depsMap = targetMap.get(target)
    let deps = depsMap.get(key)
    if (!deps) {
      depsMap.set(key, (deps = new Set()))
    }
    if (!deps.has(effect)) {
      deps.add(effect)
      effect.cleanup.push(deps)
    }
  }
}

function trigger(operation: Operation) {
  let { type, target, key } = operation
  let deps = targetMap.get(target)
  const effects = new Set()
  add(deps, key, effects)
  if (type === Const.ADD || type === Const.DELETE) {
    const iKey = Array.isArray(target) ? 'length' : ITERATE_KEY
    add(deps, iKey, effects)
  }
  effects.forEach((e: Effect) => (typeof e.scheduler === 'function' ? e.scheduler(e) : e()))
}

function add(deps, key, effects) {
  const dep = deps.get(key)
  dep && dep.forEach(e => effects.add(e))
}

export function raw(proxy: Proxy) {
  return proxyToRaw.get(proxy) || proxy
}

export function ref(value?: any) {
  if (isRef(value)) return value
  value = convert(value)
  const r = {
    isRef: true,
    get value() {
      track({ target: r, key: 'value', type: 'get' })
      return value
    },
    set value(newVal) {
      value = convert(newVal)
      trigger({ target: r, key: 'value', value, type: 'set' })
    }
  }
  return r
}

export function computed<T>(getter) {
  let dirty = true
  let value: T

  const effect = watch(getter, {
    scheduler: () => dirty = true
  })
  return {
    isRef: true,
    effect,
    get value() {
      if (dirty) {
        value = effect()
        dirty = false
      }
      trackKid(effect)
      return value
    },
    set value(newValue: T) {}
  } as any
}

function trackKid(effect) {
  for (let i = 0; i < effect.deps.length; i++) {
    const dep = effect.deps[i]
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect)
      activeEffect.deps.push(dep)
    }
  }
}

const convert = <T>(val: T): T => (isObj(val) ? reactive(val) : val)

export function isRef(r: any): boolean {
  return r ? r.isRef === true : false
}

export function isReactive(proxy: Object) {
  return proxyToRaw.has(proxy)
}

type Effect = Function & {
  IS_EFFECT?: boolean
  unwatched?: boolean
  scheduler?: Function
  cleanup?: EffectForKey[]
}

interface Options {
  scheduler?: Function
}

interface Operation {
  type: 'get' | 'iterate' | 'add' | 'set' | 'delete' | 'clear' | 'has'
  target: object
  key?: Key
  value?: any
  oldValue?: any
}
type EffectForKey = Set<Effect>
type EffectForRaw = Map<Key, EffectForKey>
type Key = string | number | symbol
type Raw = object
type Proxy = object
