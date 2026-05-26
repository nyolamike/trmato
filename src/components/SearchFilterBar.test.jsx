import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SearchFilterBar } from './SearchFilterBar'

/**
 * Unit tests for SearchFilterBar.
 *
 * Validates: Requirements 16.2, 16.5, 16.7, 16.8, 16.9, 16.10, 16.13
 *
 * Filter logic correctness lives in src/utils/sessionFilters.test.js; this
 * file focuses on the controlled-component behavior, debouncing, and the
 * active-filter UI controls.
 */

const defaultProps = () => ({
  searchQuery: '',
  selectedSubject: null,
  selectedTags: [],
  subjects: ['Biology', 'Mathematics', 'Physics'],
  popularTags: ['osmosis', 'algebra', 'cell biology'],
  onSearchChange: vi.fn(),
  onSubjectChange: vi.fn(),
  onTagToggle: vi.fn(),
  onClearFilters: vi.fn(),
})

describe('SearchFilterBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders the search input', () => {
      render(<SearchFilterBar {...defaultProps()} />)
      expect(screen.getByLabelText(/search sessions/i)).toBeInTheDocument()
    })

    it('renders the subject dropdown with all subjects (Req 16.2, 16.13)', () => {
      render(<SearchFilterBar {...defaultProps()} />)
      const select = screen.getByLabelText(/filter by subject/i)
      expect(select).toBeInTheDocument()
      // "All subjects" + 3 subjects
      expect(select.querySelectorAll('option')).toHaveLength(4)
      expect(screen.getByRole('option', { name: /all subjects/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Biology' })).toBeInTheDocument()
    })

    it('hides the subject dropdown when no subjects are available', () => {
      render(<SearchFilterBar {...defaultProps()} subjects={[]} />)
      expect(screen.queryByLabelText(/filter by subject/i)).not.toBeInTheDocument()
    })

    it('renders the popular tags section (Req 16.5)', () => {
      render(<SearchFilterBar {...defaultProps()} />)
      expect(screen.getByText(/popular tags/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '#osmosis' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '#algebra' })).toBeInTheDocument()
    })

    it('hides the popular tags section when none are provided', () => {
      render(<SearchFilterBar {...defaultProps()} popularTags={[]} />)
      expect(screen.queryByText(/popular tags/i)).not.toBeInTheDocument()
    })

    it('marks a popular tag as active (aria-pressed) when selected', () => {
      render(<SearchFilterBar {...defaultProps()} selectedTags={['osmosis']} />)
      const pill = screen.getByRole('button', { name: '#osmosis' })
      expect(pill).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Search debouncing (Req 16.10)', () => {
    it('does NOT call onSearchChange immediately on every keystroke', () => {
      const props = defaultProps()
      render(<SearchFilterBar {...props} />)
      const input = screen.getByLabelText(/search sessions/i)

      fireEvent.change(input, { target: { value: 'o' } })
      fireEvent.change(input, { target: { value: 'os' } })
      fireEvent.change(input, { target: { value: 'osm' } })

      // No debounce window has elapsed yet
      expect(props.onSearchChange).not.toHaveBeenCalled()
    })

    it('calls onSearchChange with the latest value after 300ms', () => {
      const props = defaultProps()
      render(<SearchFilterBar {...props} />)
      const input = screen.getByLabelText(/search sessions/i)

      fireEvent.change(input, { target: { value: 'osmo' } })
      fireEvent.change(input, { target: { value: 'osmosis' } })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(props.onSearchChange).toHaveBeenCalledTimes(1)
      expect(props.onSearchChange).toHaveBeenCalledWith('osmosis')
    })
  })

  describe('Subject filter (Req 16.2)', () => {
    it('calls onSubjectChange with the selected subject', () => {
      const props = defaultProps()
      render(<SearchFilterBar {...props} />)

      fireEvent.change(screen.getByLabelText(/filter by subject/i), {
        target: { value: 'Biology' },
      })

      expect(props.onSubjectChange).toHaveBeenCalledWith('Biology')
    })

    it('calls onSubjectChange with null when "All subjects" is selected', () => {
      const props = defaultProps()
      render(<SearchFilterBar {...props} selectedSubject="Biology" />)

      fireEvent.change(screen.getByLabelText(/filter by subject/i), {
        target: { value: '' },
      })

      expect(props.onSubjectChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Tag pills', () => {
    it('calls onTagToggle when a popular tag pill is clicked', () => {
      const props = defaultProps()
      render(<SearchFilterBar {...props} />)

      fireEvent.click(screen.getByRole('button', { name: '#osmosis' }))

      expect(props.onTagToggle).toHaveBeenCalledWith('osmosis')
    })
  })

  describe('Active filters (Req 16.7, 16.8, 16.9, 16.13)', () => {
    it('does NOT render the active-filters section when no filters are active', () => {
      render(<SearchFilterBar {...defaultProps()} />)
      expect(screen.queryByTestId('active-filters')).not.toBeInTheDocument()
    })

    it('shows a chip for an active search query (Req 16.7)', () => {
      render(<SearchFilterBar {...defaultProps()} searchQuery="osmosis" />)
      const activeFilters = screen.getByTestId('active-filters')
      expect(activeFilters).toBeInTheDocument()
      expect(activeFilters.textContent).toMatch(/Search: "osmosis"/)
    })

    it('shows a chip for an active subject filter (Req 16.7)', () => {
      render(<SearchFilterBar {...defaultProps()} selectedSubject="Physics" />)
      expect(screen.getByText(/Subject: Physics/)).toBeInTheDocument()
    })

    it('shows a chip for each selected tag (Req 16.7)', () => {
      render(
        <SearchFilterBar
          {...defaultProps()}
          selectedTags={['osmosis', 'algebra']}
        />
      )
      // Tag pills render twice (popular tags + active filters); we just confirm both chips exist.
      expect(
        screen.getByRole('button', { name: /Remove tag filter "osmosis"/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Remove tag filter "algebra"/i })
      ).toBeInTheDocument()
    })

    it('clears only the search filter when the search chip × is clicked (Req 16.8)', () => {
      const props = defaultProps()
      render(
        <SearchFilterBar
          {...props}
          searchQuery="osmosis"
          selectedSubject="Biology"
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /clear search filter/i }))

      // We expect an immediate empty-string push, not a debounce-delayed one
      expect(props.onSearchChange).toHaveBeenCalledWith('')
      expect(props.onSubjectChange).not.toHaveBeenCalled()
    })

    it('clears only the subject filter when the subject chip × is clicked (Req 16.8)', () => {
      const props = defaultProps()
      render(
        <SearchFilterBar
          {...props}
          searchQuery="osmosis"
          selectedSubject="Biology"
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /clear subject filter/i }))

      expect(props.onSubjectChange).toHaveBeenCalledWith(null)
      expect(props.onSearchChange).not.toHaveBeenCalled()
    })

    it('toggles a tag off when its chip × is clicked (Req 16.8)', () => {
      const props = defaultProps()
      render(
        <SearchFilterBar {...props} selectedTags={['osmosis']} />
      )

      fireEvent.click(
        screen.getByRole('button', { name: /Remove tag filter "osmosis"/i })
      )

      expect(props.onTagToggle).toHaveBeenCalledWith('osmosis')
    })

    it('calls onClearFilters when "Clear all filters" is clicked (Req 16.9)', () => {
      const props = defaultProps()
      render(
        <SearchFilterBar
          {...props}
          searchQuery="osmosis"
          selectedSubject="Biology"
          selectedTags={['algebra']}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }))

      expect(props.onClearFilters).toHaveBeenCalledTimes(1)
    })

    it('resets the local input value when the parent clears the search externally', () => {
      const props = defaultProps()
      const { rerender } = render(
        <SearchFilterBar {...props} searchQuery="osmosis" />
      )
      const input = screen.getByLabelText(/search sessions/i)
      // Bar should reflect the parent-controlled value on mount
      expect(input.value).toBe('osmosis')

      rerender(<SearchFilterBar {...props} searchQuery="" />)
      expect(input.value).toBe('')
    })
  })
})
