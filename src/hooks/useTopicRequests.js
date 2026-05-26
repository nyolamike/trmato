import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import {
  applyVoteCountUpdate,
  filterPublicTopicRequests,
  sortTopicRequestsByVoteCount,
} from '../utils/topicRequest'

export const useTopicRequests = (studentId) => {
  const [topicRequests, setTopicRequests] = useState([])
  const [userVotes, setUserVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [votingRequestId, setVotingRequestId] = useState(null)

  const fetchTopicRequests = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: requestsError } = await supabase
        .from('topic_requests_with_votes')
        .select(`
          id,
          subject,
          topic,
          description,
          status,
          vote_count,
          created_at,
          is_anonymous,
          student_id
        `)
        .eq('is_anonymous', false)
        .in('status', ['pending', 'approved'])
        .order('vote_count', { ascending: false })

      if (requestsError) throw requestsError

      const visibleRequests = sortTopicRequestsByVoteCount(
        filterPublicTopicRequests(data || [])
      )

      setTopicRequests(visibleRequests)

      if (studentId) {
        const requestIds = visibleRequests.map((request) => request.id)

        if (requestIds.length === 0) {
          setUserVotes([])
        } else {
          const { data: votes, error: votesError } = await supabase
            .from('topic_request_votes')
            .select('request_id')
            .eq('student_id', studentId)
            .in('request_id', requestIds)

          if (votesError) throw votesError

          setUserVotes((votes || []).map((vote) => vote.request_id))
        }
      } else {
        setUserVotes([])
      }
    } catch (fetchError) {
      console.error('Failed to fetch topic requests:', fetchError)
      setError('Unable to load topic requests. Please try again.')
      setTopicRequests([])
      setUserVotes([])
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

  const toggleVote = useCallback(
    async (requestId) => {
      if (!studentId) {
        return { ok: false, message: 'Please sign in to vote' }
      }

      const hasVoted = userVotes.includes(requestId)
      setVotingRequestId(requestId)

      try {
        if (hasVoted) {
          const { error: deleteError } = await supabase
            .from('topic_request_votes')
            .delete()
            .eq('request_id', requestId)
            .eq('student_id', studentId)

          if (deleteError) throw deleteError

          setUserVotes((currentVotes) =>
            currentVotes.filter((voteRequestId) => voteRequestId !== requestId)
          )
          setTopicRequests((currentRequests) =>
            currentRequests.map((request) =>
              request.id === requestId ? applyVoteCountUpdate(request, -1) : request
            )
          )
        } else {
          const { error: insertError } = await supabase
            .from('topic_request_votes')
            .insert({
              request_id: requestId,
              student_id: studentId,
            })

          if (insertError) throw insertError

          setUserVotes((currentVotes) => [...currentVotes, requestId])
          setTopicRequests((currentRequests) =>
            currentRequests.map((request) =>
              request.id === requestId ? applyVoteCountUpdate(request, 1) : request
            )
          )
        }

        return { ok: true }
      } catch (voteError) {
        console.error('Failed to toggle vote:', voteError)
        return { ok: false, message: 'Unable to update your vote. Please try again.' }
      } finally {
        setVotingRequestId(null)
      }
    },
    [studentId, userVotes]
  )

  return {
    topicRequests,
    userVotes,
    loading,
    error,
    votingRequestId,
    refetch: fetchTopicRequests,
    toggleVote,
  }
}

export default useTopicRequests
