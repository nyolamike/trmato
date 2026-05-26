const HTML_ESCAPE_LOOKUP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export const VIDEO_MIME_TYPES_BY_EXTENSION = Object.freeze({
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
})

export const IMAGE_MIME_TYPES_BY_EXTENSION = Object.freeze({
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
})

export const escapeHtml = (value) => {
  if (typeof value !== 'string') return ''

  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_LOOKUP[character])
}

export const sanitizeTextInput = (value) => {
  if (typeof value !== 'string') return ''

  return escapeHtml(value.trim())
}

export const getAllowedExtensions = (mimeTypesByExtension) =>
  Object.keys(mimeTypesByExtension || {})

export const getAllowedMimeTypes = (mimeTypesByExtension) => [
  ...new Set(Object.values(mimeTypesByExtension || {}).flat()),
]

export const getFileExtension = (file) => {
  const fileName = typeof file?.name === 'string' ? file.name.toLowerCase() : ''
  const extensionIndex = fileName.lastIndexOf('.')

  return extensionIndex >= 0 ? fileName.slice(extensionIndex) : ''
}

export const getNormalizedMimeType = (file) =>
  typeof file?.type === 'string' ? file.type.toLowerCase() : ''

export const isFileTypeAllowed = (file, mimeTypesByExtension) => {
  if (!file) return true

  const extension = getFileExtension(file)
  const mimeType = getNormalizedMimeType(file)
  const allowedMimeTypes = mimeTypesByExtension?.[extension] || []

  return Boolean(extension && mimeType) && allowedMimeTypes.includes(mimeType)
}
