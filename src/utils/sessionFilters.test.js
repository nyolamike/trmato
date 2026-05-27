import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  filterSessions,
  computePopularTags,
  extractSubjects,
  normalizeSearchQuery,
  SEARCH_QUERY_MAX_LENGTH,
} from './sessionFilters'

/**
 * Unit + property-based tests for the session filter utilities.
 *
 * Covers Task 13.3:
 * - Property 74: Text Search Filtering             (Requirement 16.1)
 * - Property 75: Subject Filter Application        (Requirement 16.2)
 * - Property 76: Tag Filter Application            (Requirement 16.3)
 * - Property 77: Combined Filter AND Logic         (Requirement 16.4)
 *
 * Plus deterministic unit tests for the supporting helpers
 * (popular tag calculation, subject extraction, query truncation).
 */

// Fast-check arbitraries -----------------------------------------------------

const subjectArb = fc.constantFrom('Biology', 'Physics', 'Chemistry', 'Mathematics')
const tagNameArb = fc.constantFrom(
  'osmosis',
  'cell biology',
  'algebra',
  'newton',
  'photosynthesis',
  'thermo'
)

const sessionArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 5, maxLength: 80 }),
  description: fc.string({ minLength: 5, maxLength: 200 }),
  subject: subjectArb,
  tags: fc.uniqueArray(tagNameArb, { minLength: 0, maxLength: 5 }),
})

const sessionsArb = fc.array(sessionArb, { minLength: 0, maxLength: 30 })

// Unit: filterSessions defaults ---------------------------------------------

describe('filterSessions — defaults & edge cases', () => {
  it('returns the original array when no filters are applied', () => {
    const sessions = [
      { id: '1', title: 'A', description: 'X', subject: 'Biology', tags: [] },
      { id: '2', title: 'B', description: 'Y', subject: 'Physics', tags: ['x'] },
    ]
    expect(filterSessions(sessions)).toEqual(sessions)
    expect(filterSessions(sessions, {})).toEqual(sessions)
  })

  it('returns an empty array for null/undefined input', () => {
    expect(filterSessions(null)).toEqual([])
    expect(filterSessions(undefined)).toEqual([])
    expect(filterSessions('not an array')).toEqual([])
  })

  it('filters out nullish sessions safely', () => {
    const sessions = [
      null,
      undefined,
      { id: '1', title: 'A', description: 'X', subject: 'Biology', tags: [] },
    ]
    expect(filterSessions(sessions)).toHaveLength(1)
  })

  it('does case-insensitive substring matching on title OR description', () => {
    const sessions = [
      { id: '1', title: 'Osmosis Deep Dive', description: 'A talk', subject: 'Biology', tags: [] },
      { id: '2', title: 'Algebra basics', description: 'covers OSMOSIS too', subject: 'Math', tags: [] },
      { id: '3', title: 'Newton laws', description: 'physics', subject: 'Physics', tags: [] },
    ]

    const results = filterSessions(sessions, { searchQuery: 'osmosis' })
    expect(results.map((s) => s.id)).toEqual(['1', '2'])
  })

  it('applies tag filter using AND logic (every selected tag must be present)', () => {
    const sessions = [
      { id: '1', title: 'A', description: 'X', subject: 'Biology', tags: ['osmosis'] },
      { id: '2', title: 'B', description: 'Y', subject: 'Biology', tags: ['osmosis', 'cell biology'] },
      { id: '3', title: 'C', description: 'Z', subject: 'Biology', tags: ['cell biology'] },
    ]

    const results = filterSessions(sessions, { tags: ['osmosis', 'cell biology'] })
    expect(results.map((s) => s.id)).toEqual(['2'])
  })
})

// Property 74 — Text Search Filtering (Requirement 16.1) --------------------

