import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useEnrollment } from '../hooks/useEnrollment'
import { TagPill } from './TagPill'

/**
 * SessionDetailModal
 *
 * Full-screen modal that shows the entire session record (description, video,
 * payment instructions, tags) plus the student enrollment form.
 *
 * The modal owns no session data of its own — `session` is passed in by the
 * LandingPage so that the filter state in the background grid stays intact
 * (Requirement 16.15). Closing the modal does not reset filters.
 *
 * Lazy loading: nothing is rendered (and no video is mounted) until `isOpen`
 * flips to true, so an idle landing page never downloads video metadata
 * (Requirement 12.2).
 *
 * Validates:
 *   2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9,
 *   4.1, 4.2, 4.3, 4.4, 4.5, 4.6,
 *   11.2, 11.11,
 *   12.2,
 *   14.5, 14.6,
 *   16.6, 16.15
 */

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const priceFormatter = new Intl.NumberFormat('en-UG', {
  style: 'currency',
  currency: 'UGX',
  maximumFractionDigits: 0,
})

const formatScheduledAt = (value) => {
  if (!value) return 'Date TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return dateFormatter.format(date)
}

const formatPrice = (priceUgx) => {
  if (priceUgx === null || priceUgx === undefined) return ''
  const numeric = Number(priceUgx)
  if (Number.isNaN(numeric)) return ''
  if (numeric === 0) return 'Free'
  return priceFormatter.format(numeric)
}

export const SessionDetailModal = ({ session, isOpen, onClose, onTagClick }) => {
  const { user } = useAuth()
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Lock background scroll while the modal is open and restore on close.
  useEffect(() => {
    if (!isOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  // Move focus to the close button when the modal opens for keyboard users.
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus?.()
    }
  }, [isOpen])

  if (!isOpen || !session) return null

  const titleId = `session-modal-title-${session.id}`

  const handleTagClick = (tag) => {
    onTagClick?.(tag)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-10"
    >
      <button
        type="button"
        aria-label="Close session details"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
      />

      <div className="relative z-10 flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {session.subject || 'General'}
            </span>
            <h2
              id={titleId}
              className="mt-2 text-xl font-semibold leading-snug text-gray-900 sm:text-2xl"
            >
              {session.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-2xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {session.explainer_video ? (
            <SessionVideo
              src={session.explainer_video}
              poster={session.video_thumbnail || undefined}
            />
          ) : null}

          {Array.isArray(session.tags) && session.tags.length > 0 && (
            <ul
              className="mt-4 flex flex-wrap gap-1.5"
              aria-label="Session tags"
            >
              {session.tags.map((tag) => (
                <li key={tag}>
                  <TagPill tag={tag} size="small" onClick={handleTagClick} />
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">
                When
              </dt>
              <dd className="font-medium text-gray-800">
                {formatScheduledAt(session.scheduled_at)}
              </dd>
            </div>
            <div className="sm:text-right">
              <dt className="text-xs uppercase tracking-wide text-gray-500">
                Price
              </dt>
              <dd className="font-semibold text-gray-900">
                {formatPrice(session.price_ugx)}
              </dd>
            </div>
          </dl>

          {session.description && (
            <section className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                About this session
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-700 sm:text-base">
                {session.description}
              </p>
            </section>
          )}

          <PaymentInstructions
            number={session.payment_number}
            name={session.payment_name}
            priceText={formatPrice(session.price_ugx)}
          />

          <EnrollmentSection session={session} user={user} />
        </div>
      </div>
    </div>
  )
}

const SessionVideo = ({ src, poster }) => {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
      >
        Video unavailable. You can still read the session description below.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video
        data-testid="session-video"
        src={src}
        poster={poster}
        autoPlay
        muted
        controls
        playsInline
        preload="metadata"
        onError={() => setHasError(true)}
        className="block h-auto w-full max-w-full"
      >
        Your browser does not support embedded video playback.
      </video>
    </div>
  )
}

const PaymentInstructions = ({ number, name, priceText }) => {
  if (!number && !name) return null
  return (
    <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-800">
        Payment instructions
      </h3>
      <p className="mt-2 text-sm text-blue-900">
        Send {priceText ? <strong>{priceText}</strong> : 'the session fee'} to the
        mobile money account below, then submit a screenshot or short note as
        proof.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-blue-900 sm:grid-cols-2">
        {number && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-blue-700">
              Mobile money number
            </dt>
            <dd className="font-mono font-medium">{number}</dd>
          </div>
        )}
        {name && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-blue-700">
              Account holder
            </dt>
            <dd className="font-medium">{name}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

const EnrollmentSection = ({ session, user }) => {
  const isStudent = user?.role === 'student'
  const isTeacher = user?.role === 'teacher'

  if (!user) {
    return (
      <section
        data-testid="enroll-signin-prompt"
        className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
      >
        Sign in as a student to enroll in this session.
      </section>
    )
  }

  if (isTeacher) {
    return (
      <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        You are signed in as a teacher. Switch to a student account to enroll.
      </section>
    )
  }

  if (!isStudent) return null

  return <EnrollmentForm sessionId={session.id} user={user} />
}

const EnrollmentForm = ({ sessionId, user }) => {
  const {
    existingEnrollment,
    loading,
    submitting,
    error,
    successMessage,
    submit,
  } = useEnrollment({ sessionId, user })

  const [screenshot, setScreenshot] = useState(null)
  const [note, setNote] = useState('')
  const [localError, setLocalError] = useState('')

  if (loading) {
    return (
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        Checking enrollment status…
      </section>
    )
  }

  if (existingEnrollment) {
    return (
      <section
        data-testid="already-enrolled"
        className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
      >
        <p className="font-medium">
          {successMessage
            ? successMessage
            : statusMessage(existingEnrollment.payment_status)}
        </p>
        {existingEnrollment.payment_status === 'pending' && !successMessage && (
          <p className="mt-1 text-emerald-800">
            We will email you once your payment is reviewed.
          </p>
        )}
      </section>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError('')
    const trimmedNote = note.trim()
    if (!screenshot && !trimmedNote) {
      setLocalError('Please provide payment proof')
      return
    }
    await submit({ screenshot: screenshot || undefined, note: trimmedNote })
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setScreenshot(file)
  }

  const visibleError = localError || error

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Enroll in this session
      </h3>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-3 flex flex-col gap-4"
      >
        <div>
          <label
            htmlFor="enrollment-screenshot"
            className="block text-sm font-medium text-gray-700"
          >
            Payment screenshot (optional)
          </label>
          <input
            id="enrollment-screenshot"
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            disabled={submitting}
            className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {screenshot && (
            <p className="mt-1 text-xs text-gray-500">
              Selected: {screenshot.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="enrollment-note"
            className="block text-sm font-medium text-gray-700"
          >
            Payment note (optional)
          </label>
          <textarea
            id="enrollment-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={submitting}
            rows={3}
            placeholder="e.g. Sent 5,000 UGX from 0700-... at 14:23"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <p className="text-xs text-gray-500">
          Provide at least one of the two above so the teacher can verify your
          payment.
        </p>

        {visibleError && (
          <p role="alert" className="text-sm text-red-700">
            {visibleError}
          </p>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {submitting ? 'Submitting…' : 'Submit enrollment'}
          </button>
        </div>
      </form>
    </section>
  )
}

const statusMessage = (status) => {
  switch (status) {
    case 'approved':
      return 'Your enrollment is approved. See your dashboard for the meet link.'
    case 'rejected':
      return 'Your previous enrollment was rejected. Please contact the teacher.'
    case 'pending':
    default:
      return 'Payment under review.'
  }
}

export default SessionDetailModal
