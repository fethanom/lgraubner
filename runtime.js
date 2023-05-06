import { parse } from './parse.js'
import { generate } from './generate.js'

export function asta(options) {
    let node = options.node
    delete options.node
    let instance = new AstaComponent('asta', options)

    instance.create(node)
    instance.update()

    return instance
}

function AstaComponent(name, options) {
    this.name = name
    this.queued = false

    let data = options
    let that = this

    console.log(generate(parse(options.view), null))


    this.view = new Function('m', 'instance', 'locals', generate(parse(options.view), null))(m, this, {})

    delete data.view

    let events = {}

    if (data.onCreate) {
        events.create = data.onCreate.bind(this)
        delete data.onCreate
    }

    if (data.onUpdate) {
        events.update = data.onUpdate.bind(this)
        delete data.onUpdate
    }

    if (data.onDestory) {
        events.destory = data.onDestory.bind(this)
        delete data.onDestory
    }

    this.events = events

    for (let key in data) {
        let value = data[key]
        if (typeof value === 'function') {
            that[key] = value.bind(that)
        } else {
            that[key] = value
        }
    }

    this.create = create
    this.update = update
    this.destroy = destroy
    this.on = on
    this.off = off
    this.emit = emit
}

function create(root) {
    this.view[0](root)
    this.emit('create')
}

function update(key, value) {
    let that = this
    if (key != null) {
        if (typeof key === 'object') {
            for (let kidKey in key) {
                that[kidKey] = key[kidKey]
            }
        } else {
            this[key] = value
        }
    }

    if (this.queued === false) {
        this.queued = true
        let instance = this
        setTimeout(() => {
            instance.view[1]()
            instance.queued = false
            instance.emit('update')
        }, 0)
    }
}

function destroy() {
    this._view[2]()
    this.emit('destroy')
}

function on(type, handler) {
    let events = this.events
    let handlers = events[type]
    if (handlers == null) {
        events[type] = [handler]
    } else {
        handlers.push(handler)
    }
}

function off(type, handler) {
    if (type == null) {
        this.events = {}
    } else if (handler == null) {
        this.events[type] = []
    } else {
        let handlers = this.events[type]
        handlers.splice(handlers.indexOf(handler), 1)
    }
}

function emit(type, data) {
    const handlers = this.events[type]

    if (handlers !== undefined) {
        if (typeof handlers === 'function') {
            handlers(data)
        } else {
            for (var i = 0; i < handlers.length; i++) {
                handlers[i](data)
            }
        }
    }
}

const createElement = function (type) { return document.createElement(type); };

const createTextNode = function (content) { return document.createTextNode(content); };

const createComment = function () { return document.createComment(""); };

const setAttribute = function (element, key, value) {
    element.setAttribute(key, value);
};

const addEventListener = function (element, type, handler) {
    element.addEventListener(type, handler);
};

const setTextContent = function (element, content) {
    element.textContent = content;
};

const appendChild = function (element, parent) {
    parent.appendChild(element);
};

const removeChild = function (element, parent) {
    parent.removeChild(element);
};

const insertBefore = function (element, reference, parent) {
    parent.insertBefore(element, reference);
}

const m = {
    c: {},
    ce: createElement,
    ctn: createTextNode,
    cc: createComment,
    sa: setAttribute,
    ael: addEventListener,
    stc: setTextContent,
    ac: appendChild,
    rc: removeChild,
    ib: insertBefore,
}