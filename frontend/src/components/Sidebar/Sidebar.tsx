import React from 'react'

interface SidebarProps {
  isOpen?: boolean
  onToggle?: () => void
  activeItem?: string
  onItemClick?: (item: string) => void
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onToggle,
  activeItem = 'dashboard',
  onItemClick,
  className = ''
}) => {
  const baseClasses = 'bg-gray-50 border-r border-gray-200 w-64 min-h-screen transition-all duration-300'
  const sidebarClasses = `${baseClasses} ${className} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'help', label: 'Help', icon: '❓' }
  ]

  const handleItemClick = (itemId: string) => {
    onItemClick?.(itemId)
  }

  return (
    <aside className={sidebarClasses}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Toggle sidebar"
            >
              <span className="text-gray-600">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Menu */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = activeItem === item.id
            const itemClasses = `
              flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors duration-200
              ${isActive 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `

            return (
              <li key={item.id}>
                <div
                  className={itemClasses}
                  onClick={() => handleItemClick(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleItemClick(item.id)
                    }
                  }}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
