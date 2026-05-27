export const TEACHER_ENROLLMENTS_PER_PAGE = 20

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

/**
 * Property 34: only sessions owned by the teacher should appear in admin views.
 */
export const filterSessionsByTeacher = (sessions, teacherId) => {
  if (!Array.isArray(sessions) || !teacherId) return []

  return sessions.filter((session) => session?.created_by === teacherId)
}

/**
 * Property 37: teachers may manage enrollments only for sessions they created.
 */
export const canTeacherManageEnrollment = (enrollment, teacherId) => {
  if (!enrollment || !teacherId) return false

  const sessionOwner =
    enrollment?.session?.created_by ?? enrollment?.session_created_by

  return sessionOwner === teacherId
}

/**
 * Property 35 / 36: approval and rejection always set the target status.
 */
export const applyPaymentStatusUpdate = (enrollment, nextStatus) => {
  if (!enrollment || !nextStatus) return enrollment

  return {
    ...enrollment,
    payment_status: nextStatus,
  }
}

export const groupEnrollmentsBySession = (enrollments) => {
  if (!Array.isArray(enrollments)) return []

  const groups = new Map()

  for (const enrollment of enrollments) {
    const sessionId = enrollment?.session?.id ?? enrollment?.session_id
    if (!sessionId) continue

    if (!groups.has(sessionId)) {
      groups.set(sessionId, {
        session: enrollment.session || {
          id: sessionId,
          title: enrollment.session_title,
          subject: enrollment.session_subject,
          scheduled_at: enrollment.session_scheduled_at,
        },
        enrollments: [],
      })
    }

    groups.get(sessionId).enrollments.push(enrollment)
  }

  return [...groups.values()].sort((left, right) => {
    const leftDate = new Date(left.session?.scheduled_at || 0).getTime()
    const rightDate = new Date(right.session?.scheduled_at || 0).getTime()
    return leftDate - rightDate
  })
}

export const paginateEnrollments = (
  enrollments,
  page = 1,
  pageSize = TEACHER_ENROLLMENTS_PER_PAGE
) => {
  if (!Array.isArray(enrollments)) return []

  const safePageSize = Math.max(1, Number(pageSize) || TEACHER_ENROLLMENTS_PER_PAGE)
  const safePage = Math.max(1, Number(page) || 1)
  const start = (safePage - 1) * safePageSize

  return enrollments.slice(start, start + safePageSize)
}

export const getEnrollmentPagination = (
  enrollments,
  page = 1,
  pageSize = TEACHER_ENROLLMENTS_PER_PAGE
) => {
  const totalItems = Array.isArray(enrollments) ? enrollments.length : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)))
  const safePage = Math.min(Math.max(1, page), totalPages)

  return {
    page: safePage,
    totalPages,
    totalItems,
    items: paginateEnrollments(enrollments, safePage, pageSize),
  }
}

export const groupPaginatedEnrollmentsBySession = (
  enrollments,
  page = 1,
  pageSize = TEACHER_ENROLLMENTS_PER_PAGE
) => {
  const pagination = getEnrollmentPagination(enrollments, page, pageSize)
  return {
    ...pagination,
    groups: groupEnrollmentsBySession(pagination.items),
  }
}
