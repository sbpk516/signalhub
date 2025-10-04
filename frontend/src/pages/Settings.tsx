import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Shared'

type DictationSettings = {
  enabled: boolean
  shortcut: string
}

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+D'

type ShortcutValidation = {
  level: 'error' | 'warning' | 'info'
  message: string
} | null

function validateShortcut(raw: string): { normalized: string; validation: ShortcutValidation; isValid: boolean } {
  const trimmed = (raw || '').trim()
  if (!trimmed) {
    return {
      normalized: DEFAULT_SHORTCUT,
      isValid: false,
      validation: { level: 'error', message: 'Shortcut cannot be empty.' }
    }
  }

  const tokens = trimmed.split('+').map(token => token.trim()).filter(Boolean)
  if (tokens.length < 2) {
    return {
      normalized: trimmed,
      isValid: false,
      validation: { level: 'error', message: 'Use at least one modifier (Cmd/Ctrl/Alt/Shift) plus a key.' }
    }
  }

  const modifierCandidates = ['commandorcontrol', 'command', 'cmd', 'control', 'ctrl', 'alt', 'option', 'shift', 'meta', 'super']
  const hasModifier = tokens.slice(0, -1).some(token => modifierCandidates.includes(token.toLowerCase()))
  if (!hasModifier) {
    return {
      normalized: trimmed,
      isValid: false,
      validation: { level: 'error', message: 'Add at least one modifier key to avoid accidental activation.' }
    }
  }

  const keyToken = tokens[tokens.length - 1]
  const normalizedKey = keyToken.length === 1 ? keyToken.toUpperCase() : keyToken
  const normalizedTokens = [...tokens.slice(0, -1), normalizedKey]
  const normalized = normalizedTokens.join('+')

  const reservedWarnings = ['CommandOrControl+Q', 'Command+Q', 'Alt+F4', 'Ctrl+Alt+Delete']
  if (reservedWarnings.some(candidate => candidate.toLowerCase() === normalized.toLowerCase())) {
    return {
      normalized,
      isValid: true,
      validation: {
        level: 'warning',
        message: 'This shortcut is commonly reserved by the OS. Consider choosing a different one.'
      }
    }
  }

  return { normalized, isValid: true, validation: null }
}

function normalizeSettings(candidate: unknown): DictationSettings {
  const source = (candidate && typeof candidate === 'object' ? candidate : {}) as Partial<DictationSettings>
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : false,
    shortcut: typeof source.shortcut === 'string' && source.shortcut.trim() ? source.shortcut.trim() : DEFAULT_SHORTCUT,
  }
}

