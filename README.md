<img align="right" height="150" src="https://ws1.sinaimg.cn/large/0065Zy9egy1fyuqe61tlej30b40b4gn6.jpg" />

# Smox

_tiny but perfect state management_

[![](https://img.shields.io/npm/v/smox.svg?style=flat)](https://npmjs.com/package/smox)
[![](https://img.shields.io/npm/dm/smox.svg?style=flat)](https://npmjs.com/package/smox)
[![](https://img.shields.io/bundlephobia/minzip/smox.svg?style=flat)](https://bundlephobia.com/result?p=smox)

### Feature

:pig_nose: New Context Api、path updating、Es6 proxy、nexted ……

:jack_o_lantern: Tiny size, 1Kb gzipped, no Dependencies

## Install

```shell
npm i smox -S
```

## Use

```javascript
import React from 'react'
import ReactDOM from 'react-dom'
import App from './app.js'
import { Smox, Provider } from 'smox'

const state = {
  count: 0
}

const actions = {
  up(state) {
    state.count++
  },
  down(state) {
    state.count--
  }
}

const effects = {
  async upAsync(actions) {
    await new Promise(t => setTimeout(t, 1000))
    actions.up()
  }
}

const store = new Smox({ state, actions, effects })

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
```

```javascript
import React from 'react'
import { map } from 'smox'

@map({
  state: ['count'],
  actions: ['up', 'down'],
  effects: ['upAsync']
})
class App extends React.Component {
  render() {
    return (
      <div>
        <h1>现在是{this.props.count}</h1>
        <button onClick={this.props.up}>加一</button>
        <button onClick={this.props.down}>减一</button>
        <button onClick={this.props.upAsync}>异步加一</button>
      </div>
    )
  }
}

export default App
```

### Nexted

nexted 是 smox 的 store 划分机制，它会根据嵌套对象的 key 作为 path，然后根据 path 来限定作用域，命中局部的状态和方法，如下：

```Javascript
const state = {
  counter:{
    count: 0
  }
}

const actions = {
  counter: {
    up(state, data) { //此处的 state 为同路径的 { count:0 }
      state.count += data
    },
    down(state, data) {
      state.count -= data
    }
  }
}

const effects = {
  counter: {
    async upAsync(actions) { //此处的 actions 为同路径的 { up(), down() }
      await new Promise(t => setTimeout(t, 1000))
      actions.up()
    }
  }
}

@map({
  state:['counter/count'],
  actions:['counter/up','counter/down'],
  effects:['counter/upAsync']
})

```

### Proxy、async/await

Proxy 可以使得 action 代码同步，更好看

```javascript
const actions = {
  up(state) {
    state.count += 1
    state.count += 2
  }
}
```
使用这个 [polyfill](https://github.com/GoogleChrome/proxy-polyfill) 可以兼容 ie9+

同时 effects 下面，配合 async/await，也能同步的编写逻辑

```JavaScript
const effects = {
  async upAsync(actions) {
    await new Promise(t => setTimeout(t, 1000))
    actions.up()
    actions.down()
  }
}
```

### Immed

if you only SetState , there is also a `produce` API turn to immutable easy

```javascript
import React from 'react'
import { produce } from 'smox'

class App extends React.Component {
  onClick = () => {
    this.setState(
      produce(this.state, draft => {
        draft.count++
      })
    )
  }
}

export default App
```

### p.s.

<details>
  <summary>Why not？</summary>

1. 和 rematch、redux 不同，smox 完全移除了 model 、reducers、dispatch、action(type) 等 API，只保留 state、actions、effects 三个 API

2. redux 中，只有 dispatch 的 action 才会触发进而修改 state ，smox 也一样，只有 actions 被触发才会修改 state，而 actions 可以被 effects 调用，形成一个闭环，完美的架构设计

3. rematch、dva 中，models 用来划分 store，显式定义命名空间，单层作用域，笨拙且局限。smox 独创 path 机制，不需要手动定义 model，会根据 key 自动生成作用域，这是 smox 2.0 最成功的一个机制，精巧又灵活

4. rematch 等库，需要保证 reducer 同步的 return 一个新对象，来保证不可变，会丑。smox 自己实现了一个精巧的劫持，不可变的同时，不需要 return（其他库也可以通过 immer）

5. and so on……（1kb 尺寸、API 的设计度等等)

</details>

## Demo

- [Counter](https://github.com/132yse/smox/tree/master/examples/counter)

### License

MIT
