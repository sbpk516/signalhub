import { useState } from 'react'
import './App.css'
import { apiClient, apiLogger } from './services/api/client'
import { API_ENDPOINTS } from './types/constants'

function App() {
  const [testResults, setTestResults] = useState<string[]>([])

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testApiClient = async () => {
    addLog('🧪 Starting API client test...')
    
    try {
      // Test 1: Configuration
      addLog(`📋 Base URL: ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}`)
      addLog(`📋 Timeout: 30000ms`)
      
      // Test 2: Health check
      addLog('🔍 Testing health check...')
      const healthResponse = await apiClient.get('/health')
      addLog(`✅ Health check successful: ${JSON.stringify(healthResponse.data)}`)
      
      // Test 3: API health endpoint
      addLog('🔍 Testing API health endpoint...')
      const apiHealthResponse = await apiClient.get(API_ENDPOINTS.HEALTH)
      addLog(`✅ API health successful: ${JSON.stringify(apiHealthResponse.data)}`)
      
      addLog('🎉 All tests passed!')
    } catch (error: any) {
      addLog(`❌ Test failed: ${error.message}`)
      if (error.code === 'ECONNREFUSED') {
        addLog('💡 Backend server may not be running. Please start it with:')
        addLog('   cd backend && python -m uvicorn app.main:app --reload --port 8000')
      }
    }
  }

  const clearLogs = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          SignalHub Frontend - API Client Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            API Client Testing
          </h2>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={testApiClient}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              🧪 Test API Client
            </button>
            
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              🗑️ Clear Logs
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Test Results:</h3>
            <div className="space-y-1">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No test results yet. Click "Test API Client" to start.</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Phase 4 Progress
          </h2>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">Step 1: Create React TypeScript project with Vite</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">Step 2: Configure TypeScript and build tools</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">Step 3: Define TypeScript types</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-gray-700">Step 4: Create API service layer (In Progress)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
              <span className="text-gray-500">Step 5: Build UI components</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
              <span className="text-gray-500">Step 6: Integration and testing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
