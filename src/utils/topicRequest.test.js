import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  TOPIC_MAX_LENGTH,
  TOPIC_MIN_LENGTH,
  applyVoteCountUpdate,
  buildTopicRequestInsertPayload,
  canStudentAddVote,
  countVotesForRequest,
  sortAnonymousTopicRequests,
  sortStudentTopicRequests,
  validateTopicRequestForm,
} from './topicRequest'

const buildValidForm = (overrides = {}) => ({
  subject: 'Biology',
  topic: 'Cell division revision',
  description: 'Cover mitosis and meiosis with exam-style questions.',
  email: 'student@example.com',
  ...overrides,
})

const topicRequestArb = fc.record({
  id: fc.uuid(),
  student_id: fc.option(fc.uuid(), { nil: null }),
  subject: fc.string({ minLength: 3, maxLength: 20 }),
  topic: fc.string({ minLength: TOPIC_MIN_LENGTH, maxLength: TOPIC_MAX_LENGTH }),
  description: fc.option(fc.string({ maxLength: 300 }), { nil: null }),
  email: fc.option(fc.emailAddress(), { nil: null }),
  status: fc.constantFrom('pending', 'approved', 'rejected'),
  is_anonymous: fc.boolean(),
  vote_count: fc.integer({ min: 0, max: 500 }),
  created_at: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
})

describe('topicRequest utilities', () => {
  describe('Property 102: Topic Request Topic Length Validation (Req 17.2)', () => {
    it('accepts only topics whose trimmed length is between the allowed bounds', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 240 }), (length) => {
          const topic = 'a'.repeat(length)
          const errors = validateTopicRequestForm(buildValidForm({ topic }), true)
          const shouldBeValid =
            length >= TOPIC_MIN_LENGTH && length <= TOPIC_MAX_LENGTH

          expect(Boolean(errors.topic)).toBe(!shouldBeValid)
        }),
        { numRuns: 60 }
      )
    })
  })

  describe('Property 104: Anonymous Request Email Requirement (Req 17.4)', () => {
    it('requires a valid email for anonymous submissions', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.string({ minLength: 1, maxLength: 20 }).filter((value) => !value.includes('@'))
          ),
          (email) => {
            const errors = validateTopicRequestForm(
              buildValidForm({ email }),
              false
            )

            expect(errors.email).toBeTruthy()
          }
        ),
        { numRuns: 40 }
      )
    })

    it('accepts valid email addresses for anonymous submissions', () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const errors = validateTopicRequestForm(
            buildValidForm({ email }),
            false
          )

          expect(errors.email).toBeUndefined()
        }),
        { numRuns: 40 }
      )
    })
  })

  describe('Property 106: Topic Request Default Status (Req 17.6)', () => {
    it('always sets status to pending for new requests', () => {
      fc.assert(
        fc.property(
          fc.record({
            subject: fc.string({ minLength: 1, maxLength: 20 }),
            topic: fc.string({ minLength: TOPIC_MIN_LENGTH, maxLength: TOPIC_MAX_LENGTH }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: '' }),
            email: fc.emailAddress(),
          }),
          fc.option(fc.uuid(), { nil: null }),
          (formData, studentId) => {
            const payload = buildTopicRequestInsertPayload(formData, {
              studentId,
              userEmail: 'student@example.com',
            })

            expect(payload.status).toBe('pending')
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  it('sanitizes topic request text before building the insert payload', () => {
    expect(
      buildTopicRequestInsertPayload(
        buildValidForm({
          topic: '  <b>Waves</b>  ',
          description: '  Use <img src=x onerror=alert(1)> examples.  ',
        }),
        {
          studentId: 'student-1',
          userEmail: 'student@example.com',
        }
      )
    ).toMatchObject({
      topic: '&lt;b&gt;Waves&lt;/b&gt;',
      description: 'Use &lt;img src=x onerror=alert(1)&gt; examples.',
    })
  })

  describe('Property 120: Vote Uniqueness Per Student Per Request (Req 20.3)', () => {
    it('prevents duplicate votes for the same student/request pair', () => {
      fc.assert(
        fc.property(fc.uuid(), fc.uuid(), (studentId, requestId) => {
          const existingVote = { student_id: studentId, request_id: requestId }

          expect(canStudentAddVote([], studentId, requestId)).toBe(true)
          expect(canStudentAddVote([existingVote], studentId, requestId)).toBe(false)
          expect(countVotesForRequest([existingVote], requestId)).toBe(1)
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 123: Vote Count Update on Vote (Req 20.6)', () => {
    it('increments vote_count by 1 when a vote is added', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            vote_count: fc.integer({ min: 0, max: 1000 }),
          }),
          (request) => {
            const updated = applyVoteCountUpdate(request, 1)
            expect(updated.vote_count).toBe((request.vote_count || 0) + 1)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 124: Vote Count Update on Unvote (Req 20.7)', () => {
    it('decrements vote_count by 1 when a vote is removed', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            vote_count: fc.integer({ min: 0, max: 1000 }),
          }),
          (request) => {
            const updated = applyVoteCountUpdate(request, -1)
            expect(updated.vote_count).toBe(
              Math.max(0, (request.vote_count || 0) - 1)
            )
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 112: Student Requests Sorting by Votes (Req 19.1)', () => {
    it('returns only non-anonymous student requests sorted by descending vote_count', () => {
      fc.assert(
        fc.property(fc.array(topicRequestArb, { minLength: 0, maxLength: 40 }), (requests) => {
          const preparedRequests = requests.map((request) => ({
            ...request,
            is_anonymous: request.is_anonymous && !request.student_id,
            student_id: request.is_anonymous ? null : request.student_id || 'student-fallback',
          }))
          const sorted = sortStudentTopicRequests(preparedRequests)

          for (let index = 0; index < sorted.length; index += 1) {
            expect(sorted[index].is_anonymous).toBe(false)
            expect(sorted[index].student_id).toBeTruthy()

            if (index > 0) {
              expect(sorted[index - 1].vote_count).toBeGreaterThanOrEqual(
                sorted[index].vote_count
              )
            }
          }
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 113: Anonymous Requests Sorting by Date (Req 19.2)', () => {
    it('returns only anonymous requests sorted by newest created_at first', () => {
      fc.assert(
        fc.property(fc.array(topicRequestArb, { minLength: 0, maxLength: 40 }), (requests) => {
          const preparedRequests = requests.map((request) => ({
            ...request,
            is_anonymous: request.is_anonymous,
            student_id: request.is_anonymous ? null : request.student_id,
          }))
          const sorted = sortAnonymousTopicRequests(preparedRequests)

          for (let index = 0; index < sorted.length; index += 1) {
            expect(sorted[index].is_anonymous).toBe(true)
            expect(sorted[index].student_id).toBeFalsy()

            if (index > 0) {
              expect(
                new Date(sorted[index - 1].created_at).getTime()
              ).toBeGreaterThanOrEqual(new Date(sorted[index].created_at).getTime())
            }
          }
        }),
        { numRuns: 50 }
      )
    })
  })
})
