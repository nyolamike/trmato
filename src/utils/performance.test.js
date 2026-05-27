import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearEstimatedMonthlyVideoBandwidth,
  DEFAULT_ESTIMATED_VIDEO_STREAM_BYTES,
  getEstimatedMonthlyVideoBandwidth,
  MONTHLY_VIDEO_BANDWIDTH_WARNING_BYTES,
  recordEstimatedVideoStream,
} from './performance'

describe('performance utilities', () => {
  beforeEach(() => {
    clearEstimatedMonthlyVideoBandwidth()
  })

  it('records estimated monthly video bandwidth usage', () => {
    recordEstimatedVideoStream({ estimatedBytes: DEFAULT_ESTIMATED_VIDEO_STREAM_BYTES })

    expect(getEstimatedMonthlyVideoBandwidth().bytes).toBe(
      DEFAULT_ESTIMATED_VIDEO_STREAM_BYTES
    )
  })

  it('resets the estimate when a new month starts', () => {
    recordEstimatedVideoStream({
      estimatedBytes: DEFAULT_ESTIMATED_VIDEO_STREAM_BYTES,
      now: new Date('2026-05-27T00:00:00Z'),
    })

    expect(
      getEstimatedMonthlyVideoBandwidth({ now: new Date('2026-06-01T00:00:00Z') }).bytes
    ).toBe(0)
  })

  it('logs a warning once when usage crosses the 2GB threshold', () => {
    const logger = vi.fn()

    recordEstimatedVideoStream({
      estimatedBytes: MONTHLY_VIDEO_BANDWIDTH_WARNING_BYTES - 1,
      now: new Date('2026-05-27T00:00:00Z'),
      logger,
    })
    recordEstimatedVideoStream({
      estimatedBytes: 1,
      now: new Date('2026-05-27T00:00:00Z'),
      logger,
    })
    recordEstimatedVideoStream({
      estimatedBytes: 1024,
      now: new Date('2026-05-27T00:00:00Z'),
      logger,
    })

    expect(logger).toHaveBeenCalledTimes(1)
    expect(logger.mock.calls[0][0]).toMatch(/2GB\/month/i)
  })
})
