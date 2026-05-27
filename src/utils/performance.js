export const DEFAULT_ESTIMATED_VIDEO_STREAM_BYTES = 10 * 1024 * 1024
export const MONTHLY_VIDEO_BANDWIDTH_WARNING_BYTES = 2 * 1024 * 1024 * 1024
export const VIDEO_BANDWIDTH_STORAGE_KEY = 'trmato-video-bandwidth-estimate'

const getMonthKey = (date = new Date()) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

const getStorage = (storage) => {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const readBandwidthEstimate = (storage) => {
  if (!storage) {
    return { month: getMonthKey(), bytes: 0, warned: false }
  }

  try {
    const rawValue = storage.getItem(VIDEO_BANDWIDTH_STORAGE_KEY)
    if (!rawValue) {
      return { month: getMonthKey(), bytes: 0, warned: false }
    }

    const parsed = JSON.parse(rawValue)
    return {
      month: typeof parsed?.month === 'string' ? parsed.month : getMonthKey(),
      bytes: Number.isFinite(parsed?.bytes) ? parsed.bytes : 0,
      warned: Boolean(parsed?.warned),
    }
  } catch {
    return { month: getMonthKey(), bytes: 0, warned: false }
  }
}

const writeBandwidthEstimate = (storage, estimate) => {
  if (!storage) return

  try {
    storage.setItem(VIDEO_BANDWIDTH_STORAGE_KEY, JSON.stringify(estimate))
  } catch {
    // Ignore storage write failures so video playback never breaks.
  }
}

export const getEstimatedMonthlyVideoBandwidth = ({
  storage,
  now = new Date(),
} = {}) => {
  const resolvedStorage = getStorage(storage)
  const currentMonth = getMonthKey(now)
  const estimate = readBandwidthEstimate(resolvedStorage)

  if (estimate.month !== currentMonth) {
    return { month: currentMonth, bytes: 0, warned: false }
  }

  return estimate
}

export const recordEstimatedVideoStream = ({
  estimatedBytes = DEFAULT_ESTIMATED_VIDEO_STREAM_BYTES,
  storage,
  now = new Date(),
  logger = console.warn,
} = {}) => {
  if (!Number.isFinite(estimatedBytes) || estimatedBytes <= 0) {
    return getEstimatedMonthlyVideoBandwidth({ storage, now })
  }

  const resolvedStorage = getStorage(storage)
  const currentMonth = getMonthKey(now)
  const previousEstimate = getEstimatedMonthlyVideoBandwidth({
    storage: resolvedStorage,
    now,
  })

  const nextEstimate = {
    month: currentMonth,
    bytes: previousEstimate.bytes + estimatedBytes,
    warned: previousEstimate.warned,
  }

  if (
    nextEstimate.bytes >= MONTHLY_VIDEO_BANDWIDTH_WARNING_BYTES &&
    !previousEstimate.warned
  ) {
    logger(
      `Estimated monthly video bandwidth has reached ${(
        nextEstimate.bytes /
        (1024 * 1024 * 1024)
      ).toFixed(2)}GB. Supabase free tier bandwidth is 2GB/month.`
    )
    nextEstimate.warned = true
  }

  writeBandwidthEstimate(resolvedStorage, nextEstimate)
  return nextEstimate
}

export const clearEstimatedMonthlyVideoBandwidth = ({ storage } = {}) => {
  const resolvedStorage = getStorage(storage)
  if (!resolvedStorage) return

  try {
    resolvedStorage.removeItem(VIDEO_BANDWIDTH_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures in production usage.
  }
}
