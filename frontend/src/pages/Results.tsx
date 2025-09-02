import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../components/Shared'
import { 
  fetchResults, 
  fetchResultDetail, 
  searchResults,
  ResultsFilters 
} from '../services/api'
import { 
  CallResult, 
  CallResultSummary, 
  CallStatus,
  CallResultSummary as CallResultSummaryType 
} from '../types/api'

interface ResultsState {
  results: CallResultSummaryType[]
  loading: boolean
  error: string | null
  selectedResult: CallResult | null
  showDetailModal: boolean
  filters: ResultsFilters
  searchQuery: string
  totalResults: number
  currentPage: number
}

const Results: React.FC = () => {
  const [state, setState] = useState<ResultsState>({
    results: [],
    loading: false,
    error: null,
    selectedResult: null,
    showDetailModal: false,
    filters: {},
    searchQuery: '',
    totalResults: 0,
    currentPage: 1
  })

  // Load results on component mount
  useEffect(() => {
    loadResults()
  }, [state.filters, state.currentPage])

  // Auto-refresh results every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.loading) {
        loadResults()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [state.loading])

  // Load results from API
  const loadResults = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      console.log('[RESULTS] Loading results with filters:', state.filters)
      
      const response = await fetchResults({
        ...state.filters,
        limit: 20,
        offset: (state.currentPage - 1) * 20
      })
      
      console.log('[RESULTS] Results loaded successfully:', {
        count: response.data.results.length,
        total: response.data.total
      })
      
      setState(prev => ({
        ...prev,
        results: response.data.results,
        totalResults: response.data.total,
        loading: false
      }))
    } catch (error) {
      console.error('[RESULTS] Error loading results:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load results'
      }))
    }
  }, [state.filters, state.currentPage])

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null, searchQuery: query }))
      
      console.log('[RESULTS] Searching for:', query)
      
      const response = await searchResults(query, state.filters)
      
      setState(prev => ({
        ...prev,
        results: response.data.results,
        totalResults: response.data.total,
        loading: false
      }))
    } catch (error) {
      console.error('[RESULTS] Search error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }))
    }
  }, [state.filters])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ResultsFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 1 // Reset to first page when filters change
    }))
  }, [])

  // Handle result selection
  const handleResultSelect = useCallback(async (result: CallResultSummaryType) => {
    try {
      console.log('[RESULTS] Loading details for result:', result.call_id)
      
      const detailResponse = await fetchResultDetail(result.call_id)
      
      setState(prev => ({
        ...prev,
        selectedResult: detailResponse.data,
        showDetailModal: true
      }))
    } catch (error) {
      console.error('[RESULTS] Error loading result details:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to load result details'
      }))
    }
  }, [])

  // Close detail modal
  const closeDetailModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showDetailModal: false,
      selectedResult: null
    }))
  }, [])

  // Get status badge with emoji
  const getStatusBadge = (status: CallStatus) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', emoji: '⏳', text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', emoji: '🔄', text: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', emoji: '✅', text: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', emoji: '❌', text: 'Failed' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.emoji}</span>
        {config.text}
      </span>
    )
  }

  // Get sentiment badge
  const getSentimentBadge = (sentiment: string) => {
    const sentimentConfig = {
      positive: { color: 'bg-green-100 text-green-800', emoji: '😊' },
      negative: { color: 'bg-red-100 text-red-800', emoji: '😞' },
      neutral: { color: 'bg-gray-100 text-gray-800', emoji: '😐' }
    }
    
    const config = sentimentConfig[sentiment.toLowerCase()] || sentimentConfig.neutral
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.emoji}</span>
        {sentiment}
      </span>
    )
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Call Results</h1>
          <p className="text-gray-600 mt-2">
            View and analyze your processed audio calls
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => loadResults()}
            disabled={state.loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {state.loading ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search calls, transcriptions, or keywords..."
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(state.searchQuery)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => handleSearch(state.searchQuery)}
              disabled={state.loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              🔍 Search
            </button>
          </div>
          
          <div className="flex space-x-4">
            <select
              value={state.filters.status || ''}
              onChange={(e) => handleFilterChange({ status: e.target.value as CallStatus || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            
            <input
              type="date"
              value={state.filters.dateFrom || ''}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="From Date"
            />
            
            <input
              type="date"
              value={state.filters.dateTo || ''}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="To Date"
            />
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Card>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Results</h3>
                <div className="mt-2 text-sm text-red-700">{state.error}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <div className="overflow-x-auto">
          {state.loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading results...</p>
            </div>
          ) : state.results.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">
                {state.searchQuery || Object.keys(state.filters).length > 0 
                  ? 'Try adjusting your search or filters'
                  : 'Upload some audio files to see results here'
                }
              </p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.results.map((result) => (
                    <tr 
                      key={result.call_id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleResultSelect(result)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {result.file_name || `Call ${result.call_id.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(result.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {result.call_id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.duration ? formatDuration(result.duration) : '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {result.sentiment ? getSentimentBadge(result.sentiment) : '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResultSelect(result)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {state.totalResults > 20 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                      disabled={state.currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={state.currentPage * 20 >= state.totalResults}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(state.currentPage - 1) * 20 + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(state.currentPage * 20, state.totalResults)}
                        </span>{' '}
                        of <span className="font-medium">{state.totalResults}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                          disabled={state.currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ←
                        </button>
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          Page {state.currentPage}
                        </span>
                        <button
                          onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          disabled={state.currentPage * 20 >= state.totalResults}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          →
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Detail Modal */}
      {state.showDetailModal && state.selectedResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Call Details: {state.selectedResult.file_name || `Call ${state.selectedResult.call_id.slice(0, 8)}`}
                </h3>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Call ID</label>
                    <p className="mt-1 text-sm text-gray-900">{state.selectedResult.call_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(state.selectedResult.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {state.selectedResult.duration ? formatDuration(state.selectedResult.duration) : '--'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">File Size</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {state.selectedResult.file_size ? formatFileSize(state.selectedResult.file_size) : '--'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(state.selectedResult.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sentiment</label>
                    <div className="mt-1">
                      {state.selectedResult.sentiment ? getSentimentBadge(state.selectedResult.sentiment) : '--'}
                    </div>
                  </div>
                </div>

                {/* Transcription */}
                {state.selectedResult.transcription && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transcription</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {state.selectedResult.transcription.text}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        Confidence: {(state.selectedResult.transcription.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* NLP Analysis */}
                {state.selectedResult.nlp_analysis && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">NLP Analysis</label>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Sentiment Score: </span>
                        <span className="text-sm text-gray-900">
                          {state.selectedResult.nlp_analysis.sentiment_score?.toFixed(3) || 'N/A'}
                        </span>
                      </div>
                      {state.selectedResult.nlp_analysis.key_phrases && state.selectedResult.nlp_analysis.key_phrases.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Key Phrases: </span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {state.selectedResult.nlp_analysis.key_phrases.map((phrase, index) => (
                              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {phrase}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {state.selectedResult.nlp_analysis.call_classification && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Classification: </span>
                          <span className="text-sm text-gray-900">
                            {state.selectedResult.nlp_analysis.call_classification}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio File Info */}
                {state.selectedResult.audio_file_path && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audio File</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-900">
                        Path: {state.selectedResult.audio_file_path}
                      </p>
                      {state.selectedResult.audio_file_path.includes('processed') && (
                        <p className="text-sm text-green-600 mt-1">✓ Audio has been processed</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Results