const Settings: React.FC = () => {
  const dictationBridge = useMemo(() => (
    (window as unknown as { signalhubDictation?: any })?.signalhubDictation || null
  ), [])

  const [dictationSettings, setDictationSettings] = useState<DictationSettings | null>(null)
  const [draftShortcut, setDraftShortcut] = useState('')
  const [isShortcutDirty, setIsShortcutDirty] = useState(false)
  const [validation, setValidation] = useState<ShortcutValidation>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSettingsUpdate = useCallback((incoming: unknown) => {
    const normalized = normalizeSettings(incoming)
    setDictationSettings(normalized)
    if (!isShortcutDirty) {
      setDraftShortcut(normalized.shortcut)
      setValidation(null)
    }
  }, [isShortcutDirty])

  useEffect(() => {
    if (!dictationBridge) {
      setLoading(false)
      setError('Dictation settings are only available in the desktop app.')
      return undefined
    }

    let unsubscribe: (() => void) | undefined
    setLoading(true)
    setError(null)

    dictationBridge.getSettings?.()
      .then((settings: unknown) => {
        handleSettingsUpdate(settings)
        setLoading(false)
      })
      .catch((fetchError: unknown) => {
        console.error('[Settings] Failed to load dictation settings', fetchError)
        setError('Unable to load dictation settings. Try reloading the app.')
        setLoading(false)
      })

    if (typeof dictationBridge.onSettingsUpdated === 'function') {
      unsubscribe = dictationBridge.onSettingsUpdated((settings: unknown) => {
        handleSettingsUpdate(settings)
      })
    }

    return () => {
      try {
        unsubscribe?.()
      } catch (unsubscribeError) {
        console.error('[Settings] Failed to unsubscribe dictation settings listener', unsubscribeError)
      }
    }
  }, [dictationBridge, handleSettingsUpdate])

  const applyShortcut = useCallback(async () => {
    if (!dictationBridge || !dictationSettings) {
      return
    }

    const result = validateShortcut(draftShortcut)
    setValidation(result.validation)
    if (!result.isValid) {
      return
    }

    if (result.normalized === dictationSettings.shortcut) {
      setIsShortcutDirty(false)
      return
    }

    try {
      setSaving(true)
      setError(null)
      await dictationBridge.updateSettings?.({ shortcut: result.normalized })
      setIsShortcutDirty(false)
      setValidation(result.validation)
    } catch (updateError: unknown) {
      console.error('[Settings] Failed to update dictation shortcut', updateError)
      setError('Could not update shortcut. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [dictationBridge, dictationSettings, draftShortcut])

  const toggleDictation = useCallback(async () => {
    if (!dictationBridge || !dictationSettings) {
      return
    }
    const nextEnabled = !dictationSettings.enabled
    try {
      setSaving(true)
      setError(null)
      setDictationSettings(prev => (prev ? { ...prev, enabled: nextEnabled } : prev))
      await dictationBridge.updateSettings?.({ enabled: nextEnabled })
    } catch (toggleError: unknown) {
      console.error('[Settings] Failed to toggle dictation', toggleError)
      setDictationSettings(prev => (prev ? { ...prev, enabled: !nextEnabled } : prev))
      setError('Unable to update dictation toggle. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [dictationBridge, dictationSettings])

  const shortcutValidationMessage = useMemo(() => {
    if (!validation) {
      return null
    }
    const baseCls = validation.level === 'error'
      ? 'text-red-600'
      : validation.level === 'warning'
        ? 'text-amber-600'
        : 'text-gray-600'
    return (
      <p className={`text-sm mt-2 ${baseCls}`}>{validation.message}</p>
    )
  }, [validation])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure desktop preferences.</p>
      </div>

      <Card title="Press-and-Hold Dictation">
        {loading && (
          <div className="text-sm text-gray-500">Loading dictation settings…</div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && dictationSettings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-900">Enable press-and-hold dictation</p>
                <p className="text-sm text-gray-600">Hold the shortcut, speak, then release to transcribe and insert text automatically.</p>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${dictationSettings.enabled ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-200 border-gray-300'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={dictationSettings.enabled}
                onClick={toggleDictation}
                disabled={saving}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${dictationSettings.enabled ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">First time using dictation?</p>
              <p className="mt-1">
                When you enable dictation we will prompt for microphone and accessibility access. macOS needs both to allow the shortcut to listen system-wide.
              </p>
              <p className="mt-1">
                If access is already granted, the desktop app now auto-starts dictation as soon as you hold the shortcut.
              </p>
            </div>

            <div>
              <label htmlFor="dictation-shortcut" className="block text-sm font-medium text-gray-700">
                Dictation shortcut
              </label>
              <div className="mt-1 flex gap-3">
                <input
                  id="dictation-shortcut"
                  type="text"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={draftShortcut}
                  onChange={event => {
                    setDraftShortcut(event.target.value)
                    setIsShortcutDirty(true)
                  }}
                  onBlur={() => {
                    if (isShortcutDirty) {
                      const result = validateShortcut(draftShortcut)
                      setValidation(result.validation)
                    }
                  }}
                  placeholder={DEFAULT_SHORTCUT}
                  disabled={saving}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={applyShortcut}
                  disabled={saving || !isShortcutDirty}
                >
                  Save Shortcut
                </button>
              </div>
              {shortcutValidationMessage}
              {!validation && (
                <p className="text-xs text-gray-500 mt-2">
                  Avoid common system shortcuts (Cmd+Q, Alt+F4). We recommend combining Command/Ctrl, Shift, and a letter key.
                </p>
              )}
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Troubleshooting</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Make sure the shortcut stays unique. If dictation doesn&apos;t start, try a different combination.</li>
                <li>On macOS, confirm SignalHub is allowed in System Settings → Privacy &amp; Security → Accessibility and Microphone.</li>
                <li>Reopen this window after changing permissions to refresh status.</li>
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Settings
