import React, { useState, useCallback } from 'react'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { Dashboard, Upload } from '../../pages'

const Layout: React.FC = () => {
  console.log('[LAYOUT] Component rendering...')
  
  const [activePage, setActivePage] = useState<'dashboard' | 'upload' | 'results'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleUploadComplete = useCallback(() => {
    console.log('[LAYOUT] Upload completed, switching to dashboard')
    setActivePage('dashboard')
  }, [])

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'upload':
        return <Upload onUploadComplete={handleUploadComplete} />
      case 'results':
        return <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Results Page</h2>
          <p className="text-gray-600">Results functionality coming soon...</p>
        </div>
      default:
        return <Dashboard />
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onPageChange={setActivePage} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activePage={activePage}
          onPageChange={setActivePage}
        />
        <main className="flex-1 p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default Layout
