/**
 * TagPill
 *
 * Reusable pill/badge component for rendering session tags. Used on session
 * cards, in the search/filter bar (popular tags + active filter chips), and
 * in the teacher's tag input control (removable variant).
 *
 * Variants:
 * - 'default'   - clickable pill in a neutral style
 * - 'active'    - clickable pill in a selected style (aria-pressed=true)
 * - 'removable' - non-clickable pill body with an inner × button
 *
 * Sizes:
 * - 'small'      - text-xs / px-2.5 py-0.5  (mobile-friendly compact)
 * - 'medium'     - text-sm / px-3 py-1      (more breathing room)
 * - 'responsive' - small on mobile, medium on desktop (default)
 *
 * Click handlers receive the tag value as their single argument. For the
 * clickable variants TagPill also stops click propagation so it can be safely
 * nested inside a larger clickable surface (e.g. a session card).
 *
 * Validates: Requirements 15.10, 16.14
 */

const SIZE_CLASSES = {
  small: 'text-xs px-2.5 py-0.5',
  medium: 'text-sm px-3 py-1',
  responsive: 'text-xs px-2.5 py-0.5 sm:text-sm sm:px-3 sm:py-1',
}

const VARIANT_CLASSES = {
  default:
    'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700',
  active: 'bg-blue-600 text-white hover:bg-blue-700',
  removable: 'bg-blue-50 text-blue-700',
}

const BASE_CLASSES =
  'inline-flex items-center gap-1 rounded-full font-medium transition'

const INTERACTIVE_CLASSES =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

export const TagPill = ({
  tag,
  variant = 'default',
  size = 'responsive',
  onClick,
  onRemove,
  removeAriaLabel,
  className = '',
}) => {
  if (!tag) return null

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.responsive
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default

  if (variant === 'removable') {
    return (
      <span
        data-testid="tag-pill"
        data-variant="removable"
        className={`${BASE_CLASSES} ${sizeClass} ${variantClass} ${className}`.trim()}
      >
        #{tag}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove?.(tag)
          }}
          aria-label={removeAriaLabel || `Remove tag "${tag}"`}
          className={`-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 ${INTERACTIVE_CLASSES}`}
        >
          ×
        </button>
      </span>
    )
  }

  const isActive = variant === 'active'

  return (
    <button
      type="button"
      data-testid="tag-pill"
      data-variant={variant}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.(tag)
      }}
      aria-pressed={isActive}
      className={`${BASE_CLASSES} ${sizeClass} ${variantClass} ${INTERACTIVE_CLASSES} ${className}`.trim()}
    >
      #{tag}
    </button>
  )
}

export default TagPill
