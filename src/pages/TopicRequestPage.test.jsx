import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TopicRequestPage } from './TopicRequestPage'

const mockNavigate = vi.fn()
const mockSignOut = vi.fn()
const mockRefetch = vi.fn()
const mockToggleVote = vi.fn()
const mockUseAuth = vi.fn()
const mockUseTopicRequests = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useTopicRequests', () => ({
  useTopicRequests: () => mockUseTopicRequests(),
}))

vi.mock('../components/TopicRequestForm', () => ({
  TopicRequestForm: ({ onSubmitted }) => (
    <div data-testid="topic-request-form">
      <button type="button" onClick={onSubmitted}>
        Mock submit
      </button>
    </div>
  ),
}))

const buildRequest = (overrides = {}) => ({
  id: 'request-1',
  subject: 'Physics',
  topic: 'Newton laws revision',
  description: 'Focus on free-body diagrams.',
  status: 'pending',
  vote_count: 3,
  created_at: '2030-01-01T10:00:00.000Z',
  is_anonymous: false,
  student_id: 'student-1',
  ...overrides,
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <TopicRequestPage />
    </MemoryRouter>
  )

describe('TopicRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      signOut: mockSignOut,
    })
    mockUseTopicRequests.mockReturnValue({
      topicRequests: [buildRequest()],
      userVotes: [],
      loading: false,
      error: null,
      votingRequestId: null,
      refetch: mockRefetch,
      toggleVote: mockToggleVote,
    })
  })

  it('renders public topic requests sorted by vote count', () => {
    mockUseTopicRequests.mockReturnValue({
      topicRequests: [
        buildRequest({ id: 'request-1', topic: 'Most voted', vote_count: 10 }),
        buildRequest({ id: 'request-2', topic: 'Less voted', vote_count: 2 }),
      ],
      userVotes: [],
      loading: false,
      error: null,
      votingRequestId: null,
      refetch: mockRefetch,
      toggleVote: mockToggleVote,
    })

    renderPage()

    expect(screen.getByText('Most voted')).toBeInTheDocument()
    expect(screen.getByText('10 votes')).toBeInTheDocument()
    expect(screen.getByText('Less voted')).toBeInTheDocument()
    expect(screen.getByText('2 votes')).toBeInTheDocument()
    expect(screen.getAllByText('Please sign in to vote')).toHaveLength(2)
  })

  it('shows a sign-in message instead of vote buttons for guests', () => {
    renderPage()

    expect(screen.getByText('Please sign in to vote')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upvote' })).not.toBeInTheDocument()
  })

  it('shows filled vote state for requests the student has already voted for', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'student-1', role: 'student', email: 'alice@example.com' },
      signOut: mockSignOut,
    })
    mockUseTopicRequests.mockReturnValue({
      topicRequests: [buildRequest()],
      userVotes: ['request-1'],
      loading: false,
      error: null,
      votingRequestId: null,
      refetch: mockRefetch,
      toggleVote: mockToggleVote,
    })

    renderPage()

    expect(screen.getByRole('button', { name: 'Voted' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('calls toggleVote for authenticated students', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'student-1', role: 'student', email: 'alice@example.com' },
      signOut: mockSignOut,
    })
    mockToggleVote.mockResolvedValue({ ok: true })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Upvote' }))

    expect(mockToggleVote).toHaveBeenCalledWith('request-1')
  })

  it('shows retry UI when loading fails', () => {
    mockUseTopicRequests.mockReturnValue({
      topicRequests: [],
      userVotes: [],
      loading: false,
      error: 'Unable to load topic requests. Please try again.',
      votingRequestId: null,
      refetch: mockRefetch,
      toggleVote: mockToggleVote,
    })

    renderPage()

    expect(
      screen.getByText('Unable to load topic requests. Please try again.')
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })
})
