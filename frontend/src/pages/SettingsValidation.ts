const modifierAliases = new Map<string, string>([
  ['commandorcontrol', 'CommandOrControl'],
  ['command', 'Command'],
  ['cmd', 'Command'],
  ['control', 'Control'],
  ['ctrl', 'Control'],
  ['alt', 'Alt'],
  ['option', 'Option'],
  ['shift', 'Shift'],
  ['meta', 'Meta'],
  ['super', 'Super'],
])

export type ShortcutValidation = {
  level: 'error' | 'warning' | 'info'
  message: string
} | null

export const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+D'

export function validateShortcut(raw: string): { normalized: string; validation: ShortcutValidation; isValid: boolean } {
  const trimmed = (raw || '').trim()
  if (!trimmed) {
    return {
      normalized: DEFAULT_SHORTCUT,
      isValid: false,
      validation: { level: 'error', message: 'Shortcut cannot be empty.' }
    }
  }

  const tokens = trimmed.split('+').map(token => token.trim()).filter(Boolean)
  if (!tokens.length) {
    return {
      normalized: DEFAULT_SHORTCUT,
      isValid: false,
      validation: { level: 'error', message: 'Shortcut cannot be empty.' }
    }
  }

  type TokenInfo = { type: 'modifier' | 'key'; value: string }
  const parsedTokens: TokenInfo[] = tokens.map(token => {
    const lower = token.toLowerCase()
    if (modifierAliases.has(lower)) {
      return { type: 'modifier', value: modifierAliases.get(lower) as string }
    }
    return { type: 'key', value: token.length === 1 ? token.toUpperCase() : token }
  })

  const normalizedParts: string[] = []
  const seenModifiers = new Set<string>()
  const modifiers: string[] = []
  const nonModifiers: string[] = []
  let duplicatesCollapsed = false

  parsedTokens.forEach(({ type, value }) => {
    if (type === 'modifier') {
      if (!seenModifiers.has(value)) {
        seenModifiers.add(value)
        modifiers.push(value)
        normalizedParts.push(value)
      } else {
        duplicatesCollapsed = true
      }
    } else {
      nonModifiers.push(value)
      normalizedParts.push(value)
    }
  })

  if (!nonModifiers.length && modifiers.length < 2) {
    return {
      normalized: trimmed,
      isValid: false,
      validation: { level: 'error', message: 'Use at least two modifier keys or add a letter/number key.' }
    }
  }

  if (nonModifiers.length > 1) {
    return {
      normalized: trimmed,
      isValid: false,
      validation: { level: 'error', message: 'Only one non-modifier key is supported within the shortcut.' }
    }
  }

  if (nonModifiers.length === 1 && modifiers.length === 0) {
    return {
      normalized: trimmed,
      isValid: false,
      validation: { level: 'error', message: 'Add at least one modifier key to avoid accidental activation.' }
    }
  }

  const normalized = normalizedParts.join('+')

  const reservedWarnings = ['CommandOrControl+Q', 'Command+Q', 'Alt+F4', 'Ctrl+Alt+Delete']
  let validation: ShortcutValidation = null
  if (reservedWarnings.some(candidate => candidate.toLowerCase() === normalized.toLowerCase())) {
    validation = {
      level: 'warning',
      message: 'This shortcut is commonly reserved by the OS. Consider choosing a different one.'
    }
  }

  if (duplicatesCollapsed) {
    const duplicateMessage = 'Duplicate modifiers were removed from this shortcut.'
    if (validation) {
      validation = {
        level: 'warning',
        message: `${validation.message} ${duplicateMessage}`.trim()
      }
    } else {
      validation = {
        level: 'warning',
        message: duplicateMessage
      }
    }
  }

  return { normalized, isValid: true, validation }
}

export const validateShortcutForTest = validateShortcut
