import React from 'react'
import { Card } from '../components/Shared'

const Settings: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure system preferences (coming soon)</p>
      </div>

      <Card title="Preferences">
        <div className="text-sm text-gray-600">No settings implemented yet.</div>
      </Card>
    </div>
  )
}

export default Settings

