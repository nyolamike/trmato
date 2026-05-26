import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

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
        .select('*')
        .eq('created_by', teacherId)
        .order('scheduled_at', { ascending: true })

      if (sessionsError) {
        throw sessionsError
      }

      const sessionIds = (sessionsData || []).map((session) => session.id)

      let tagsData = []
      if (sessionIds.length > 0) {
        const { data: fetchedTags, error: tagsError } = await supabase
          .from('session_tags')
          .select('session_id, tag')
          .in('session_id', sessionIds)

        if (tagsError) {
          throw tagsError
        }

        tagsData = fetchedTags || []
      }

      const tagsBySessionId = tagsData.reduce((accumulator, tagRow) => {
        if (!accumulator[tagRow.session_id]) {
          accumulator[tagRow.session_id] = []
        }

        accumulator[tagRow.session_id].push(tagRow.tag)
        return accumulator
      }, {})

      setSessions(
        (sessionsData || []).map((session) => ({
          ...session,
          tags: (tagsBySessionId[session.id] || []).sort((a, b) =>
            a.localeCompare(b)
          ),
        }))
      )
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
