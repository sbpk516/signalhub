import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Test Button</Button>)
    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })

  test('renders with primary variant by default', () => {
    render(<Button>Primary Button</Button>)
    const button = screen.getByText('Primary Button')
    expect(button).toHaveClass('bg-blue-600')
  })

  test('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>)
    const button = screen.getByText('Secondary Button')
    expect(button).toHaveClass('bg-gray-600')
  })

  test('renders with danger variant', () => {
    render(<Button variant="danger">Danger Button</Button>)
    const button = screen.getByText('Danger Button')
    expect(button).toHaveClass('bg-red-600')
  })

  test('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Clickable Button</Button>)
    
    fireEvent.click(screen.getByText('Clickable Button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('renders disabled state', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByText('Disabled Button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
  })

  test('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small Button</Button>)
    expect(screen.getByText('Small Button')).toHaveClass('px-3 py-1.5')

    rerender(<Button size="lg">Large Button</Button>)
    expect(screen.getByText('Large Button')).toHaveClass('px-6 py-3')
  })
})
