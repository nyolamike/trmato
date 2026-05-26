import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowingComponent = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>Healthy tree</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Healthy tree')).toBeInTheDocument()
  })

  it('shows a fallback message when a descendant throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText('Please refresh the page and try again.')
    ).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
