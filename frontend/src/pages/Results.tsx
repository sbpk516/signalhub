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
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Get sentiment color
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      case 'neutral': return 'text-gray-600'
      default: return 'text-gray-400'
    }
  }

  // Get risk level color
  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Results</h1>
          <p className="text-gray-600 mt-2">View and analyze call processing results</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredResults.length} of {mockResults.length} calls
        </div>
      </div>

      {/* Search and Filters */}
      <Card title="Search & Filters">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by file name or call ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card title="Call Results">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Call ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sentiment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((result) => (
                <tr 
                  key={result.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCall(result)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.callId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.fileName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.status)}`}>
                      {result.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getSentimentColor(result.sentiment)}>
                      {result.sentiment || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.riskLevel && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(result.riskLevel)}`}>
                        {result.riskLevel}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-900">
                      View Details
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
        <Card title={`Call Details - ${selectedCall.callId}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">File Information</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <div><strong>File Name:</strong> {selectedCall.fileName}</div>
                  <div><strong>Duration:</strong> {selectedCall.duration}</div>
                  <div><strong>Uploaded:</strong> {selectedCall.uploadedAt}</div>
                  {selectedCall.processedAt && (
                    <div><strong>Processed:</strong> {selectedCall.processedAt}</div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Analysis Results</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <div><strong>Status:</strong> 
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCall.status)}`}>
                      {selectedCall.status}
                    </span>
                  </div>
                  <div><strong>Sentiment:</strong> 
                    <span className={`ml-2 ${getSentimentColor(selectedCall.sentiment)}`}>
                      {selectedCall.sentiment || 'N/A'}
                    </span>
                  </div>
                  <div><strong>Intent:</strong> {selectedCall.intent || 'N/A'}</div>
                  {selectedCall.riskLevel && (
                    <div><strong>Risk Level:</strong> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(selectedCall.riskLevel)}`}>
                        {selectedCall.riskLevel}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedCall.transcript && (
              <div>
                <h4 className="font-medium text-gray-900">Transcript</h4>
                <div className="mt-2 p-4 bg-gray-50 rounded-md text-sm text-gray-700">
                  {selectedCall.transcript}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Close
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                Download Report
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* No Results */}
      {filteredResults.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms or filters
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Results
