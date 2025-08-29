import React from 'react'

interface LogoProps {
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const Logo: React.FC<LogoProps> = ({
  onClick,
  className = '',
  size = 'md'
}) => {
  const baseClasses = 'font-bold text-blue-600 cursor-pointer transition-colors duration-200 hover:text-blue-700'
  
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const logoClasses = `${baseClasses} ${sizeClasses[size]} ${className}`

  return (
    <div 
      className={logoClasses}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <span className="text-blue-600">Signal</span>
      <span className="text-gray-800">Hub</span>
    </div>
  )
}

export default Logo
