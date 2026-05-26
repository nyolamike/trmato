import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

/**
 * useEnrollment
 *
 * Manages the authenticated student's enrollment state for a single session:
 *   - looks up an existing enrollment row (so we can prevent duplicates and
 *     surface "already enrolled" UI)
 *   - uploads a payment screenshot to the `payment-proofs` Storage bucket
 *   - inserts a new enrollment row with payment_status = 'pending'
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 11.2
 *
 * @param {object} options
 * @param {string|null} options.sessionId  Session being viewed.
 * @param {object|null} options.user       Authenticated user profile (must be a student).
 *
 * @returns {{
 *   existingEnrollment: object|null,
 *   loading: boolean,
 *   submitting: boolean,
 *   error: string|null,
 *   successMessage: string|null,
 *   submit: (input: {screenshot?: File, note?: string}) => Promise<{ok: boolean}>,
 *   reset: () => void,
 * }}
 */
export function useEnrollment({ sessionId, user }) {
  const [existingEnrollment, setExistingEnrollment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const studentId = user?.role === 'student' ? user.id : null

  const fetchExisting = useCallback(async (skipReset = false) => {
    if (!skipReset) {
      // Reset transient state when the target session/student changes.
      setSuccessMessage(null)
      setError(null)
      setExistingEnrollment(null)
    }

    if (!sessionId || !studentId) return

    setLoading(true)
    try {
      // `maybeSingle()` returns null instead of throwing when no row is found.
      const { data, error: queryError } = await supabase
        .from('enrollments')
        .select('id, payment_status, payment_screenshot, payment_note, enrolled_at')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .maybeSingle()
      if (queryError) throw queryError
      setExistingEnrollment(data || null)
    } catch (err) {
      console.error('Failed to load existing enrollment:', err)
      setError('Unable to check enrollment status. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId, studentId])

  useEffect(() => {
    // Defer to the next microtask so setState calls inside fetchExisting do
    // not run synchronously inside this effect (avoids the
    // react-hooks/set-state-in-effect cascading-render warning, same trick
    // used in AuthContext.jsx).
    const timer = window.setTimeout(() => {
      fetchExisting()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchExisting])

  const reset = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const submit = useCallback(
    async ({ screenshot, note } = {}) => {
      if (!sessionId || !studentId) {
        setError('You must be signed in as a student to enroll.')
        return { ok: false }
      }

      const trimmedNote = typeof note === 'string' ? note.trim() : ''
      const hasScreenshot = screenshot instanceof File
      const hasNote = trimmedNote.length > 0

      // Requirement 4.2 / 11.2: at least one form of payment proof required.
      if (!hasScreenshot && !hasNote) {
        setError('Please provide payment proof')
        return { ok: false }
      }

      // Requirement 4.4: prevent duplicate enrollments client-side; the unique
      // constraint enforces it server-side as well.
      if (existingEnrollment) {
        setError('You are already enrolled in this session')
        return { ok: false }
      }

      setSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      try {
        let screenshotPath = null

        if (hasScreenshot) {
          // Path layout: {studentId}/{sessionId}/{timestamp}_{filename}
          const safeName = screenshot.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const objectPath = `${studentId}/${sessionId}/${Date.now()}_${safeName}`

          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(objectPath, screenshot, {
              contentType: screenshot.type || 'application/octet-stream',
              upsert: false,
            })

          if (uploadError) throw uploadError
          screenshotPath = objectPath
        }

        const { data: inserted, error: insertError } = await supabase
          .from('enrollments')
          .insert({
            session_id: sessionId,
            student_id: studentId,
            payment_status: 'pending',
            payment_screenshot: screenshotPath,
            payment_note: hasNote ? trimmedNote : null,
          })
          .select('id, payment_status, payment_screenshot, payment_note, enrolled_at')
          .single()

        if (insertError) {
          // Postgres unique_violation -> we're racing a duplicate insert.
          if (insertError.code === '23505') {
            setError('You are already enrolled in this session')
            await fetchExisting(true)
            return { ok: false }
          }
          throw insertError
        }

        setExistingEnrollment(inserted)
        setSuccessMessage('Payment under review. We will notify you once it is approved.')
        return { ok: true }
      } catch (err) {
        console.error('Enrollment submission failed:', err)
        setError(err?.message || 'Failed to submit enrollment. Please try again.')
        return { ok: false }
      } finally {
        setSubmitting(false)
      }
    },
    [sessionId, studentId, existingEnrollment, fetchExisting]
  )

  return {
    existingEnrollment,
    loading,
    submitting,
    error,
    successMessage,
    submit,
    reset,
  }
}

export default useEnrollment
