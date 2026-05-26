import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TagInput } from './TagInput'

describe('TagInput', () => {
  it('shows the requirement-matching validation message for empty tags', () => {
    render(<TagInput tags={[]} onChange={vi.fn()} />)

    fireEvent.keyDown(screen.getByLabelText(/tags/i), { key: 'Enter' })

    expect(screen.getByText('Tags must be 1-50 characters')).toBeInTheDocument()
  })

  it('shows a duplicate-tag message instead of silently ignoring the input', () => {
    render(<TagInput tags={['osmosis']} onChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: 'osmosis' },
    })
    fireEvent.keyDown(screen.getByLabelText(/tags/i), { key: 'Enter' })

    expect(screen.getByText('Tag already added')).toBeInTheDocument()
  })
})
