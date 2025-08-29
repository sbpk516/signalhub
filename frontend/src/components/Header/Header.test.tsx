import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from './Header'

describe('Header Component', () => {
  test('renders header with logo and navigation', () => {
    render(<Header />)
    
    // Check if logo is rendered
    expect(screen.getByText('Signal')).toBeInTheDocument()
    expect(screen.getByText('Hub')).toBeInTheDocument()
    
    // Check if navigation items are rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Results')).toBeInTheDocument()
  })

  test('renders with correct header structure', () => {
    render(<Header />)
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('bg-white', 'border-b', 'border-gray-200')
  })

  test('handles logo click events', () => {
    const handleLogoClick = jest.fn()
    render(<Header onLogoClick={handleLogoClick} />)
    
    fireEvent.click(screen.getByText('Signal'))
    expect(handleLogoClick).toHaveBeenCalledTimes(1)
  })

  test('handles navigation page changes', () => {
    const handlePageChange = jest.fn()
    render(<Header onPageChange={handlePageChange} />)
    
    fireEvent.click(screen.getByText('Upload'))
    expect(handlePageChange).toHaveBeenCalledWith('upload')
  })

  test('shows correct active page', () => {
    render(<Header activePage="results" />)
    const resultsItem = screen.getByText('Results').closest('div')
    expect(resultsItem).toHaveClass('bg-blue-100')
  })

  test('applies custom className', () => {
    render(<Header className="custom-header" />)
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('custom-header')
  })

  test('has proper layout structure', () => {
    render(<Header />)
    const header = screen.getByRole('banner')
    
    // Check for max-width container
    const container = header.querySelector('.max-w-7xl')
    expect(container).toBeInTheDocument()
    
    // Check for flex layout
    expect(container).toHaveClass('flex', 'items-center', 'justify-between')
  })

  test('renders with default active page (dashboard)', () => {
    render(<Header />)
    const dashboardItem = screen.getByText('Dashboard').closest('div')
    expect(dashboardItem).toHaveClass('bg-blue-100')
  })
})
