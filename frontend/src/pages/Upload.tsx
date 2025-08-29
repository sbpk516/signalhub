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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Audio</h1>
            <p className="text-lg text-gray-600">Upload audio files for analysis and transcription</p>
          </div>
          <div className="mt-4 lg:mt-0 lg:ml-6">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="mr-2">📁</span>
                <span>Supported: WAV, MP3, M4A, FLAC</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">📏</span>
                <span>Max: 100MB per file</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <Card title="Upload Audio Files" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
            ${isDragOver 
              ? 'border-blue-500 bg-blue-100 scale-105' 
              : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-6">
            <div className="text-8xl animate-bounce">📁</div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                Drop audio files here or click to browse
              </h3>
              <p className="text-lg text-gray-600">
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
              className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 cursor-pointer transition-all duration-200 transform hover:scale-105"
            >
              <span className="mr-2">📤</span>
              Choose Files
            </label>
          </div>
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card title={`Selected Files (${files.length})`} className="bg-white">
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {file.status === 'completed' ? '✅' : 
                     file.status === 'error' ? '❌' : 
                     file.status === 'uploading' ? '⏳' : '📄'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">{file.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatFileSize(file.size)} • {file.type} • {file.status}
                    </div>
                    {file.error && (
                      <div className="text-sm text-red-500 mt-1">{file.error}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {file.status === 'uploading' && (
                    <div className="w-48 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  )}
                  {file.status === 'completed' && (
                    <span className="text-green-600 text-sm font-semibold bg-green-100 px-3 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-red-600 text-sm font-semibold bg-red-100 px-3 py-1 rounded-full">
                      Failed
                    </span>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={startUpload}
              disabled={uploading || files.filter(f => f.status === 'pending').length === 0}
              className={`
                px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200
                ${uploading || files.filter(f => f.status === 'pending').length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 focus:ring-4 focus:ring-green-300'
                }
              `}
            >
              {uploading ? '⏳ Uploading...' : '🚀 Start Upload'}
            </button>
          </div>
        </Card>
      )}

      {/* Upload Instructions */}
      <Card title="📋 Upload Instructions" className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 text-lg">Step-by-Step Process</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Select or drag audio files into the upload area above</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Supported formats: WAV, MP3, M4A, FLAC (max 100MB per file)</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Click "Start Upload" to begin processing</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>Monitor progress and check results in the Results page</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 text-lg">File Requirements</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>Audio quality: 16kHz or higher</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>Duration: 1 second to 2 hours</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>File size: Up to 100MB</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>Languages: English, Spanish, French</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Upload
