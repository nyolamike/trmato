import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { StudentDashboard } from './StudentDashboard'

const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockRefetchEnrollments = vi.fn()
const mockUseStudentEnrollments = vi.fn()
vi.mock('../hooks/useStudentEnrollments', () => ({
  useStudentEnrollments: () => mockUseStudentEnrollments(),
}))

const mockRefetchTopicRequests = vi.fn()
const mockUseStudentTopicRequests = vi.fn()
vi.mock('../hooks/useStudentTopicRequests', () => ({
  useStudentTopicRequests: () => mockUseStudentTopicRequests(),
}))

const buildEnrollment = (overrides = {}) => ({
  id: 'enrollment-1',
  payment_status: 'approved',
  session: {
    id: 'session-1',
    title: 'Cell Biology Deep Dive',
    subject: 'Biology',
    scheduled_at: '2030-01-01T10:00:00Z',
    price_ugx: 5000,
    status: 'upcoming',
    meet_link: 'https://meet.google.com/abc-defg-hij',
  },
  ...overrides,
})

const buildTopicRequest = (overrides = {}) => ({
  id: 'request-1',
  student_id: 'student-1',
  subject: 'Physics',
  topic: "Newton's laws made easy",
  description: 'Please focus on action-reaction examples.',
  status: 'approved',
  vote_count: 3,
  created_at: '2030-01-01T10:00:00Z',
  approved_session_id: 'session-99',
  approved_session_title: 'Newton Laws Workshop',
  rejection_reason: null,
  ...overrides,
})

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <StudentDashboard />
    </MemoryRouter>
  )

