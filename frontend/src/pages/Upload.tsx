import React, { useState, useCallback } from 'react'
import { Card } from '../components/Shared'

interface UploadFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
}

const Upload: React.FC = () => {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0
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
      setUploading(true)
      
      // Simulate upload progress (replace with actual API call)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, progress: i, status: i === 100 ? 'completed' : 'uploading' }
            : f
        ))
      }

      // TODO: Replace with actual API call
      // const formData = new FormData()
      // formData.append('file', file)
      // const response = await fetch('/api/v1/upload', {
      //   method: 'POST',
      //   body: formData
      // })

    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'error', error: 'Upload failed' }
          : f
      ))
    } finally {
      setUploading(false)
    }
  }

  // Start upload for all pending files
  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    for (const file of pendingFiles) {
      await uploadFile(file)
    }
  }

  // Remove file from list
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Audio</h1>
          <p className="text-gray-600 mt-2">Upload audio files for analysis and transcription</p>
        </div>
        <div className="text-sm text-gray-500">
          Supported formats: WAV, MP3, M4A, FLAC
        </div>
      </div>

      {/* Upload Zone */}
      <Card title="Upload Audio Files">
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-6xl">📁</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Drop audio files here or click to browse
              </h3>
              <p className="text-gray-500 mt-1">
                Support for WAV, MP3, M4A, and FLAC files up to 100MB
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="audio/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Choose Files
            </label>
          </div>
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card title="Selected Files">
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {file.status === 'completed' ? '✅' : 
                     file.status === 'error' ? '❌' : 
                     file.status === 'uploading' ? '⏳' : '📄'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{file.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {file.type}
                    </div>
                    {file.error && (
                      <div className="text-sm text-red-500">{file.error}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.status === 'uploading' && (
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  )}
                  {file.status === 'completed' && (
                    <span className="text-green-600 text-sm font-medium">Completed</span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-red-600 text-sm font-medium">Failed</span>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={startUpload}
              disabled={uploading || files.filter(f => f.status === 'pending').length === 0}
              className={`
                px-6 py-2 rounded-md font-medium
                ${uploading || files.filter(f => f.status === 'pending').length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {uploading ? 'Uploading...' : 'Start Upload'}
            </button>
          </div>
        </Card>
      )}

      {/* Upload Instructions */}
      <Card title="Upload Instructions">
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">1.</span>
            <span>Select or drag audio files into the upload area above</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">2.</span>
            <span>Supported formats: WAV, MP3, M4A, FLAC (max 100MB per file)</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">3.</span>
            <span>Click "Start Upload" to begin processing</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">4.</span>
            <span>Monitor progress and check results in the Results page</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Upload
