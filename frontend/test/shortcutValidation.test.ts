import test from 'node:test'
import assert from 'node:assert/strict'

import { validateShortcut } from '../src/pages/SettingsValidation.js'

const ok = (value: string) => validateShortcut(value)

test('modifier plus key is accepted', () => {
  const result = ok('Command+Shift+D')
  assert.equal(result.isValid, true)
  assert.equal(result.normalized, 'Command+Shift+D')
})

test('two modifier combination is accepted', () => {
  const result = ok('Command+Option')
  assert.equal(result.isValid, true)
  assert.equal(result.normalized, 'Command+Option')
})

test('single modifier is rejected', () => {
  const result = ok('Command')
  assert.equal(result.isValid, false)
})

test('multiple non-modifier keys are rejected', () => {
  const result = ok('A+B')
  assert.equal(result.isValid, false)
})

test('duplicate modifiers are deduplicated with warning', () => {
  const result = ok('Command+Command+Shift')
  assert.equal(result.isValid, true)
  assert.equal(result.normalized, 'Command+Shift')
  assert.ok(result.validation)
  assert.match(result.validation!.message, /duplicate modifiers were removed/i)
})

test('duplicate single modifier is rejected', () => {
  const result = ok('Command+Command')
  assert.equal(result.isValid, false)
})

test('modifier-only requires at least two unique modifiers', () => {
  const result = ok('Option')
  assert.equal(result.isValid, false)
})