describe('StudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      user: { id: 'student-1', username: 'alice', role: 'student' },
      signOut: mockSignOut,
    })

    mockUseStudentEnrollments.mockReturnValue({
      enrollments: [buildEnrollment()],
      loading: false,
      error: null,
      refetch: mockRefetchEnrollments,
    })

    mockUseStudentTopicRequests.mockReturnValue({
      topicRequests: [buildTopicRequest()],
      loading: false,
      error: null,
      refetch: mockRefetchTopicRequests,
    })
  })

  it('renders enrollments and shows the meet link only for approved enrollments', () => {
    mockUseStudentEnrollments.mockReturnValue({
      enrollments: [
        buildEnrollment({
          id: 'approved',
          payment_status: 'approved',
          session: {
            ...buildEnrollment().session,
            title: 'Approved Session',
            meet_link: 'https://meet.google.com/approved-link',
          },
        }),
        buildEnrollment({
          id: 'pending',
          payment_status: 'pending',
          session: {
            ...buildEnrollment().session,
            id: 'session-2',
            title: 'Pending Session',
            meet_link: 'https://meet.google.com/not-visible',
          },
        }),
      ],
      loading: false,
      error: null,
      refetch: mockRefetchEnrollments,
    })

    renderDashboard()

    expect(screen.getByText('Approved Session')).toBeInTheDocument()
    expect(screen.getByText('Pending Session')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /join your session/i })
    ).toHaveAttribute('href', 'https://meet.google.com/approved-link')
    expect(
      screen.getByText(/this link becomes available after your payment is approved/i)
    ).toBeInTheDocument()
  })

  it('filters between upcoming and past enrollments', () => {
    mockUseStudentEnrollments.mockReturnValue({
      enrollments: [
        buildEnrollment({
          id: 'upcoming',
          session: {
            ...buildEnrollment().session,
            title: 'Future Session',
            scheduled_at: '2030-01-01T10:00:00Z',
            status: 'upcoming',
          },
        }),
        buildEnrollment({
          id: 'past',
          session: {
            ...buildEnrollment().session,
            id: 'session-past',
            title: 'Past Session',
            scheduled_at: '2020-01-01T10:00:00Z',
            status: 'completed',
          },
        }),
      ],
      loading: false,
      error: null,
      refetch: mockRefetchEnrollments,
    })

    renderDashboard()

    expect(screen.getByText('Future Session')).toBeInTheDocument()
    expect(screen.queryByText('Past Session')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /past \(1\)/i }))

    expect(screen.getByText('Past Session')).toBeInTheDocument()
    expect(screen.queryByText('Future Session')).not.toBeInTheDocument()
  })

  it('paginates enrollments 20 per page', () => {
    const enrollments = Array.from({ length: 21 }, (_, index) =>
      buildEnrollment({
        id: `enrollment-${index + 1}`,
        session: {
          ...buildEnrollment().session,
          id: `session-${index + 1}`,
          title: `Session ${index + 1}`,
          scheduled_at: `2030-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
        },
      })
    )

    mockUseStudentEnrollments.mockReturnValue({
      enrollments,
      loading: false,
      error: null,
      refetch: mockRefetchEnrollments,
    })

    renderDashboard()

    expect(screen.getByText('Session 1')).toBeInTheDocument()
    expect(screen.getByText('Session 20')).toBeInTheDocument()
    expect(screen.queryByText('Session 21')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText('Session 21')).toBeInTheDocument()
    expect(screen.queryByText('Session 1')).not.toBeInTheDocument()
  })

  it('renders topic request status, created-session link, and rejection reason', () => {
    mockUseStudentTopicRequests.mockReturnValue({
      topicRequests: [
        buildTopicRequest(),
        buildTopicRequest({
          id: 'request-2',
          topic: 'Rejected request',
          status: 'rejected',
          approved_session_id: null,
          approved_session_title: null,
          rejection_reason: 'Too broad. Please narrow the topic.',
        }),
      ],
      loading: false,
      error: null,
      refetch: mockRefetchTopicRequests,
    })

    renderDashboard()

    expect(screen.getByText("Newton's laws made easy")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view created session/i })).toHaveAttribute(
      'href',
      '/'
    )
    expect(screen.getByText(/created session: newton laws workshop/i)).toBeInTheDocument()
    expect(screen.getByText(/rejection reason/i)).toBeInTheDocument()
    expect(screen.getByText(/too broad\. please narrow the topic\./i)).toBeInTheDocument()
  })

  it('shows a retry state when dashboard data fails to load', () => {
    mockUseStudentEnrollments.mockReturnValue({
      enrollments: [],
      loading: false,
      error: 'Connection error. Please try again.',
      refetch: mockRefetchEnrollments,
    })

    mockUseStudentTopicRequests.mockReturnValue({
      topicRequests: [],
      loading: false,
      error: null,
      refetch: mockRefetchTopicRequests,
    })

    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(mockRefetchEnrollments).toHaveBeenCalledTimes(1)
    expect(mockRefetchTopicRequests).toHaveBeenCalledTimes(1)
  })

  it('uses mobile-first classes for header actions, view toggles, and pagination controls', () => {
    const enrollments = Array.from({ length: 21 }, (_, index) =>
      buildEnrollment({
        id: `enrollment-${index + 1}`,
        session: {
          ...buildEnrollment().session,
          id: `session-${index + 1}`,
          title: `Session ${index + 1}`,
          scheduled_at: `2030-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
        },
      })
    )

    mockUseStudentEnrollments.mockReturnValue({
      enrollments,
      loading: false,
      error: null,
      refetch: mockRefetchEnrollments,
    })

    renderDashboard()

    expect(screen.getByRole('button', { name: /^home$/i }).className).toMatch(/\bw-full\b/)
    expect(screen.getByRole('button', { name: /^home$/i }).className).toMatch(
      /\bsm:w-auto\b/
    )
    expect(
      screen.getByRole('button', { name: /upcoming \(21\)/i }).className
    ).toMatch(/\bw-full\b/)
    expect(
      screen.getByRole('button', { name: /upcoming \(21\)/i }).className
    ).toMatch(/\bsm:w-auto\b/)
    expect(screen.getByRole('button', { name: /^next$/i }).className).toMatch(/\bw-full\b/)
    expect(screen.getByRole('button', { name: /^next$/i }).className).toMatch(
      /\bsm:w-auto\b/
    )
  })
})
