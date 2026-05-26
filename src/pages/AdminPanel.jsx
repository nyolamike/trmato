import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SessionForm } from '../components/SessionForm'
import { useAuth } from '../hooks/useAuth'
import { useTeacherEnrollments } from '../hooks/useTeacherEnrollments'
import { useTeacherTopicRequests } from '../hooks/useTeacherTopicRequests'
import { useTeacherSessions } from '../hooks/useTeacherSessions'
import {
  groupPaginatedEnrollmentsBySession,
} from '../utils/teacherEnrollment'
import { buildSessionDraftFromTopicRequest } from '../utils/topicRequest'
import { supabase } from '../utils/supabase'

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

  const [enrollmentPage, setEnrollmentPage] = useState(1)

  const {
    enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
    updatingId,
    actionMessage,
    refetch: refetchEnrollments,
    approveEnrollment,
    rejectEnrollment,
    clearActionMessage,
  } = useTeacherEnrollments(user?.id)

  const {
    studentRequests,
    anonymousRequests,
    loading: topicRequestsLoading,
    error: topicRequestsError,
    updatingId: updatingTopicRequestId,
    actionMessage: topicRequestActionMessage,
    refetch: refetchTopicRequests,
    approveRequest,
    rejectRequest,
    clearActionMessage: clearTopicRequestActionMessage,
  } = useTeacherTopicRequests(user?.id)

  const [rejectingRequestId, setRejectingRequestId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [requestToCreateSession, setRequestToCreateSession] = useState(null)

  const enrollmentPagination = useMemo(
    () => groupPaginatedEnrollmentsBySession(enrollments, enrollmentPage),
    [enrollments, enrollmentPage]
  )

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

  const handleApproveWithoutSession = async (request) => {
    const result = await approveRequest(request)

    if (result.ok && requestToCreateSession?.id === request.id) {
      setRequestToCreateSession(null)
    }
  }

  const handleStartReject = (request) => {
    setRequestToCreateSession(null)
    setRejectingRequestId(request.id)
    setRejectionReason(request.rejection_reason || '')
  }

  const handleConfirmReject = async (request) => {
    const result = await rejectRequest(request, rejectionReason)

    if (result.ok) {
      setRejectingRequestId(null)
      setRejectionReason('')
      if (requestToCreateSession?.id === request.id) {
        setRequestToCreateSession(null)
      }
    }
  }

  const handleStartSessionCreation = (request) => {
    setRejectingRequestId(null)
    setRejectionReason('')
    setRequestToCreateSession(request)
  }

  const handleSessionCreatedFromRequest = async (createdSession) => {
    if (!requestToCreateSession || !createdSession?.id) return

    const result = await approveRequest(requestToCreateSession, createdSession.id)

    if (result.ok) {
      setRequestToCreateSession(null)
      await refetchSessions()
    }
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
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Session Enrollments
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Review payment proof and approve or reject enrollments for your
                  sessions.
                </p>
              </div>

              <button
                type="button"
                onClick={refetchEnrollments}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Refresh
              </button>
            </div>

            {actionMessage && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-start justify-between gap-3">
                  <p>{actionMessage}</p>
                  <button
                    type="button"
                    onClick={clearActionMessage}
                    className="text-emerald-700 hover:text-emerald-900"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {enrollmentsLoading && (
              <LoadingState message="Loading enrollments for your sessions..." />
            )}

            {!enrollmentsLoading && enrollmentsError && (
              <ErrorState message={enrollmentsError} onRetry={refetchEnrollments} />
            )}

            {!enrollmentsLoading &&
              !enrollmentsError &&
              enrollments.length === 0 && (
                <EmptyState
                  title="No enrollments yet"
                  message="When students enroll in your sessions, their payment proof will appear here."
                />
              )}

            {!enrollmentsLoading &&
              !enrollmentsError &&
              enrollmentPagination.items.length > 0 && (
                <>
                  <p className="mb-4 text-sm text-gray-600">
                    Showing {enrollmentPagination.items.length} of{' '}
                    {enrollmentPagination.totalItems} enrollment
                    {enrollmentPagination.totalItems === 1 ? '' : 's'}
                  </p>

                  <div className="grid gap-6">
                    {enrollmentPagination.groups.map((group) => (
                      <section
                        key={group.session.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700">
                              {group.session.subject || 'General'}
                            </p>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {group.session.title || 'Untitled session'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {formatDateTime(group.session.scheduled_at)}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {group.enrollments.length} enrollment
                            {group.enrollments.length === 1 ? '' : 's'} on this page
                          </span>
                        </div>

                        <ul className="grid gap-4" aria-label="Session enrollments">
                          {group.enrollments.map((enrollment) => (
                            <li
                              key={enrollment.id}
                              className="rounded-xl border border-gray-200 bg-white p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {enrollment.student?.username || 'Unknown student'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {enrollment.student?.email || 'No email on file'}
                                  </p>
                                  <p className="mt-2 text-xs text-gray-500">
                                    Enrolled {formatDateTime(enrollment.enrolled_at)}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <PaymentStatusBadge status={enrollment.payment_status} />
                                  {enrollment.payment_status === 'pending' && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={updatingId === enrollment.id}
                                        onClick={() => approveEnrollment(enrollment)}
                                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        disabled={updatingId === enrollment.id}
                                        onClick={() => rejectEnrollment(enrollment)}
                                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {enrollment.payment_note && (
                                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Payment note
                                  </p>
                                  <p className="mt-1 text-sm text-gray-800">
                                    {enrollment.payment_note}
                                  </p>
                                </div>
                              )}

                              {enrollment.payment_screenshot && (
                                <PaymentProofImage path={enrollment.payment_screenshot} />
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>

                  {enrollmentPagination.totalPages > 1 && (
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-600">
                        Page {enrollmentPagination.page} of{' '}
                        {enrollmentPagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={enrollmentPagination.page === 1}
                          onClick={() =>
                            setEnrollmentPage((page) => Math.max(1, page - 1))
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={
                            enrollmentPagination.page === enrollmentPagination.totalPages
                          }
                          onClick={() =>
                            setEnrollmentPage((page) =>
                              Math.min(enrollmentPagination.totalPages, page + 1)
                            )
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
        )}

        {activeTab === 'topic-requests' && (
          <div className="grid gap-6">
            {requestToCreateSession && (
              <SessionForm
                key={requestToCreateSession.id}
                teacherId={user?.id}
                initialValues={buildSessionDraftFromTopicRequest(
                  requestToCreateSession
                )}
                title="Create Session From Topic Request"
                description="The selected topic request has already filled in the subject, title, and description. Complete the remaining session details to publish it."
                submitLabel="Create session and approve request"
                successMessage="Session created. Linking it to the topic request..."
                onCancel={() => setRequestToCreateSession(null)}
                onCreated={handleSessionCreatedFromRequest}
              />
            )}

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Topic Requests
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Review student demand, handle anonymous submissions, and
                    turn approved requests into sessions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refetchTopicRequests}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Refresh
                </button>
              </div>

              {topicRequestActionMessage && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <div className="flex items-start justify-between gap-3">
                    <p>{topicRequestActionMessage}</p>
                    <button
                      type="button"
                      onClick={clearTopicRequestActionMessage}
                      className="text-emerald-700 hover:text-emerald-900"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {topicRequestsLoading && (
                <LoadingState message="Loading topic requests..." />
              )}

              {!topicRequestsLoading && topicRequestsError && (
                <ErrorState
                  message={topicRequestsError}
                  onRetry={refetchTopicRequests}
                />
              )}

              {!topicRequestsLoading && !topicRequestsError && (
                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Student Requests
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Non-anonymous requests sorted by votes.
                      </p>
                    </div>

                    {studentRequests.length === 0 ? (
                      <EmptyState
                        title="No student requests yet"
                        message="Public topic requests from signed-in students will appear here."
                      />
                    ) : (
                      <ul className="grid gap-4" aria-label="Student topic requests">
                        {studentRequests.map((request) => (
                          <li
                            key={request.id}
                            className="rounded-xl border border-gray-200 bg-white p-4"
                          >
                            <TopicRequestCard
                              request={request}
                              voteLabel={`${request.vote_count || 0} vote${
                                request.vote_count === 1 ? '' : 's'
                              }`}
                              updating={updatingTopicRequestId === request.id}
                              onApprove={() => handleApproveWithoutSession(request)}
                              onCreateSession={() =>
                                handleStartSessionCreation(request)
                              }
                              onReject={() => handleStartReject(request)}
                            />

                            {request.status === 'approved' &&
                              request.approved_session_id && (
                                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                  Linked session: {findSessionTitle(
                                    sessions,
                                    request.approved_session_id
                                  ) || request.approved_session_id}
                                </div>
                              )}

                            {request.status === 'rejected' &&
                              request.rejection_reason && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                  Rejection reason: {request.rejection_reason}
                                </div>
                              )}

                            {rejectingRequestId === request.id && (
                              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <label
                                  htmlFor={`rejection-reason-${request.id}`}
                                  className="block text-sm font-medium text-gray-700"
                                >
                                  Rejection reason (optional)
                                </label>
                                <textarea
                                  id={`rejection-reason-${request.id}`}
                                  value={rejectionReason}
                                  onChange={(event) =>
                                    setRejectionReason(event.target.value)
                                  }
                                  rows={3}
                                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  placeholder="Explain why this request is being rejected."
                                />
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmReject(request)}
                                    disabled={updatingTopicRequestId === request.id}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Confirm rejection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingRequestId(null)
                                      setRejectionReason('')
                                    }}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Anonymous Requests
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Private requests sorted by newest first.
                      </p>
                    </div>

                    {anonymousRequests.length === 0 ? (
                      <EmptyState
                        title="No anonymous requests yet"
                        message="Anonymous requests will appear here with the contact email provided."
                      />
                    ) : (
                      <ul className="grid gap-4" aria-label="Anonymous topic requests">
                        {anonymousRequests.map((request) => (
                          <li
                            key={request.id}
                            className="rounded-xl border border-gray-200 bg-white p-4"
                          >
                            <TopicRequestCard
                              request={request}
                              updating={updatingTopicRequestId === request.id}
                              onApprove={() => handleApproveWithoutSession(request)}
                              onReject={() => handleStartReject(request)}
                            />

                            {request.status === 'rejected' &&
                              request.rejection_reason && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                  Rejection reason: {request.rejection_reason}
                                </div>
                              )}

                            {rejectingRequestId === request.id && (
                              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <label
                                  htmlFor={`rejection-reason-${request.id}`}
                                  className="block text-sm font-medium text-gray-700"
                                >
                                  Rejection reason (optional)
                                </label>
                                <textarea
                                  id={`rejection-reason-${request.id}`}
                                  value={rejectionReason}
                                  onChange={(event) =>
                                    setRejectionReason(event.target.value)
                                  }
                                  rows={3}
                                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  placeholder="Explain why this request is being rejected."
                                />
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmReject(request)}
                                    disabled={updatingTopicRequestId === request.id}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Confirm rejection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingRequestId(null)
                                      setRejectionReason('')
                                    }}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}
            </section>
          </div>
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

const PaymentStatusBadge = ({ status }) => {
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

const PaymentProofImage = ({ path }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [imageError, setImageError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadProof = async () => {
      setImageUrl(null)
      setImageError(null)

      if (!path) return

      try {
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(path, 3600)

        if (error) throw error
        if (!cancelled) {
          setImageUrl(data.signedUrl)
        }
      } catch (err) {
        if (!cancelled) {
          setImageError('Unable to load payment screenshot.')
        }
      }
    }

    loadProof()

    return () => {
      cancelled = true
    }
  }, [path])

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Payment screenshot
      </p>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Student payment proof"
          className="mt-3 max-h-72 w-full rounded-lg border border-gray-200 object-contain bg-white"
        />
      )}
      {imageError && <p className="mt-2 text-sm text-red-700">{imageError}</p>}
      {!imageUrl && !imageError && (
        <p className="mt-2 text-sm text-gray-600">Loading payment screenshot...</p>
      )}
    </div>
  )
}

const TopicRequestCard = ({
  request,
  voteLabel,
  updating,
  onApprove,
  onCreateSession,
  onReject,
}) => (
  <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-blue-700">
            {request.subject || 'General'}
          </p>
          <RequestStatusBadge status={request.status} />
        </div>
        <h4 className="mt-1 text-lg font-semibold text-gray-900">
          {request.topic}
        </h4>
        {request.description && (
          <p className="mt-2 text-sm text-gray-600">{request.description}</p>
        )}
        {request.email && (
          <p className="mt-3 text-sm text-gray-600">
            Contact: <span className="font-medium text-gray-900">{request.email}</span>
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Submitted {formatDateTime(request.created_at)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        {voteLabel && (
          <span className="text-sm font-semibold text-gray-900">{voteLabel}</span>
        )}

        {request.status === 'pending' && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onApprove}
              disabled={updating}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Approve
            </button>
            {onCreateSession && (
              <button
                type="button"
                onClick={onCreateSession}
                disabled={updating}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve & create session
              </button>
            )}
            <button
              type="button"
              onClick={onReject}
              disabled={updating}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  </>
)

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

const findSessionTitle = (sessions, sessionId) => {
  if (!Array.isArray(sessions) || !sessionId) return null
  return sessions.find((session) => session.id === sessionId)?.title || null
}
