import test from 'node:test'
import assert from 'node:assert/strict'

const originalDocument = globalThis.document
const originalEvent = globalThis.Event
const originalWindow = globalThis.window

class SimpleEvent {
  type: string
  constructor(type: string, _init?: any) {
    this.type = type
  }
}

async function loadHelper() {
  const module = await import('../src/modules/dictation/textInsertion.js')
  return module.insertDictationText as (text: string) => Promise<any>
}

function withDocument(fakeDoc: any, fn: () => Promise<void> | void) {
  globalThis.document = fakeDoc
  globalThis.Event = SimpleEvent as any
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      globalThis.document = originalDocument
      globalThis.Event = originalEvent as any
    })
}

test('insertDictationText inserts into focused input', async () => {
  const insertDictationText = await loadHelper()
  const input: any = {
    tagName: 'INPUT',
    value: 'hello',
    selectionStart: 5,
    selectionEnd: 5,
    readOnly: false,
    disabled: false,
    dispatched: [] as any[],
    focus() {},
    dispatchEvent(ev: any) {
      this.dispatched.push(ev)
      return true
    },
  }
  const fakeDoc: any = {
    activeElement: input,
  }

  await withDocument(fakeDoc, async () => {
    const outcome = await insertDictationText(' world')
    assert.equal(outcome.ok, true)
    assert.equal(outcome.method, 'input')
    assert.equal(input.value, 'hello world')
    assert.equal(input.selectionStart, 11)
    assert.equal(input.selectionEnd, 11)
    assert.equal(input.dispatched[0]?.type, 'input')
  })
})

test('insertDictationText falls back to bridge', async () => {
  const insertDictationText = await loadHelper()
  const calls: any[] = []
  ;(globalThis as any).window = globalThis
  ;(window as any).signalhubDictation = {
    async typeText(payload: any) {
      calls.push(payload)
      return { ok: true }
    },
  }

  await withDocument({ activeElement: null }, async () => {
    const outcome = await insertDictationText('bridge test')
    assert.equal(outcome.ok, true)
    assert.equal(outcome.method, 'bridge')
    assert.equal(calls[0].text, 'bridge test')
  })

  delete (window as any).signalhubDictation
  if (originalWindow === undefined) {
    delete (globalThis as any).window
  } else {
    globalThis.window = originalWindow
  }
})
