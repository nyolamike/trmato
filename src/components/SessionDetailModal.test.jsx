import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'

/**
 * Tests for SessionDetailModal (Task 16 / Task 17 / Task 18 in Phase 4).
 *
 * Mocks:
 *   - useAuth so we can flip between guest, student, and teacher users
 *   - useEnrollment so the form's submit/loading/success states are
 *     deterministic without needing a Supabase double
 *
 * Validates:
 *   2.3, 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.9,
 *   4.1, 4.2, 4.5, 4.6,
 *   11.2, 11.11,
 *   16.6
 */

const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseEnrollment = vi.fn()
vi.mock('../hooks/useEnrollment', () => ({
  useEnrollment: (args) => mockUseEnrollment(args),
}))

import { SessionDetailModal } from './SessionDetailModal'

const defaultEnrollment = {
  existingEnrollment: null,
  loading: false,
  submitting: false,
  error: null,
  successMessage: null,
  submit: vi.fn().mockResolvedValue({ ok: true }),
  reset: vi.fn(),
}

const buildSession = (overrides = {}) => ({
  id: 'session-1',
  title: 'Cell Biology Deep Dive',
  subject: 'Biology',
  description: 'A great deep dive into cell biology.',
  scheduled_at: '2030-01-01T10:00:00Z',
  price_ugx: 5000,
  meet_link: 'https://meet.google.com/abc',
  payment_number: '+256700000001',
  payment_name: 'Mary Nakato',
  explainer_video: 'https://example.com/video.mp4',
  video_thumbnail: 'https://example.com/thumb.jpg',
  tags: ['osmosis', 'cell biology'],
  ...overrides,
})

const renderModal = (props = {}) =>
  render(
    <SessionDetailModal
      session={buildSession()}
      isOpen
      onClose={vi.fn()}
      onTagClick={vi.fn()}
      {...props}
    />
  )

const videoUrlArb = fc.webUrl().map((url) => `${url.replace(/\/$/, '')}/video.mp4`)
const posterUrlArb = fc.webUrl().map((url) => `${url.replace(/\/$/, '')}/poster.jpg`)

