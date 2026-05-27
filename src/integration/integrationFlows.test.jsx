import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { ErrorBoundary } from '../components/ErrorBoundary'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { LandingPage } from '../pages/LandingPage'
import { StudentDashboard } from '../pages/StudentDashboard'
import { AdminPanel } from '../pages/AdminPanel'
import { TopicRequestPage } from '../pages/TopicRequestPage'
import { SessionDetailModal } from '../components/SessionDetailModal'
import { filterSessions } from '../utils/sessionFilters'

/**
 * Phase 13 — End-to-end integration tests (Task 40)
 *
 * Validates complete user flows across multiple pages and components.
 * Supabase is mocked at the hook layer so flows remain deterministic.
 */

// ── Shared auth mock ────────────────────────────────────────────────────────

const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// ── Landing page hooks ────────────────────────────────────────────────────────

const mockRefetchSessions = vi.fn()
const mockUseUpcomingSessions = vi.fn()
vi.mock('../hooks/useUpcomingSessions', () => ({
  useUpcomingSessions: () => mockUseUpcomingSessions(),
}))

// ── Enrollment hook ───────────────────────────────────────────────────────────

const mockUseEnrollment = vi.fn()
vi.mock('../hooks/useEnrollment', () => ({
  useEnrollment: (args) => mockUseEnrollment(args),
}))

// ── Student dashboard hooks ─────────────────────────────────────────────────

const mockUseStudentEnrollments = vi.fn()
vi.mock('../hooks/useStudentEnrollments', () => ({
  useStudentEnrollments: () => mockUseStudentEnrollments(),
}))

const mockUseStudentTopicRequests = vi.fn()
vi.mock('../hooks/useStudentTopicRequests', () => ({
  useStudentTopicRequests: () => mockUseStudentTopicRequests(),
}))

// ── Teacher admin hooks ───────────────────────────────────────────────────────

const mockUseTeacherSessions = vi.fn()
vi.mock('../hooks/useTeacherSessions', () => ({
  useTeacherSessions: () => mockUseTeacherSessions(),
}))

const mockUseTeacherEnrollments = vi.fn()
const mockApproveEnrollment = vi.fn()
const mockRejectEnrollment = vi.fn()
vi.mock('../hooks/useTeacherEnrollments', () => ({
  useTeacherEnrollments: () => mockUseTeacherEnrollments(),
}))

const mockUseTeacherTopicRequests = vi.fn()
const mockApproveRequest = vi.fn()
const mockRejectRequest = vi.fn()
vi.mock('../hooks/useTeacherTopicRequests', () => ({
  useTeacherTopicRequests: () => mockUseTeacherTopicRequests(),
}))

// ── Topic request page hooks ─────────────────────────────────────────────────

const mockUseTopicRequests = vi.fn()
const mockToggleVote = vi.fn()
vi.mock('../hooks/useTopicRequests', () => ({
  useTopicRequests: () => mockUseTopicRequests(),
}))

// ── Admin panel SessionForm mock ────────────────────────────────────────────

vi.mock('../components/SessionForm', () => ({
  SessionForm: (props) => (
    <div data-testid="session-form">
      {props.title && <p>{props.title}</p>}
      {props.initialValues?.subject && (
        <p>Prefill subject: {props.initialValues.subject}</p>
      )}
      {props.initialValues?.title && (
        <p>Prefill title: {props.initialValues.title}</p>
      )}
      {props.onCreated && (
        <button
          type="button"
          onClick={() => props.onCreated({ id: 'session-from-request' })}
        >
          Mock create session
        </button>
      )}
    </div>
  ),
}))

vi.mock('../utils/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/proof.jpg' },
          error: null,
        }),
      })),
    },
  },
}))

