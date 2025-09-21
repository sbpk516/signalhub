import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card } from '../components/Shared'
import { API_ENDPOINTS, API_BASE_URL, UI_CONFIG } from '../types/constants'
import { apiClient } from '@/services/api/client'
// Live batch mode: final transcript only; no SSE stream

interface UploadFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  file?: File
}

interface UploadProps {
  onUploadComplete?: () => void
  onNavigate?: (page: 'dashboard' | 'upload' | 'results') => void
}

const Upload: React.FC<UploadProps> = ({ onUploadComplete, onNavigate }) => {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processingTick, setProcessingTick] = useState(0)

  // Cycle processing label while any file is in 'processing'
  useEffect(() => {
    const anyProcessing = files.some(f => f.status === 'processing')
    if (!anyProcessing) return
    const id = window.setInterval(() => {
      setProcessingTick(t => (t + 1) % processingStages.length)
    }, 3000)
    return () => window.clearInterval(id)
  }, [files])

  const processingLabel = processingStages[processingTick]

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      file
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // Validate file type
  const isValidAudioFile = (file: File): boolean => {
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/flac']
    return validTypes.includes(file.type)
  }

  // Upload file to backend
  const uploadFile = async (file: UploadFile) => {
    try {
      console.log(`[UPLOAD] Starting upload for file: ${file.name}`)
      setUploading(true)
      
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      // Create FormData for file upload
      const formData = new FormData()
      const actualFile = file.file
      if (!actualFile) throw new Error('File content not available')
      formData.append('file', actualFile)
      
      console.log(`[UPLOAD] Sending file to: ${API_ENDPOINTS.UPLOAD}`)
      console.log(`[UPLOAD] File details:`, {
        name: actualFile.name,
        size: actualFile.size,
        type: actualFile.type
      })

      // Make API call to backend using relative URL (will use Vite proxy)
      const uploadUrl = API_ENDPOINTS.UPLOAD
      console.log(`[UPLOAD] Upload URL: ${uploadUrl}`)

      let uploadFinished = false
      const response = await apiClient.post(uploadUrl, formData, {
        timeout: UI_CONFIG.UPLOAD_TIMEOUT,
        // Do NOT set 'Content-Type' for FormData; the browser will add the correct boundary
        onUploadProgress: (evt: any) => {
          const total = evt.total || actualFile.size || 0
          const loaded = evt.loaded || 0
          const pct = total ? Math.min(100, Math.round((loaded / total) * 100)) : loaded ? 100 : 0
          // Debug log to verify progress events
          if (pct % 10 === 0) console.log(`[UPLOAD] Progress ${pct}% (${loaded}/${total})`)
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: pct } : f))
          if (pct >= 100 && !uploadFinished) {
            uploadFinished = true
            // Show processing state while awaiting server-side pipeline
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing' } : f))
          }
        }
      })
  
      console.log(`[UPLOAD] Response status: ${response.status}`)
      console.log(`[UPLOAD] Response headers:`, response.headers)

      const result = response.data
      console.log(`[UPLOAD] Upload successful:`, result)

      // Update file status to completed
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'completed', progress: 100 }
          : f
      ))

      console.log(`[UPLOAD] File ${file.name} uploaded successfully!`)

      // Don't immediately switch pages - let user see the completed status
      // if (onUploadComplete) {
      //   onUploadComplete()
      // }

      // Show success message instead
      // Optional: inline success message or toast could be added here

    } catch (error) {
      console.error(`[UPLOAD] Error uploading ${file.name}:`, error)
      
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { 
              ...f, 
              status: 'error', 
              error: (error as any)?.message || 'Upload failed'
            }
          : f
      ))
    } finally {
      setUploading(false)
    }
  }

  // Start upload for all pending files
  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    console.log(`[UPLOAD] Starting upload for ${pendingFiles.length} pending files`)
    
    for (const file of pendingFiles) {
      await uploadFile(file)
    }
  }

  // Clear completed files
  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'))
  }

  // Remove file
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Audio Files</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload your audio files for transcription and analysis. Supported formats: WAV, MP3, M4A, FLAC
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <div className="space-y-6">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop audio files here, or click to browse
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your audio files, or click the button below to select files
            </p>
            
            <input
              id="file-input"
              type="file"
              multiple
              accept="audio/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            
            <button
              onClick={() => document.getElementById('file-input')?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📁 Choose Files
            </button>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Selected Files ({files.length})
                </h3>
                <div className="flex space-x-3">
                  <button
                    onClick={startUpload}
                    disabled={uploading || !files.some(f => f.status === 'pending')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    🚀 Start Upload
                  </button>
                  <button
                    onClick={clearCompleted}
                    disabled={!files.some(f => f.status === 'completed')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    🗑️ Clear Completed
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                        <div className="text-2xl">
                          {file.status === 'completed' ? '✅' : 
                           file.status === 'uploading' ? '🔼' : 
                           file.status === 'processing' ? '🔄' :
                           file.status === 'error' ? '❌' : '📁'}
                        </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{file.name}</span>
                          {file.status === 'error' && (
                            <span className="text-red-600 text-sm">{file.error}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {file.type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Progress Bar */}
                      {file.status === 'uploading' && (
                        <div className="w-32">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            {file.progress}%
                          </div>
                        </div>
                      )}
                      {file.status === 'processing' && (
                        <div className="w-48">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin"></span>
                            <span>{processingLabel}</span>
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        file.status === 'completed' ? 'bg-green-100 text-green-800' :
                        file.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                        file.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        file.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {file.status === 'completed' ? '✅ Completed' : 
                         file.status === 'uploading' ? `🔼 Uploading ${file.progress}%` : 
                         file.status === 'processing' ? `🔄 ${processingLabel}` : 
                         file.status === 'error' ? '❌ Error' : '⏳ Pending'}
                      </span>

                      {/* Remove Button */}
                      {file.status !== 'uploading' && file.status !== 'processing' && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📋 Upload Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Supported formats: WAV, MP3, M4A, FLAC</li>
              <li>• Maximum file size: 100MB</li>
              <li>• Files are automatically processed after upload</li>
              <li>• Check the Results page to view processing status</li>
              <li>• Processing time depends on file length and complexity</li>
            </ul>
          </div>

          {/* Live Mic (beta) */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">🎤 Live Mic (beta)</h4>
            <LiveMicPanel onNavigate={onNavigate} />
          </div>

          {/* Return to Dashboard Button */}
          <div className="text-center pt-4">
            <button
              onClick={() => onUploadComplete && onUploadComplete()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              🏠 Return to Dashboard
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Cycling processing label
const processingStages = ['Processing audio…', 'Transcribing speech…', 'Running NLP analysis…']

// Hook-like logic in component scope will compute label

export default Upload

function LiveMicPanel({ onNavigate }: { onNavigate?: (page: 'dashboard' | 'upload' | 'results') => void }) {
  const [recording, setRecording] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Batch-only live mic (no SSE): hold final transcript returned by /live/stop
  const [finalText, setFinalText] = useState<string>("")
  const [processingFinal, setProcessingFinal] = useState(false)
  const [callId, setCallId] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      setError(null)
      console.log('[LIVE] start(): creating session…')
      // Start session
      const res = await apiClient.post('/api/v1/live/start')
      const sid = res.data?.session_id as string
      if (!sid) throw new Error('Failed to create session')
      setSessionId(sid)
      console.log('[LIVE] start(): session created', { sessionId: sid })

      // Get mic
      console.log('[LIVE] start(): requesting mic via getUserMedia')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const preferredMime = 'audio/webm;codecs=opus'
      const mimeSupported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(preferredMime)
      const recorderOptions = mimeSupported ? { mimeType: preferredMime } : undefined
      const mr = recorderOptions ? new MediaRecorder(stream, recorderOptions) : new MediaRecorder(stream)
      mediaRef.current = mr
      console.log('[LIVE] start(): MediaRecorder ready', {
        mimeType: mr.mimeType,
        requestedMime: mimeSupported ? preferredMime : 'default',
        state: mr.state
      })

      mr.ondataavailable = async (ev: BlobEvent) => {
        try {
          if (!sessionId && sid) setSessionId(sid)
          const s = sessionId || sid
          if (!s) return
          const blob = ev.data
          if (!blob || blob.size === 0) {
            console.warn('[LIVE] ondataavailable: empty blob skipped')
            return
          }
          console.log('[LIVE] ondataavailable: chunk ready', { size: blob.size, type: blob.type })
          const fd = new FormData()
          // Name chunk with timestamp to aid backend debugging
          const extension = blob.type === 'audio/mp4' ? 'm4a' : 'webm'
          const file = new File([blob], `chunk_${Date.now()}.${extension}`, { type: blob.type })
          fd.append('file', file)
          console.log('[LIVE] uploading chunk…', { sessionId: s, filename: file.name, size: file.size })
          const t0 = performance.now()
          await apiClient.post(`/api/v1/live/chunk?session_id=${encodeURIComponent(s)}`, fd)
          const dt = Math.round(performance.now() - t0)
          console.log('[LIVE] chunk upload done', { ms: dt })
        } catch (e) {
          console.warn('[LIVE] chunk upload failed', e)
        }
      }
      mr.start(4000) // 4s chunks
      console.log('[LIVE] MediaRecorder started with 4000ms timeslice')
      setRecording(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to start recording')
      console.error('[LIVE] start() failed', e)
      try { mediaRef.current?.stop() } catch {}
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
      setRecording(false)
      setSessionId(null)
    }
  }, [sessionId])

  const stop = useCallback(async () => {
    try {
      console.log('[LIVE] stop(): stopping recorder and mic…')
      // Flush any buffered data and stop
      try { mediaRef.current?.requestData?.() } catch {}
      mediaRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
    } catch {}
    setRecording(false)
    setProcessingFinal(true)
    setFinalText("")
    try {
      // Give a brief moment for the last chunk upload to complete
      console.log('[LIVE] stop(): waiting 800ms for last chunk to finish uploading…')
      await new Promise(r => setTimeout(r, 800))
      if (sessionId) {
        console.log('[LIVE] stop(): calling /live/stop', { sessionId })
        const t0 = performance.now()
        const res = await apiClient.post(`/api/v1/live/stop?session_id=${encodeURIComponent(sessionId)}`)
        const dt = Math.round(performance.now() - t0)
        const txt = (res.data?.final_text as string) || ""
        const cid = (res.data?.call_id as string) || null
        const chunksCount = res.data?.chunks_count
        const concatOk = res.data?.concat_ok
        const durationSec = res.data?.duration_seconds
        const transcriptPath = res.data?.transcript_path
        const combinedPath = res.data?.combined_path
        console.log('[LIVE] stop(): response received', { ms: dt, chunksCount, concatOk, durationSec, callId: cid, transcriptPath, combinedPath, textLen: txt.length })
        setFinalText(txt)
        setCallId(cid)
      }
    } catch (e) {
      console.warn('[LIVE] stop() failed', e)
    } finally {
      setProcessingFinal(false)
    }
  }, [sessionId])

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        {!recording ? (
          <button onClick={start} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">● Record</button>
        ) : (
          <button onClick={stop} className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800">■ Stop</button>
        )}
        {sessionId && (
          <span className="text-xs text-gray-600">Session: {sessionId.slice(0,8)}</span>
        )}
      </div>
      {error && <div className="text-xs text-red-700 mb-2">{error}</div>}
      <div className="text-sm text-gray-800 whitespace-pre-wrap min-h-[2rem]">
        {recording
          ? 'Listening…'
          : processingFinal
            ? 'Processing final transcript…'
            : (finalText || (sessionId ? 'No transcript available' : 'Press Record to start'))}
      </div>
      {!recording && !processingFinal && finalText && (
        <div className="flex items-center gap-3 mt-1">
          <div className="text-xs text-green-700">Completed</div>
          {callId && (
            <button
              onClick={() => {
                console.log('[LIVE] navigate: View in Results clicked', { callId })
                onNavigate && onNavigate('results')
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View in Results
            </button>
          )}
        </div>
      )}
    </div>
  )
}
