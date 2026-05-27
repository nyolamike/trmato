import { useEffect, useRef, useState } from 'react'
import { SEARCH_QUERY_MAX_LENGTH } from '../utils/sessionFilters'
import { TagPill } from './TagPill'

/**
 * SearchFilterBar
 *
 * Unified search + filter controls for the Landing_Page:
 * - Debounced text search (300ms) across title + description
 * - Subject dropdown filter
 * - Popular tag pills (top 10) with click-to-toggle filtering
 * - Active filter chips with individual clear buttons
 * - "Clear all" button when any filter is active
 *
 * The bar is controlled by the parent for `searchQuery`, `selectedSubject`,
 * and `selectedTags`, but owns its own raw input value internally so that
 * the search query the parent sees is debounced.
 *
 * Validates: Requirements 16.1, 16.2, 16.5, 16.7, 16.8, 16.9, 16.10, 16.13, 16.14
 */
export const SearchFilterBar = ({
  searchQuery = '',
  selectedSubject = null,
  selectedTags = [],
  subjects = [],
  popularTags = [],
  onSearchChange,
  onSubjectChange,
  onTagToggle,
  onClearFilters,
}) => {
  const [inputValue, setInputValue] = useState(searchQuery || '')
  const lastPushedRef = useRef(searchQuery || '')

  // If the parent resets the search query externally (e.g. "Clear all"),
  // sync the local input value down without retriggering the debounce.
  useEffect(() => {
    const external = searchQuery || ''
    if (external !== lastPushedRef.current) {
      lastPushedRef.current = external
      setInputValue(external)
    }
  }, [searchQuery])

  // Debounce the local input value upward to the parent.
  useEffect(() => {
    if (inputValue === lastPushedRef.current) return
    const handle = setTimeout(() => {
      const truncated = inputValue.slice(0, SEARCH_QUERY_MAX_LENGTH)
      lastPushedRef.current = truncated
      onSearchChange?.(truncated)
    }, 300)
    return () => clearTimeout(handle)
  }, [inputValue, onSearchChange])

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedSubject) ||
    (selectedTags?.length ?? 0) > 0

  const handleClearSearch = () => {
    lastPushedRef.current = ''
    setInputValue('')
    onSearchChange?.('')
  }

  const handleClearSubject = () => {
    onSubjectChange?.(null)
  }

  const handleClearAll = () => {
    lastPushedRef.current = ''
    setInputValue('')
    onClearFilters?.()
  }

  return (
    <div
      data-testid="search-filter-bar"
      className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="session-search" className="sr-only">
            Search sessions
          </label>
          <input
            id="session-search"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search by title or description..."
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {subjects.length > 0 && (
          <div className="sm:w-56">
            <label htmlFor="subject-filter" className="sr-only">
              Filter by subject
            </label>
            <select
              id="subject-filter"
              value={selectedSubject || ''}
              onChange={(e) => onSubjectChange?.(e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {popularTags.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Popular tags
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label="Popular tags">
            {popularTags.map((tag) => {
              const isActive = selectedTags.includes(tag)
              return (
                <li key={tag}>
                  <TagPill
                    tag={tag}
                    variant={isActive ? 'active' : 'default'}
                    size="small"
                    onClick={onTagToggle}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {hasActiveFilters && (
        <div
          data-testid="active-filters"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Filters:
          </span>

          {searchQuery && (
            <FilterChip
              label={`Search: "${searchQuery}"`}
              onClear={handleClearSearch}
              ariaLabel={`Clear search filter`}
            />
          )}

          {selectedSubject && (
            <FilterChip
              label={`Subject: ${selectedSubject}`}
              onClear={handleClearSubject}
              ariaLabel={`Clear subject filter`}
            />
          )}

          {selectedTags.map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              variant="removable"
              size="small"
              onRemove={onTagToggle}
              removeAriaLabel={`Remove tag filter "${tag}"`}
            />
          ))}

          <button
            type="button"
            onClick={handleClearAll}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 sm:ml-auto sm:w-auto"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}

const FilterChip = ({ label, onClear, ariaLabel }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
    {label}
    <button
      type="button"
      onClick={onClear}
      aria-label={ariaLabel}
      className="rounded-full p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
    >
      ×
    </button>
  </span>
)

export default SearchFilterBar