vi.mock('../utils/performance', () => ({
  recordEstimatedVideoStream: vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const studentUser = { id: 'student-1', username: 'alice', role: 'student', email: 'alice@example.com' }
const teacherUser = { id: 'teacher-1', username: 'mary', role: 'teacher', email: 'mary@example.com' }

const buildSession = (overrides = {}) => ({
  id: 'session-1',
  title: 'Cell Biology Deep Dive',
  subject: 'Biology',
  description: 'Explore osmosis and cell structure.',
  scheduled_at: '2030-01-01T10:00:00Z',
  price_ugx: 5000,
  status: 'upcoming',
  meet_link: 'https://meet.google.com/abc-defg-hij',
  payment_number: '+256700000001',
  payment_name: 'Mary Nakato',
  explainer_video: 'https://example.com/video.mp4',
  video_thumbnail: 'https://example.com/thumb.jpg',
  tags: ['osmosis', 'cell biology'],
  ...overrides,
})

const buildEnrollment = (overrides = {}) => ({
  id: 'enrollment-1',
  payment_status: 'pending',
  session: buildSession(),
  ...overrides,
})

const buildTopicRequest = (overrides = {}) => ({
  id: 'request-1',
  student_id: 'student-1',
  subject: 'Biology',
  topic: 'Photosynthesis revision',
  description: 'Cover light-dependent reactions.',
  status: 'pending',
  vote_count: 5,
  created_at: '2030-01-01T10:00:00Z',
  is_anonymous: false,
  ...overrides,
})

const defaultEnrollmentHook = {
  existingEnrollment: null,
  loading: false,
  submitting: false,
  error: null,
  successMessage: null,
  uploadProgressMessage: '',
  submit: vi.fn().mockResolvedValue({ ok: true }),
  reset: vi.fn(),
}

const TestRouter = ({ initialEntries = ['/'], children }) => (
  <ErrorBoundary>
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  </ErrorBoundary>
)

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/topic-requests" element={<TopicRequestPage />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute requiredRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin"
      element={
        <ProtectedRoute requiredRole="teacher">
          <AdminPanel />
        </ProtectedRoute>
      }
    />
  </Routes>
)

const setupDefaultMocks = () => {
  mockUseAuth.mockReturnValue({ user: null, signOut: vi.fn(), loading: false })

  mockUseUpcomingSessions.mockReturnValue({
    sessions: [
      buildSession(),
      buildSession({
        id: 'session-2',
        title: 'Algebra Crash Course',
        subject: 'Mathematics',
        tags: ['algebra'],
      }),
    ],
    loading: false,
    error: null,
    refetch: mockRefetchSessions,
  })

  mockUseEnrollment.mockReturnValue({ ...defaultEnrollmentHook })

  mockUseStudentEnrollments.mockReturnValue({
    enrollments: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })

  mockUseStudentTopicRequests.mockReturnValue({
    topicRequests: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })

  mockUseTeacherSessions.mockReturnValue({
    sessions: [buildSession()],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })

  mockUseTeacherEnrollments.mockReturnValue({
    enrollments: [
      {
        id: 'enrollment-1',
        payment_status: 'pending',
        payment_note: 'Paid via MTN MoMo',
        student: { username: 'alice', email: 'alice@example.com' },
        session: buildSession(),
      },
    ],
    loading: false,
    error: null,
    actionMessage: null,
    refetch: vi.fn(),
    approveEnrollment: mockApproveEnrollment,
    rejectEnrollment: mockRejectEnrollment,
    clearActionMessage: vi.fn(),
  })

  mockUseTeacherTopicRequests.mockReturnValue({
    topicRequests: [buildTopicRequest()],
    studentRequests: [buildTopicRequest()],
    anonymousRequests: [
      buildTopicRequest({
        id: 'request-2',
        topic: 'Anonymous chemistry topic',
        is_anonymous: true,
        student_id: null,
        vote_count: 0,
      }),
    ],
    loading: false,
    error: null,
    updatingId: null,
    actionMessage: null,
    refetch: vi.fn(),
    approveRequest: mockApproveRequest,
    rejectRequest: mockRejectRequest,
    clearActionMessage: vi.fn(),
  })

  mockUseTopicRequests.mockReturnValue({
    topicRequests: [buildTopicRequest()],
    userVotes: [],
    loading: false,
    error: null,
    votingRequestId: null,
    refetch: vi.fn(),
    toggleVote: mockToggleVote,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Phase 13 — Integration flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  describe('Student enrollment flow: browse → view → enroll → dashboard', () => {
    it('completes the full student journey from landing page to dashboard', async () => {
      // Step 1: Browse sessions on landing page
      mockUseAuth.mockReturnValue({ user: studentUser, signOut: vi.fn(), loading: false })

      const { unmount: unmountLanding } = render(
        <TestRouter>
          <LandingPage />
        </TestRouter>
      )

      const grid = screen.getByLabelText(/upcoming sessions list/i)
      expect(within(grid).getByText('Cell Biology Deep Dive')).toBeInTheDocument()
      expect(within(grid).getByText('Algebra Crash Course')).toBeInTheDocument()

      // Step 2: Open session detail modal
      fireEvent.click(within(grid).getByText('Cell Biology Deep Dive'))
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(
        within(dialog).getByRole('heading', { name: /cell biology deep dive/i })
      ).toBeInTheDocument()

      // Step 3: Submit enrollment with payment note
      const submitEnrollment = vi.fn().mockResolvedValue({ ok: true })
      mockUseEnrollment.mockReturnValue({
        ...defaultEnrollmentHook,
        submit: submitEnrollment,
      })

      // Re-render modal with updated enrollment hook (simulates modal staying open)
      unmountLanding()
      const { unmount: unmountLandingWithForm } = render(
        <TestRouter>
          <LandingPage />
        </TestRouter>
      )
      fireEvent.click(screen.getByText('Cell Biology Deep Dive'))

      fireEvent.change(screen.getByLabelText(/payment note/i), {
        target: { value: 'Sent via MTN 14:23' },
      })
      fireEvent.click(screen.getByRole('button', { name: /submit enrollment/i }))

      await waitFor(() => {
        expect(submitEnrollment).toHaveBeenCalledWith(
          expect.objectContaining({ note: 'Sent via MTN 14:23' })
        )
      })

      // Step 4: Dashboard shows pending enrollment
      unmountLandingWithForm()

      mockUseEnrollment.mockReturnValue({
        ...defaultEnrollmentHook,
        existingEnrollment: buildEnrollment({ payment_status: 'pending' }),
        successMessage: 'Enrollment submitted! Awaiting teacher approval.',
      })

      mockUseStudentEnrollments.mockReturnValue({
        enrollments: [buildEnrollment({ payment_status: 'pending' })],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(
        <TestRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </TestRouter>
      )

      const enrollmentsList = screen.getByLabelText(/student enrollments/i)
      expect(within(enrollmentsList).getByText('Cell Biology Deep Dive')).toBeInTheDocument()
      expect(within(enrollmentsList).getByText('pending')).toBeInTheDocument()
    })

    it('shows meet link on dashboard after teacher approves payment', () => {
      mockUseAuth.mockReturnValue({ user: studentUser, signOut: vi.fn(), loading: false })
      mockUseStudentEnrollments.mockReturnValue({
        enrollments: [
          buildEnrollment({
            payment_status: 'approved',
            session: buildSession({ meet_link: 'https://meet.google.com/approved-link' }),
          }),
        ],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(
        <TestRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.getByText('Cell Biology Deep Dive')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /join your session/i })).toHaveAttribute(
        'href',
        'https://meet.google.com/approved-link'
      )
    })
  })

  describe('Teacher flow: create session → manage enrollments → approve payment', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: teacherUser, signOut: vi.fn(), loading: false })
    })

    it('navigates admin tabs and approves a pending enrollment', () => {
      mockApproveEnrollment.mockResolvedValue({ ok: true })

      render(
        <TestRouter initialEntries={['/admin']}>
          <AppRoutes />
        </TestRouter>
      )

      // Sessions tab — session form and existing sessions visible
      expect(screen.getByTestId('session-form')).toBeInTheDocument()
      expect(screen.getByText('Cell Biology Deep Dive')).toBeInTheDocument()

      // Switch to enrollments tab
      fireEvent.click(screen.getByRole('button', { name: 'Enrollments' }))
      expect(screen.getByRole('heading', { name: /session enrollments/i })).toBeInTheDocument()
      expect(screen.getByText('alice')).toBeInTheDocument()
      expect(screen.getByText('Paid via MTN MoMo')).toBeInTheDocument()

      // Approve the enrollment
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
      expect(mockApproveEnrollment).toHaveBeenCalledTimes(1)
    })

    it('creates a session from an approved topic request', async () => {
      mockApproveRequest.mockResolvedValue({ ok: true })

      render(
        <TestRouter initialEntries={['/admin']}>
          <AppRoutes />
        </TestRouter>
      )

      fireEvent.click(screen.getByRole('button', { name: 'Topic Requests' }))
      expect(screen.getByText('Photosynthesis revision')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /approve & create session/i }))
      expect(screen.getByText('Create Session From Topic Request')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Mock create session' }))
      expect(mockApproveRequest).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'request-1' }),
        'session-from-request'
      )
    })
  })

  describe('Topic request flow: submit → vote → teacher approve → session created', () => {
    it('allows a student to vote on a topic request', () => {
      mockUseAuth.mockReturnValue({ user: studentUser, signOut: vi.fn(), loading: false })
      mockToggleVote.mockResolvedValue({ ok: true })

      render(
        <TestRouter initialEntries={['/topic-requests']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.getByText('Photosynthesis revision')).toBeInTheDocument()
      expect(screen.getByText('5 votes')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Upvote' }))
      expect(mockToggleVote).toHaveBeenCalledWith('request-1')
    })

    it('prompts guests to sign in before voting', () => {
      mockUseAuth.mockReturnValue({ user: null, signOut: vi.fn(), loading: false })

      render(
        <TestRouter initialEntries={['/topic-requests']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.getByText('Please sign in to vote')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Upvote' })).not.toBeInTheDocument()
    })

    it('shows approved topic request with linked session on student dashboard', () => {
      mockUseAuth.mockReturnValue({ user: studentUser, signOut: vi.fn(), loading: false })
      mockUseStudentTopicRequests.mockReturnValue({
        topicRequests: [
          {
            ...buildTopicRequest({ status: 'approved' }),
            approved_session_id: 'session-99',
            approved_session_title: 'Photosynthesis Workshop',
          },
        ],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(
        <TestRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.getByRole('heading', { name: /my topic requests/i })).toBeInTheDocument()
      expect(screen.getByText(/created session: photosynthesis workshop/i)).toBeInTheDocument()
    })
  })

  describe('Search and filter combinations', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('applies search + subject + tag filters with AND logic', () => {
      const sessions = [
        buildSession(),
        buildSession({
          id: 'session-2',
          title: 'Algebra Crash Course',
          subject: 'Mathematics',
          tags: ['algebra'],
        }),
        buildSession({
          id: 'session-3',
          title: 'Biology Osmosis Lab',
          subject: 'Biology',
          tags: ['osmosis'],
        }),
      ]

      mockUseUpcomingSessions.mockReturnValue({
        sessions,
        loading: false,
        error: null,
        refetch: mockRefetchSessions,
      })

      render(
        <TestRouter>
          <LandingPage />
        </TestRouter>
      )

      const grid = () => screen.getByLabelText(/upcoming sessions list/i)

      // Apply search filter (unique to session-1)
      fireEvent.change(screen.getByLabelText(/search sessions/i), {
        target: { value: 'deep dive' },
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Apply subject filter
      fireEvent.change(screen.getByLabelText(/filter by subject/i), {
        target: { value: 'Biology' },
      })

      // Apply tag filter unique to session-1 via popular tags
      const popularTagsRegion = screen.getByText(/popular tags/i).closest('div')
      fireEvent.click(
        within(popularTagsRegion).getByRole('button', { name: '#cell biology' })
      )

      // Only the session matching all three filters should remain
      expect(within(grid()).getByText('Cell Biology Deep Dive')).toBeInTheDocument()
      expect(within(grid()).queryByText('Algebra Crash Course')).not.toBeInTheDocument()
      expect(within(grid()).queryByText('Biology Osmosis Lab')).not.toBeInTheDocument()

      // Verify filter utility AND logic directly
      const filtered = filterSessions(sessions, {
        searchQuery: 'deep dive',
        subject: 'Biology',
        tags: ['cell biology'],
      })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe('Cell Biology Deep Dive')
    })

    it('clears all filters when Clear All is clicked', () => {
      render(
        <TestRouter>
          <LandingPage />
        </TestRouter>
      )

      fireEvent.change(screen.getByLabelText(/filter by subject/i), {
        target: { value: 'Biology' },
      })
      expect(screen.getByText(/Subject: Biology/)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }))

      expect(screen.queryByText(/Subject: Biology/)).not.toBeInTheDocument()
      const grid = screen.getByLabelText(/upcoming sessions list/i)
      expect(within(grid).getByText('Cell Biology Deep Dive')).toBeInTheDocument()
      expect(within(grid).getByText('Algebra Crash Course')).toBeInTheDocument()
    })
  })

  describe('Authentication flows and role-based redirects', () => {
    it('redirects unauthenticated users away from protected routes', () => {
      mockUseAuth.mockReturnValue({ user: null, signOut: vi.fn(), loading: false })

      render(
        <TestRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </TestRouter>
      )

      // ProtectedRoute redirects to landing page
      expect(screen.queryByText(/my enrollments/i)).not.toBeInTheDocument()
    })

    it('redirects students away from admin panel to dashboard', () => {
      mockUseAuth.mockReturnValue({ user: studentUser, signOut: vi.fn(), loading: false })
      mockUseStudentEnrollments.mockReturnValue({
        enrollments: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(
        <TestRouter initialEntries={['/admin']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.queryByText(/teacher admin panel/i)).not.toBeInTheDocument()
    })

    it('redirects teachers away from student dashboard to admin panel', () => {
      mockUseAuth.mockReturnValue({ user: teacherUser, signOut: vi.fn(), loading: false })

      render(
        <TestRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.queryByText(/my enrollments/i)).not.toBeInTheDocument()
    })

    it('allows students to access dashboard and teachers to access admin', () => {
      mockUseAuth.mockReturnValue({ user: studentUser, signOut: vi.fn(), loading: false })
      mockUseStudentEnrollments.mockReturnValue({
        enrollments: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { unmount } = render(
        <TestRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.getByRole('heading', { name: /student dashboard/i })).toBeInTheDocument()
      unmount()

      mockUseAuth.mockReturnValue({ user: teacherUser, signOut: vi.fn(), loading: false })

      render(
        <TestRouter initialEntries={['/admin']}>
          <AppRoutes />
        </TestRouter>
      )

      expect(screen.getByRole('heading', { name: /teacher admin panel/i })).toBeInTheDocument()
    })

    it('shows sign-in prompt in session modal for unauthenticated visitors', () => {
      mockUseAuth.mockReturnValue({ user: null, signOut: vi.fn(), loading: false })

      render(
        <SessionDetailModal
          session={buildSession()}
          isOpen
          onClose={vi.fn()}
        />
      )

      expect(screen.getByTestId('enroll-signin-prompt')).toHaveTextContent(
        /sign in as a student/i
      )
    })
  })
})
