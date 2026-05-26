import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  TEACHER_ENROLLMENTS_PER_PAGE,
  applyPaymentStatusUpdate,
  canTeacherManageEnrollment,
  filterSessionsByTeacher,
  getEnrollmentPagination,
  groupEnrollmentsBySession,
  groupPaginatedEnrollmentsBySession,
  paginateEnrollments,
  PAYMENT_STATUS,
} from './teacherEnrollment'

const teacherIdArb = fc.uuid()
const otherTeacherIdArb = fc.uuid()

const sessionArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 10, maxLength: 80 }),
  subject: fc.string({ minLength: 3, maxLength: 20 }),
  scheduled_at: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
  created_by: fc.uuid(),
})

const enrollmentArb = fc.record({
  id: fc.uuid(),
  session_id: fc.uuid(),
  student_id: fc.uuid(),
  payment_status: fc.constantFrom('pending', 'approved', 'rejected'),
  payment_note: fc.option(fc.string({ minLength: 1, maxLength: 120 }), { nil: null }),
  enrolled_at: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
  session: sessionArb,
})

describe('teacherEnrollment utilities', () => {
  describe('Property 34: Teacher Session Ownership Filtering (Req 7.1)', () => {
    it('only sessions created by the teacher are returned', () => {
      fc.assert(
        fc.property(
          fc.array(sessionArb, { minLength: 0, maxLength: 30 }),
          teacherIdArb,
          (sessions, teacherId) => {
            const filtered = filterSessionsByTeacher(sessions, teacherId)

            for (const session of filtered) {
              expect(session.created_by).toBe(teacherId)
            }

            expect(filtered.length).toBe(
              sessions.filter((session) => session.created_by === teacherId).length
            )
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 35: Payment Status Transition on Approval (Req 7.6)', () => {
    it('approval always sets payment_status to approved', () => {
      fc.assert(
        fc.property(enrollmentArb, (enrollment) => {
          const updated = applyPaymentStatusUpdate(
            enrollment,
            PAYMENT_STATUS.APPROVED
          )

          expect(updated.payment_status).toBe(PAYMENT_STATUS.APPROVED)
          expect(updated.id).toBe(enrollment.id)
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 37: Session Enrollment Authorization (Req 7.8)', () => {
    it('only the session owner can manage an enrollment', () => {
      fc.assert(
        fc.property(enrollmentArb, teacherIdArb, (enrollment, teacherId) => {
          const expected = enrollment.session.created_by === teacherId
          expect(canTeacherManageEnrollment(enrollment, teacherId)).toBe(expected)
        }),
        { numRuns: 50 }
      )
    })

    it('denies management when teacher id is missing', () => {
      fc.assert(
        fc.property(enrollmentArb, (enrollment) => {
          expect(canTeacherManageEnrollment(enrollment, null)).toBe(false)
          expect(canTeacherManageEnrollment(enrollment, '')).toBe(false)
        }),
        { numRuns: 20 }
      )
    })
  })

  describe('grouping and pagination helpers', () => {
    it('groups enrollments under their session', () => {
      fc.assert(
        fc.property(
          fc.array(enrollmentArb, { minLength: 0, maxLength: 20 }),
          (enrollments) => {
            const groups = groupEnrollmentsBySession(enrollments)
            const groupedCount = groups.reduce(
              (total, group) => total + group.enrollments.length,
              0
            )

            expect(groupedCount).toBe(
              enrollments.filter((enrollment) => enrollment.session?.id).length
            )
          }
        ),
        { numRuns: 30 }
      )
    })

    it('paginates enrollments with a fixed page size', () => {
      fc.assert(
        fc.property(
          fc.array(enrollmentArb, { minLength: 0, maxLength: 45 }),
          fc.integer({ min: 1, max: 5 }),
          (enrollments, page) => {
            const pagination = getEnrollmentPagination(
              enrollments,
              page,
              TEACHER_ENROLLMENTS_PER_PAGE
            )

            expect(pagination.items.length).toBeLessThanOrEqual(
              TEACHER_ENROLLMENTS_PER_PAGE
            )
            expect(pagination.totalItems).toBe(enrollments.length)
            expect(pagination.page).toBeGreaterThanOrEqual(1)
            expect(pagination.page).toBeLessThanOrEqual(pagination.totalPages)
          }
        ),
        { numRuns: 30 }
      )
    })

    it('returns grouped slices for the current page only', () => {
      const enrollments = [
        {
          id: 'e1',
          session_id: 's1',
          session: { id: 's1', title: 'Session A', scheduled_at: '2030-01-01T10:00:00Z' },
        },
        {
          id: 'e2',
          session_id: 's1',
          session: { id: 's1', title: 'Session A', scheduled_at: '2030-01-01T10:00:00Z' },
        },
        {
          id: 'e3',
          session_id: 's2',
          session: { id: 's2', title: 'Session B', scheduled_at: '2030-02-01T10:00:00Z' },
        },
      ]

      const pageOne = groupPaginatedEnrollmentsBySession(enrollments, 1, 2)
      expect(pageOne.items).toHaveLength(2)
      expect(pageOne.groups).toHaveLength(1)
      expect(pageOne.groups[0].enrollments).toHaveLength(2)

      const pageTwo = paginateEnrollments(enrollments, 2, 2)
      expect(pageTwo).toHaveLength(1)
      expect(pageTwo[0].session_id).toBe('s2')
    })
  })
})
