"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")

const DictationManager = require("../src/main/dictation-manager")

function createStubFactory(state) {
  return class GlobalListenerStub {
    constructor() {
      state.instances.push(this)
    }

    async addListener(handler) {
      state.handlers.add(handler)
      state.added.push(handler)
      return Promise.resolve()
    }

    removeListener(handler) {
      state.handlers.delete(handler)
      state.removed.push(handler)
    }

    kill() {
      state.killed = true
    }
  }
}

function createStubNut() {
  const Key = new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    },
  )
  return {
    keyboard: {},
    Key,
  }
}

test("DictationManager attaches and detaches global listener", async () => {
  const state = {
    handlers: new Set(),
    added: [],
    removed: [],
    instances: [],
    killed: false,
  }
  const manager = new DictationManager({ listenerFactory: createStubFactory(state) })
  const stubNut = createStubNut()
  manager._nut = stubNut
  manager._keyboard = stubNut.keyboard
  manager._keyEnum = stubNut.Key
  manager._shouldIgnoreEvent = () => false
  manager._mapListenerEventToKey = event => event.mockKey ?? null
  const events = []
  manager.on("dictation:press-start", payload => events.push({ type: "start", payload }))
  manager.on("dictation:press-end", payload => events.push({ type: "end", payload }))
  manager.on("dictation:press-cancel", payload => events.push({ type: "cancel", payload }))
  manager.on("dictation:request-start", payload => events.push({ type: "request", payload }))

  const started = await manager.startListening({ shortcut: "Shift+A" })
  assert.equal(started, true)
  assert.equal(state.instances.length, 1)
  assert.equal(state.handlers.size, 1)
  assert.equal(state.added.length, 1)

  const handler = state.added[0]
  handler({ mockKey: "LeftShift", state: "DOWN" })
  handler({ mockKey: "A", state: "DOWN" })
  const pending = manager._pendingPermission
  assert.ok(pending)
  manager.grantPermission({ requestId: pending.id, source: "test" })
  handler({ mockKey: "A", state: "UP" })
  handler({ mockKey: "LeftShift", state: "UP" })

  await manager.stopListening()
  assert.equal(state.handlers.size, 0)
  assert.equal(state.removed.length, 1)
  assert.equal(state.killed, true)

  const types = events.map(e => e.type)
  assert.deepEqual(types, ["start", "request", "end"])
  const [startEvent, requestEvent, endEvent] = events
  assert.ok(startEvent.payload.durationMs === 0)
  assert.equal(requestEvent.payload.requestId >= 1, true)
  assert.ok(endEvent.payload.durationMs >= 0)

  await manager.dispose()
  assert.equal(state.killed, true)
})

test("DictationManager cancels when permission denied", async () => {
  const state = {
    handlers: new Set(),
    added: [],
    removed: [],
    instances: [],
    killed: false,
  }
  const manager = new DictationManager({ listenerFactory: createStubFactory(state) })
  const stubNut = createStubNut()
  manager._nut = stubNut
  manager._keyboard = stubNut.keyboard
  manager._keyEnum = stubNut.Key
  manager._shouldIgnoreEvent = () => false
  manager._mapListenerEventToKey = event => event.mockKey ?? null
  const events = []
  manager.on("dictation:press-cancel", payload => events.push({ type: "cancel", payload }))
  manager.on("dictation:permission-denied", payload => events.push({ type: "denied", payload }))

  await manager.startListening({ shortcut: "Shift+A" })
  const handler = state.added[0]
  handler({ mockKey: "LeftShift", state: "DOWN" })
  handler({ mockKey: "A", state: "DOWN" })
  const pending = manager._pendingPermission
  assert.ok(pending)
  manager.denyPermission({ requestId: pending.id, reason: "test" })
  handler({ mockKey: "A", state: "UP" })
  handler({ mockKey: "LeftShift", state: "UP" })

  await manager.stopListening()
  assert.deepEqual(
    events.map(e => e.type),
    ["denied", "cancel"],
  )
  await manager.dispose()
})

 test("DictationManager typeText with keyboard", async () => {
   const state = {
     handlers: new Set(),
     added: [],
     removed: [],
     instances: [],
     killed: false,
   }
   const manager = new DictationManager({ listenerFactory: createStubFactory(state) })
   const stubNut = createStubNut()
   stubNut.keyboard.type = async () => {}
   manager._nut = stubNut
   manager._keyboard = stubNut.keyboard

  const result = await manager.typeText('hello world')
  assert.equal(result.ok, true)
  assert.equal(result.method, 'keyboard')
})

test("DictationManager typeText supports object payload", async () => {
  const state = {
    handlers: new Set(),
    added: [],
    removed: [],
    instances: [],
    killed: false,
  }
  const manager = new DictationManager({ listenerFactory: createStubFactory(state) })
  const stubNut = createStubNut()
  stubNut.keyboard.type = async () => {}
  manager._nut = stubNut
  manager._keyboard = stubNut.keyboard

  const result = await manager.typeText({ text: 'object payload', mode: 'type' })
  assert.equal(result.ok, true)
  assert.equal(result.method, 'keyboard')
})

test("DictationManager typeText handles empty text", async () => {
  const manager = new DictationManager()
  const result = await manager.typeText('')
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'empty_text')
})
