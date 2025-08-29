import React, { useState } from 'react'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'

interface LayoutProps {
  children: React.ReactNode
  className?: string
}

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState<'dashboard' | 'upload' | 'results'>('dashboard')
  const [activeSidebarItem, setActiveSidebarItem] = useState('dashboard')

  const handlePageChange = (page: 'dashboard' | 'upload' | 'results') => {
    setActivePage(page)
  }

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSidebarItemClick = (item: string) => {
    setActiveSidebarItem(item)
  }

  const handleLogoClick = () => {
    setActivePage('dashboard')
    setActiveSidebarItem('dashboard')
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <Header 
        activePage={activePage}
        onPageChange={handlePageChange}
        onLogoClick={handleLogoClick}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
          activeItem={activeSidebarItem}
          onItemClick={handleSidebarItemClick}
        />

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
