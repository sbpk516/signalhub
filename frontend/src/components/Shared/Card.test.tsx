import React from 'react'
import { render, screen } from '@testing-library/react'
import Card from './Card'

describe('Card Component', () => {
  test('renders card with content', () => {
    render(<Card>Card Content</Card>)
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  test('renders card with title', () => {
    render(<Card title="Test Title">Card Content</Card>)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  test('renders card without title', () => {
    render(<Card>Card Content</Card>)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  test('renders with different padding sizes', () => {
    const { rerender } = render(<Card padding="sm">Small Padding</Card>)
    expect(screen.getByText('Small Padding').closest('div')).toHaveClass('p-3')

    rerender(<Card padding="lg">Large Padding</Card>)
    expect(screen.getByText('Large Padding').closest('div')).toHaveClass('p-8')
  })

  test('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>)
    expect(screen.getByText('Content').closest('div')).toHaveClass('custom-class')
  })
})