describe('SessionDetailModal', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseEnrollment.mockReturnValue({ ...defaultEnrollment })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering & lifecycle', () => {
    it('renders nothing when isOpen=false (Req 12.2 lazy load)', () => {
      const { container } = render(
        <SessionDetailModal
          session={buildSession()}
          isOpen={false}
          onClose={vi.fn()}
        />
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('renders nothing when session is null', () => {
      const { container } = render(
        <SessionDetailModal session={null} isOpen onClose={vi.fn()} />
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('exposes the dialog role and modal label', () => {
      renderModal()
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(
        within(dialog).getByRole('heading', { name: /cell biology deep dive/i })
      ).toBeInTheDocument()
    })

    it('renders title, subject, date, price, and description (Req 2.3)', () => {
      renderModal()
      expect(
        screen.getByRole('heading', { name: /cell biology deep dive/i })
      ).toBeInTheDocument()
      expect(screen.getByText('Biology')).toBeInTheDocument()
      // The date is rendered using en-GB formatting → "1 January 2030"
      expect(screen.getByText(/January/)).toBeInTheDocument()
      expect(screen.getByText(/2030/)).toBeInTheDocument()
      // The price label maps to a dedicated <dd>; scope the assertion to it
      // so we don't collide with the same price echoed in payment instructions.
      const priceLabel = screen.getByText(/^price$/i)
      const priceValue = priceLabel.nextElementSibling
      expect(priceValue?.textContent || '').toMatch(/5,?000/)
      expect(
        screen.getByText('A great deep dive into cell biology.')
      ).toBeInTheDocument()
    })

    it('calls onClose when the close (×) button is clicked', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when the user presses Escape', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when the overlay backdrop is clicked', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.click(
        screen.getByRole('button', { name: /close session details/i })
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Payment instructions (Req 3.6 / 4.1)', () => {
    it('shows the mobile money number and account holder name', () => {
      renderModal()
      expect(screen.getByText('+256700000001')).toBeInTheDocument()
      expect(screen.getByText('Mary Nakato')).toBeInTheDocument()
    })
  })

  describe('Video player (Reqs 3.1 / 3.2 / 3.3 / 3.5 / 3.9)', () => {
    it('renders a <video> with autoplay, muted, controls, playsInline, preload=metadata', () => {
      renderModal()
      const video = screen.getByTestId('session-video')
      expect(video.tagName).toBe('VIDEO')
      // Boolean attributes flip to true on the underlying HTMLVideoElement.
      expect(video).toHaveAttribute('autoplay')
      expect(video.muted).toBe(true)
      expect(video).toHaveAttribute('controls')
      expect(video).toHaveAttribute('playsinline')
      expect(video).toHaveAttribute('preload', 'metadata')
      expect(video).toHaveAttribute(
        'src',
        'https://example.com/video.mp4'
      )
      expect(video).toHaveAttribute(
        'poster',
        'https://example.com/thumb.jpg'
      )
    })

    it('does not render a <video> when explainer_video is null (Req 3.6)', () => {
      render(
        <SessionDetailModal
          session={buildSession({ explainer_video: null })}
          isOpen
          onClose={vi.fn()}
        />
      )
      expect(screen.queryByTestId('session-video')).not.toBeInTheDocument()
    })

    it('falls back to a "video unavailable" message on error (Req 3.7 / 11.11)', () => {
      renderModal()
      const video = screen.getByTestId('session-video')
      fireEvent.error(video)
      expect(screen.queryByTestId('session-video')).not.toBeInTheDocument()
      expect(
        screen.getByText(/video unavailable/i)
      ).toBeInTheDocument()
      // Description still renders alongside the fallback
      expect(
        screen.getByText('A great deep dive into cell biology.')
      ).toBeInTheDocument()
    })

    it('Property 9: renders a video element whenever explainer_video is present (Req 3.1)', () => {
      fc.assert(
        fc.property(videoUrlArb, (explainerVideo) => {
          const { unmount } = renderModal({
            session: buildSession({
              explainer_video: explainerVideo,
              video_thumbnail: null,
            }),
          })

          const video = screen.getByTestId('session-video')
          expect(video.tagName).toBe('VIDEO')
          expect(video).toHaveAttribute('src', explainerVideo)
          unmount()
        }),
        { numRuns: 30 }
      )
    })

    it('Property 10: every rendered video is configured for muted autoplay (Req 3.2)', () => {
      fc.assert(
        fc.property(videoUrlArb, posterUrlArb, (explainerVideo, poster) => {
          const { unmount } = renderModal({
            session: buildSession({
              explainer_video: explainerVideo,
              video_thumbnail: poster,
            }),
          })

          const video = screen.getByTestId('session-video')
          expect(video).toHaveAttribute('autoplay')
          expect(video.muted).toBe(true)
          unmount()
        }),
        { numRuns: 30 }
      )
    })

    it('Property 11: poster matches video_thumbnail when both are present (Req 3.3)', () => {
      fc.assert(
        fc.property(videoUrlArb, posterUrlArb, (explainerVideo, poster) => {
          const { unmount } = renderModal({
            session: buildSession({
              explainer_video: explainerVideo,
              video_thumbnail: poster,
            }),
          })

          expect(screen.getByTestId('session-video')).toHaveAttribute(
            'poster',
            poster
          )
          unmount()
        }),
        { numRuns: 30 }
      )
    })

    it('Property 14: no video element is rendered when explainer_video is null (Req 3.6)', () => {
      fc.assert(
        fc.property(posterUrlArb, (poster) => {
          const { unmount } = renderModal({
            session: buildSession({
              explainer_video: null,
              video_thumbnail: poster,
            }),
          })

          expect(screen.queryByTestId('session-video')).not.toBeInTheDocument()
          unmount()
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Tags (Req 16.6 — clickable in modal)', () => {
    it('renders tag pills inside the modal', () => {
      renderModal()
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('#osmosis')).toBeInTheDocument()
      expect(within(dialog).getByText('#cell biology')).toBeInTheDocument()
    })

    it('calls onTagClick with the tag value when a pill is clicked', () => {
      const onTagClick = vi.fn()
      renderModal({ onTagClick })
      fireEvent.click(screen.getByRole('button', { name: '#osmosis' }))
      expect(onTagClick).toHaveBeenCalledWith('osmosis')
    })
  })

  describe('Enrollment gating', () => {
    it('shows a sign-in prompt for unauthenticated visitors', () => {
      mockUseAuth.mockReturnValue({ user: null })
      renderModal()
      expect(screen.getByTestId('enroll-signin-prompt')).toHaveTextContent(
        /sign in as a student/i
      )
      // No enrollment form rendered for guests
      expect(
        screen.queryByLabelText(/payment screenshot/i)
      ).not.toBeInTheDocument()
    })

    it('shows a teacher-account notice for teachers, no enrollment form', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'teacher-1', role: 'teacher' },
      })
      renderModal()
      expect(
        screen.getByText(/signed in as a teacher/i)
      ).toBeInTheDocument()
      expect(
        screen.queryByLabelText(/payment screenshot/i)
      ).not.toBeInTheDocument()
    })

    it('renders the enrollment form for authenticated students', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'student-1', role: 'student' },
      })
      renderModal()
      expect(
        screen.getByLabelText(/payment screenshot/i)
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/payment note/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /submit enrollment/i })
      ).toBeInTheDocument()
    })
  })

  describe('Enrollment form behaviour (Reqs 4.2 / 4.5 / 11.2)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'student-1', role: 'student' },
      })
    })

    it('shows a validation error when neither screenshot nor note is provided', () => {
      const submit = vi.fn()
      mockUseEnrollment.mockReturnValue({ ...defaultEnrollment, submit })

      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /submit enrollment/i }))

      expect(submit).not.toHaveBeenCalled()
      expect(
        screen.getByText(/please provide payment proof/i)
      ).toBeInTheDocument()
    })

    it('submits the form when a note is provided', async () => {
      const submit = vi.fn().mockResolvedValue({ ok: true })
      mockUseEnrollment.mockReturnValue({ ...defaultEnrollment, submit })

      renderModal()
      fireEvent.change(screen.getByLabelText(/payment note/i), {
        target: { value: 'Sent via MTN 14:23' },
      })
      fireEvent.click(
        screen.getByRole('button', { name: /submit enrollment/i })
      )

      await waitFor(() => {
        expect(submit).toHaveBeenCalledTimes(1)
      })
      const callArgs = submit.mock.calls[0][0]
      expect(callArgs.note).toBe('Sent via MTN 14:23')
      expect(callArgs.screenshot).toBeUndefined()
    })

    it('disables the submit button while the hook is submitting', () => {
      mockUseEnrollment.mockReturnValue({
        ...defaultEnrollment,
        submitting: true,
      })
      renderModal()
      const button = screen.getByRole('button', { name: /submitting/i })
      expect(button).toBeDisabled()
    })

    it('surfaces hook-level errors as alert text (Req 11.2)', () => {
      mockUseEnrollment.mockReturnValue({
        ...defaultEnrollment,
        error: 'You are already enrolled in this session',
      })
      renderModal()
      expect(
        screen.getByText(/already enrolled in this session/i)
      ).toBeInTheDocument()
    })

    it('shows the success banner once an enrollment exists (Req 4.6)', () => {
      mockUseEnrollment.mockReturnValue({
        ...defaultEnrollment,
        existingEnrollment: {
          id: 'enr-1',
          payment_status: 'pending',
        },
        successMessage:
          'Payment under review. We will notify you once it is approved.',
      })
      renderModal()
      expect(screen.getByTestId('already-enrolled')).toHaveTextContent(
        /payment under review/i
      )
      expect(
        screen.queryByRole('button', { name: /submit enrollment/i })
      ).not.toBeInTheDocument()
    })

    it('replaces the form with an "already enrolled" notice for prior enrollments', () => {
      mockUseEnrollment.mockReturnValue({
        ...defaultEnrollment,
        existingEnrollment: {
          id: 'enr-1',
          payment_status: 'approved',
        },
      })
      renderModal()
      expect(screen.getByTestId('already-enrolled')).toHaveTextContent(
        /approved/i
      )
    })
  })
})
