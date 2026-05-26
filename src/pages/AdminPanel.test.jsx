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

vi.mock('../components/SessionForm', () => ({
  SessionForm: () => <div data-testid="session-form">Session form mock</div>,
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
    expect(
      screen.getByText(/payment approval tools will plug into this area next/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Topic Requests' }))
    expect(
      screen.getByText(/student and anonymous topic requests/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }))
    expect(screen.getByTestId('session-form')).toBeInTheDocument()
  })

  it('allows the teacher to refresh their sessions list', () => {
    renderAdminPanel()

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    expect(mockRefetchSessions).toHaveBeenCalledTimes(1)
  })
})
