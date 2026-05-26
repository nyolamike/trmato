import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTopicRequests } from '../hooks/useTopicRequests'
import { TopicRequestForm } from '../components/TopicRequestForm'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { hasStudentVoted } from '../utils/topicRequest'

export const TopicRequestPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isStudent = user?.role === 'student'
  const {
    topicRequests,
    userVotes,
    loading,
    error,
    votingRequestId,
    refetch,
    toggleVote,
  } = useTopicRequests(isStudent ? user?.id : null)

  const [voteMessage, setVoteMessage] = useState('')

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleVoteClick = async (requestId) => {
    setVoteMessage('')

    if (!user) {
      setVoteMessage('Please sign in to vote')
      return
    }

    if (!isStudent) {
      setVoteMessage('Only students can vote on topic requests.')
      return
    }

    const result = await toggleVote(requestId)
    if (!result.ok && result.message) {
      setVoteMessage(result.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 sm:py-10">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                <Link to="/" className="hover:underline">
                  ← Back to sessions
                </Link>
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
                Topic Requests
              </h1>
              <p className="mt-2 max-w-2xl text-base text-gray-600">
                Browse topics students want covered, upvote ideas you support, or submit
                your own request.
              </p>
            </div>

            {user ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(user.role === 'student' ? '/dashboard' : '/admin')
                  }
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
            ) : (
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
            )}
          </div>
        </header>

        {voteMessage && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {voteMessage}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section aria-labelledby="topic-requests-list-heading">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2
                  id="topic-requests-list-heading"
                  className="text-2xl font-semibold text-gray-900"
                >
                  Popular Requests
                </h2>
                <p className="text-sm text-gray-600">
                  Sorted by votes. Anonymous requests are not shown here.
                </p>
              </div>
            </div>

            {loading && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                <LoadingSpinner message="Loading topic requests..." />
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && topicRequests.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No requests yet</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Be the first to suggest a topic using the form.
                </p>
              </div>
            )}

            {!loading && !error && topicRequests.length > 0 && (
              <ul className="grid gap-4" aria-label="Public topic requests">
                {topicRequests.map((request) => {
                  const voted = hasStudentVoted(userVotes, request.id)
                  const isVoting = votingRequestId === request.id

                  return (
                    <li
                      key={request.id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-blue-700">
                              {request.subject}
                            </p>
                            <RequestStatusBadge status={request.status} />
                          </div>
                          <h3 className="mt-1 text-lg font-semibold text-gray-900">
                            {request.topic}
                          </h3>
                          {request.description && (
                            <p className="mt-2 text-sm text-gray-600">{request.description}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <p className="text-sm font-medium text-gray-700">
                            {request.vote_count || 0}{' '}
                            {request.vote_count === 1 ? 'vote' : 'votes'}
                          </p>

                          {!user ? (
                            <p className="text-xs text-gray-500">Please sign in to vote</p>
                          ) : isStudent ? (
                            <button
                              type="button"
                              onClick={() => handleVoteClick(request.id)}
                              disabled={isVoting}
                              aria-pressed={voted}
                              className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                voted
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'border border-blue-600 text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              {isVoting ? 'Saving…' : voted ? 'Voted' : 'Upvote'}
                            </button>
                          ) : (
                            <p className="text-xs text-gray-500">Students can vote on requests</p>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <TopicRequestForm
            isAuthenticated={Boolean(user)}
            userEmail={user?.email || null}
            studentId={isStudent ? user?.id : null}
            onSubmitted={refetch}
          />
        </div>
      </div>
    </div>
  )
}

const RequestStatusBadge = ({ status }) => {
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

export default TopicRequestPage
