/**
 * Pure session filter utilities.
 *
 * Extracted from LandingPage so the filter logic can be unit + property tested
 * without spinning up the React rendering pipeline.
 *
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5, 16.11, 16.12
 */

export const SEARCH_QUERY_MAX_LENGTH = 200

/**
 * Truncate a search query to at most SEARCH_QUERY_MAX_LENGTH characters
 * (Requirement 11.16).
 *
 * @param {string} query
 * @returns {string}
 */
export function normalizeSearchQuery(query) {
  if (typeof query !== 'string') return ''
  return query.slice(0, SEARCH_QUERY_MAX_LENGTH)
}

/**
 * Returns true if `text` contains `query` (case-insensitive substring match).
 * Empty / nullish text or query are handled safely.
 */
function caseInsensitiveIncludes(text, query) {
  if (!query) return true
  if (typeof text !== 'string') return false
  return text.toLowerCase().includes(query.toLowerCase())
}

/**
 * Filter a list of sessions by search query, subject, and tags.
 *
 * Filters are combined with AND logic. Each filter is independently optional;
 * passing an empty/null filter is a no-op.
 *
 * - searchQuery: matches if it appears in title OR description (case-insensitive)
 * - subject:     matches if session.subject === subject (exact match)
 * - tags:        matches if session.tags includes EVERY selected tag (AND)
 *
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.11
 *
 * @param {Array<object>} sessions
 * @param {{searchQuery?: string, subject?: string|null, tags?: string[]}} [filters]
 * @returns {Array<object>}
 */
export function filterSessions(sessions, filters = {}) {
  if (!Array.isArray(sessions)) return []

  const { searchQuery = '', subject = null, tags = [] } = filters
  const query = normalizeSearchQuery(searchQuery).trim()
  const subjectFilter = subject || null
  const tagFilters = Array.isArray(tags) ? tags.filter(Boolean) : []

  return sessions.filter((session) => {
    if (!session) return false

    if (query) {
      const titleMatch = caseInsensitiveIncludes(session.title, query)
      const descriptionMatch = caseInsensitiveIncludes(session.description, query)
      if (!titleMatch && !descriptionMatch) return false
    }

    if (subjectFilter && session.subject !== subjectFilter) {
      return false
    }

    if (tagFilters.length > 0) {
      const sessionTags = Array.isArray(session.tags) ? session.tags : []
      const hasAll = tagFilters.every((tag) => sessionTags.includes(tag))
      if (!hasAll) return false
    }

    return true
  })
}

/**
 * Compute the top N most frequently used tags across a list of sessions.
 * Ties are broken alphabetically for deterministic ordering.
 *
 * Validates: Requirements 16.5
 *
 * @param {Array<object>} sessions
 * @param {number} [limit=10]
 * @returns {string[]}
 */
export function computePopularTags(sessions, limit = 10) {
  if (!Array.isArray(sessions)) return []

  const counts = new Map()
  for (const session of sessions) {
    const tags = Array.isArray(session?.tags) ? session.tags : []
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length === 0) continue
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .slice(0, Math.max(0, limit))
    .map(([tag]) => tag)
}

/**
 * Extract the unique sorted list of subjects from a list of sessions.
 * Useful for populating the subject dropdown filter.
 *
 * @param {Array<object>} sessions
 * @returns {string[]}
 */
export function extractSubjects(sessions) {
  if (!Array.isArray(sessions)) return []

  const set = new Set()
  for (const session of sessions) {
    const subject = session?.subject
    if (typeof subject === 'string' && subject.length > 0) {
      set.add(subject)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
