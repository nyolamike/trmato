export const ENROLLMENTS_PER_PAGE = 20

const getValidDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const isUpcomingEnrollment = (enrollment, now = new Date()) => {
  const scheduledAt = getValidDate(enrollment?.session?.scheduled_at)
  if (!scheduledAt) return false

  return (
    enrollment?.session?.status === 'upcoming' &&
    scheduledAt.getTime() >= now.getTime()
  )
}

export const shouldShowMeetLink = (enrollment) =>
  enrollment?.payment_status === 'approved' &&
  typeof enrollment?.session?.meet_link === 'string' &&
  enrollment.session.meet_link.length > 0

const sortByScheduledAt = (left, right, ascending) => {
  const leftDate = getValidDate(left?.session?.scheduled_at)
  const rightDate = getValidDate(right?.session?.scheduled_at)

  if (!leftDate && !rightDate) return 0
  if (!leftDate) return 1
  if (!rightDate) return -1

  return ascending
    ? leftDate.getTime() - rightDate.getTime()
    : rightDate.getTime() - leftDate.getTime()
}

export const getVisibleEnrollments = (
  enrollments,
  view = 'upcoming',
  now = new Date()
) => {
  if (!Array.isArray(enrollments)) return []

  const showPast = view === 'past'

  return enrollments
    .filter((enrollment) =>
      showPast
        ? !isUpcomingEnrollment(enrollment, now)
        : isUpcomingEnrollment(enrollment, now)
    )
    .sort((left, right) => sortByScheduledAt(left, right, !showPast))
}

export const paginateItems = (
  items,
  page = 1,
  pageSize = ENROLLMENTS_PER_PAGE
) => {
  if (!Array.isArray(items)) return []

  const safePageSize = Math.max(1, Number(pageSize) || ENROLLMENTS_PER_PAGE)
  const safePage = Math.max(1, Number(page) || 1)
  const start = (safePage - 1) * safePageSize

  return items.slice(start, start + safePageSize)
}

export const getTopicRequestsForStudent = (requests, studentId) => {
  if (!Array.isArray(requests) || !studentId) return []

  return requests
    .filter((request) => request?.student_id === studentId)
    .sort((left, right) => {
      const leftDate = getValidDate(left?.created_at)
      const rightDate = getValidDate(right?.created_at)

      if (!leftDate && !rightDate) return 0
      if (!leftDate) return 1
      if (!rightDate) return -1

      return rightDate.getTime() - leftDate.getTime()
    })
}
