import { useAuth } from '../hooks/useAuth'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useStudentEnrollments } from '../hooks/useStudentEnrollments'
import { useStudentTopicRequests } from '../hooks/useStudentTopicRequests'
import {
  ENROLLMENTS_PER_PAGE,
  getTopicRequestsForStudent,
  getVisibleEnrollments,
  shouldShowMeetLink,
} from '../utils/studentDashboard'

export const StudentDashboard = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [enrollmentView, setEnrollmentView] = useState('upcoming')
  const [currentPage, setCurrentPage] = useState(1)

  const {
    enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
    refetch: refetchEnrollments,
  } = useStudentEnrollments(user?.id)

  const {
    topicRequests,
    loading: topicRequestsLoading,
    error: topicRequestsError,
    refetch: refetchTopicRequests,
  } = useStudentTopicRequests(user?.id)

  // Flash-message handling: derive the message from navigation state and use
  // an async setState only to dismiss it after 5s (avoids set-state-in-effect).
  const stateMessage = location.state?.message ?? ''
  const [dismissedStateMessage, setDismissedStateMessage] = useState(null)

  useEffect(() => {
    if (!stateMessage) return undefined
    const timer = setTimeout(
      () => setDismissedStateMessage(stateMessage),
      5000
    )
    return () => clearTimeout(timer)
  }, [stateMessage])

  const message =
    stateMessage && dismissedStateMessage !== stateMessage ? stateMessage : ''

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const now = useMemo(() => new Date(), [])
  const upcomingEnrollments = useMemo(
    () => getVisibleEnrollments(enrollments, 'upcoming', now),
    [enrollments, now]
  )
  const pastEnrollments = useMemo(
    () => getVisibleEnrollments(enrollments, 'past', now),
    [enrollments, now]
  )
  const visibleEnrollments = enrollmentView === 'past' ? pastEnrollments : upcomingEnrollments
  const totalPages = Math.max(1, Math.ceil(visibleEnrollments.length / ENROLLMENTS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedEnrollments = useMemo(() => {
    const startIndex = (safePage - 1) * ENROLLMENTS_PER_PAGE
    return visibleEnrollments.slice(startIndex, startIndex + ENROLLMENTS_PER_PAGE)
  }, [safePage, visibleEnrollments])

  const myTopicRequests = useMemo(
    () => getTopicRequestsForStudent(topicRequests, user?.id),
    [topicRequests, user?.id]
  )

  const loading = enrollmentsLoading || topicRequestsLoading
  const hasError = Boolean(enrollmentsError || topicRequestsError)

  const handleRetry = async () => {
    await Promise.all([refetchEnrollments(), refetchTopicRequests()])
  }

  const handleEnrollmentViewChange = (nextView) => {
    setEnrollmentView(nextView)
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.username}!</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Home
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Message Display */}
        {message && (
          <div className="mb-6">
            <div className={`p-4 rounded-lg ${
              message.includes('denied') 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">My Enrollments</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Track your tutoring sessions and see when the meet link becomes available.
                </p>
              </div>

              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => handleEnrollmentViewChange('upcoming')}
                  aria-pressed={enrollmentView === 'upcoming'}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    enrollmentView === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Upcoming ({upcomingEnrollments.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleEnrollmentViewChange('past')}
                  aria-pressed={enrollmentView === 'past'}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    enrollmentView === 'past'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Past ({pastEnrollments.length})
                </button>
              </div>
            </div>

            {loading && <DashboardLoading message="Loading your dashboard..." />}

            {!loading && hasError && (
              <ErrorState
                message={enrollmentsError || topicRequestsError}
                onRetry={handleRetry}
              />
            )}

            {!loading && !hasError && paginatedEnrollments.length === 0 && (
              <EmptyState
                title={
                  enrollmentView === 'past'
                    ? 'No past enrollments yet'
                    : 'No upcoming enrollments yet'
                }
                message={
                  enrollmentView === 'past'
                    ? 'Completed or older sessions you joined will appear here.'
                    : 'Once you enroll in a future session, it will show up here.'
                }
              />
            )}

            {!loading && !hasError && paginatedEnrollments.length > 0 && (
              <>
                <ul className="mt-5 grid gap-4" aria-label="Student enrollments">
                  {paginatedEnrollments.map((enrollment) => (
                    <li
                      key={enrollment.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {enrollment.session?.title || 'Untitled session'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {enrollment.session?.subject || 'General'} ·{' '}
                            {formatDateTime(enrollment.session?.scheduled_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={enrollment.payment_status} />
                          <span className="text-sm font-semibold text-gray-900">
                            {formatPrice(enrollment.session?.price_ugx)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                        {shouldShowMeetLink(enrollment) ? (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Google Meet Link
                            </p>
                            <a
                              href={enrollment.session.meet_link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              Join your session
                            </a>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Google Meet Link
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {enrollment.payment_status === 'approved'
                                ? 'Your meet link will appear here once the teacher adds it.'
                                : 'This link becomes available after your payment is approved.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-600">
                      Page {safePage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={safePage === totalPages}
                        onClick={() =>
                          setCurrentPage((page) => Math.min(totalPages, page + 1))
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">My Topic Requests</h2>
              <p className="mt-1 text-sm text-gray-600">
                Follow the status of topics you have asked the teacher to cover.
              </p>
            </div>

            {!loading && !hasError && myTopicRequests.length === 0 && (
              <EmptyState
                title="No topic requests yet"
                message="When you submit a request, it will show up here with votes and status."
              />
            )}

            {!loading && !hasError && myTopicRequests.length > 0 && (
              <ul className="mt-5 grid gap-4" aria-label="Student topic requests">
                {myTopicRequests.map((request) => (
                  <li
                    key={request.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">{request.subject}</p>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.topic}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={request.status} />
                        <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {request.vote_count} vote{request.vote_count === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    {request.description && (
                      <p className="mt-3 text-sm text-gray-700">{request.description}</p>
                    )}

                    <div className="mt-4 text-sm text-gray-600">
                      Requested on {formatDate(request.created_at)}
                    </div>

                    {request.status === 'approved' && request.approved_session_id && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        <p className="font-medium">
                          Created session:{' '}
                          {request.approved_session_title || 'Session available'}
                        </p>
                        <Link
                          to="/"
                          state={{ sessionIdToOpen: request.approved_session_id }}
                          className="mt-1 inline-flex font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          View created session
                        </Link>
                      </div>
                    )}

                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p className="font-medium">Rejection reason</p>
                        <p className="mt-1">{request.rejection_reason}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const classes = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
        classes[status] || 'bg-gray-200 text-gray-700'
      }`}
    >
      {status || 'unknown'}
    </span>
  )
}

const DashboardLoading = ({ message }) => (
  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
    {message}
  </div>
)

const EmptyState = ({ title, message }) => (
  <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-600">{message}</p>
  </div>
)

const ErrorState = ({ message, onRetry }) => (
  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <p>{message || 'Connection error. Please try again.'}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
    >
      Try again
    </button>
  </div>
)

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const priceFormatter = new Intl.NumberFormat('en-UG', {
  style: 'currency',
  currency: 'UGX',
  maximumFractionDigits: 0,
})

const formatDateTime = (value) => {
  if (!value) return 'Date TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return dateTimeFormatter.format(date)
}

const formatDate = (value) => {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return dateFormatter.format(date)
}

const formatPrice = (value) => {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 'Price unavailable'
  if (numeric === 0) return 'Free'
  return priceFormatter.format(numeric)
}
