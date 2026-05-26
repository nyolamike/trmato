import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionCard } from './SessionCard'

/**
 * Unit tests for SessionCard component
 *
 * Validates: Requirements 2.2, 15.10
 *
 * Test coverage:
 * - All required fields displayed (title, subject, scheduled date, price)
 * - Click handler opens modal (onClick callback fires with session)
 * - Tag pills are rendered
 */

const baseSession = {
  id: 'session-1',
  title: 'Osmosis Deep Dive',
  subject: 'Biology',
  scheduled_at: '2026-06-15T14:00:00.000Z',
  price_ugx: 5000,
  tags: ['osmosis', 'cell biology'],
}

describe('SessionCard', () => {
  describe('Rendering required fields (Requirement 2.2)', () => {
    it('renders the session title', () => {
      render(<SessionCard session={baseSession} />)
      expect(
        screen.getByRole('heading', { name: /osmosis deep dive/i })
      ).toBeInTheDocument()
    })

    it('renders the subject', () => {
      render(<SessionCard session={baseSession} />)
      expect(screen.getByText('Biology')).toBeInTheDocument()
    })

    it('renders the scheduled date', () => {
      render(<SessionCard session={baseSession} />)
      // The card uses Intl.DateTimeFormat('en-GB', ...) which formats the
      // June 15, 2026 date with "Jun" as the short month name.
      const whenLabel = screen.getByText(/^when$/i)
      const whenValue = whenLabel.nextElementSibling
      expect(whenValue).toBeTruthy()
      expect(whenValue.textContent).toMatch(/Jun/)
      expect(whenValue.textContent).toMatch(/2026/)
    })

    it('renders the price formatted as UGX', () => {
      render(<SessionCard session={baseSession} />)
      const priceLabel = screen.getByText(/^price$/i)
      const priceValue = priceLabel.nextElementSibling
      expect(priceValue).toBeTruthy()
      expect(priceValue.textContent).toMatch(/UGX|USh/)
      expect(priceValue.textContent).toMatch(/5,?000/)
    })

    it('shows "Free" when price is zero', () => {
      render(<SessionCard session={{ ...baseSession, price_ugx: 0 }} />)
      expect(screen.getByText(/^free$/i)).toBeInTheDocument()
    })

    it('shows "Date TBD" when scheduled_at is missing', () => {
      render(<SessionCard session={{ ...baseSession, scheduled_at: null }} />)
      expect(screen.getByText(/date tbd/i)).toBeInTheDocument()
    })

    it('falls back to "General" when subject is missing', () => {
      render(<SessionCard session={{ ...baseSession, subject: '' }} />)
      expect(screen.getByText('General')).toBeInTheDocument()
    })

    it('returns null when no session is provided', () => {
      const { container } = render(<SessionCard session={null} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('Click behavior (Requirement 2.3 — opens Session_Modal)', () => {
    it('calls onClick with the session when the card is clicked', () => {
      const onClick = vi.fn()
      render(<SessionCard session={baseSession} onClick={onClick} />)

      fireEvent.click(screen.getByRole('button', { name: /osmosis deep dive/i }))

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(baseSession)
    })

    it('activates on Enter key for keyboard users', () => {
      const onClick = vi.fn()
      render(<SessionCard session={baseSession} onClick={onClick} />)

      fireEvent.keyDown(
        screen.getByRole('button', { name: /osmosis deep dive/i }),
        { key: 'Enter' }
      )

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(baseSession)
    })

    it('activates on Space key for keyboard users', () => {
      const onClick = vi.fn()
      render(<SessionCard session={baseSession} onClick={onClick} />)

      fireEvent.keyDown(
        screen.getByRole('button', { name: /osmosis deep dive/i }),
        { key: ' ' }
      )

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not throw when onClick is not provided', () => {
      render(<SessionCard session={baseSession} />)
      expect(() =>
        fireEvent.click(
          screen.getByRole('button', { name: /osmosis deep dive/i })
        )
      ).not.toThrow()
    })
  })

  describe('Tag pills (Requirement 15.10)', () => {
    it('renders a pill for each tag', () => {
      render(<SessionCard session={baseSession} />)

      expect(screen.getByText('#osmosis')).toBeInTheDocument()
      expect(screen.getByText('#cell biology')).toBeInTheDocument()
    })

    it('renders tag pills as buttons (clickable)', () => {
      render(<SessionCard session={baseSession} />)
      const osmosisPill = screen.getByRole('button', { name: '#osmosis' })
      expect(osmosisPill).toBeInTheDocument()
      expect(osmosisPill.tagName).toBe('BUTTON')
    })

    it('calls onTagClick with the tag value when a pill is clicked', () => {
      const onTagClick = vi.fn()
      const onClick = vi.fn()
      render(
        <SessionCard
          session={baseSession}
          onClick={onClick}
          onTagClick={onTagClick}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: '#osmosis' }))

      expect(onTagClick).toHaveBeenCalledWith('osmosis')
    })

    it('stops propagation so clicking a tag does not trigger the card onClick', () => {
      const onTagClick = vi.fn()
      const onClick = vi.fn()
      render(
        <SessionCard
          session={baseSession}
          onClick={onClick}
          onTagClick={onTagClick}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: '#osmosis' }))

      expect(onTagClick).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('does not render the tags list when there are no tags', () => {
      render(<SessionCard session={{ ...baseSession, tags: [] }} />)
      expect(screen.queryByLabelText(/session tags/i)).not.toBeInTheDocument()
    })

    it('handles a missing tags property safely', () => {
      const sessionWithoutTags = { ...baseSession }
      delete sessionWithoutTags.tags
      expect(() =>
        render(<SessionCard session={sessionWithoutTags} />)
      ).not.toThrow()
      expect(screen.queryByLabelText(/session tags/i)).not.toBeInTheDocument()
    })
  })
})
