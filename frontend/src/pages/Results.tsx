import React, { useState, useEffect } from 'react'
import { apiClient } from '@/services/api/client'

// STEP 2: Add basic API integration
// We'll add API call to fetch results from backend

const Results: React.FC = () => {
  // STEP 2: Add state for API results
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Detail view (lazy-loaded per call)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({})
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({})
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null)
  const [reanalyzeErrors, setReanalyzeErrors] = useState<Record<string, string>>({})
  
  console.log('[RESULTS] Component rendering - Step 2 with API integration')
  
  // STEP 2: Add API call function
  const fetchResults = async () => {
    try {
      console.log('[RESULTS] 🚀 Starting API call to fetch results')
      setLoading(true)
      setError(null)
      
      // Call the backend API endpoint using shared API client (respects base URL)
      const { data } = await apiClient.get('/api/v1/pipeline/results')
      console.log('[RESULTS] 📥 API Response received:', data)
      
      // Extract results from response
      const resultsData = data.data?.results || []
      setResults(resultsData)
      console.log('[RESULTS] ✅ Results loaded:', resultsData.length, 'items')
      console.log('[RESULTS] 📊 Full response structure:', data)
      
    } catch (err) {
      console.error('[RESULTS] ❌ API call failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch results'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchResultDetail = async (callId: string) => {
    try {
      setDetailLoadingId(callId)
      const { data } = await apiClient.get(`/api/v1/pipeline/results/${callId}`)
      const detail = data?.data || null
      setDetailsCache(prev => ({ ...prev, [callId]: detail }))
      setDetailErrors(prev => ({ ...prev, [callId]: '' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch details'
      setDetailErrors(prev => ({ ...prev, [callId]: msg }))
    } finally {
      setDetailLoadingId(null)
    }
  }

  const onToggleDetails = (callId: string) => {
    if (expandedId === callId) {
      setExpandedId(null)
      return
    }
    setExpandedId(callId)
    if (!detailsCache[callId] && detailLoadingId !== callId) {
      fetchResultDetail(callId)
    }
  }

  const reanalyzeCall = async (callId: string) => {
    try {
      setReanalyzingId(callId)
      setReanalyzeErrors(prev => ({ ...prev, [callId]: '' }))
      await apiClient.post(`/api/v1/pipeline/reanalyze/${callId}`)
      await fetchResultDetail(callId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reanalyze call'
      setReanalyzeErrors(prev => ({ ...prev, [callId]: msg }))
    } finally {
      setReanalyzingId(null)
    }
  }
  
  // STEP 2: Load results when component mounts
  useEffect(() => {
    console.log('[RESULTS] 🔄 Component mounted, fetching results...')
    fetchResults()
  }, [])
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Results Page</h1>
      <p className="text-gray-600 mb-4">Step 3: Enhanced Results Display</p>
      
      {/* Step 3 Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400 text-xl">🎯</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Step 3: Enhanced Results Display</h3>
              <div className="mt-2 text-sm text-green-700">
                Now with refresh button and better result formatting. Ready for real data!
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={fetchResults}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄' : '🔄'} Refresh Results
            </button>
            
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results from API...</p>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">API Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Results Display */}
      {!loading && !error && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Results ({results.length}) - Page 1 of 1</h2>
          <p className="text-sm text-gray-600 mb-4">
            💡 <strong>Tip:</strong> Newer uploads with file sizes are on later pages. Use pagination to see them!
          </p>
          
          {results.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">Upload some audio files to see results here</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Calls</h3>
                <p className="text-sm text-gray-500 mt-1">Showing {results.length} processed audio files</p>
              </div>
              <div className="divide-y divide-gray-200">
                {results.map((result, index) => (
                  <div key={index} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Call ID and Status */}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Call ID: {result.call_id?.slice(0, 8) || 'Unknown'}
                        </p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.status === 'completed' ? 'bg-green-100 text-green-800' :
                            result.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            result.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.status === 'completed' ? '✅' : 
                             result.status === 'processing' ? '🔄' : 
                             result.status === 'failed' ? '❌' : '❓'}
                            {result.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      {/* File Info */}
                      <div>
                        <p className="text-sm text-gray-500 truncate" title={(result.file_info?.original_filename || (result.file_info?.file_path ? result.file_info.file_path.split('/').pop() : 'Unknown'))}>
                          {(() => {
                            const storedName = result.file_info?.file_path 
                              ? result.file_info.file_path.split('/').pop() 
                              : null
                            const original = result.file_info?.original_filename || storedName || 'Unknown'
                            return <>File: {original}</>
                          })()}
                        </p>
                        {result.file_info?.original_filename && result.file_info?.file_path && (
                          <p className="text-xs text-gray-400 mt-1">
                            Stored as: {result.file_info.file_path.split('/').pop()}
                          </p>
                        )}
                        {result.file_info?.file_size && (
                          <p className="text-xs text-gray-400 mt-1">
                            Size: {typeof result.file_info.file_size === 'number' 
                              ? `${(result.file_info.file_size / 1024).toFixed(1)} KB`
                              : result.file_info.file_size === 'Unknown' 
                                ? 'Unknown'
                                : result.file_info.file_size
                            }
                          </p>
                        )}
                      </div>
                      
                      {/* Date and Duration */}
                      <div className="text-right">
                        <p
                          className="text-sm text-gray-500"
                          title={result.created_at || ''}
                        >
                          {result.created_at
                            ? new Date(result.created_at).toLocaleString(undefined, {
                                year: 'numeric', month: 'short', day: '2-digit',
                                hour: '2-digit', minute: '2-digit'
                              })
                            : 'Unknown date'}
                        </p>
                        {result.audio_analysis?.duration && (
                          <p className="text-xs text-gray-400 mt-1">
                            Duration: {typeof result.audio_analysis.duration === 'number' 
                              ? `${Math.round(result.audio_analysis.duration)}s`
                              : result.audio_analysis.duration === 'Unknown' 
                                ? 'Unknown'
                                : result.audio_analysis.duration
                            }
                          </p>
                        )}
                        <div className="mt-3">
                          <button
                            onClick={() => onToggleDetails(result.call_id)}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                          >
                            {expandedId === result.call_id ? 'Hide details' : 'View details'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lazy-loaded Details Panel */}
                    {expandedId === result.call_id && (
                      <div className="mt-4 p-4 border-t border-gray-100 bg-gray-50 rounded">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-gray-500 flex items-center gap-3 min-w-0">
                            <span className="shrink-0">Call ID: {result.call_id}</span>
                            <span className="text-gray-300">|</span>
                            <span
                              className="text-gray-600 max-w-[28rem] truncate"
                              title={result.file_info?.original_filename || (result.file_info?.file_path ? result.file_info.file_path.split('/').pop() : 'Unknown')}
                            >
                              File: {result.file_info?.original_filename || (result.file_info?.file_path ? result.file_info.file_path.split('/').pop() : 'Unknown')}
                            </span>
                          </div>
                        <div className="flex items-center gap-3">
                          {reanalyzingId === result.call_id && (
                            <span className="text-sm text-gray-600">Reanalyzing…</span>
                          )}
                          <button
                            onClick={() => reanalyzeCall(result.call_id)}
                            disabled={reanalyzingId === result.call_id}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium ${reanalyzingId === result.call_id ? 'bg-gray-300 text-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                          >
                            Reanalyze
                          </button>
                        </div>
                        </div>
                        {detailLoadingId === result.call_id && (
                          <div className="text-sm text-gray-600">Loading details…</div>
                        )}
                        {detailErrors[result.call_id] && (
                          <div className="text-sm text-red-600">{detailErrors[result.call_id]}</div>
                        )}
                        {reanalyzeErrors[result.call_id] && (
                          <div className="text-sm text-red-600">{reanalyzeErrors[result.call_id]}</div>
                        )}
                        {detailsCache[result.call_id] && (
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Transcript</div>
                              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                {detailsCache[result.call_id]?.transcription?.transcription_text || 'No transcript available'}
                              </div>
                            </div>
                            {detailsCache[result.call_id]?.nlp_analysis && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <div className="text-xs text-gray-500">Sentiment</div>
                                  <div className="font-medium">
                                    {detailsCache[result.call_id].nlp_analysis.sentiment?.overall || 'neutral'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Intent</div>
                                  <div className="font-medium">
                                    {detailsCache[result.call_id].nlp_analysis.intent?.detected || 'unknown'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Risk</div>
                                  <div className="font-medium">
                                    {detailsCache[result.call_id].nlp_analysis.risk?.escalation_risk || 'low'}
                                  </div>
                                </div>
                              </div>
                            )}
                            {!detailsCache[result.call_id]?.nlp_analysis && (
                              <div className="text-sm text-gray-600">
                                No analysis available — this call wasn’t processed by the full pipeline or NLP failed.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Pagination Info removed (debug helper) */}
      
      {/* Debug Information removed */}
    </div>
  )
}

export default Results
