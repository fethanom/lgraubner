import { resolveSource, splitType, compose } from './util'
import { combineModels } from './helper'
import { produce } from './produce'
export class Store {
  constructor(models, middlewares) {
    this.state = models.state ? models.state : combineModels(models).state
    this.mutations = models.state
      ? models.mutations
      : combineModels(models).mutations
    this.actions = models.state ? models.actions : combineModels(models).actions
    this.middlewares = middlewares
    this.subscribers = []
    this.dispatch = this.dispatch.bind(this)
    this.commit = this.commit.bind(this)
    if (this.middlewares && this.middlewares.length !== 0) {
      this.midApi = {
        state: this.state,
        commit: this.commit
      }
      const middwareChain = this.middlewares.map(middware =>
        middware(this.midApi)
      )
      this.commit = compose(...middwareChain)(this.commit)
    }
  }
  subscribe(sub) {
    return this.subscribers.push(sub)
  }
  unsubscribe(sub) {
    return this.subscribers.filter(f => f !== sub)
  }
  dispatch(type, payload, name) {
    if (name) {
      payload = {
        namespace: name,
        payload
      }
    }
    const action = resolveSource(this.actions, type)
    const ctx = {
      commit: this.commit,
      dispatch: this.dispatch
    }
    return Promise.resolve(action(ctx, payload))
  }
  commit(type, payload, name) {
    if (payload) {
      if (payload.namespace) {
        name = payload.namespace
        payload = payload.payload
      }
    }

    type = splitType(type)
    const mutation = resolveSource(this.mutations, type, name)
    const model = Array.isArray(type) ? type[0] : name
    if (this.middlewares) {
      if (typeof type === 'function' && name) {
        this.midApi.state[name] = this.state[name] = produce(this.state[name], state => {
          mutation(state, payload)
        })
      } else if (model) {
        this.midApi.state[model] = this.state[model]= produce(this.state[model], state => {
          mutation(state, payload)
        })
      } else {
        this.midApi.state = this.state = produce(this.state, state => {
          mutation(state, payload)
        })
      }
    } else {
      if (typeof type === 'function' && name) {
        console.log(this.state)
        this.state[name] = produce(this.state[name], state => {
          mutation(state, payload)
        })
      } else if (model) {
        this.state[model] = produce(this.state[model], state => {
          mutation(state, payload)
        })
      } else {
        this.state = produce(this.state, state => {
          mutation(state, payload)
        })
      }
    }

    this.subscribers.forEach(v => v())
  }
}
