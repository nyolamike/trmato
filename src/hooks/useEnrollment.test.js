import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'

vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}))

import { useEnrollment } from './useEnrollment'
import { supabase } from '../utils/supabase'

const studentUser = { id: 'student-1', role: 'student' }

const blankNoteArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 12 })
  .map((chars) => chars.join(''))

const noteCharArb = fc.constantFrom(
  'a',
  'b',
  'c',
  '1',
  '2',
  '3',
  ' ',
  '-',
  ':'
)

const nonEmptyTrimmedNoteArb = fc
  .array(noteCharArb, { minLength: 1, maxLength: 30 })
  .map((chars) => chars.join(''))
  .filter((value) => value.trim().length > 0)

const existingEnrollmentArb = fc.record({
  id: fc.uuid(),
  payment_status: fc.constantFrom('pending', 'approved', 'rejected'),
})

const buildScreenshot = (name = 'proof.png', type = 'image/png') =>
  new File(['proof'], name, { type })

const setupEnrollmentSupabaseMocks = ({
  existingEnrollment = null,
  lookupError = null,
  insertedRow = {
    id: 'enr-1',
    payment_status: 'pending',
    payment_screenshot: null,
    payment_note: null,
    enrolled_at: '2030-01-01T10:00:00Z',
  },
  insertError = null,
  uploadError = null,
} = {}) => {
  supabase.from.mockReset()
  supabase.storage.from.mockReset()

  const maybeSingle = vi.fn().mockResolvedValue({
    data: existingEnrollment,
    error: lookupError,
  })
  const eqStudentId = vi.fn().mockReturnValue({ maybeSingle })
  const eqSessionId = vi.fn().mockReturnValue({ eq: eqStudentId })
  const selectForLookup = vi.fn().mockReturnValue({ eq: eqSessionId })

  const single = vi.fn().mockResolvedValue({
    data: insertError ? null : insertedRow,
    error: insertError,
  })
  const selectAfterInsert = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select: selectAfterInsert })

  supabase.from.mockImplementation((tableName) => {
    if (tableName !== 'enrollments') {
      throw new Error(`Unexpected table: ${tableName}`)
    }

    return {
      select: selectForLookup,
      insert,
    }
  })

  const upload = vi.fn().mockResolvedValue({
    data: uploadError ? null : { path: 'uploaded/proof.png' },
    error: uploadError,
  })

  supabase.storage.from.mockImplementation((bucketName) => {
    if (bucketName !== 'payment-proofs') {
      throw new Error(`Unexpected bucket: ${bucketName}`)
    }

    return { upload }
  })

  return {
    maybeSingle,
    insert,
    upload,
  }
}

const settleInitialLookup = async (maybeSingle) => {
  await waitFor(() => {
    expect(maybeSingle).toHaveBeenCalledTimes(1)
  })
}

describe('useEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Property 16: blank payment proof is always rejected (Req 4.2)', async () => {
    await fc.assert(
      fc.asyncProperty(blankNoteArb, async (blankNote) => {
        const mocks = setupEnrollmentSupabaseMocks()

        const { result, unmount } = renderHook(() =>
          useEnrollment({
            sessionId: 'session-1',
            user: studentUser,
          })
        )

        await settleInitialLookup(mocks.maybeSingle)

        let submitResult
        await act(async () => {
          submitResult = await result.current.submit({ note: blankNote })
        })

        expect(submitResult).toEqual({ ok: false })
        expect(mocks.insert).not.toHaveBeenCalled()
        expect(mocks.upload).not.toHaveBeenCalled()
        expect(result.current.error).toBe('Please provide payment proof')

        unmount()
      }),
      { numRuns: 20 }
    )
  }, 15000)

  it('Property 17: valid enrollments always start with payment_status=pending (Req 4.3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.boolean(),
        nonEmptyTrimmedNoteArb,
        async (hasScreenshot, hasNote, note) => {
          fc.pre(hasScreenshot || hasNote)

          const mocks = setupEnrollmentSupabaseMocks()

          const { result, unmount } = renderHook(() =>
            useEnrollment({
              sessionId: 'session-1',
              user: studentUser,
            })
          )

          await settleInitialLookup(mocks.maybeSingle)

          const screenshot = hasScreenshot ? buildScreenshot('proof image.png') : undefined
          const rawNote = hasNote ? `  ${note}  ` : undefined

          let submitResult
          await act(async () => {
            submitResult = await result.current.submit({
              screenshot,
              note: rawNote,
            })
          })

          expect(submitResult).toEqual({ ok: true })
          expect(mocks.insert).toHaveBeenCalledTimes(1)

          const payload = mocks.insert.mock.calls[0][0]
          expect(payload.session_id).toBe('session-1')
          expect(payload.student_id).toBe('student-1')
          expect(payload.payment_status).toBe('pending')

          if (hasScreenshot) {
            expect(mocks.upload).toHaveBeenCalledTimes(1)
            expect(payload.payment_screenshot).toMatch(/^student-1\/session-1\//)
          } else {
            expect(mocks.upload).not.toHaveBeenCalled()
            expect(payload.payment_screenshot).toBeNull()
          }

          if (hasNote) {
            expect(payload.payment_note).toBe(rawNote.trim())
          } else {
            expect(payload.payment_note).toBeNull()
          }

          unmount()
        }
      ),
      { numRuns: 20 }
    )
  }, 15000)

  it('Property 18: an existing enrollment always blocks duplicate submission (Req 4.4)', async () => {
    await fc.assert(
      fc.asyncProperty(
        existingEnrollmentArb,
        nonEmptyTrimmedNoteArb,
        async (existingEnrollment, note) => {
          const mocks = setupEnrollmentSupabaseMocks({ existingEnrollment })

          const { result, unmount } = renderHook(() =>
            useEnrollment({
              sessionId: 'session-1',
              user: studentUser,
            })
          )

          await settleInitialLookup(mocks.maybeSingle)

          await waitFor(() => {
            expect(result.current.existingEnrollment).toEqual(existingEnrollment)
          })

          let submitResult
          await act(async () => {
            submitResult = await result.current.submit({ note })
          })

          expect(submitResult).toEqual({ ok: false })
          expect(mocks.insert).not.toHaveBeenCalled()
          expect(mocks.upload).not.toHaveBeenCalled()
          expect(result.current.error).toBe('You are already enrolled in this session')

          unmount()
        }
      ),
      { numRuns: 20 }
    )
  }, 15000)

  it('surfaces a duplicate-enrollment message on server-side unique violation', async () => {
    const mocks = setupEnrollmentSupabaseMocks({
      insertError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
    })

    const { result } = renderHook(() =>
      useEnrollment({
        sessionId: 'session-1',
        user: studentUser,
      })
    )

    await settleInitialLookup(mocks.maybeSingle)

    let submitResult
    await act(async () => {
      submitResult = await result.current.submit({ note: 'Paid via MTN' })
    })

    expect(submitResult).toEqual({ ok: false })
    expect(result.current.error).toBe('You are already enrolled in this session')
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2)
  }, 10000)
})
