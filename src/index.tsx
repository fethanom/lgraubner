import * as React from 'react'
import { bindCreators, mapMethods } from './util'

const Context = React.createContext(null)

interface State {
  props: any
}

export const map = ({ state = [], mutations = [], actions = [] }) => Component => {
  return class extends React.Component<State> {
    _isMounted: boolean
    store: any
    props: any
    state: any
    setState: any
    name: string
    constructor(props) {
      super(props)
      this.state = {
        props: {}
      }
    }

    componentWillMount() {
      this._isMounted = true
    }

    componentWillUnmount() {
      this._isMounted = false
      this.store.unsubscribe(() => this.update())
    }

    componentDidMount() {
      this.store.subscribe(() => this.update())
      this.update()
    }

    update() {
      this.name = mapMethods(this.store.state, state).name
      const stateProps = mapMethods(this.store.state, state).res
      const commitProps = bindCreators(mapMethods(this.store.mutations, mutations).res, this.store.commit, this.name)
      const dispatchProps = bindCreators(mapMethods(this.store.actions, actions).res, this.store.dispatch, this.name)
      if (this._isMounted) {
        this.setState({
          props: {
            ...this.state.props,
            ...stateProps,
            ...commitProps,
            ...dispatchProps
          }
        })
      }
    }

    render() {
      return (
        <Context.Consumer>
          {store => {
            this.store = store
            return <Component {...this.state.props} />
          }}
        </Context.Consumer>
      )
    }
  }
}

interface Props {
  store: any
}

export class Provider extends React.Component<Props>{
  store: any
  props: any
  constructor(props: Props) {
    super(props)
    this.store = this.props.store
  }

  render() {
    return (
      <Context.Provider value={this.store}>
        {this.props.children}
      </Context.Provider>
    )
  }
}