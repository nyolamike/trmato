import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

const mapTeacherSessionRow = (session) => {
  const { session_tags: sessionTags = [], ...sessionFields } = session

  return {
    ...sessionFields,
    tags: sessionTags
    .map((tagRow) => tagRow.tag)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b)),
  }
}

export const useTeacherSessions = (teacherId) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSessions = useCallback(async () => {
    if (!teacherId) {
      setSessions([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          session_tags (
            tag
          )
        `)
        .eq('created_by', teacherId)
        .order('scheduled_at', { ascending: true })

      if (sessionsError) {
        throw sessionsError
      }

      setSessions((sessionsData || []).map(mapTeacherSessionRow))
    } catch (fetchError) {
      console.error('Failed to fetch teacher sessions:', fetchError)
      setSessions([])
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchSessions()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchSessions])

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
  }
}

export default useTeacherSessions
