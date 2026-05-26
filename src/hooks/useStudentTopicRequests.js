import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export const useStudentTopicRequests = (studentId) => {
  const [topicRequests, setTopicRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTopicRequests = useCallback(async () => {
    if (!studentId) {
      setTopicRequests([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: requestsError } = await supabase
        .from('topic_requests')
        .select(`
          id,
          student_id,
          subject,
          topic,
          description,
          status,
          approved_session_id,
          rejection_reason,
          created_at
        `)
        .eq('student_id', studentId)

      if (requestsError) throw requestsError

      const requests = data || []
      const requestIds = requests.map((request) => request.id)
      const approvedSessionIds = [
        ...new Set(requests.map((request) => request.approved_session_id).filter(Boolean)),
      ]

      let voteCountsByRequestId = {}
      if (requestIds.length > 0) {
        const { data: votes, error: votesError } = await supabase
          .from('topic_request_votes')
          .select('request_id')
          .in('request_id', requestIds)

        if (votesError) throw votesError

        voteCountsByRequestId = (votes || []).reduce((accumulator, vote) => {
          accumulator[vote.request_id] = (accumulator[vote.request_id] || 0) + 1
          return accumulator
        }, {})
      }

      let sessionTitlesById = {}
      if (approvedSessionIds.length > 0) {
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, title')
          .in('id', approvedSessionIds)

        if (sessionsError) throw sessionsError

        sessionTitlesById = Object.fromEntries(
          (sessions || []).map((session) => [session.id, session.title])
        )
      }

      setTopicRequests(
        requests.map((request) => ({
          ...request,
          vote_count: voteCountsByRequestId[request.id] || 0,
          approved_session_title: request.approved_session_id
            ? sessionTitlesById[request.approved_session_id] || null
            : null,
        }))
      )
    } catch (fetchError) {
      console.error('Failed to fetch student topic requests:', fetchError)
      setError('Connection error. Please try again.')
      setTopicRequests([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTopicRequests()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchTopicRequests])

  return {
    topicRequests,
    loading,
    error,
    refetch: fetchTopicRequests,
  }
}

export default useStudentTopicRequests
