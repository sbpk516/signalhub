import React from 'react'

interface NavigationProps {
  activePage: 'dashboard' | 'capture' | 'transcripts' | 'analytics' | 'settings'
  onPageChange: (page: 'dashboard' | 'capture' | 'transcripts' | 'analytics' | 'settings') => void
}

const Navigation: React.FC<NavigationProps> = ({ activePage, onPageChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'capture', label: 'Capture', icon: '🎙️' },
    { id: 'transcripts', label: 'Transcripts', icon: '📄' }
  ]

  return (
    <nav className="flex space-x-8">
      {navItems.map((item) => {
        const isActive = activePage === item.id
        
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id as any)}
            className={`
              flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
              ${isActive
                ? 'text-blue-600 bg-blue-50 border border-blue-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default Navigation
