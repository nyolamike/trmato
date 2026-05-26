import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { useTeacherSessions } from './useTeacherSessions'
import { supabase } from '../utils/supabase'

describe('useTeacherSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setupMocks = (sessionsData, sessionsError = null) => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: sessionsData,
      error: sessionsError,
    })
    const mockEq = vi.fn().mockReturnValue({
      order: mockOrder,
    })
    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'sessions') {
        return { select: mockSelect }
      }

      return { select: vi.fn() }
    })

    return {
      mockSelect,
      mockEq,
      mockOrder,
    }
  }

  it('fetches the teacher session list with nested tags in one query', async () => {
    const mocks = setupMocks([
      {
        id: 'session-1',
        title: 'Biology Session',
        created_by: 'teacher-1',
        scheduled_at: '2030-01-01T10:00:00Z',
        session_tags: [{ tag: 'revision' }, { tag: 'cells' }],
      },
    ])

    const { result } = renderHook(() => useTeacherSessions('teacher-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mocks.mockEq).toHaveBeenCalledWith('created_by', 'teacher-1')
    expect(mocks.mockSelect).toHaveBeenCalledWith(expect.stringContaining('session_tags'))
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(result.current.sessions[0].tags).toEqual(['cells', 'revision'])
  })

  it('returns an empty list when no teacher id is provided', async () => {
    const { result } = renderHook(() => useTeacherSessions(null))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sessions).toEqual([])
    expect(result.current.error).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('surfaces a friendly error when the query fails', async () => {
    setupMocks(null, new Error('Query failed'))

    const { result } = renderHook(() => useTeacherSessions('teacher-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sessions).toEqual([])
    expect(result.current.error).toBe('Connection error. Please try again.')
  })
})
