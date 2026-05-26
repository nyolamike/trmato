import { useState } from 'react'
import { TagPill } from './TagPill'
import { getUniqueNormalizedTags, normalizeTag, validateTag } from '../utils/sessionForm'

export const TagInput = ({
  tags = [],
  onChange,
  error = '',
  disabled = false,
}) => {
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState('')

  const commitDraft = (rawValue, { showEmptyError = false } = {}) => {
    if (!rawValue) {
      if (showEmptyError) {
        setLocalError('Tags must be 1-50 characters')
      }
      return
    }

    const pieces = rawValue
      .split(',')
      .map((tag) => normalizeTag(tag))

    if (pieces.length === 0) {
      setDraft('')
      setLocalError('Tags must be 1-50 characters')
      return
    }

    const nextTags = [...tags]

    for (const piece of pieces) {
      const validationError = validateTag(piece)
      if (validationError) {
        setLocalError(validationError)
        return
      }

      if (nextTags.includes(piece)) {
        setLocalError('Tag already added')
        return
      }

      nextTags.push(piece)
    }

    onChange?.(getUniqueNormalizedTags(nextTags))
    setDraft('')
    setLocalError('')
  }

  const handleRemove = (tagToRemove) => {
    onChange?.(tags.filter((tag) => tag !== tagToRemove))
    setLocalError('')
  }

  return (
    <div>
      <label htmlFor="session-tags" className="block text-sm font-medium text-gray-700">
        Tags
      </label>
      <p className="mt-1 text-xs text-gray-500">
        Add tags one at a time, then press Enter or type a comma.
      </p>

      <div className="mt-2 rounded-lg border border-gray-300 bg-white p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagPill
                key={tag}
                tag={tag}
                variant="removable"
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}

        <input
          id="session-tags"
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value)
            if (localError) {
              setLocalError('')
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              commitDraft(draft, { showEmptyError: true })
            }
          }}
          onBlur={() => commitDraft(draft)}
          placeholder="e.g. osmosis, exam prep"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500"
        />
      </div>

      {(error || localError) && (
        <p className="mt-2 text-sm text-red-600">{error || localError}</p>
      )}
    </div>
  )
}

export default TagInput
