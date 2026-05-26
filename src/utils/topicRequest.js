export const TOPIC_MIN_LENGTH = 5
export const TOPIC_MAX_LENGTH = 200
export const DESCRIPTION_MAX_LENGTH = 1000
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const DEFAULT_TOPIC_REQUEST_FORM_VALUES = {
  subject: '',
  topic: '',
  description: '',
  email: '',
}

export const TOPIC_REQUEST_SUBJECTS = [
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'English',
  'Geography',
  'History',
]

export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false
  return EMAIL_REGEX.test(email.trim())
}

export const validateTopicRequestForm = (formData, isAuthenticated) => {
  const safeValues = formData || DEFAULT_TOPIC_REQUEST_FORM_VALUES
  const errors = {}

  const subject = safeValues.subject?.trim() || ''
  const topic = safeValues.topic?.trim() || ''
  const description = safeValues.description?.trim() || ''
  const email = safeValues.email?.trim() || ''

  if (!subject) {
    errors.subject = 'Subject is required.'
  }

  if (!topic) {
    errors.topic = 'Topic is required.'
  } else if (topic.length < TOPIC_MIN_LENGTH) {
    errors.topic = 'Topic must be at least 5 characters'
  } else if (topic.length > TOPIC_MAX_LENGTH) {
    errors.topic = 'Topic must be 200 characters or less'
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = 'Description must be 1000 characters or less'
  }

  if (!isAuthenticated) {
    if (!email) {
      errors.email = 'Email is required for anonymous requests'
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address'
    }
  } else if (email && !isValidEmail(email)) {
    errors.email = 'Please enter a valid email address'
  }

  return errors
}

export const buildTopicRequestInsertPayload = (
  formData,
  { studentId = null, userEmail = null } = {}
) => {
  const isAuthenticated = Boolean(studentId)
  const trimmedEmail = formData?.email?.trim() || ''

  return {
    subject: formData.subject.trim(),
    topic: formData.topic.trim(),
    description: formData.description?.trim() || null,
    email: trimmedEmail || (isAuthenticated ? userEmail || null : null),
    status: REQUEST_STATUS.PENDING,
    is_anonymous: !isAuthenticated,
    student_id: studentId,
  }
}

export const filterPublicTopicRequests = (requests) => {
  if (!Array.isArray(requests)) return []

  return requests.filter(
    (request) =>
      request?.is_anonymous === false &&
      [REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED].includes(request?.status)
  )
}

export const filterStudentTopicRequests = (requests) => {
  if (!Array.isArray(requests)) return []

  return requests.filter(
    (request) => request?.is_anonymous === false && Boolean(request?.student_id)
  )
}

export const filterAnonymousTopicRequests = (requests) => {
  if (!Array.isArray(requests)) return []

  return requests.filter(
    (request) => request?.is_anonymous === true && !request?.student_id
  )
}

export const sortTopicRequestsByVoteCount = (requests) => {
  if (!Array.isArray(requests)) return []

  return [...requests].sort((left, right) => {
    const voteDifference = (right?.vote_count || 0) - (left?.vote_count || 0)
    if (voteDifference !== 0) return voteDifference

    return new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime()
  })
}

export const sortStudentTopicRequests = (requests) =>
  sortTopicRequestsByVoteCount(filterStudentTopicRequests(requests))

export const sortAnonymousTopicRequests = (requests) => {
  if (!Array.isArray(requests)) return []

  return [...filterAnonymousTopicRequests(requests)].sort(
    (left, right) =>
      new Date(right?.created_at || 0).getTime() -
      new Date(left?.created_at || 0).getTime()
  )
}

export const applyVoteCountUpdate = (request, delta) => {
  if (!request) return request

  return {
    ...request,
    vote_count: Math.max(0, (request.vote_count || 0) + delta),
  }
}

export const hasStudentVoted = (userVotes, requestId) => {
  if (!Array.isArray(userVotes) || !requestId) return false
  return userVotes.includes(requestId)
}

export const canStudentAddVote = (votes, studentId, requestId) => {
  if (!studentId || !requestId || !Array.isArray(votes)) return false

  return !votes.some(
    (vote) => vote?.student_id === studentId && vote?.request_id === requestId
  )
}

export const countVotesForRequest = (votes, requestId) => {
  if (!Array.isArray(votes) || !requestId) return 0

  return votes.filter((vote) => vote?.request_id === requestId).length
}

export const applyTopicRequestStatusUpdate = (
  request,
  nextStatus,
  overrides = {}
) => {
  if (!request || !nextStatus) return request

  return {
    ...request,
    ...overrides,
    status: nextStatus,
  }
}

export const buildTopicRequestRejectionPayload = (reason = '') => ({
  status: REQUEST_STATUS.REJECTED,
  approved_session_id: null,
  rejection_reason: reason.trim() || null,
})

export const buildTopicRequestApprovalPayload = (approvedSessionId = null) => ({
  status: REQUEST_STATUS.APPROVED,
  approved_session_id: approvedSessionId,
  rejection_reason: null,
})

export const buildSessionDraftFromTopicRequest = (request) => ({
  subject: request?.subject || '',
  title: request?.topic || '',
  description: request?.description || '',
  scheduled_at: '',
  price_ugx: '',
  meet_link: '',
  payment_number: '',
  payment_name: '',
})
