import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildTopicRequestApprovalPayload,
  buildTopicRequestRejectionPayload,
  sortAnonymousTopicRequests,
  sortStudentTopicRequests,
} from '../utils/topicRequest'
import { supabase } from '../utils/supabase'

const mapTopicRequestRow = (row, voteCount) => ({
  id: row.id,
  student_id: row.student_id,
  subject: row.subject,
  topic: row.topic,
  description: row.description,
  email: row.email,
  status: row.status,
  is_anonymous: row.is_anonymous,
  approved_session_id: row.approved_session_id,
  rejection_reason: row.rejection_reason,
  created_at: row.created_at,
  vote_count: voteCount,
})

const TOPIC_REQUEST_COLUMNS = `
  id,
  student_id,
  subject,
  topic,
  description,
  email,
  status,
  is_anonymous,
  approved_session_id,
  rejection_reason,
  created_at
`

export const useTeacherTopicRequests = (teacherId) => {
  const [topicRequests, setTopicRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  const fetchTopicRequests = useCallback(async () => {
    if (!teacherId) {
      setTopicRequests([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('topic_requests')
        .select(TOPIC_REQUEST_COLUMNS)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      const requestIds = (requestsData || []).map((request) => request.id)
      let voteCountsByRequestId = {}

      if (requestIds.length > 0) {
        const { data: votesData, error: votesError } = await supabase
          .from('topic_request_votes')
          .select('request_id')
          .in('request_id', requestIds)

        if (votesError) throw votesError

        voteCountsByRequestId = (votesData || []).reduce((counts, vote) => {
          counts[vote.request_id] = (counts[vote.request_id] || 0) + 1
          return counts
        }, {})
      }

      setTopicRequests(
        (requestsData || []).map((request) =>
          mapTopicRequestRow(request, voteCountsByRequestId[request.id] || 0)
        )
      )
    } catch (fetchError) {
      console.error('Failed to fetch teacher topic requests:', fetchError)
      setTopicRequests([])
      setError('Unable to load topic requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTopicRequests()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchTopicRequests])

  const studentRequests = useMemo(
    () => sortStudentTopicRequests(topicRequests),
    [topicRequests]
  )

  const anonymousRequests = useMemo(
    () => sortAnonymousTopicRequests(topicRequests),
    [topicRequests]
  )

  const updateRequest = useCallback(
    async (request, payload, message) => {
      if (!teacherId || !request?.id) {
        setActionMessage(null)
        setError('Unable to update topic request. Please try again.')
        return { ok: false }
      }

      setUpdatingId(request.id)
      setError(null)
      setActionMessage(null)

      try {
        const { data, error: updateError } = await supabase
          .from('topic_requests')
          .update(payload)
          .eq('id', request.id)
          .select(TOPIC_REQUEST_COLUMNS)
          .single()

        if (updateError) throw updateError

        const updatedRequest = mapTopicRequestRow(data, request.vote_count || 0)
        setTopicRequests((currentRequests) =>
          currentRequests.map((row) =>
            row.id === updatedRequest.id ? updatedRequest : row
          )
        )
        setActionMessage(message)
        return { ok: true, request: updatedRequest }
      } catch (updateFailure) {
        console.error('Failed to update topic request:', updateFailure)
        setError('Unable to update topic request. Please try again.')
        return { ok: false }
      } finally {
        setUpdatingId(null)
      }
    },
    [teacherId]
  )

  const approveRequest = useCallback(
    (request, approvedSessionId = null) =>
      updateRequest(
        request,
        buildTopicRequestApprovalPayload(approvedSessionId),
        approvedSessionId
          ? 'Topic request approved and linked to a new session.'
          : 'Topic request approved successfully.'
      ),
    [updateRequest]
  )

  const rejectRequest = useCallback(
    (request, reason = '') =>
      updateRequest(
        request,
        buildTopicRequestRejectionPayload(reason),
        'Topic request rejected successfully.'
      ),
    [updateRequest]
  )

  const clearActionMessage = useCallback(() => {
    setActionMessage(null)
  }, [])

  return {
    topicRequests,
    studentRequests,
    anonymousRequests,
    loading,
    error,
    updatingId,
    actionMessage,
    refetch: fetchTopicRequests,
    approveRequest,
    rejectRequest,
    clearActionMessage,
  }
}

export default useTeacherTopicRequests
