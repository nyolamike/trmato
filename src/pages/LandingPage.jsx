import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUpcomingSessions } from '../hooks/useUpcomingSessions'
import { SessionCard } from '../components/SessionCard'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { SessionDetailModal } from '../components/SessionDetailModal'
import {
  computePopularTags,
  extractSubjects,
  filterSessions,
} from '../utils/sessionFilters'

/**
 * LandingPage
 *
 * Public landing page that displays all upcoming sessions in a mobile-first
 * responsive grid with search and filter controls.
 *
 * Validates: Requirements 2.1, 2.5, 14.3, 14.4, 16.1, 16.2, 16.3, 16.4,
 *            16.5, 16.6, 16.9, 16.11, 16.12
 */
export const LandingPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { sessions, loading, error, refetch } = useUpcomingSessions()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])

  // Flash-message handling.
  // `stateMessage` is derived from navigation state (no state-sync effect
  // needed). `dismissedStateMessage` is set asynchronously after a 5s
  // timeout to hide it. `localMessage` is set by local event handlers
  // (e.g. sign-out) and auto-clears the same way.
  const stateMessage = location.state?.message ?? ''
  const requestedSessionId = location.state?.sessionIdToOpen ?? null
  const [dismissedStateMessage, setDismissedStateMessage] = useState(null)
  const [localMessage, setLocalMessage] = useState('')

  useEffect(() => {
    if (!stateMessage) return undefined
    const timer = setTimeout(() => setDismissedStateMessage(stateMessage), 5000)
    return () => clearTimeout(timer)
  }, [stateMessage])

  useEffect(() => {
    if (!localMessage) return undefined
    const timer = setTimeout(() => setLocalMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [localMessage])

  const message =
    localMessage ||
    (stateMessage && dismissedStateMessage !== stateMessage ? stateMessage : '')

  const subjects = useMemo(() => extractSubjects(sessions), [sessions])
  const popularTags = useMemo(() => computePopularTags(sessions, 10), [sessions])

  const filteredSessions = useMemo(
    () =>
      filterSessions(sessions, {
        searchQuery,
        subject: selectedSubject,
        tags: selectedTags,
      }),
    [sessions, searchQuery, selectedSubject, selectedTags]
  )

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedSubject) ||
    selectedTags.length > 0

  const handleDashboardClick = () => {
    if (user?.role === 'student') {
      navigate('/dashboard')
    } else if (user?.role === 'teacher') {
      navigate('/admin')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setLocalMessage('You have been signed out successfully')
  }

  // Tracks the currently-open session in the Session_Modal. Storing the id
  // (rather than the session object) lets the modal stay in sync with the
  // latest cached session data after a refetch.
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  )

  useEffect(() => {
    if (!requestedSessionId || loading || sessions.length === 0) return
    const sessionToOpen = sessions.find((session) => session.id === requestedSessionId)
    if (sessionToOpen) {
      const timer = window.setTimeout(() => {
        setSelectedSessionId(sessionToOpen.id)
      }, 0)

      return () => window.clearTimeout(timer)
    }
  }, [requestedSessionId, loading, sessions])

  const handleSessionClick = (session) => {
    setSelectedSessionId(session.id)
  }

  const handleCloseModal = () => {
    setSelectedSessionId(null)
  }

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  // Tags clicked from inside the modal should both apply the tag as an
  // active filter *and* close the modal so the filtered grid is visible
  // (Requirements 16.6, 16.15).
  const handleTagClickFromModal = (tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    setSelectedSessionId(null)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedSubject(null)
    setSelectedTags([])
  }

  const isMessageError =
    message.includes('denied') || message.includes('sign in')

  const sessionsAvailable = sessions.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 sm:py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            TrMato MVP Platform
          </h1>
          <p className="mt-2 text-base text-gray-600 sm:text-lg">
            Live tutoring sessions for secondary school students in Uganda
          </p>
        </header>

        {message && (
          <div className="mx-auto mb-6 max-w-2xl">
            <div
              role="status"
              className={`rounded-lg p-4 ${
                isMessageError
                  ? 'border border-red-200 bg-red-50 text-red-800'
                  : 'border border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <section className="mx-auto mb-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          {user ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-gray-700">
                Welcome back, <strong>{user.username}</strong>{' '}
                <span className="text-sm text-gray-500">({user.role})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDashboardClick}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Go to {user.role === 'student' ? 'Dashboard' : 'Admin Panel'}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-gray-700">
                Browse upcoming sessions below, or sign in to enroll.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/signin')}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </section>

        <section
          aria-labelledby="topic-requests-cta-heading"
          className="mx-auto mb-8 max-w-3xl rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="topic-requests-cta-heading" className="text-lg font-semibold text-gray-900">
                Have a topic in mind?
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Request a lesson topic and upvote ideas from other students.
              </p>
            </div>
            <Link
              to="/topic-requests"
              className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Browse Topic Requests
            </Link>
          </div>
        </section>

        <section aria-labelledby="upcoming-sessions-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2
                id="upcoming-sessions-heading"
                className="text-2xl font-semibold text-gray-900"
              >
                Upcoming Sessions
              </h2>
              <p className="text-sm text-gray-600">
                Discover live tutoring sessions you can join.
              </p>
            </div>
          </div>

          {sessionsAvailable && !loading && !error && (
            <SearchFilterBar
              searchQuery={searchQuery}
              selectedSubject={selectedSubject}
              selectedTags={selectedTags}
              subjects={subjects}
              popularTags={popularTags}
              onSearchChange={setSearchQuery}
              onSubjectChange={setSelectedSubject}
              onTagToggle={handleTagToggle}
              onClearFilters={handleClearFilters}
            />
          )}

          {loading && <SessionGridSkeleton />}

          {!loading && error && (
            <ErrorState message={error} onRetry={refetch} />
          )}

          {!loading && !error && !sessionsAvailable && <EmptyState />}

          {!loading &&
            !error &&
            sessionsAvailable &&
            filteredSessions.length === 0 && (
              <NoMatchesState onClearFilters={handleClearFilters} />
            )}

          {!loading && !error && filteredSessions.length > 0 && (
            <ul
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Upcoming sessions list"
            >
              {filteredSessions.map((session) => (
                <li
                  key={session.id}
                  aria-current={
                    selectedSessionId === session.id ? 'true' : undefined
                  }
                >
                  <SessionCard
                    session={session}
                    onClick={handleSessionClick}
                    onTagClick={handleTagToggle}
                  />
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && hasActiveFilters && filteredSessions.length > 0 && (
            <p className="mt-4 text-sm text-gray-600" aria-live="polite">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </p>
          )}
        </section>
      </div>

      <SessionDetailModal
        session={selectedSession}
        isOpen={Boolean(selectedSession)}
        onClose={handleCloseModal}
        onTagClick={handleTagClickFromModal}
      />
    </div>
  )
}

const SessionGridSkeleton = () => (
  <ul
    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    aria-label="Loading sessions"
    aria-busy="true"
  >
    {Array.from({ length: 6 }).map((_, index) => (
      <li
        key={index}
        className="h-44 animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-3 h-4 w-20 rounded-full bg-gray-200" />
        <div className="mb-2 h-5 w-3/4 rounded bg-gray-200" />
        <div className="mb-4 h-5 w-1/2 rounded bg-gray-200" />
        <div className="mt-6 flex justify-between">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      </li>
    ))}
  </ul>
)

const EmptyState = () => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
    <h3 className="text-lg font-semibold text-gray-900">
      No upcoming sessions yet
    </h3>
    <p className="mt-1 text-sm text-gray-600">
      Check back soon — new sessions are added regularly.
    </p>
  </div>
)

const NoMatchesState = ({ onClearFilters }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
    <h3 className="text-lg font-semibold text-gray-900">
      No sessions found. Try adjusting your filters.
    </h3>
    <p className="mt-1 text-sm text-gray-600">
      Try a different search term, subject, or tag.
    </p>
    {onClearFilters && (
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Clear all filters
      </button>
    )}
  </div>
)

const ErrorState = ({ message, onRetry }) => (
  <div
    role="alert"
    className="rounded-xl border border-red-200 bg-red-50 p-6 text-center"
  >
    <h3 className="text-lg font-semibold text-red-800">
      Unable to load sessions
    </h3>
    <p className="mt-1 text-sm text-red-700">
      {message || 'Something went wrong. Please try again.'}
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
      >
        Try again
      </button>
    )}
  </div>
)
