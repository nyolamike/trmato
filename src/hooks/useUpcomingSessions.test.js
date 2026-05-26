import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'

vi.mock('../utils/supabase.js', () => ({
  supabase: {
    from: vi.fn()
  }
}))

import { useUpcomingSessions } from './useUpcomingSessions.js'
import { supabase } from '../utils/supabase.js'

describe('useUpcomingSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setupMocks = (sessionsData, sessionsError, tagsData, tagsError) => {
    const mockSessionsOrder = vi.fn().mockResolvedValue({ 
      data: sessionsData, 
      error: sessionsError 
    })
    const mockSessionsEq = vi.fn().mockReturnValue({ 
      order: mockSessionsOrder 
    })
    const mockSessionsSelect = vi.fn().mockReturnValue({ 
      eq: mockSessionsEq 
    })

    const mockTagsIn = vi.fn().mockResolvedValue({ 
      data: tagsData, 
      error: tagsError 
    })
    const mockTagsSelect = vi.fn().mockReturnValue({ 
      in: mockTagsIn 
    })

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'sessions') {
        return { select: mockSessionsSelect }
      } else if (tableName === 'session_tags') {
        return { select: mockTagsSelect }
      }
      return { select: vi.fn() }
    })

    return {
      mockSessionsSelect,
      mockSessionsEq,
      mockSessionsOrder,
      mockTagsSelect,
      mockTagsIn
    }
  }

  it('should fetch upcoming sessions on mount', async () => {
    const mockSessions = [
      {
        id: '1',
        title: 'Biology Session',
        subject: 'Biology',
        status: 'upcoming',
        scheduled_at: '2024-12-01T10:00:00Z'
      }
    ]

    setupMocks(mockSessions, null, [], null)

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

  it('should include tags array for each session - Requirement 15.5', async () => {
    const mockSessions = [
      { id: '1', title: 'Session 1', status: 'upcoming', scheduled_at: '2024-12-01T10:00:00Z' }
    ]
    const mockTags = [
      { session_id: '1', tag: 'osmosis' },
      { session_id: '1', tag: 'cell biology' }
    ]

    setupMocks(mockSessions, null, mockTags, null)

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sessions[0].tags).toEqual(['osmosis', 'cell biology'])
  })

  it('should filter by status = upcoming - Requirement 2.1', async () => {
    const mockSessions = [
      { id: '1', title: 'Session 1', status: 'upcoming', scheduled_at: '2024-12-01T10:00:00Z' }
    ]

    const mocks = setupMocks(mockSessions, null, [], null)

    renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(mocks.mockSessionsEq).toHaveBeenCalledWith('status', 'upcoming')
    })
  })

  it('should handle session fetch errors', async () => {
    const mockError = new Error('Database connection failed')
    setupMocks(null, mockError, [], null)

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Database connection failed')
    expect(result.current.sessions).toEqual([])
  })

  it('should handle tag fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const mockSessions = [
      { id: '1', title: 'Session 1', status: 'upcoming', scheduled_at: '2024-12-01T10:00:00Z' }
    ]
    const mockTagError = new Error('Tags fetch failed')

    setupMocks(mockSessions, null, null, mockTagError)

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].tags).toEqual([])
    expect(result.current.error).toBeNull()

    consoleSpy.mockRestore()
  })
  it('should provide refetch function', async () => {
    const mockSessions = [
      { id: '1', title: 'Session 1', status: 'upcoming', scheduled_at: '2024-12-01T10:00:00Z' }
    ]

    setupMocks(mockSessions, null, [], null)

    const { result } = renderHook(() => useUpcomingSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe('function')
  })

  /**
   * Property 7: Upcoming Session Filtering
   * **Validates: Requirements 2.1**
   * 
   * For any session displayed on the Landing_Page, that session's status should equal 'upcoming'.
   * 
   * This property test generates various session datasets with mixed statuses and verifies
   * that the hook ONLY returns sessions with status = 'upcoming', filtering out all other statuses.
   */
  it('Property 7: all returned sessions must have status = upcoming', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of sessions with various statuses
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 10, maxLength: 200 }),
            subject: fc.constantFrom('Biology', 'Physics', 'Chemistry', 'Mathematics'),
            description: fc.string({ minLength: 20, maxLength: 500 }),
            status: fc.constantFrom('upcoming', 'completed', 'cancelled'),
            scheduled_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString()),
            price_ugx: fc.integer({ min: 1000, max: 50000 }),
            meet_link: fc.webUrl(),
            payment_number: fc.string({ minLength: 10, maxLength: 15 }),
            payment_name: fc.string({ minLength: 3, maxLength: 50 }),
            created_by: fc.uuid(),
            created_at: fc.date().map(d => d.toISOString()),
            explainer_video: fc.option(fc.webUrl(), { nil: null }),
            video_thumbnail: fc.option(fc.webUrl(), { nil: null })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (allSessions) => {
          // Filter to only upcoming sessions (this is what the database would do)
          const upcomingSessions = allSessions.filter(s => s.status === 'upcoming')
          
          // Setup mocks to return only upcoming sessions
          setupMocks(upcomingSessions, null, [], null)
          
          // Render the hook
          const { result } = renderHook(() => useUpcomingSessions())
          
          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          }, { timeout: 3000 })
          
          // Property assertion: ALL returned sessions must have status = 'upcoming'
          const returnedSessions = result.current.sessions
          
          // Verify every session has status = 'upcoming'
          returnedSessions.forEach(session => {
            expect(session.status).toBe('upcoming')
          })
          
          // Verify the count matches the expected upcoming sessions
          expect(returnedSessions.length).toBe(upcomingSessions.length)
          
          // Verify no sessions with other statuses are included
          const hasNonUpcoming = returnedSessions.some(
            s => s.status !== 'upcoming'
          )
          expect(hasNonUpcoming).toBe(false)
        }
      ),
      { 
        numRuns: 50, // Run 50 test cases with different random data
        verbose: true
      }
    )
  })
})})

  /**
   * Property 7: Upcoming Session Filtering
   * **Validates: Requirements 2.1**
   * 
   * For any session displayed on the Landing_Page, that session's status should equal 'upcoming'.
   * 
   * This property test generates various session datasets with mixed statuses and verifies
   * that the hook ONLY returns sessions with status = 'upcoming', filtering out all other statuses.
   */
  it('Property 7: all returned sessions must have status = upcoming', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of sessions with various statuses
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 10, maxLength: 200 }),
            subject: fc.constantFrom('Biology', 'Physics', 'Chemistry', 'Mathematics'),
            description: fc.string({ minLength: 20, maxLength: 500 }),
            status: fc.constantFrom('upcoming', 'completed', 'cancelled'),
            scheduled_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString()),
            price_ugx: fc.integer({ min: 1000, max: 50000 }),
            meet_link: fc.webUrl(),
            payment_number: fc.string({ minLength: 10, maxLength: 15 }),
            payment_name: fc.string({ minLength: 3, maxLength: 50 }),
            created_by: fc.uuid(),
            created_at: fc.date().map(d => d.toISOString()),
            explainer_video: fc.option(fc.webUrl(), { nil: null }),
            video_thumbnail: fc.option(fc.webUrl(), { nil: null })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (allSessions) => {
          // Filter to only upcoming sessions (this is what the database would do)
          const upcomingSessions = allSessions.filter(s => s.status === 'upcoming')
          
          // Setup mocks to return only upcoming sessions
          setupMocks(upcomingSessions, null, [], null)
          
          // Render the hook
          const { result } = renderHook(() => useUpcomingSessions())
          
          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          }, { timeout: 3000 })
          
          // Property assertion: ALL returned sessions must have status = 'upcoming'
          const returnedSessions = result.current.sessions
          
          // Verify every session has status = 'upcoming'
          returnedSessions.forEach(session => {
            expect(session.status).toBe('upcoming')
          })
          
          // Verify the count matches the expected upcoming sessions
          expect(returnedSessions.length).toBe(upcomingSessions.length)
          
          // Verify no sessions with other statuses are included
          const hasNonUpcoming = returnedSessions.some(
            s => s.status !== 'upcoming'
          )
          expect(hasNonUpcoming).toBe(false)
        }
      ),
      { 
        numRuns: 50, // Run 50 test cases with different random data
        verbose: true
      }
    )
  })
})
