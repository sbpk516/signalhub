import React from 'react'
import { Logo, Navigation } from './index'

interface HeaderProps {
  activePage?: 'dashboard' | 'upload' | 'results'
  onPageChange?: (page: 'dashboard' | 'upload' | 'results') => void
  onLogoClick?: () => void
  className?: string
}

const Header: React.FC<HeaderProps> = ({
  activePage = 'dashboard',
  onPageChange,
  onLogoClick,
  className = ''
}) => {
  const baseClasses = 'bg-white border-b border-gray-200 px-6 py-4 shadow-sm'
  const headerClasses = `${baseClasses} ${className}`

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center">
          <Logo onClick={onLogoClick} />
        </div>

        {/* Navigation Section */}
        <div className="flex items-center">
          <Navigation 
            activePage={activePage}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </header>
  )
}

export default Header
