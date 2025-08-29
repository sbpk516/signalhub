import React from 'react'
import { Card } from '../components/Shared'

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to SignalHub - Your Audio Analysis Platform</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Calls" className="bg-blue-50 border-blue-200">
          <div className="text-3xl font-bold text-blue-600">24</div>
          <div className="text-sm text-blue-500">+12% from last week</div>
        </Card>
        
        <Card title="Processed Audio" className="bg-green-50 border-green-200">
          <div className="text-3xl font-bold text-green-600">18</div>
          <div className="text-sm text-green-500">75% success rate</div>
        </Card>
        
        <Card title="Pending Analysis" className="bg-yellow-50 border-yellow-200">
          <div className="text-3xl font-bold text-yellow-600">6</div>
          <div className="text-sm text-yellow-500">In queue</div>
        </Card>
        
        <Card title="Total Duration" className="bg-purple-50 border-purple-200">
          <div className="text-3xl font-bold text-purple-600">2.4h</div>
          <div className="text-sm text-purple-500">Average: 6min/call</div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card title="Recent Activity">
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <div className="font-medium">Call #2025-001 processed successfully</div>
              <div className="text-sm text-gray-500">2 minutes ago</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <div className="font-medium">New audio file uploaded</div>
              <div className="text-sm text-gray-500">15 minutes ago</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div className="flex-1">
              <div className="font-medium">Analysis in progress</div>
              <div className="text-sm text-gray-500">1 hour ago</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-2">📤</div>
              <div className="font-medium">Upload Audio</div>
              <div className="text-sm text-gray-500">Add new audio file</div>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">View Analytics</div>
              <div className="text-sm text-gray-500">Check insights</div>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium">View Results</div>
              <div className="text-sm text-gray-500">See all results</div>
            </div>
          </button>
        </div>
      </Card>
    </div>
  )
}

export default Dashboard
