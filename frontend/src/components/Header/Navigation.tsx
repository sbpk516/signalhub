import React from 'react'

interface NavigationProps {
  activePage?: 'dashboard' | 'upload' | 'results'
  onPageChange?: (page: 'dashboard' | 'upload' | 'results') => void
  className?: string
}

const Navigation: React.FC<NavigationProps> = ({
  activePage = 'dashboard',
  onPageChange,
  className = ''
}) => {
  const baseClasses = 'flex items-center space-x-6'
  const navClasses = `${baseClasses} ${className}`

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'results', label: 'Results', icon: '📋' }
  ] as const

  const handleClick = (page: 'dashboard' | 'upload' | 'results') => {
    onPageChange?.(page)
  }

  return (
    <nav className={navClasses}>
      {menuItems.map((item) => {
        const isActive = activePage === item.id
        const itemClasses = `
          flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors duration-200
          ${isActive 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }
        `

        return (
          <div
            key={item.id}
            className={itemClasses}
            onClick={() => handleClick(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(item.id)
              }
            }}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        )
      })}
    </nav>
  )
}

export default Navigation
