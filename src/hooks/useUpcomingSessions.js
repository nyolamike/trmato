import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase.js'

/**
 * Custom hook to fetch upcoming sessions with tags and 5-minute caching
 * 
 * Fetches sessions where status = 'upcoming' ordered by scheduled_at
 * Joins with session_tags to include tags array for each session
 * Implements 5-minute cache to reduce database queries
 * 
 * @returns {Object} { sessions, loading, error, refetch }
 * 
 * Validates: Requirements 2.1, 12.1, 15.5
 */
export const UPCOMING_SESSIONS_CACHE_TTL = 5 * 60 * 1000

let upcomingSessionsCache = {
  data: null,
  timestamp: 0,
}

const isUpcomingSessionsCacheValid = () => {
  if (!upcomingSessionsCache.timestamp || !Array.isArray(upcomingSessionsCache.data)) {
    return false
  }

  return Date.now() - upcomingSessionsCache.timestamp < UPCOMING_SESSIONS_CACHE_TTL
}

const mapSessionRow = (session) => {
  const { session_tags: sessionTags = [], ...sessionFields } = session

  return {
    ...sessionFields,
    tags: sessionTags
    .map((tagRow) => tagRow.tag)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b)),
  }
}

export const resetUpcomingSessionsCacheForTests = () => {
  upcomingSessionsCache = {
    data: null,
    timestamp: 0,
  }
}

export function useUpcomingSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Fetch upcoming sessions from database
   */
  const fetchSessions = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isUpcomingSessionsCacheValid()) {
      setSessions(upcomingSessionsCache.data)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          session_tags (
            tag
          )
        `)
        .eq('status', 'upcoming')
        .order('scheduled_at', { ascending: true })

      if (sessionsError) {
        throw sessionsError
      }

      const sessionsWithTags = (sessionsData || []).map(mapSessionRow)

      upcomingSessionsCache = {
        data: sessionsWithTags,
        timestamp: Date.now(),
      }

      setSessions(sessionsWithTags)
      setError(null)
    } catch (err) {
      console.error('Error fetching upcoming sessions:', err)
      setError('Connection error. Please try again.')

      if (Array.isArray(upcomingSessionsCache.data)) {
        setSessions(upcomingSessionsCache.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refetch function to force refresh (bypasses cache)
   */
  const refetch = useCallback(() => {
    return fetchSessions(true)
  }, [fetchSessions])

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    loading,
    error,
    refetch,
  }
}
