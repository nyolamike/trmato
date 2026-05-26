import {
  getAllowedExtensions,
  getAllowedMimeTypes,
  IMAGE_MIME_TYPES_BY_EXTENSION,
  isFileTypeAllowed,
  sanitizeTextInput,
  VIDEO_MIME_TYPES_BY_EXTENSION,
} from './security'

export const SESSION_TITLE_MIN_LENGTH = 10
export const SESSION_TITLE_MAX_LENGTH = 200
export const SESSION_DESCRIPTION_MIN_LENGTH = 20
export const TAG_MIN_LENGTH = 1
export const TAG_MAX_LENGTH = 50
export const VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024
export const THUMBNAIL_MAX_SIZE_BYTES = 2 * 1024 * 1024
export const ALLOWED_VIDEO_MIME_TYPES = getAllowedMimeTypes(VIDEO_MIME_TYPES_BY_EXTENSION)
export const ALLOWED_THUMBNAIL_MIME_TYPES = getAllowedMimeTypes(IMAGE_MIME_TYPES_BY_EXTENSION)
export const ALLOWED_VIDEO_EXTENSIONS = getAllowedExtensions(VIDEO_MIME_TYPES_BY_EXTENSION)
export const ALLOWED_THUMBNAIL_EXTENSIONS = getAllowedExtensions(IMAGE_MIME_TYPES_BY_EXTENSION)

export const DEFAULT_SESSION_FORM_VALUES = {
  title: '',
  subject: '',
  description: '',
  scheduled_at: '',
  price_ugx: '',
  meet_link: '',
  payment_number: '',
  payment_name: '',
}

export const normalizeTag = (value) => {
  if (typeof value !== 'string') return ''
  return sanitizeTextInput(value).toLowerCase()
}

export const getUniqueNormalizedTags = (tags) => {
  if (!Array.isArray(tags)) return []

  const seen = new Set()

  return tags.reduce((accumulator, tag) => {
    const normalized = normalizeTag(tag)
    if (!normalized || seen.has(normalized)) {
      return accumulator
    }

    seen.add(normalized)
    accumulator.push(normalized)
    return accumulator
  }, [])
}

export const validateTag = (value) => {
  const normalized = normalizeTag(value)

  if (!normalized) {
    return 'Tags must be 1-50 characters'
  }

  if (normalized.length < TAG_MIN_LENGTH || normalized.length > TAG_MAX_LENGTH) {
    return 'Tags must be 1-50 characters'
  }

  return ''
}

export const isFutureScheduledAt = (value, now = new Date()) => {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }

  const scheduledAt = new Date(value)
  if (Number.isNaN(scheduledAt.getTime())) {
    return false
  }

  return scheduledAt.getTime() > now.getTime()
}

export const isPositiveInteger = (value) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0
}

export const isValidHttpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }

  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

export const validateVideoFile = (file) => {
  if (!file) return ''

  if (!isFileTypeAllowed(file, VIDEO_MIME_TYPES_BY_EXTENSION)) {
    return 'Only MP4 and WebM formats are supported'
  }

  if (typeof file.size === 'number' && file.size > VIDEO_MAX_SIZE_BYTES) {
    return 'Video file must be under 50MB'
  }

  return ''
}

export const validateThumbnailFile = (file) => {
  if (!file) return ''

  if (!isFileTypeAllowed(file, IMAGE_MIME_TYPES_BY_EXTENSION)) {
    return 'Only JPG and PNG formats are supported'
  }

  if (typeof file.size === 'number' && file.size > THUMBNAIL_MAX_SIZE_BYTES) {
    return 'Thumbnail must be under 2MB'
  }

  return ''
}

export const validateSessionValues = (
  values,
  { tags = [], now = new Date() } = {}
) => {
  const safeValues = values || DEFAULT_SESSION_FORM_VALUES
  const errors = {}

  const title = safeValues.title?.trim() || ''
  const subject = safeValues.subject?.trim() || ''
  const description = safeValues.description?.trim() || ''
  const scheduledAt = safeValues.scheduled_at || ''
  const meetLink = safeValues.meet_link?.trim() || ''
  const paymentNumber = safeValues.payment_number?.trim() || ''
  const paymentName = safeValues.payment_name?.trim() || ''

  if (!title) {
    errors.title = 'Title is required.'
  } else if (
    title.length < SESSION_TITLE_MIN_LENGTH ||
    title.length > SESSION_TITLE_MAX_LENGTH
  ) {
    errors.title = `Title must be between ${SESSION_TITLE_MIN_LENGTH} and ${SESSION_TITLE_MAX_LENGTH} characters.`
  }

  if (!subject) {
    errors.subject = 'Subject is required.'
  }

  if (!description) {
    errors.description = 'Description is required.'
  } else if (description.length < SESSION_DESCRIPTION_MIN_LENGTH) {
    errors.description = `Description must be at least ${SESSION_DESCRIPTION_MIN_LENGTH} characters.`
  }

  if (!scheduledAt) {
    errors.scheduled_at = 'Scheduled date and time are required.'
  } else if (!isFutureScheduledAt(scheduledAt, now)) {
    errors.scheduled_at = 'Session date must be in the future'
  }

  if (safeValues.price_ugx === '' || safeValues.price_ugx === null || safeValues.price_ugx === undefined) {
    errors.price_ugx = 'Price is required.'
  } else if (!isPositiveInteger(safeValues.price_ugx)) {
    errors.price_ugx = 'Price must be a positive whole number.'
  }

  if (!meetLink) {
    errors.meet_link = 'Meet link is required.'
  } else if (!isValidHttpUrl(meetLink)) {
    errors.meet_link = 'Meet link must be a valid URL.'
  }

  if (!paymentNumber) {
    errors.payment_number = 'Payment number is required.'
  }

  if (!paymentName) {
    errors.payment_name = 'Payment name is required.'
  }

  const normalizedTags = getUniqueNormalizedTags(tags)
  const invalidTag = normalizedTags.find((tag) => validateTag(tag))
  if (invalidTag) {
    errors.tags = validateTag(invalidTag)
  }

  return errors
}

export const sanitizeFileName = (name) => {
  if (typeof name !== 'string' || !name.trim()) {
    return 'file'
  }

  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
}

export const buildMediaPath = (kind, sessionId, file, timestamp = Date.now()) => {
  const safeSessionId = sessionId || 'session'
  const safeFileName = sanitizeFileName(file?.name)
  const folder = kind === 'thumbnail' ? 'thumbnails' : 'videos'

  return `${folder}/${safeSessionId}/${timestamp}_${safeFileName}`
}

export const buildSessionInsertPayload = (values, teacherId) => ({
  title: sanitizeTextInput(values.title),
  subject: sanitizeTextInput(values.subject),
  description: sanitizeTextInput(values.description),
  scheduled_at: new Date(values.scheduled_at).toISOString(),
  price_ugx: Number(values.price_ugx),
  meet_link: values.meet_link.trim(),
  payment_number: sanitizeTextInput(values.payment_number),
  payment_name: sanitizeTextInput(values.payment_name),
  created_by: teacherId,
})
