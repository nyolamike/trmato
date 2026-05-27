import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  ENROLLMENTS_PER_PAGE,
  getTopicRequestsForStudent,
  getVisibleEnrollments,
  isUpcomingEnrollment,
  paginateItems,
  shouldShowMeetLink,
} from './studentDashboard'

const statusArb = fc.constantFrom('upcoming', 'completed', 'cancelled')
const paymentStatusArb = fc.constantFrom('pending', 'approved', 'rejected')

const enrollmentArb = fc.record({
  id: fc.uuid(),
  payment_status: paymentStatusArb,
  session: fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 3, maxLength: 60 }),
    status: statusArb,
    scheduled_at: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
    meet_link: fc.option(fc.webUrl(), { nil: undefined }),
  }),
})

const topicRequestArb = fc.record({
  id: fc.uuid(),
  student_id: fc.option(fc.uuid(), { nil: null }),
  subject: fc.string({ minLength: 3, maxLength: 20 }),
  topic: fc.string({ minLength: 5, maxLength: 80 }),
  created_at: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
})

describe('studentDashboard utilities', () => {
  describe('Property 19: Student Enrollment Filtering (Req 5.1)', () => {
    it('upcoming view returns only upcoming enrollments and past view excludes them', () => {
      fc.assert(
        fc.property(
          fc.array(enrollmentArb, { minLength: 0, maxLength: 30 }),
          fc.date({ noInvalidDate: true }),
          (enrollments, now) => {
            const upcoming = getVisibleEnrollments(enrollments, 'upcoming', now)
            const past = getVisibleEnrollments(enrollments, 'past', now)

            for (const enrollment of upcoming) {
              expect(isUpcomingEnrollment(enrollment, now)).toBe(true)
            }

            for (const enrollment of past) {
              expect(isUpcomingEnrollment(enrollment, now)).toBe(false)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 20: Meet Link Conditional Visibility (Req 5.3 / 5.4)', () => {
    it('meet links are visible iff payment is approved and a meet link exists', () => {
      fc.assert(
        fc.property(enrollmentArb, (enrollment) => {
          const expected =
            enrollment.payment_status === 'approved' &&
            typeof enrollment.session.meet_link === 'string' &&
            enrollment.session.meet_link.length > 0

          expect(shouldShowMeetLink(enrollment)).toBe(expected)
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 108: Student Topic Request Filtering (Req 18.1)', () => {
    it('only requests owned by the current student are returned', () => {
      fc.assert(
        fc.property(
          fc.array(topicRequestArb, { minLength: 0, maxLength: 30 }),
          fc.uuid(),
          (requests, studentId) => {
            const visible = getTopicRequestsForStudent(requests, studentId)

            for (const request of visible) {
              expect(request.student_id).toBe(studentId)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('paginateItems', () => {
    it(`defaults to ${ENROLLMENTS_PER_PAGE} items per page`, () => {
      const items = Array.from({ length: 25 }, (_, index) => index + 1)
      expect(paginateItems(items, 1)).toEqual(items.slice(0, ENROLLMENTS_PER_PAGE))
      expect(paginateItems(items, 2)).toEqual(items.slice(ENROLLMENTS_PER_PAGE))
    })

    it('returns an empty array for non-array input', () => {
      expect(paginateItems(null)).toEqual([])
      expect(paginateItems(undefined)).toEqual([])
      expect(paginateItems('oops')).toEqual([])
    })
  })

  describe('getTopicRequestsForStudent', () => {
    it('sorts matching requests newest-first', () => {
      const studentId = 'student-1'
      const requests = [
        {
          id: 'a',
          student_id: studentId,
          topic: 'Older',
          created_at: '2030-01-01T10:00:00Z',
        },
        {
          id: 'b',
          student_id: 'student-2',
          topic: 'Other student',
          created_at: '2030-01-03T10:00:00Z',
        },
        {
          id: 'c',
          student_id: studentId,
          topic: 'Newest',
          created_at: '2030-01-02T10:00:00Z',
        },
      ]

      expect(getTopicRequestsForStudent(requests, studentId).map((request) => request.id)).toEqual([
        'c',
        'a',
      ])
    })
  })
})
