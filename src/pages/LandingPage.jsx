import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUpcomingSessions } from '../hooks/useUpcomingSessions'
import { SessionCard } from '../components/SessionCard'

/**
 * LandingPage
 *
 * Public landing page that displays all upcoming sessions in a mobile-first
 * responsive grid. Unauthenticated users can browse; authenticated users see
 * a dashboard shortcut.
 *
 * Validates: Requirements 2.1, 2.5, 14.3, 14.4
 */
export const LandingPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [message, setMessage] = useState('')
  const { sessions, loading, error, refetch } = useUpcomingSessions()

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message)
      const timer = setTimeout(() => setMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  const handleDashboardClick = () => {
    if (user?.role === 'student') {
      navigate('/dashboard')
    } else if (user?.role === 'teacher') {
      navigate('/admin')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setMessage('You have been signed out successfully')
  }

  // Session_Modal is implemented in Task 16. For now we just log so the
  // click contract is exercised end-to-end and easy to wire up later.
  const handleSessionClick = (session) => {
    // eslint-disable-next-line no-console
    console.log('Session selected:', session.id)
  }

  const isMessageError =
    message.includes('denied') || message.includes('sign in')

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

          {loading && <SessionGridSkeleton />}

          {!loading && error && (
            <ErrorState message={error} onRetry={refetch} />
          )}

          {!loading && !error && sessions.length === 0 && <EmptyState />}

          {!loading && !error && sessions.length > 0 && (
            <ul
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Upcoming sessions list"
            >
              {sessions.map((session) => (
                <li key={session.id}>
                  <SessionCard
                    session={session}
                    onClick={handleSessionClick}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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
