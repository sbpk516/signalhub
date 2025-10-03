import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'

import { useDictationController } from './dictationController'
import { DictationPermissionPrompt } from './permissionPrompt'

function respondPermission(requestId: number | null, granted: boolean) {
  if (requestId === null) {
    return
  }
  const bridge = (window as unknown as { signalhubDictation?: any })?.signalhubDictation
  if (bridge && typeof bridge.respondPermission === 'function') {
    void bridge.respondPermission({ requestId, granted }).catch((error: unknown) => {
      console.warn('[DictationOverlay] respondPermission failed', error)
    })
  }
}

function cancelActivePress(reason: string) {
  const bridge = (window as unknown as { signalhubDictation?: any })?.signalhubDictation
  if (bridge && typeof bridge.cancelActivePress === 'function') {
    void bridge.cancelActivePress({ reason }).catch((error: unknown) => {
      console.warn('[DictationOverlay] cancelActivePress failed', error)
    })
  }
}

const statusMessages: Record<string, string> = {
  recording: 'Listening… Release the shortcut to finish dictation.',
  processing: 'Processing your speech…',
  error: 'Dictation encountered an issue.',
}

export const DictationOverlay: React.FC = () => {
  const state = useDictationController()

  const showOverlay = state.status !== 'idle'
  const target = typeof document !== 'undefined' ? document.body : null

  const content = useMemo(() => {
    if (state.status === 'permission' && state.permission) {
      return (
        <DictationPermissionPrompt
          permission={state.permission}
          onAllow={() => respondPermission(state.permission?.requestId ?? null, true)}
          onDeny={() => {
            respondPermission(state.permission?.requestId ?? null, false)
            cancelActivePress('user_denied_permission')
          }}
          allowDisabled={state.permission?.requestId == null}
        />
      )
    }

    if (state.status === 'recording' || state.status === 'processing') {
      const key = state.status
      return (
        <div className="w-full max-w-sm rounded-lg bg-gray-900/90 p-5 text-white shadow-lg">
          <h2 className="text-lg font-semibold">Press-and-hold Dictation</h2>
          <p className="mt-2 text-sm text-gray-100">{statusMessages[key]}</p>
          {state.processing.startedAt && (
            <p className="mt-4 text-xs text-gray-300">
              Request {state.processing.requestId?.slice?.(0, 8) || 'pending'} · Attempt {state.processing.attempt}
            </p>
          )}
        </div>
      )
    }

    if (state.status === 'error' && state.error) {
      return (
        <div className="w-full max-w-sm rounded-lg bg-red-700/90 p-5 text-white shadow-lg">
          <h2 className="text-lg font-semibold">Dictation error</h2>
          <p className="mt-2 text-sm text-red-50">{state.error}</p>
        </div>
      )
    }

    return null
  }, [state])

  if (!showOverlay || !target || !content) {
    return null
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="pointer-events-auto" role="status" aria-live="assertive">
        {content}
      </div>
    </div>,
    target,
  )
}

export default DictationOverlay
