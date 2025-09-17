import React from 'react'
import { Card } from '../components/Shared'

const Analytics: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Advanced insights and charts (coming soon)</p>
      </div>

      <Card title="Summary">
        <div className="text-sm text-gray-600">No analytics implemented yet.</div>
      </Card>
    </div>
  )
}

export default Analytics

