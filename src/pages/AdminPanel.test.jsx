import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminPanel } from './AdminPanel'

const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockRefetchSessions = vi.fn()
const mockUseTeacherSessions = vi.fn()
vi.mock('../hooks/useTeacherSessions', () => ({
  useTeacherSessions: () => mockUseTeacherSessions(),
}))

const mockRefetchEnrollments = vi.fn()
const mockApproveEnrollment = vi.fn()
const mockRejectEnrollment = vi.fn()
const mockClearActionMessage = vi.fn()
const mockUseTeacherEnrollments = vi.fn()
vi.mock('../hooks/useTeacherEnrollments', () => ({
  useTeacherEnrollments: () => mockUseTeacherEnrollments(),
}))

const mockRefetchTopicRequests = vi.fn()
const mockApproveRequest = vi.fn()
const mockRejectRequest = vi.fn()
const mockClearTopicRequestActionMessage = vi.fn()
const mockUseTeacherTopicRequests = vi.fn()
vi.mock('../hooks/useTeacherTopicRequests', () => ({
  useTeacherTopicRequests: () => mockUseTeacherTopicRequests(),
}))

vi.mock('../components/SessionForm', () => ({
  SessionForm: (props) => (
    <div data-testid="session-form">
      <p>{props.title || 'Session form mock'}</p>
      {props.initialValues?.subject && <p>Prefill subject: {props.initialValues.subject}</p>}
      {props.initialValues?.title && <p>Prefill title: {props.initialValues.title}</p>}
      {props.initialValues?.description && (
        <p>Prefill description: {props.initialValues.description}</p>
      )}
      {props.onCreated && (
        <button
          type="button"
          onClick={() => props.onCreated({ id: 'session-created-from-request' })}
        >
          Mock create session
        </button>
      )}
      Session form mock
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

const buildSession = (overrides = {}) => ({
  id: 'session-1',
  title: 'Cell Division Masterclass',
  subject: 'Biology',
  description: 'Revise mitosis, meiosis, and common UNEB exam questions.',
  scheduled_at: '2030-01-02T10:00:00Z',
  price_ugx: 5000,
  status: 'upcoming',
  explainer_video: 'https://example.com/video.mp4',
  video_thumbnail: 'https://example.com/thumb.jpg',
  tags: ['revision', 'cells'],
  ...overrides,
})

const buildEnrollment = (overrides = {}) => ({
  id: 'enrollment-1',
  session_id: 'session-1',
  student_id: 'student-1',
  payment_status: 'pending',
  payment_screenshot: null,
  payment_note: 'Paid via MTN MoMo',
  enrolled_at: '2030-01-01T10:00:00Z',
  session: {
    id: 'session-1',
    title: 'Cell Division Masterclass',
    subject: 'Biology',
    scheduled_at: '2030-01-02T10:00:00Z',
    created_by: 'teacher-1',
  },
  student: {
    id: 'student-1',
    username: 'alice',
    email: 'alice@example.com',
  },
  ...overrides,
})

const buildTopicRequest = (overrides = {}) => ({
  id: 'request-1',
  student_id: 'student-1',
  subject: 'Biology',
  topic: 'Photosynthesis revision',
  description: 'Please focus on light and dark stages.',
  email: 'alice@example.com',
  status: 'pending',
  is_anonymous: false,
  approved_session_id: null,
  rejection_reason: null,
  vote_count: 4,
  created_at: '2030-01-01T12:00:00Z',
  ...overrides,
})

const renderAdminPanel = () =>
  render(
    <MemoryRouter>
      <AdminPanel />
    </MemoryRouter>
  )

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      user: { id: 'teacher-1', username: 'mike', role: 'teacher' },
      signOut: mockSignOut,
    })

    mockUseTeacherSessions.mockReturnValue({
      sessions: [
        buildSession(),
        buildSession({
          id: 'session-2',
          title: 'Kinematics Crash Course',
          subject: 'Physics',
          explainer_video: null,
          video_thumbnail: null,
          tags: [],
        }),
      ],
      loading: false,
      error: null,
      refetch: mockRefetchSessions,
    })

    mockUseTeacherEnrollments.mockReturnValue({
      enrollments: [buildEnrollment()],
      loading: false,
      error: null,
      updatingId: null,
      actionMessage: null,
      refetch: mockRefetchEnrollments,
      approveEnrollment: mockApproveEnrollment,
      rejectEnrollment: mockRejectEnrollment,
      clearActionMessage: mockClearActionMessage,
    })

    mockUseTeacherTopicRequests.mockReturnValue({
      topicRequests: [
        buildTopicRequest(),
        buildTopicRequest({
          id: 'request-2',
          student_id: null,
          is_anonymous: true,
          email: 'anon@example.com',
          topic: 'Anonymous chemistry topic',
          subject: 'Chemistry',
          status: 'approved',
          vote_count: 0,
        }),
      ],
      studentRequests: [buildTopicRequest()],
      anonymousRequests: [
        buildTopicRequest({
          id: 'request-2',
          student_id: null,
          is_anonymous: true,
          email: 'anon@example.com',
          topic: 'Anonymous chemistry topic',
          subject: 'Chemistry',
          status: 'approved',
          vote_count: 0,
        }),
      ],
      loading: false,
      error: null,
      updatingId: null,
      actionMessage: null,
      refetch: mockRefetchTopicRequests,
      approveRequest: mockApproveRequest,
      rejectRequest: mockRejectRequest,
      clearActionMessage: mockClearTopicRequestActionMessage,
    })
  })

  it('renders the sessions workspace by default with the form, stats, and teacher sessions', () => {
    renderAdminPanel()

    expect(screen.getByRole('heading', { name: /teacher admin panel/i })).toBeInTheDocument()
    expect(screen.getByTestId('session-form')).toBeInTheDocument()
    expect(screen.getByText('Cell Division Masterclass')).toBeInTheDocument()
    expect(screen.getByText('Kinematics Crash Course')).toBeInTheDocument()
    expect(screen.getByText('Total sessions')).toBeInTheDocument()
    expect(screen.getByText('With video')).toBeInTheDocument()
    expect(screen.getByText('#revision')).toBeInTheDocument()
  })

  it('switches between admin tabs', () => {
    renderAdminPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Enrollments' }))
    expect(screen.getByRole('heading', { name: /session enrollments/i })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('Paid via MTN MoMo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Topic Requests' }))
    expect(screen.getByRole('heading', { name: /topic requests/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /student requests/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /anonymous requests/i })).toBeInTheDocument()
    expect(screen.getByText('Photosynthesis revision')).toBeInTheDocument()
    expect(screen.getByText('Anonymous chemistry topic')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }))
    expect(screen.getByTestId('session-form')).toBeInTheDocument()
  })

  it('allows the teacher to refresh their sessions list', () => {
    renderAdminPanel()

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    expect(mockRefetchSessions).toHaveBeenCalledTimes(1)
  })

  it('shows approve and reject actions for pending enrollments', () => {
    renderAdminPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Enrollments' }))

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(mockApproveEnrollment).toHaveBeenCalledTimes(1)
    expect(mockRejectEnrollment).toHaveBeenCalledTimes(1)
  })

  it('allows the teacher to approve, reject, and create a session from a topic request', () => {
    mockApproveRequest.mockResolvedValue({ ok: true })
    mockRejectRequest.mockResolvedValue({ ok: true })

    renderAdminPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Topic Requests' }))

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(mockApproveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'request-1' })
    )

    fireEvent.click(
      screen.getByRole('button', { name: /approve & create session/i })
    )
    expect(
      screen.getByText('Create Session From Topic Request')
    ).toBeInTheDocument()
    expect(screen.getByText('Prefill subject: Biology')).toBeInTheDocument()
    expect(
      screen.getByText('Prefill title: Photosynthesis revision')
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mock create session' }))
    expect(mockApproveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'request-1' }),
      'session-created-from-request'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    fireEvent.change(screen.getByLabelText(/rejection reason/i), {
      target: { value: 'Too broad right now.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm rejection/i }))

    expect(mockRejectRequest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'request-1' }),
      'Too broad right now.'
    )
  })
})