describe('Property 74: Text Search Filtering (Req 16.1)', () => {
  it('every result contains the (non-empty) query in title OR description (case-insensitive)', () => {
    fc.assert(
      fc.property(
        sessionsArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        (sessions, rawQuery) => {
          const query = rawQuery.trim()
          fc.pre(query.length > 0)

          const results = filterSessions(sessions, { searchQuery: query })
          const q = query.toLowerCase()

          for (const session of results) {
            const titleMatch = session.title.toLowerCase().includes(q)
            const descriptionMatch = session.description.toLowerCase().includes(q)
            expect(titleMatch || descriptionMatch).toBe(true)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('empty / whitespace-only queries do not exclude any sessions', () => {
    fc.assert(
      fc.property(
        sessionsArb,
        fc.constantFrom('', '   ', '\t\n', '  \r '),
        (sessions, blankQuery) => {
          const results = filterSessions(sessions, { searchQuery: blankQuery })
          expect(results).toHaveLength(sessions.length)
        }
      ),
      { numRuns: 30 }
    )
  })
})

// Property 75 — Subject Filter Application (Requirement 16.2) ---------------

describe('Property 75: Subject Filter Application (Req 16.2)', () => {
  it('every result has subject equal to the selected subject', () => {
    fc.assert(
      fc.property(sessionsArb, subjectArb, (sessions, subject) => {
        const results = filterSessions(sessions, { subject })
        for (const session of results) {
          expect(session.subject).toBe(subject)
        }
      }),
      { numRuns: 50 }
    )
  })
})

// Property 76 — Tag Filter Application (Requirement 16.3) ------------------

describe('Property 76: Tag Filter Application (Req 16.3)', () => {
  it('every result contains every selected tag in its tags array', () => {
    fc.assert(
      fc.property(
        sessionsArb,
        fc.uniqueArray(tagNameArb, { minLength: 1, maxLength: 3 }),
        (sessions, tags) => {
          const results = filterSessions(sessions, { tags })
          for (const session of results) {
            for (const tag of tags) {
              expect(session.tags).toContain(tag)
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})

// Property 77 — Combined Filter AND Logic (Requirement 16.4) ---------------

describe('Property 77: Combined Filter AND Logic (Req 16.4)', () => {
  it('every result satisfies ALL active filter conditions simultaneously', () => {
    fc.assert(
      fc.property(
        sessionsArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        subjectArb,
        fc.uniqueArray(tagNameArb, { minLength: 0, maxLength: 2 }),
        (sessions, rawQuery, subject, tags) => {
          const query = rawQuery.trim()
          fc.pre(query.length > 0)

          const results = filterSessions(sessions, {
            searchQuery: query,
            subject,
            tags,
          })

          const q = query.toLowerCase()
          for (const session of results) {
            const textMatch =
              session.title.toLowerCase().includes(q) ||
              session.description.toLowerCase().includes(q)
            expect(textMatch).toBe(true)
            expect(session.subject).toBe(subject)
            for (const tag of tags) {
              expect(session.tags).toContain(tag)
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('combined filter result is a subset of each single-filter result', () => {
    fc.assert(
      fc.property(
        sessionsArb,
        subjectArb,
        fc.uniqueArray(tagNameArb, { minLength: 1, maxLength: 2 }),
        (sessions, subject, tags) => {
          const combined = filterSessions(sessions, { subject, tags }).map((s) => s.id)
          const bySubject = new Set(filterSessions(sessions, { subject }).map((s) => s.id))
          const byTags = new Set(filterSessions(sessions, { tags }).map((s) => s.id))
          for (const id of combined) {
            expect(bySubject.has(id)).toBe(true)
            expect(byTags.has(id)).toBe(true)
          }
        }
      ),
      { numRuns: 30 }
    )
  })
})

// computePopularTags --------------------------------------------------------

describe('computePopularTags', () => {
  it('returns tags sorted by frequency descending (ties broken alphabetically)', () => {
    const sessions = [
      { tags: ['osmosis', 'cell biology'] },
      { tags: ['osmosis'] },
      { tags: ['algebra', 'osmosis'] },
      { tags: ['algebra'] },
      { tags: ['cell biology'] },
    ]
    expect(computePopularTags(sessions)).toEqual(['osmosis', 'algebra', 'cell biology'])
  })

  it('limits the result to the top N tags', () => {
    const sessions = [
      { tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] },
    ]
    expect(computePopularTags(sessions, 3)).toHaveLength(3)
    expect(computePopularTags(sessions, 10)).toHaveLength(10)
  })

  it('returns an empty array for missing or non-array input', () => {
    expect(computePopularTags(null)).toEqual([])
    expect(computePopularTags(undefined)).toEqual([])
    expect(computePopularTags([])).toEqual([])
    expect(computePopularTags([{ tags: [] }])).toEqual([])
  })

  it('skips non-string and empty tags', () => {
    const sessions = [{ tags: ['osmosis', '', null, undefined, 5, 'osmosis'] }]
    expect(computePopularTags(sessions)).toEqual(['osmosis'])
  })
})

// extractSubjects -----------------------------------------------------------

describe('extractSubjects', () => {
  it('returns unique sorted subjects', () => {
    const sessions = [
      { subject: 'Physics' },
      { subject: 'Biology' },
      { subject: 'Physics' },
      { subject: 'Mathematics' },
    ]
    expect(extractSubjects(sessions)).toEqual([
      'Biology',
      'Mathematics',
      'Physics',
    ])
  })

  it('skips nullish or empty subjects', () => {
    const sessions = [
      { subject: 'Physics' },
      { subject: '' },
      { subject: null },
      {},
    ]
    expect(extractSubjects(sessions)).toEqual(['Physics'])
  })

  it('returns an empty array for non-array input', () => {
    expect(extractSubjects(null)).toEqual([])
    expect(extractSubjects(undefined)).toEqual([])
    expect(extractSubjects('not an array')).toEqual([])
  })
})

// normalizeSearchQuery ------------------------------------------------------

describe('normalizeSearchQuery (Req 11.16)', () => {
  it(`truncates queries longer than ${SEARCH_QUERY_MAX_LENGTH} characters`, () => {
    const longQuery = 'a'.repeat(SEARCH_QUERY_MAX_LENGTH + 50)
    expect(normalizeSearchQuery(longQuery)).toHaveLength(SEARCH_QUERY_MAX_LENGTH)
  })

  it('returns short queries unchanged', () => {
    expect(normalizeSearchQuery('osmosis')).toBe('osmosis')
    expect(normalizeSearchQuery('')).toBe('')
  })

  it('returns empty string for non-string input', () => {
    expect(normalizeSearchQuery(null)).toBe('')
    expect(normalizeSearchQuery(undefined)).toBe('')
    expect(normalizeSearchQuery(123)).toBe('')
  })
})
