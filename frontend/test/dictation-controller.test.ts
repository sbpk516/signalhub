import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSnippetPayload,
  MAX_SNIPPET_BYTES,
} from '../src/modules/dictation/snippetPayload.js'

const WEBM_HEADER = new Uint8Array([
  0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x86, 0x81, 0x01,
])

function createBlobPart(size: number): Uint8Array {
  const buffer = new Uint8Array(size)
  for (let i = 0; i < size; i += 1) {
    buffer[i] = (i * 31) % 255
  }
  return buffer
}

function createMediaRecorderChunk(byteLength: number): BlobPart[] {
  const payload = createBlobPart(byteLength)
  return [WEBM_HEADER, payload]
}

test('buildSnippetPayload packages MediaRecorder-style chunks', async () => {
  const durationMs = 1500
  const mimeType = 'audio/webm'
  const snippet = await buildSnippetPayload({
    chunks: createMediaRecorderChunk(2048),
    mimeType,
    durationMs,
  })

  assert.equal(snippet.mimeType, mimeType)
  assert.equal(snippet.durationMs, durationMs)
  assert.ok(snippet.sizeBytes > 0)
  assert.ok(snippet.base64Audio.length > 0)
  const decoded = Buffer.from(snippet.base64Audio, 'base64')
  assert.equal(decoded.byteLength, snippet.sizeBytes)
})

test('buildSnippetPayload rejects oversized media recorder chunks', async () => {
  const tooLarge = MAX_SNIPPET_BYTES + 128
  await assert.rejects(
    () => buildSnippetPayload({
      chunks: createMediaRecorderChunk(tooLarge),
      mimeType: 'audio/webm',
      durationMs: 3000,
    }),
    /exceeds maximum size/i,
  )
})

test('buildSnippetPayload rejects empty chunk list', async () => {
  await assert.rejects(
    () => buildSnippetPayload({
      chunks: [],
      mimeType: 'audio/webm',
      durationMs: 100,
    }),
    /no audio chunks/i,
  )
})
