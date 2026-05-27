import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export const useStudentEnrollments = (studentId) => {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEnrollments = useCallback(async () => {
    if (!studentId) {
      setEnrollments([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          session_id,
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
            status
          )
        `)
        .eq('student_id', studentId)

      if (enrollmentsError) throw enrollmentsError

      const baseRows = (data || []).map((row) => ({
        id: row.id,
        session_id: row.session_id,
        payment_status: row.payment_status,
        payment_screenshot: row.payment_screenshot,
        payment_note: row.payment_note,
        enrolled_at: row.enrolled_at,
        session: row.sessions,
      }))

      const approvedSessionIds = [
        ...new Set(
          baseRows
            .filter((row) => row.payment_status === 'approved')
            .map((row) => row.session?.id)
            .filter(Boolean)
        ),
      ]

      let meetLinksBySessionId = {}

      if (approvedSessionIds.length > 0) {
        const { data: approvedSessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, meet_link')
          .in('id', approvedSessionIds)

        if (sessionsError) throw sessionsError

        meetLinksBySessionId = Object.fromEntries(
          (approvedSessions || []).map((session) => [session.id, session.meet_link])
        )
      }

      setEnrollments(
        baseRows.map((row) => ({
          ...row,
          session: {
            ...row.session,
            meet_link:
              row.payment_status === 'approved'
                ? meetLinksBySessionId[row.session?.id] || null
                : null,
          },
        }))
      )
    } catch (fetchError) {
      console.error('Failed to fetch student enrollments:', fetchError)
      setError('Connection error. Please try again.')
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchEnrollments()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchEnrollments])

  return {
    enrollments,
    loading,
    error,
    refetch: fetchEnrollments,
  }
}

export default useStudentEnrollments
