import { useCallback, useEffect, useState } from 'react'
import { canTeacherManageEnrollment, PAYMENT_STATUS } from '../utils/teacherEnrollment'
import { supabase } from '../utils/supabase'

const mapEnrollmentRow = (row) => ({
  id: row.id,
  session_id: row.session_id,
  student_id: row.student_id,
  payment_status: row.payment_status,
  payment_screenshot: row.payment_screenshot,
  payment_note: row.payment_note,
  enrolled_at: row.enrolled_at,
  session: row.sessions,
  student: row.student,
})

/**
 * Loads enrollments for sessions owned by the current teacher and exposes
 * approve/reject actions with client-side ownership checks.
 *
 * Validates: Requirements 7.2, 7.3, 7.6, 7.7, 7.8
 */
export const useTeacherEnrollments = (teacherId) => {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  const fetchEnrollments = useCallback(async () => {
    if (!teacherId) {
      setEnrollments([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('enrollments')
        .select(`
          id,
          session_id,
          student_id,
          payment_status,
          payment_screenshot,
          payment_note,
          enrolled_at,
          sessions!inner (
            id,
            title,
            subject,
            scheduled_at,
            price_ugx,
            created_by
          ),
          student:users!enrollments_student_id_fkey (
            id,
            username,
            email
          )
        `)
        .eq('sessions.created_by', teacherId)
        .order('enrolled_at', { ascending: false })

      if (queryError) throw queryError

      setEnrollments((data || []).map(mapEnrollmentRow))
    } catch (fetchError) {
      console.error('Failed to fetch teacher enrollments:', fetchError)
      setEnrollments([])
      setError('Unable to load enrollments. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchEnrollments()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchEnrollments])

  const updatePaymentStatus = useCallback(
    async (enrollment, nextStatus) => {
      if (!teacherId || !enrollment?.id) {
        setActionMessage(null)
        setError('Unable to update enrollment. Please try again.')
        return { ok: false }
      }

      if (!canTeacherManageEnrollment(enrollment, teacherId)) {
        setActionMessage(null)
        setError('You can only manage enrollments for your own sessions.')
        return { ok: false }
      }

      setUpdatingId(enrollment.id)
      setError(null)
      setActionMessage(null)

      try {
        const { data, error: updateError } = await supabase
          .from('enrollments')
          .update({ payment_status: nextStatus })
          .eq('id', enrollment.id)
          .select(`
            id,
            session_id,
            student_id,
            payment_status,
            payment_screenshot,
            payment_note,
            enrolled_at,
            sessions!inner (
              id,
              title,
              subject,
              scheduled_at,
              price_ugx,
              created_by
            ),
            student:users!enrollments_student_id_fkey (
              id,
              username,
              email
            )
          `)
          .single()

        if (updateError) throw updateError

        const updatedEnrollment = mapEnrollmentRow(data)

        setEnrollments((current) =>
          current.map((row) =>
            row.id === updatedEnrollment.id ? updatedEnrollment : row
          )
        )

        const label =
          nextStatus === PAYMENT_STATUS.APPROVED ? 'approved' : 'rejected'
        setActionMessage(`Enrollment ${label} successfully.`)
        return { ok: true, enrollment: updatedEnrollment }
      } catch (updateError) {
        console.error('Failed to update enrollment status:', updateError)
        setError('Unable to update enrollment. Please try again.')
        return { ok: false }
      } finally {
        setUpdatingId(null)
      }
    },
    [teacherId]
  )

  const approveEnrollment = useCallback(
    (enrollment) => updatePaymentStatus(enrollment, PAYMENT_STATUS.APPROVED),
    [updatePaymentStatus]
  )

  const rejectEnrollment = useCallback(
    (enrollment) => updatePaymentStatus(enrollment, PAYMENT_STATUS.REJECTED),
    [updatePaymentStatus]
  )

  const clearActionMessage = useCallback(() => {
    setActionMessage(null)
  }, [])

  return {
    enrollments,
    loading,
    error,
    updatingId,
    actionMessage,
    refetch: fetchEnrollments,
    approveEnrollment,
    rejectEnrollment,
    clearActionMessage,
  }
}

export default useTeacherEnrollments
