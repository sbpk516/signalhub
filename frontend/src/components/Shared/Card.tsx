import React from 'react'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  padding = 'md'
}) => {
  // Base card classes
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200'
  
  // Padding classes
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const cardClasses = `${baseClasses} ${paddingClasses[padding]} ${className}`

  return (
    <div className={cardClasses}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  )
}

export default Card
