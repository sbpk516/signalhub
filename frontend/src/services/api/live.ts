import { useEffect, useRef, useState } from 'react'

type LiveEvent = {
  type?: 'partial' | 'progress' | 'complete' | 'error'
  call_id?: string
  chunk_index?: number
  start_sec?: number
  end_sec?: number
  text?: string
  percent?: number
  message?: string
}

export function useTranscriptionStream(callId: string | null) {
  const [text, setText] = useState('')
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [events, setEvents] = useState<number>(0)
  const [partials, setPartials] = useState<number>(0)
  const seen = useRef<Set<number>>(new Set())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!callId) return
    setText('')
    setCompleted(false)
    setError(null)
    setProgress(null)
    setEvents(0)
    setPartials(0)
    seen.current = new Set()

    // Compute backend base similarly to axios client
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
    const port = (typeof window !== 'undefined' && (window as any)?.api?.backend?.port) || null
    const base = isFile ? (port ? `http://127.0.0.1:${port}` : '') : ''
    const url = `${base}/api/v1/transcription/stream?call_id=${encodeURIComponent(callId)}`

    try {
      const es = new EventSource(url)
      esRef.current = es

      const onPartial = (e: MessageEvent) => {
        try {
          const payload: LiveEvent = JSON.parse((e as MessageEvent).data)
          const idx = typeof payload.chunk_index === 'number' ? payload.chunk_index : -1
          if (idx >= 0 && !seen.current.has(idx)) {
            seen.current.add(idx)
            if (payload.text) setText(prev => (prev ? prev + ' ' : '') + payload.text)
            setPartials(prev => prev + 1)
          }
        } catch (_) { /* ignore parse errors */ }
        setEvents(prev => prev + 1)
      }
      const onMessage = onPartial // default events treated as partials
      const onProgress = (e: MessageEvent) => {
        try { const p: LiveEvent = JSON.parse(e.data); if (typeof p.percent === 'number') setProgress(p.percent) } catch (_) {}
      }
      const onComplete = () => { setCompleted(true); es.close(); }
      const onError = (e: Event) => {
        // Network/SSE error; do not spam — mark as error and close
        setError('stream_error')
        es.close()
      }

      es.addEventListener('partial', onPartial)
      es.addEventListener('progress', onProgress)
      es.addEventListener('complete', onComplete)
      es.addEventListener('error', onError as any)
      es.onmessage = onMessage
    } catch (e) {
      setError('init_error')
    }

    return () => {
      try { esRef.current?.close() } catch (_) {}
      esRef.current = null
    }
  }, [callId])

  return { text, completed, error, progress, events, partials }
}
