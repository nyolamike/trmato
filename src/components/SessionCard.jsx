import { TagPill } from './TagPill'

/**
 * SessionCard
 *
 * Displays an upcoming session as a clickable card.
 * Shows title, subject, scheduled date/time, price (UGX), and tag pills.
 *
 * Validates: Requirements 2.2, 15.10
 */

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const priceFormatter = new Intl.NumberFormat('en-UG', {
  style: 'currency',
  currency: 'UGX',
  maximumFractionDigits: 0,
})

const formatScheduledAt = (value) => {
  if (!value) return 'Date TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return dateFormatter.format(date)
}

const formatPrice = (priceUgx) => {
  if (priceUgx === null || priceUgx === undefined) return ''
  const numeric = Number(priceUgx)
  if (Number.isNaN(numeric)) return ''
  if (numeric === 0) return 'Free'
  return priceFormatter.format(numeric)
}

export const SessionCard = ({ session, onClick, onTagClick }) => {
  if (!session) return null

  const { title, subject, scheduled_at, price_ugx, tags = [] } = session

  const handleClick = () => {
    onClick?.(session)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`View details for session: ${title}`}
      className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
    >
      <header className="mb-3">
        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {subject || 'General'}
        </span>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-gray-900 group-hover:text-blue-700 sm:text-xl">
          {title}
        </h3>
      </header>

      {tags.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Session tags">
          {tags.map((tag) => (
            <li key={tag}>
              <TagPill tag={tag} size="small" onClick={onTagClick} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">When</p>
          <p className="font-medium text-gray-800">{formatScheduledAt(scheduled_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">Price</p>
          <p className="font-semibold text-gray-900">{formatPrice(price_ugx)}</p>
        </div>
      </div>
    </article>
  )
}

export default SessionCard
