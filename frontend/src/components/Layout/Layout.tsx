import React, { useState, useCallback } from 'react'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { Dashboard, Capture, Transcripts, Analytics, Settings } from '../../pages'

const Layout: React.FC = () => {
  console.log('[LAYOUT] Component rendering...')
  
  const [activePage, setActivePage] = useState<'dashboard' | 'capture' | 'transcripts' | 'analytics' | 'settings'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleUploadComplete = useCallback(() => {
    console.log('[LAYOUT] Capture completed, switching to dashboard')
    setActivePage('dashboard')
  }, [])

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} />
      case 'capture':
        return <Capture onUploadComplete={handleUploadComplete} onNavigate={setActivePage} />
      case 'transcripts':
        return <Transcripts />
      case 'analytics':
        return <Analytics />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage={activePage} onPageChange={setActivePage} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
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
