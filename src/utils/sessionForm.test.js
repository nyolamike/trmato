import { describe, expect, it } from 'vitest'
import * as fc from 'fast-check'
import {
  buildSessionInsertPayload,
  getUniqueNormalizedTags,
  SESSION_TITLE_MAX_LENGTH,
  SESSION_TITLE_MIN_LENGTH,
  TAG_MAX_LENGTH,
  TAG_MIN_LENGTH,
  validateThumbnailFile,
  validateSessionValues,
  validateTag,
  validateVideoFile,
  VIDEO_MAX_SIZE_BYTES,
} from './sessionForm'

const buildValidValues = (overrides = {}) => ({
  title: 'Cell Division Masterclass',
  subject: 'Biology',
  description: 'A focused revision lesson on mitosis, meiosis, and exam technique.',
  scheduled_at: '2030-01-02T10:00:00.000Z',
  price_ugx: '5000',
  meet_link: 'https://meet.google.com/cell-division',
  payment_number: '0772000000',
  payment_name: 'TrMato Classes',
  ...overrides,
})

const makeFile = (name, type, size) => ({
  name,
  type,
  size,
})

describe('sessionForm utilities', () => {
  it('normalizes tags to lowercase, trims whitespace, and removes duplicates', () => {
    expect(
      getUniqueNormalizedTags(['  Algebra ', 'algebra', 'Kinematics', ''])
    ).toEqual(['algebra', 'kinematics'])
  })

  it('uses requirement-matching validation messages for date, tags, and uploads', () => {
    expect(
      validateSessionValues(buildValidValues({ scheduled_at: '2029-12-31T10:00:00.000Z' }), {
        now: new Date('2030-01-01T10:00:00.000Z'),
      }).scheduled_at
    ).toBe('Session date must be in the future')

    expect(validateTag('')).toBe('Tags must be 1-50 characters')
    expect(validateTag('a'.repeat(51))).toBe('Tags must be 1-50 characters')
    expect(validateVideoFile(makeFile('lesson.mov', 'video/quicktime', 1024))).toBe(
      'Only MP4 and WebM formats are supported'
    )
    expect(validateVideoFile(makeFile('lesson.mp4', 'video/webm', 1024))).toBe(
      'Only MP4 and WebM formats are supported'
    )
    expect(
      validateVideoFile(makeFile('lesson.mp4', 'video/mp4', VIDEO_MAX_SIZE_BYTES + 1))
    ).toBe('Video file must be under 50MB')
    expect(validateThumbnailFile(makeFile('thumb.gif', 'image/gif', 100))).toBe(
      'Only JPG and PNG formats are supported'
    )
    expect(validateThumbnailFile(makeFile('thumb.png', 'image/jpeg', 100))).toBe(
      'Only JPG and PNG formats are supported'
    )
    expect(validateThumbnailFile(makeFile('thumb.png', 'image/png', 2 * 1024 * 1024 + 1))).toBe(
      'Thumbnail must be under 2MB'
    )
  })

  it('escapes HTML-sensitive text before building the insert payload', () => {
    expect(
      buildSessionInsertPayload(
        buildValidValues({
          title: '  <b>Cells</b>  ',
          description: '  Learn <script>alert(1)</script> safely.  ',
          payment_name: '  "Coach"  ',
        }),
        'teacher-1'
      )
    ).toMatchObject({
      title: '&lt;b&gt;Cells&lt;/b&gt;',
      description: 'Learn &lt;script&gt;alert(1)&lt;/script&gt; safely.',
      payment_name: '&quot;Coach&quot;',
    })
  })
})

describe('Property 22: Session Title Length Validation (Req 6.3)', () => {
  it('accepts only titles whose trimmed length is between the allowed bounds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 240 }), (length) => {
        const title = 'a'.repeat(length)
        const errors = validateSessionValues(buildValidValues({ title }))
        const shouldBeValid =
          length >= SESSION_TITLE_MIN_LENGTH && length <= SESSION_TITLE_MAX_LENGTH

        expect(Boolean(errors.title)).toBe(!shouldBeValid)
      }),
      { numRuns: 60 }
    )
  })
})

describe('Property 24: Future Date Validation (Req 6.5)', () => {
  it('accepts only scheduled_at values that are later than the submission time', () => {
    const now = new Date('2030-01-01T10:00:00.000Z')

    fc.assert(
      fc.property(fc.integer({ min: -86400, max: 86400 }), (offsetSeconds) => {
        const scheduledAt = new Date(now.getTime() + offsetSeconds * 1000).toISOString()
        const errors = validateSessionValues(
          buildValidValues({ scheduled_at: scheduledAt }),
          { now }
        )

        expect(Boolean(errors.scheduled_at)).toBe(offsetSeconds <= 0)
      }),
      { numRuns: 60 }
    )
  })
})

describe('Property 27: Video Format Validation (Req 6.8)', () => {
  it('accepts only MP4 or WebM video files', () => {
    const allowedPairs = [
      ['lesson.mp4', 'video/mp4'],
      ['lesson.webm', 'video/webm'],
    ]

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...allowedPairs),
          fc
            .tuple(
              fc.constantFrom('lesson.bin', 'lesson.mp4', 'lesson.webm'),
              fc.constantFrom('video/mp4', 'video/webm', 'application/octet-stream')
            )
            .filter(
              ([fileName, mimeType]) =>
                !allowedPairs.some(
                  ([allowedName, allowedType]) =>
                    allowedName === fileName && allowedType === mimeType
                )
            )
        ),
        ([fileName, mimeType]) => {
          const error = validateVideoFile(makeFile(fileName, mimeType, 1024))
          expect(Boolean(error)).toBe(
            !allowedPairs.some(
              ([allowedName, allowedType]) =>
                allowedName === fileName && allowedType === mimeType
            )
          )
        }
      ),
      { numRuns: 60 }
    )
  })
})

describe('Property 28: Video File Size Limit (Req 6.9)', () => {
  it('rejects videos larger than 50MB', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: VIDEO_MAX_SIZE_BYTES + 5_000_000 }), (size) => {
        const error = validateVideoFile(makeFile('lesson.mp4', 'video/mp4', size))
        expect(Boolean(error)).toBe(size > VIDEO_MAX_SIZE_BYTES)
      }),
      { numRuns: 60 }
    )
  })
})

describe('Property 70: Tag Length Validation (Req 15.2)', () => {
  it('accepts only tags whose normalized length is between 1 and 50 characters', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 60 }), (length) => {
        const tag = 'a'.repeat(length)
        const error = validateTag(tag)
        const shouldBeValid = length >= TAG_MIN_LENGTH && length <= TAG_MAX_LENGTH

        expect(Boolean(error)).toBe(!shouldBeValid)
      }),
      { numRuns: 60 }
    )
  })
})
