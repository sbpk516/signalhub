import React, { useState } from 'react'
import { Card } from '../components/Shared'

interface CallResult {
  id: string
  callId: string
  fileName: string
  duration: string
  status: 'completed' | 'processing' | 'failed'
  uploadedAt: string
  processedAt?: string
  transcript?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  intent?: string
  riskLevel?: 'low' | 'medium' | 'high'
}

const Results: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all')
  const [selectedCall, setSelectedCall] = useState<CallResult | null>(null)

  // Mock data - replace with actual API call
  const mockResults: CallResult[] = [
    {
      id: '1',
      callId: '2025-001',
      fileName: 'customer_support_call_001.wav',
      duration: '5:32',
      status: 'completed',
      uploadedAt: '2025-08-29 10:30 AM',
      processedAt: '2025-08-29 10:35 AM',
      transcript: 'Customer called regarding billing issue. Agent provided solution and customer was satisfied.',
      sentiment: 'positive',
      intent: 'billing_inquiry',
      riskLevel: 'low'
    },
    {
      id: '2',
      callId: '2025-002',
      fileName: 'sales_call_002.mp3',
      duration: '8:15',
      status: 'completed',
      uploadedAt: '2025-08-29 11:15 AM',
      processedAt: '2025-08-29 11:20 AM',
      transcript: 'Sales call discussing new product features. Customer showed interest in premium package.',
      sentiment: 'positive',
      intent: 'sales_inquiry',
      riskLevel: 'low'
    },
    {
      id: '3',
      callId: '2025-003',
      fileName: 'complaint_call_003.wav',
      duration: '12:45',
      status: 'processing',
      uploadedAt: '2025-08-29 12:00 PM',
      transcript: 'Customer complaint about service quality. Escalation required.',
      sentiment: 'negative',
      intent: 'complaint',
      riskLevel: 'high'
    },
    {
      id: '4',
      callId: '2025-004',
      fileName: 'technical_support_004.m4a',
      duration: '6:20',
      status: 'failed',
      uploadedAt: '2025-08-29 12:30 PM',
      error: 'Audio quality too low for processing'
    }
  ]

  // Filter results based on search and status
  const filteredResults = mockResults.filter(result => {
    const matchesSearch = result.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.callId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 border-green-200'
      case 'processing': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'failed': return 'text-red-600 bg-red-100 border-red-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  // Get sentiment color
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100 border-green-200'
      case 'negative': return 'text-red-600 bg-red-100 border-red-200'
      case 'neutral': return 'text-gray-600 bg-gray-100 border-gray-200'
      default: return 'text-gray-400 bg-gray-50 border-gray-100'
    }
  }

  // Get risk level color
  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-100 border-red-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Results</h1>
            <p className="text-lg text-gray-600">View and analyze call processing results</p>
          </div>
          <div className="mt-4 lg:mt-0 lg:ml-6">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="mr-2">📊</span>
                <span>{filteredResults.length} of {mockResults.length} calls</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">⏱️</span>
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card title="🔍 Search & Filters" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Calls</label>
            <input
              type="text"
              placeholder="Search by file name or call ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
          <div className="lg:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-transparent text-lg"
            >
              <option value="all">All Status</option>
              <option value="completed">✅ Completed</option>
              <option value="processing">⏳ Processing</option>
              <option value="failed">❌ Failed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card title="📋 Call Results" className="bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Call ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sentiment
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((result) => (
                <tr 
                  key={result.id}
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedCall(result)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{result.callId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{result.fileName}</div>
                    <div className="text-xs text-gray-500">Uploaded: {result.uploadedAt}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{result.duration}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(result.status)}`}>
                      {result.status === 'completed' ? '✅' : 
                       result.status === 'processing' ? '⏳' : '❌'} {result.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.sentiment && (
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getSentimentColor(result.sentiment)}`}>
                        {result.sentiment === 'positive' ? '😊' : 
                         result.sentiment === 'negative' ? '😞' : '😐'} {result.sentiment}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.riskLevel && (
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getRiskColor(result.riskLevel)}`}>
                        {result.riskLevel === 'low' ? '🟢' : 
                         result.riskLevel === 'medium' ? '🟡' : '🔴'} {result.riskLevel}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-900 font-medium hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors">
                      👁️ View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Call Details Modal */}
      {selectedCall && (
        <Card title={`📞 Call Details - ${selectedCall.callId}`} className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-900 text-lg mb-4">📁 File Information</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">File Name:</span>
                    <span className="text-gray-900">{selectedCall.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Duration:</span>
                    <span className="text-gray-900">{selectedCall.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Uploaded:</span>
                    <span className="text-gray-900">{selectedCall.uploadedAt}</span>
                  </div>
                  {selectedCall.processedAt && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Processed:</span>
                      <span className="text-gray-900">{selectedCall.processedAt}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-900 text-lg mb-4">📊 Analysis Results</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedCall.status)}`}>
                      {selectedCall.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">Sentiment:</span>
                    {selectedCall.sentiment && (
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getSentimentColor(selectedCall.sentiment)}`}>
                        {selectedCall.sentiment}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Intent:</span>
                    <span className="text-gray-900">{selectedCall.intent || 'N/A'}</span>
                  </div>
                  {selectedCall.riskLevel && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">Risk Level:</span>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getRiskColor(selectedCall.riskLevel)}`}>
                        {selectedCall.riskLevel}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedCall.transcript && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-900 text-lg mb-4">📝 Transcript</h4>
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed">
                  {selectedCall.transcript}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
              <button className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                📥 Download Report
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* No Results */}
      {filteredResults.length === 0 && (
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📋</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No results found</h3>
            <p className="text-lg text-gray-600 mb-6">
              Try adjusting your search terms or filters
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
              }}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              🔄 Clear Filters
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Results
