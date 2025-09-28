import { useCallback, useEffect, useRef, useState } from 'react'

import {
  buildSnippetPayload,
  DictationSnippetPayload,
  submitDictationSnippetWithRetry,
} from './dictationService'

type DictationStatus = 'idle' | 'permission' | 'recording' | 'processing' | 'error'

type DictationEvent = {
  type: string
  payload?: Record<string, unknown>
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface DictationProcessingSnapshot {
  requestId: string | null
  attempt: number
  startedAt: number | null
  lastError: string | null
}

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
  },
}

const RECORDER_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
const MAX_RECORDING_DURATION_MS = 120_000

export interface DictationControllerState {
  status: DictationStatus
  transcript: string
  confidence: number
  error: string | null
  isEnabled: boolean
  processing: DictationProcessingSnapshot
}

const initialProcessingSnapshot: DictationProcessingSnapshot = {
  requestId: null,
  attempt: 0,
  startedAt: null,
  lastError: null,
}

const initialState: DictationControllerState = {
  status: 'idle',
  transcript: '',
  confidence: 0,
  error: null,
  isEnabled: false,
  processing: { ...initialProcessingSnapshot },
}

export function useDictationController(): DictationControllerState {
  const [state, setState] = useState<DictationControllerState>(initialState)
  const permissionUnsubscribe = useRef<() => void>(() => {})
  const lifecycleUnsubscribe = useRef<() => void>(() => {})
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const bufferedChunksRef = useRef<BlobPart[]>([])
  const watchdogTimerRef = useRef<number | null>(null)
  const recorderMimeTypeRef = useRef<string | null>(null)
  const pendingSnippetRef = useRef<DictationSnippetPayload | null>(null)
  const activeUploadAbortRef = useRef<AbortController | null>(null)

  const log = useCallback((level: LogLevel, message: string, meta: Record<string, unknown> = {}) => {
    const logger = (console[level] as typeof console.log) || console.log
    if (Object.keys(meta).length > 0) {
      logger('[DictationController]', message, meta)
      return
    }
    logger('[DictationController]', message)
  }, [])

  const clearWatchdogTimer = useCallback(() => {
    if (watchdogTimerRef.current !== null) {
      window.clearTimeout(watchdogTimerRef.current)
      watchdogTimerRef.current = null
    }
  }, [])

  const cancelActiveUpload = useCallback(() => {
    if (activeUploadAbortRef.current) {
      try {
        activeUploadAbortRef.current.abort()
      } catch (error) {
        log('warn', 'failed to abort active upload', { error })
      }
      activeUploadAbortRef.current = null
    }
  }, [log])

  const resetRecordingState = useCallback(() => {
    clearWatchdogTimer()
    bufferedChunksRef.current = []
    mediaRecorderRef.current = null
    mediaStreamRef.current = null
    recorderMimeTypeRef.current = null
    pendingSnippetRef.current = null
    cancelActiveUpload()
  }, [cancelActiveUpload, clearWatchdogTimer])

  const stopStreamTracks = useCallback(() => {
    if (!mediaStreamRef.current) return
    mediaStreamRef.current.getTracks().forEach(track => {
      try {
        track.stop()
      } catch (error) {
        log('error', 'failed to stop media track', { error })
      }
    })
  }, [log])

  const selectSupportedMimeType = useCallback((): string | undefined => {
    const recorderCtor = window.MediaRecorder
    if (!recorderCtor || !recorderCtor.isTypeSupported) return undefined
    return RECORDER_MIME_TYPES.find(mime => recorderCtor.isTypeSupported(mime))
  }, [])

  const startRecordingSession = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      log('error', 'media devices API unavailable')
      setState(prev => ({ ...prev, status: 'error', error: 'microphone access unsupported' }))
      return null
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS)
      mediaStreamRef.current = stream
    } catch (error) {
      log('error', 'failed to acquire microphone stream', { error })
      setState(prev => ({ ...prev, status: 'error', error: 'microphone permission denied' }))
      stopStreamTracks()
      resetRecordingState()
      return null
    }

    const mimeType = selectSupportedMimeType()

    try {
      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current!, mimeType ? { mimeType } : undefined)
      recorderMimeTypeRef.current = mediaRecorderRef.current.mimeType || mimeType || null
      setState(prev => ({ ...prev, error: null }))
      log('debug', 'microphone session initialized', { mimeType: mimeType || 'auto' })
      return mediaRecorderRef.current
    } catch (error) {
      log('error', 'failed to initialize MediaRecorder', { error })
      stopStreamTracks()
      resetRecordingState()
      setState(prev => ({ ...prev, status: 'error', error: 'failed to initialize recorder' }))
      return null
    }
  }, [log, resetRecordingState, selectSupportedMimeType, setState, stopStreamTracks])

  const stopRecorder = useCallback(
    (options?: { preserveBuffer?: boolean }) => {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch (error) {
          log('error', 'failed to stop recorder', { error })
        }
      }

      clearWatchdogTimer()
      stopStreamTracks()
      mediaRecorderRef.current = null
      mediaStreamRef.current = null

      if (!options?.preserveBuffer) {
        bufferedChunksRef.current = []
        recorderMimeTypeRef.current = null
        pendingSnippetRef.current = null
        cancelActiveUpload()
      }
    },
    [cancelActiveUpload, clearWatchdogTimer, log, stopStreamTracks],
  )

  const startSnippetUpload = useCallback(
    (snippet: DictationSnippetPayload) => {
      if (!snippet) {
        return
      }

      cancelActiveUpload()

      const uploadAbort = new AbortController()
      activeUploadAbortRef.current = uploadAbort
      const requestId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dict-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      const startedAt = Date.now()
      let finalAttempt = 0

      setState(prev => ({
        ...prev,
        status: 'processing',
        processing: {
          requestId,
          attempt: 0,
          startedAt,
          lastError: null,
        },
        error: null,
      }))

      log('debug', 'dictation upload started', {
        requestId,
        sizeBytes: snippet.sizeBytes,
        durationMs: snippet.durationMs,
      })

      void submitDictationSnippetWithRetry(
        {
          base64Audio: snippet.base64Audio,
          mimeType: snippet.mimeType,
          durationMs: snippet.durationMs,
          sizeBytes: snippet.sizeBytes,
          requestId,
          attempt: 0,
        },
        {
          externalAbortSignal: uploadAbort.signal,
          onAttempt: attempt => {
            finalAttempt = attempt
            log('debug', 'dictation upload attempt', { requestId, attempt })
            setState(prev => ({
              ...prev,
              processing: {
                requestId,
                attempt,
                startedAt,
                lastError: null,
              },
            }))
          },
        },
      )
        .then(result => {
          if (result.ok) {
            log('info', 'dictation upload succeeded', {
              requestId,
              transcriptLength: result.transcript?.length ?? 0,
            })
            setState(prev => ({
              ...prev,
              status: 'idle',
              transcript: result.transcript ?? prev.transcript,
              confidence: typeof result.confidence === 'number' ? result.confidence : prev.confidence,
              error: null,
              processing: {
                requestId,
                attempt: finalAttempt,
                startedAt,
                lastError: null,
              },
            }))
            return
          }

          const errorMessage = result.error || 'dictation upload failed'
          log(result.retryable ? 'warn' : 'error', 'dictation upload failed', {
            requestId,
            error: errorMessage,
            status: result.status,
          })
          setState(prev => ({
            ...prev,
            status: 'error',
            error: errorMessage,
            processing: {
              requestId,
              attempt: finalAttempt,
              startedAt,
              lastError: errorMessage,
            },
          }))
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'dictation upload failed'
          log('error', 'dictation upload exception', { requestId, error: errorMessage })
          setState(prev => ({
            ...prev,
            status: 'error',
            error: errorMessage,
            processing: {
              requestId,
              attempt: finalAttempt,
              startedAt,
              lastError: errorMessage,
            },
          }))
        })
        .finally(() => {
          if (activeUploadAbortRef.current === uploadAbort) {
            activeUploadAbortRef.current = null
          }
          pendingSnippetRef.current = null
        })
    },
    [cancelActiveUpload, log],
  )

  const handlePermissionEvent = useCallback((event: DictationEvent) => {
    if (!event) return
    if (event.type === 'dictation:permission-required') {
      setState(prev => ({ ...prev, status: 'permission', error: null }))
    }
    if (event.type === 'dictation:permission-denied') {
      setState(prev => ({ ...prev, status: 'error', error: 'dictation permission denied' }))
    }
    if (event.type === 'dictation:permission-granted') {
      setState(prev => ({ ...prev, status: 'recording', error: null }))
    }
  }, [])

  const handleLifecycleEvent = useCallback((event: DictationEvent) => {
    if (!event) return
    const payload = event.payload || {}
    switch (event.type) {
      case 'dictation:press-start':
        void startRecordingSession().then(recorder => {
          if (!recorder) {
            log('error', 'recorder unavailable on press-start')
            return
          }

          bufferedChunksRef.current = []
          recorder.ondataavailable = evt => {
            if (evt.data && evt.data.size > 0) {
              bufferedChunksRef.current.push(evt.data)
            }
          }

          recorder.onstop = null
          recorder.onerror = eventError => {
            log('error', 'recorder error', { error: eventError })
            setState(prev => ({ ...prev, status: 'error', error: 'recorder error' }))
            stopRecorder()
          }

          try {
            recorder.start()
            clearWatchdogTimer()
            watchdogTimerRef.current = window.setTimeout(() => {
              log('warn', 'recording watchdog triggered', { timeoutMs: MAX_RECORDING_DURATION_MS })
              stopRecorder()
              setState(prev => ({ ...prev, status: 'error', error: 'recording timed out' }))
              if (window.signalhubDictation && typeof window.signalhubDictation.cancelActivePress === 'function') {
                void window.signalhubDictation
                  .cancelActivePress({
                    reason: 'renderer_timeout',
                    details: { source: 'watchdog' },
                  })
                  .then(response => {
                    const ok = Boolean(response && (response as { ok?: boolean }).ok)
                    log(ok ? 'debug' : 'warn', 'watchdog cancel response', {
                      ok,
                      message: (response as { message?: string })?.message,
                    })
                  })
                  .catch(cancelError => {
                    log('error', 'failed to notify cancel', { error: cancelError })
                  })
              }
            }, MAX_RECORDING_DURATION_MS)
            setState(prev => ({ ...prev, status: 'recording', error: null }))
            log('debug', 'recording started', { event: 'press-start' })
          } catch (error) {
            log('error', 'failed to start recorder', { error })
            setState(prev => ({ ...prev, status: 'error', error: 'failed to start recording' }))
            stopStreamTracks()
            resetRecordingState()
          }
        })
        break
      case 'dictation:press-end':
        setState(prev => ({ ...prev, status: 'processing', error: null }))
        if (!mediaRecorderRef.current) {
          log('warn', 'press-end received without active recorder')
          break
        }

        stopRecorder({ preserveBuffer: true })
        log('debug', 'recording stopped', {
          event: 'press-end',
          chunks: bufferedChunksRef.current.length,
        })

        const durationMs = typeof (payload as { durationMs?: unknown }).durationMs === 'number'
          ? (payload as { durationMs: number }).durationMs
          : 0

        void (async () => {
          try {
            const snippet = await buildSnippetPayload({
              chunks: [...bufferedChunksRef.current],
              mimeType: recorderMimeTypeRef.current || 'audio/webm',
              durationMs,
            })
            pendingSnippetRef.current = snippet
            bufferedChunksRef.current = []
            recorderMimeTypeRef.current = null
            log('debug', 'snippet prepared for upload', {
              sizeBytes: snippet.sizeBytes,
              durationMs: snippet.durationMs,
            })
            startSnippetUpload(snippet)
          } catch (error) {
            pendingSnippetRef.current = null
            bufferedChunksRef.current = []
            recorderMimeTypeRef.current = null
            const message = error instanceof Error ? error.message : 'unknown'
            const tooLarge = typeof message === 'string' && message.includes('exceeds maximum size')
            log('error', 'failed to prepare snippet payload', { error })
            setState(prev => ({
              ...prev,
              status: 'error',
              error: tooLarge ? 'failed to prepare audio snippet – too large' : 'failed to prepare audio snippet',
            }))
          }
        })()
        break
      case 'dictation:press-cancel':
        setState(prev => ({ ...prev, status: 'idle', error: null }))
        if (!mediaRecorderRef.current && bufferedChunksRef.current.length === 0) {
          break
        }

        stopRecorder()
        log('debug', 'recording stopped', { event: 'press-cancel' })
        pendingSnippetRef.current = null
        break
      case 'dictation:permission-denied':
        setState(prev => ({ ...prev, status: 'error', error: 'dictation permission denied' }))
        break
      case 'dictation:listener-fallback':
        setState(prev => ({ ...prev, status: 'error', error: 'dictation listener unavailable' }))
        break
      default:
        break
    }
  }, [buildSnippetPayload, clearWatchdogTimer, log, resetRecordingState, startRecordingSession, startSnippetUpload, stopRecorder])

  useEffect(() => {
    if (window.signalhubDictation) {
      permissionUnsubscribe.current = window.signalhubDictation.onPermissionRequired(handlePermissionEvent)
      lifecycleUnsubscribe.current = window.signalhubDictation.onLifecycle(handleLifecycleEvent)
    }
    return () => {
      if (permissionUnsubscribe.current) {
        try {
          permissionUnsubscribe.current()
        } catch (error) {
          console.error('[DictationController] failed to unsubscribe permission listener', error)
        }
      }
      if (lifecycleUnsubscribe.current) {
        try {
          lifecycleUnsubscribe.current()
        } catch (error) {
          console.error('[DictationController] failed to unsubscribe lifecycle listener', error)
        }
      }
      cancelActiveUpload()
    }
  }, [cancelActiveUpload, handleLifecycleEvent, handlePermissionEvent])
  return state
}
