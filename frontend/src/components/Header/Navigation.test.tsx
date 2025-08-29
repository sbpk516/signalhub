import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Navigation from './Navigation'

describe('Navigation Component', () => {
  test('renders all navigation items', () => {
    render(<Navigation />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Results')).toBeInTheDocument()
  })

  test('renders with icons', () => {
    render(<Navigation />)
    expect(screen.getByText('📊')).toBeInTheDocument()
    expect(screen.getByText('📤')).toBeInTheDocument()
    expect(screen.getByText('📋')).toBeInTheDocument()
  })

  test('shows dashboard as active by default', () => {
    render(<Navigation />)
    const dashboardItem = screen.getByText('Dashboard').closest('div')
    expect(dashboardItem).toHaveClass('bg-blue-100')
  })

  test('shows correct active state when prop is passed', () => {
    render(<Navigation activePage="upload" />)
    const uploadItem = screen.getByText('Upload').closest('div')
    expect(uploadItem).toHaveClass('bg-blue-100')
  })

  test('handles click events', () => {
    const handlePageChange = jest.fn()
    render(<Navigation onPageChange={handlePageChange} />)
    
    fireEvent.click(screen.getByText('Upload'))
    expect(handlePageChange).toHaveBeenCalledWith('upload')
  })

  test('handles keyboard events (Enter key)', () => {
    const handlePageChange = jest.fn()
    render(<Navigation onPageChange={handlePageChange} />)
    
    const uploadItem = screen.getByText('Upload').closest('div')
    fireEvent.keyDown(uploadItem!, { key: 'Enter' })
    expect(handlePageChange).toHaveBeenCalledWith('upload')
  })

  test('handles keyboard events (Space key)', () => {
    const handlePageChange = jest.fn()
    render(<Navigation onPageChange={handlePageChange} />)
    
    const resultsItem = screen.getByText('Results').closest('div')
    fireEvent.keyDown(resultsItem!, { key: ' ' })
    expect(handlePageChange).toHaveBeenCalledWith('results')
  })

  test('applies custom className', () => {
    render(<Navigation className="custom-nav" />)
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('custom-nav')
  })

  test('has proper accessibility attributes', () => {
    render(<Navigation />)
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    
    const items = screen.getAllByRole('button')
    items.forEach(item => {
      expect(item).toHaveAttribute('tabIndex', '0')
    })
  })
})
