import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Logo from './Logo'

describe('Logo Component', () => {
  test('renders logo with default text', () => {
    render(<Logo />)
    expect(screen.getByText('Signal')).toBeInTheDocument()
    expect(screen.getByText('Hub')).toBeInTheDocument()
  })

  test('renders with small size', () => {
    render(<Logo size="sm" />)
    const logo = screen.getByText('Signal').closest('div')
    expect(logo).toHaveClass('text-lg')
  })

  test('renders with medium size (default)', () => {
    render(<Logo size="md" />)
    const logo = screen.getByText('Signal').closest('div')
    expect(logo).toHaveClass('text-xl')
  })

  test('renders with large size', () => {
    render(<Logo size="lg" />)
    const logo = screen.getByText('Signal').closest('div')
    expect(logo).toHaveClass('text-2xl')
  })

  test('handles click events', () => {
    const handleClick = jest.fn()
    render(<Logo onClick={handleClick} />)
    
    fireEvent.click(screen.getByText('Signal'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('handles keyboard events (Enter key)', () => {
    const handleClick = jest.fn()
    render(<Logo onClick={handleClick} />)
    
    const logo = screen.getByText('Signal').closest('div')
    fireEvent.keyDown(logo!, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('handles keyboard events (Space key)', () => {
    const handleClick = jest.fn()
    render(<Logo onClick={handleClick} />)
    
    const logo = screen.getByText('Signal').closest('div')
    fireEvent.keyDown(logo!, { key: ' ' })
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('applies custom className', () => {
    render(<Logo className="custom-class" />)
    const logo = screen.getByText('Signal').closest('div')
    expect(logo).toHaveClass('custom-class')
  })

  test('has proper accessibility attributes', () => {
    render(<Logo />)
    const logo = screen.getByText('Signal').closest('div')
    expect(logo).toHaveAttribute('role', 'button')
    expect(logo).toHaveAttribute('tabIndex', '0')
  })
})
