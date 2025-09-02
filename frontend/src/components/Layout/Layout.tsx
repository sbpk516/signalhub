import React, { useState, useCallback } from 'react'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { Dashboard, Upload, Results } from '../../pages'

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState<'dashboard' | 'upload' | 'results'>('dashboard')

  // Handle upload completion - switch to results page
  const handleUploadComplete = useCallback(() => {
    console.log('[LAYOUT] Upload completed, switching to results page')
    setActivePage('results')
  }, [])

  // Handle page navigation
  const handlePageChange = useCallback((page: 'dashboard' | 'upload' | 'results') => {
    console.log('[LAYOUT] Switching to page:', page)
    setActivePage(page)
  }, [])

  // Render the active page content
  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'upload':
        return <Upload onUploadComplete={handleUploadComplete} />
      case 'results':
        return <Results />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        activePage={activePage} 
        onPageChange={handlePageChange}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activePage={activePage}
          onPageChange={handlePageChange}
        />
        
        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          {renderPageContent()}
        </main>
      </div>
    </div>
  )
}

export default Layout
