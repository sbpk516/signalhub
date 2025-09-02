import React, { useState, useCallback } from 'react'
import { Card } from '../components/Shared'
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES, API_BASE_URL } from '../types/constants'

interface UploadFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
}

interface UploadProps {
  onUploadComplete?: () => void
}

const Upload: React.FC<UploadProps> = ({ onUploadComplete }) => {
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
      
      // Get the file from the input element
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (!fileInput || !fileInput.files) {
        throw new Error('No file input found')
      }
      
      const actualFile = Array.from(fileInput.files).find(f => f.name === file.name)
      if (!actualFile) {
        throw new Error('File not found in input')
      }
      
      formData.append('file', actualFile)
      
      console.log(`[UPLOAD] Sending file to: ${API_ENDPOINTS.UPLOAD}`)
      console.log(`[UPLOAD] File details:`, {
        name: actualFile.name,
        size: actualFile.size,
        type: actualFile.type
      })

      // Make API call to backend using full URL
      const fullUrl = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD}`
      console.log(`[UPLOAD] Full URL: ${fullUrl}`)
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formData,
      })

      // Update progress to show upload is complete
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, progress: 100 }
          : f
      ))
  
      console.log(`[UPLOAD] Response status: ${response.status}`)
      console.log(`[UPLOAD] Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[UPLOAD] Upload failed with status ${response.status}:`, errorText)
        throw new Error(`Upload failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
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
      alert(`✅ File "${file.name}" uploaded successfully!`)

    } catch (error) {
      console.error(`[UPLOAD] Error uploading ${file.name}:`, error)
      
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed'
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
                         file.status === 'uploading' ? '🔄' : 
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

                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        file.status === 'completed' ? 'bg-green-100 text-green-800' :
                        file.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                        file.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {file.status === 'completed' ? '✅ Completed' : 
                         file.status === 'uploading' ? '🔄 Uploading' : 
                         file.status === 'error' ? '❌ Error' : '⏳ Pending'}
                      </span>

                      {/* Remove Button */}
                      {file.status !== 'uploading' && (
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

export default Upload
