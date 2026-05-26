import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SessionForm } from '../components/SessionForm'
import { useAuth } from '../hooks/useAuth'
import { useTeacherSessions } from '../hooks/useTeacherSessions'

const TABS = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'enrollments', label: 'Enrollments' },
  { id: 'topic-requests', label: 'Topic Requests' },
]

export const AdminPanel = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('sessions')

  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useTeacherSessions(user?.id)

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

  const stats = useMemo(() => {
    const total = sessions.length
    const upcoming = sessions.filter((session) => session.status === 'upcoming').length
    const withVideo = sessions.filter((session) => Boolean(session.explainer_video)).length
    const tagged = sessions.filter((session) => (session.tags || []).length > 0).length

    return { total, upcoming, withVideo, tagged }
  }, [sessions])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Admin Panel</h1>
            <p className="mt-1 text-gray-600">Welcome, {user?.username}!</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
            >
              Home
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-6">
            <div
              className={`rounded-lg p-4 ${
                message.includes('denied')
                  ? 'border border-red-200 bg-red-50 text-red-800'
                  : 'border border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Workspace</h2>
              <p className="mt-1 text-sm text-gray-600">
                Create sessions now, then switch tabs as you move into enrollment
                review and topic planning.
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {activeTab === 'sessions' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <SessionForm teacherId={user?.id} onCreated={refetchSessions} />

            <div className="grid gap-6">
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900">Session Stats</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    A quick overview of the sessions you have already published.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Total sessions" value={stats.total} />
                  <StatCard label="Upcoming" value={stats.upcoming} />
                  <StatCard label="With video" value={stats.withVideo} />
                  <StatCard label="Tagged" value={stats.tagged} />
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">My Sessions</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Sessions you created appear here with status, schedule, and tags.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={refetchSessions}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    Refresh
                  </button>
                </div>

                {sessionsLoading && <LoadingState message="Loading your sessions..." />}

                {!sessionsLoading && sessionsError && (
                  <ErrorState message={sessionsError} onRetry={refetchSessions} />
                )}

                {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                  <EmptyState
                    title="No sessions created yet"
                    message="Use the form to publish your first tutoring session."
                  />
                )}

                {!sessionsLoading && !sessionsError && sessions.length > 0 && (
                  <ul className="grid gap-4" aria-label="Teacher sessions">
                    {sessions.map((session) => (
                      <li
                        key={session.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700">
                              {session.subject || 'General'}
                            </p>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {session.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {formatDateTime(session.scheduled_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <StatusBadge status={session.status} />
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPrice(session.price_ugx)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <InfoChip>
                            {session.explainer_video ? 'Video attached' : 'No video yet'}
                          </InfoChip>
                          <InfoChip>
                            {session.video_thumbnail ? 'Thumbnail attached' : 'No thumbnail yet'}
                          </InfoChip>
                          <InfoChip>
                            {session.tags?.length ? `${session.tags.length} tag(s)` : 'No tags'}
                          </InfoChip>
                        </div>

                        {session.tags?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {session.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {activeTab === 'enrollments' && (
          <ComingSoonState
            title="Enrollment review is ready for the next phase"
            message="The tabbed admin layout is in place. Payment approval tools will plug into this area next."
          />
        )}

        {activeTab === 'topic-requests' && (
          <ComingSoonState
            title="Topic request management is staged here"
            message="This section will host student and anonymous topic requests once that workflow is added."
          />
        )}
      </div>
    </div>
  )
}

const StatCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
  </div>
)

const StatusBadge = ({ status }) => {
  const classes = {
    upcoming: 'bg-blue-100 text-blue-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
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

const InfoChip = ({ children }) => (
  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
    {children}
  </span>
)

const LoadingState = ({ message }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
    {message}
  </div>
)

const EmptyState = ({ title, message }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-600">{message}</p>
  </div>
)

const ErrorState = ({ message, onRetry }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <p>{message || 'Unable to load data. Please try again.'}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
    >
      Try again
    </button>
  </div>
)

const ComingSoonState = ({ title, message }) => (
  <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
    <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
    <p className="mt-2 text-sm text-gray-600">{message}</p>
  </section>
)

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
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

const formatPrice = (value) => {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 'Price unavailable'
  if (numeric === 0) return 'Free'
  return priceFormatter.format(numeric)
}
