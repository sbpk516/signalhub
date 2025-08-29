import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from './Sidebar'

describe('Sidebar Component', () => {
  test('renders sidebar with all menu items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Help')).toBeInTheDocument()
  })

  test('renders sidebar with icons', () => {
    render(<Sidebar />)
    expect(screen.getByText('📊')).toBeInTheDocument()
    expect(screen.getByText('📈')).toBeInTheDocument()
    expect(screen.getByText('⚙️')).toBeInTheDocument()
    expect(screen.getByText('❓')).toBeInTheDocument()
  })

  test('renders sidebar header with title', () => {
    render(<Sidebar />)
    expect(screen.getByText('Menu')).toBeInTheDocument()
  })

  test('shows dashboard as active by default', () => {
    render(<Sidebar />)
    const dashboardItem = screen.getByText('Dashboard').closest('div')
    expect(dashboardItem).toHaveClass('bg-blue-100')
  })

  test('shows correct active state when prop is passed', () => {
    render(<Sidebar activeItem="settings" />)
    const settingsItem = screen.getByText('Settings').closest('div')
    expect(settingsItem).toHaveClass('bg-blue-100')
  })

  test('handles item click events', () => {
    const handleItemClick = jest.fn()
    render(<Sidebar onItemClick={handleItemClick} />)
    
    fireEvent.click(screen.getByText('Analytics'))
    expect(handleItemClick).toHaveBeenCalledWith('analytics')
  })

  test('handles keyboard events (Enter key)', () => {
    const handleItemClick = jest.fn()
    render(<Sidebar onItemClick={handleItemClick} />)
    
    const settingsItem = screen.getByText('Settings').closest('div')
    fireEvent.keyDown(settingsItem!, { key: 'Enter' })
    expect(handleItemClick).toHaveBeenCalledWith('settings')
  })

  test('handles keyboard events (Space key)', () => {
    const handleItemClick = jest.fn()
    render(<Sidebar onItemClick={handleItemClick} />)
    
    const helpItem = screen.getByText('Help').closest('div')
    fireEvent.keyDown(helpItem!, { key: ' ' })
    expect(handleItemClick).toHaveBeenCalledWith('help')
  })

  test('renders toggle button when onToggle is provided', () => {
    const handleToggle = jest.fn()
    render(<Sidebar onToggle={handleToggle} />)
    
    const toggleButton = screen.getByLabelText('Toggle sidebar')
    expect(toggleButton).toBeInTheDocument()
  })

  test('handles toggle button click', () => {
    const handleToggle = jest.fn()
    render(<Sidebar onToggle={handleToggle} />)
    
    const toggleButton = screen.getByLabelText('Toggle sidebar')
    fireEvent.click(toggleButton)
    expect(handleToggle).toHaveBeenCalledTimes(1)
  })

  test('applies open/closed classes correctly', () => {
    const { rerender } = render(<Sidebar isOpen={true} />)
    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('translate-x-0')

    rerender(<Sidebar isOpen={false} />)
    expect(sidebar).toHaveClass('-translate-x-full')
  })

  test('applies custom className', () => {
    render(<Sidebar className="custom-sidebar" />)
    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('custom-sidebar')
  })

  test('has proper accessibility attributes', () => {
    render(<Sidebar />)
    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toBeInTheDocument()
    
    const items = screen.getAllByRole('button')
    items.forEach(item => {
      expect(item).toHaveAttribute('tabIndex', '0')
    })
  })
})
