import React from 'react'
import { Card } from '../components/Shared'

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-lg text-gray-600">Welcome to SignalHub - Your Audio Analysis Platform</p>
          </div>
          <div className="mt-4 lg:mt-0 lg:ml-6">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>System Online</span>
              </div>
              <div>
                Last updated: {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Total Calls</p>
              <p className="text-3xl font-bold text-blue-900">24</p>
              <p className="text-sm text-blue-600 mt-1">+12% from last week</p>
            </div>
            <div className="text-3xl text-blue-400">📞</div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Processed Audio</p>
              <p className="text-3xl font-bold text-green-900">18</p>
              <p className="text-sm text-green-600 mt-1">75% success rate</p>
            </div>
            <div className="text-3xl text-green-400">✅</div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 mb-1">Pending Analysis</p>
              <p className="text-3xl font-bold text-yellow-900">6</p>
              <p className="text-sm text-yellow-600 mt-1">In queue</p>
            </div>
            <div className="text-3xl text-yellow-400">⏳</div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">Total Duration</p>
              <p className="text-3xl font-bold text-purple-900">2.4h</p>
              <p className="text-sm text-purple-600 mt-1">Average: 6min/call</p>
            </div>
            <div className="text-3xl text-purple-400">⏱️</div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card title="Recent Activity" className="h-full">
            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Call #2025-001 processed successfully</p>
                  <p className="text-sm text-gray-500">Transcription and analysis completed</p>
                  <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📤</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">New audio file uploaded</p>
                  <p className="text-sm text-gray-500">customer_support_call_002.wav (8.5MB)</p>
                  <p className="text-xs text-gray-400 mt-1">15 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">⚙️</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Analysis in progress</p>
                  <p className="text-sm text-gray-500">NLP processing for call #2025-003</p>
                  <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">⚠️</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">High risk call detected</p>
                  <p className="text-sm text-gray-500">Call #2025-004 shows escalation risk</p>
                  <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card title="Quick Actions" className="h-full">
            <div className="space-y-4">
              <button className="w-full p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group">
                <div className="text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📤</div>
                  <div className="font-medium text-gray-900 group-hover:text-blue-700">Upload Audio</div>
                  <div className="text-sm text-gray-500 mt-1">Add new audio file</div>
                </div>
              </button>
              
              <button className="w-full p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 group">
                <div className="text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                  <div className="font-medium text-gray-900 group-hover:text-green-700">View Analytics</div>
                  <div className="text-sm text-gray-500 mt-1">Check insights</div>
                </div>
              </button>
              
              <button className="w-full p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 group">
                <div className="text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                  <div className="font-medium text-gray-900 group-hover:text-purple-700">View Results</div>
                  <div className="text-sm text-gray-500 mt-1">See all results</div>
                </div>
              </button>

              <button className="w-full p-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 group">
                <div className="text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
                  <div className="font-medium text-gray-900 group-hover:text-orange-700">Settings</div>
                  <div className="text-sm text-gray-500 mt-1">Configure system</div>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* System Status */}
      <Card title="System Status" className="bg-gray-50 border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Audio Processing</p>
              <p className="text-xs text-gray-500">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">NLP Analysis</p>
              <p className="text-xs text-gray-500">Models loaded and ready</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-500">Connected and responsive</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Dashboard
