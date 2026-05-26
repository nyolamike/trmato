import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagPill } from './TagPill'

/**
 * Unit tests for TagPill.
 *
 * Validates: Requirements 15.10, 16.14
 *
 * Covers:
 * - All three variants ('default' | 'active' | 'removable')
 * - Click handler firing with the tag value
 * - Remove handler firing with the tag value (removable)
 * - Stop-propagation when nested inside a clickable surface
 * - Size class mapping ('small' | 'medium' | 'responsive')
 */

describe('TagPill', () => {
  describe('Rendering', () => {
    it('renders nothing when tag is missing', () => {
      const { container } = render(<TagPill tag="" />)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders the tag prefixed with # by default', () => {
      render(<TagPill tag="osmosis" />)
      expect(screen.getByText('#osmosis')).toBeInTheDocument()
    })

    it('renders a button for variant="default"', () => {
      render(<TagPill tag="osmosis" variant="default" />)
      const pill = screen.getByRole('button', { name: '#osmosis' })
      expect(pill).toBeInTheDocument()
      expect(pill.tagName).toBe('BUTTON')
      expect(pill).toHaveAttribute('aria-pressed', 'false')
      expect(pill).toHaveAttribute('data-variant', 'default')
    })

    it('renders a button with aria-pressed="true" for variant="active"', () => {
      render(<TagPill tag="osmosis" variant="active" />)
      const pill = screen.getByRole('button', { name: '#osmosis' })
      expect(pill).toHaveAttribute('aria-pressed', 'true')
      expect(pill).toHaveAttribute('data-variant', 'active')
    })

    it('renders a non-button body with an inner × button for variant="removable"', () => {
      render(<TagPill tag="osmosis" variant="removable" />)

      // The pill body itself is a <span>, not a button
      const body = screen.getByTestId('tag-pill')
      expect(body.tagName).toBe('SPAN')
      expect(body).toHaveAttribute('data-variant', 'removable')

      // The × button is the only role=button in the pill
      const removeButton = screen.getByRole('button', {
        name: /Remove tag "osmosis"/i,
      })
      expect(removeButton).toBeInTheDocument()
    })
  })

  describe('Click behavior', () => {
    it('calls onClick with the tag for variant="default"', () => {
      const onClick = vi.fn()
      render(<TagPill tag="osmosis" onClick={onClick} />)

      fireEvent.click(screen.getByRole('button', { name: '#osmosis' }))

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith('osmosis')
    })

    it('calls onClick with the tag for variant="active"', () => {
      const onClick = vi.fn()
      render(<TagPill tag="algebra" variant="active" onClick={onClick} />)

      fireEvent.click(screen.getByRole('button', { name: '#algebra' }))

      expect(onClick).toHaveBeenCalledWith('algebra')
    })

    it('does not throw when onClick is not provided', () => {
      render(<TagPill tag="osmosis" />)
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: '#osmosis' }))
      ).not.toThrow()
    })

    it('stops click propagation so it can be safely nested in a clickable parent', () => {
      const onClick = vi.fn()
      const onParentClick = vi.fn()

      render(
        <div onClick={onParentClick}>
          <TagPill tag="osmosis" onClick={onClick} />
        </div>
      )

      fireEvent.click(screen.getByRole('button', { name: '#osmosis' }))

      expect(onClick).toHaveBeenCalledWith('osmosis')
      expect(onParentClick).not.toHaveBeenCalled()
    })
  })

  describe('Remove behavior (variant="removable")', () => {
    it('calls onRemove with the tag when × is clicked', () => {
      const onRemove = vi.fn()
      render(<TagPill tag="osmosis" variant="removable" onRemove={onRemove} />)

      fireEvent.click(
        screen.getByRole('button', { name: /Remove tag "osmosis"/i })
      )

      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onRemove).toHaveBeenCalledWith('osmosis')
    })

    it('uses the provided removeAriaLabel when given', () => {
      render(
        <TagPill
          tag="osmosis"
          variant="removable"
          removeAriaLabel='Remove tag filter "osmosis"'
        />
      )

      expect(
        screen.getByRole('button', { name: /Remove tag filter "osmosis"/i })
      ).toBeInTheDocument()
    })

    it('stops propagation so removing inside a clickable parent does not trigger it', () => {
      const onRemove = vi.fn()
      const onParentClick = vi.fn()

      render(
        <div onClick={onParentClick}>
          <TagPill
            tag="osmosis"
            variant="removable"
            onRemove={onRemove}
          />
        </div>
      )

      fireEvent.click(
        screen.getByRole('button', { name: /Remove tag "osmosis"/i })
      )

      expect(onRemove).toHaveBeenCalledWith('osmosis')
      expect(onParentClick).not.toHaveBeenCalled()
    })

    it('does not throw when onRemove is not provided', () => {
      render(<TagPill tag="osmosis" variant="removable" />)
      expect(() =>
        fireEvent.click(
          screen.getByRole('button', { name: /Remove tag "osmosis"/i })
        )
      ).not.toThrow()
    })
  })

  describe('Sizing', () => {
    it('applies small classes when size="small"', () => {
      render(<TagPill tag="osmosis" size="small" />)
      const pill = screen.getByTestId('tag-pill')
      expect(pill.className).toMatch(/\btext-xs\b/)
      expect(pill.className).not.toMatch(/\bsm:text-sm\b/)
    })

    it('applies medium classes when size="medium"', () => {
      render(<TagPill tag="osmosis" size="medium" />)
      const pill = screen.getByTestId('tag-pill')
      expect(pill.className).toMatch(/\btext-sm\b/)
      expect(pill.className).not.toMatch(/\btext-xs\b/)
    })

    it('applies responsive classes by default (small on mobile, medium on desktop)', () => {
      render(<TagPill tag="osmosis" />)
      const pill = screen.getByTestId('tag-pill')
      expect(pill.className).toMatch(/\btext-xs\b/)
      expect(pill.className).toMatch(/\bsm:text-sm\b/)
    })
  })
})
