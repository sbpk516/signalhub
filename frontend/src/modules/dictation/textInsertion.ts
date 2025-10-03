export type TextInsertionOutcome =
  | { ok: true; method: 'input' | 'contenteditable' | 'bridge' | 'clipboard' }
  | { ok: false; reason: 'no_target' | 'bridge_failed' | 'clipboard_failed' }

function insertIntoInput(element: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? element.value.length
  const value = element.value ?? ''
  const nextValue = value.slice(0, start) + text + value.slice(end)
  element.value = nextValue
  const caret = start + text.length
  element.selectionStart = caret
  element.selectionEnd = caret
  element.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

function insertIntoContentEditable(element: HTMLElement, text: string): boolean {
  element.focus({ preventScroll: true })
  return document.execCommand('insertText', false, text)
}

async function attemptClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text)
    return true
  }
  return false
}

export async function insertDictationText(text: string): Promise<TextInsertionOutcome> {
  if (!text) {
    return { ok: false, reason: 'no_target' }
  }

  const active = (typeof document !== 'undefined') ? (document.activeElement as HTMLElement | null) : null

  if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
    const input = active as HTMLInputElement | HTMLTextAreaElement
    if (!input.readOnly && !input.disabled) {
      insertIntoInput(input, text)
      return { ok: true, method: 'input' }
    }
  }

  if (active && active.isContentEditable) {
    if (insertIntoContentEditable(active, text)) {
      return { ok: true, method: 'contenteditable' }
    }
  }

  const bridge = (window as unknown as { signalhubDictation?: any })?.signalhubDictation
  if (bridge && typeof bridge.typeText === 'function') {
    try {
      const result = await bridge.typeText({ text })
      if (result?.ok) {
        return { ok: true, method: 'bridge' }
      }
    } catch (error) {
      console.warn('[Dictation] bridge typeText failed', error)
    }
  }

  try {
    const success = await attemptClipboard(text)
    if (success) {
      return { ok: true, method: 'clipboard' }
    }
  } catch (error) {
    console.warn('[Dictation] clipboard fallback failed', error)
    return { ok: false, reason: 'clipboard_failed' }
  }

  return { ok: false, reason: 'bridge_failed' }
}
