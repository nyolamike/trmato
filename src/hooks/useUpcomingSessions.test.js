import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'

vi.mock('../utils/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import {
  resetUpcomingSessionsCacheForTests,
  useUpcomingSessions,
} from './useUpcomingSessions.js'
import { supabase } from '../utils/supabase.js'

describe('useUpcomingSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetUpcomingSessionsCacheForTests()
  })

  const setupMocks = (sessionsData, sessionsError = null) => {
    const mockSessionsOrder = vi.fn().mockResolvedValue({
      data: sessionsData,
      error: sessionsError,
    })
    const mockSessionsEq = vi.fn().mockReturnValue({
      order: mockSessionsOrder,
    })
    const mockSessionsSelect = vi.fn().mockReturnValue({
      eq: mockSessionsEq,
    })

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'sessions') {
        return { select: mockSessionsSelect }
      }

      return { select: vi.fn() }
    })

    return {
      mockSessionsSelect,
      mockSessionsEq,
      mockSessionsOrder,
    }
  }

  it('fetches upcoming sessions on mount', async () => {
    setupMocks([
      {
        id: '1',
        title: 'Biology Session',
        subject: 'Biology',
        status: 'upcoming',
        scheduled_at: '2024-12-01T10:00:00Z',
        session_tags: [],
      },
    ])

    const { result } = renderHook(() => useUpcomingSessions())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].title).toBe('Biology Session')
    expect(result.current.sessions[0].tags).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('includes sorted tags from the nested session_tags relation', async () => {
    setupMocks([
      {
        id: '1',
        title: 'Session 1',
        status: 'upcoming',
        scheduled_at: '2024-12-01T10:00:00Z',
        session_tags: [{ tag: 'zoology' }, { tag: 'biology' }],
      },
    ])

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sessions[0].tags).toEqual(['biology', 'zoology'])
  })

  it('filters by status = upcoming and requests nested tags in one query', async () => {
    const mocks = setupMocks([
      {
        id: '1',
        title: 'Session 1',
        status: 'upcoming',
        scheduled_at: '2024-12-01T10:00:00Z',
        session_tags: [],
      },
    ])

    renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(mocks.mockSessionsEq).toHaveBeenCalledWith('status', 'upcoming')
    })

    expect(mocks.mockSessionsSelect).toHaveBeenCalledWith(
      expect.stringContaining('session_tags')
    )
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('handles session fetch errors', async () => {
    setupMocks(null, new Error('Database connection failed'))

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Connection error. Please try again.')
    expect(result.current.sessions).toEqual([])
  })

  it('provides a refetch function', async () => {
    setupMocks([
      {
        id: '1',
        title: 'Session 1',
        status: 'upcoming',
        scheduled_at: '2024-12-01T10:00:00Z',
        session_tags: [],
      },
    ])

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe('function')
  })

  it('reuses the 5-minute cache across mounts to reduce database queries', async () => {
    setupMocks([
      {
        id: '1',
        title: 'Biology Session',
        status: 'upcoming',
        scheduled_at: '2024-12-01T10:00:00Z',
        session_tags: [{ tag: 'revision' }],
      },
    ])

    const firstHook = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(firstHook.result.current.loading).toBe(false)
    })

    firstHook.unmount()

    const secondHook = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(secondHook.result.current.loading).toBe(false)
    })

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(secondHook.result.current.sessions[0].tags).toEqual(['revision'])
  })

  it('bypasses the cache when refetch is called explicitly', async () => {
    setupMocks([
      {
        id: '1',
        title: 'Biology Session',
        status: 'upcoming',
        scheduled_at: '2024-12-01T10:00:00Z',
        session_tags: [],
      },
    ])

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.refetch()

    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('Property 7: all returned sessions must have status = upcoming', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 10, maxLength: 200 }),
            subject: fc.constantFrom('Biology', 'Physics', 'Chemistry', 'Mathematics'),
            description: fc.string({ minLength: 20, maxLength: 500 }),
            status: fc.constantFrom('upcoming', 'completed', 'cancelled'),
            scheduled_at: fc
              .date({
                min: new Date('2024-01-01'),
                max: new Date('2025-12-31'),
                noInvalidDate: true,
              })
              .map((date) => date.toISOString()),
            price_ugx: fc.integer({ min: 1000, max: 50000 }),
            meet_link: fc.webUrl(),
            payment_number: fc.string({ minLength: 10, maxLength: 15 }),
            payment_name: fc.string({ minLength: 3, maxLength: 50 }),
            created_by: fc.uuid(),
            created_at: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
            explainer_video: fc.option(fc.webUrl(), { nil: null }),
            video_thumbnail: fc.option(fc.webUrl(), { nil: null }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (allSessions) => {
          resetUpcomingSessionsCacheForTests()
          const upcomingSessions = allSessions
            .filter((session) => session.status === 'upcoming')
            .map((session) => ({
              ...session,
              session_tags: [],
            }))

          setupMocks(upcomingSessions)

          const { result } = renderHook(() => useUpcomingSessions())

          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          })

          result.current.sessions.forEach((session) => {
            expect(session.status).toBe('upcoming')
          })

          expect(result.current.sessions).toHaveLength(upcomingSessions.length)
        }
      ),
      { numRuns: 50 }
    )
  })
})
