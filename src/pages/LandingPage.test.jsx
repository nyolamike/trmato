import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { LandingPage } from './LandingPage'

/**
 * Tests for LandingPage.
 *
 * Focus: integration of search/filter state with the SessionCard grid.
 *
 * Specifically asserts the state-lift contract that Task 16's Session_Modal
 * relies on (Requirement 16.15 — "filters preserved when a session is
 * opened"):
 *
 *   The search/subject/tag filter state lives in LandingPage and persists
 *   across SessionCard clicks, so when Task 16 mounts the Session_Modal as
 *   a child the filters remain visually applied to the grid behind it.
 */

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}))

const mockRefetch = vi.fn()
const mockUseUpcomingSessions = vi.fn()
vi.mock('../hooks/useUpcomingSessions', () => ({
  useUpcomingSessions: () => mockUseUpcomingSessions(),
}))

const buildSession = (overrides = {}) => ({
  id: 'session-1',
  title: 'Cell Biology Deep Dive',
  subject: 'Biology',
  status: 'upcoming',
  scheduled_at: '2030-01-01T10:00:00Z',
  price_ugx: 5000,
  tags: ['osmosis', 'cell biology'],
  ...overrides,
})

const renderLandingPage = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )

describe('LandingPage — filter state preservation (Req 16.15)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockRefetch.mockReset()
    mockUseUpcomingSessions.mockReturnValue({
      sessions: [
        buildSession({ id: 'session-1', title: 'Cell Biology Deep Dive' }),
        buildSession({
          id: 'session-2',
          title: 'Algebra Crash Course',
          subject: 'Mathematics',
          tags: ['algebra'],
        }),
      ],
      loading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the search query applied after a SessionCard is clicked', () => {
    renderLandingPage()

    // Apply a search filter and flush the debounce window
    const search = screen.getByLabelText(/search sessions/i)
    fireEvent.change(search, { target: { value: 'cell' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Only the matching session is visible
    expect(screen.getByText('Cell Biology Deep Dive')).toBeInTheDocument()
    expect(screen.queryByText('Algebra Crash Course')).not.toBeInTheDocument()

    // Simulate the Session_Modal trigger (Task 16) by clicking the card
    fireEvent.click(screen.getByText('Cell Biology Deep Dive'))

    // Filter state must remain applied — the grid still only shows the match
    expect(search.value).toBe('cell')
    expect(screen.getByText('Cell Biology Deep Dive')).toBeInTheDocument()
    expect(screen.queryByText('Algebra Crash Course')).not.toBeInTheDocument()
  })

  it('keeps the subject filter applied after a SessionCard is clicked', () => {
    renderLandingPage()

    const subjectSelect = screen.getByLabelText(/filter by subject/i)
    fireEvent.change(subjectSelect, { target: { value: 'Biology' } })

    // Subject chip and filtered list reflect the choice
    expect(screen.getByText(/Subject: Biology/)).toBeInTheDocument()
    expect(screen.getByText('Cell Biology Deep Dive')).toBeInTheDocument()
    expect(screen.queryByText('Algebra Crash Course')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Cell Biology Deep Dive'))

    // Subject filter survives the click
    expect(subjectSelect.value).toBe('Biology')
    expect(screen.getByText(/Subject: Biology/)).toBeInTheDocument()
    expect(screen.queryByText('Algebra Crash Course')).not.toBeInTheDocument()
  })

  it('keeps selected tag filters applied after a SessionCard is clicked', () => {
    renderLandingPage()

    // Activate a popular-tag pill (Popular tags section, not a card's tag)
    const popularTagsRegion = screen.getByText(/popular tags/i).closest('div')
    expect(popularTagsRegion).not.toBeNull()

    const osmosisPill = within(popularTagsRegion).getByRole('button', {
      name: '#osmosis',
    })
    fireEvent.click(osmosisPill)

    // Only the session tagged "osmosis" remains
    expect(screen.getByText('Cell Biology Deep Dive')).toBeInTheDocument()
    expect(screen.queryByText('Algebra Crash Course')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Cell Biology Deep Dive'))

    // Tag filter still applied after the click
    expect(screen.getByText('Cell Biology Deep Dive')).toBeInTheDocument()
    expect(screen.queryByText('Algebra Crash Course')).not.toBeInTheDocument()
    expect(
      within(popularTagsRegion).getByRole('button', { name: '#osmosis' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks the clicked SessionCard as aria-current on the host <li>', () => {
    renderLandingPage()

    const card = screen.getByText('Cell Biology Deep Dive')
    const hostLi = card.closest('li')
    expect(hostLi).not.toBeNull()
    expect(hostLi).not.toHaveAttribute('aria-current')

    fireEvent.click(card)

    expect(hostLi).toHaveAttribute('aria-current', 'true')
  })
})
