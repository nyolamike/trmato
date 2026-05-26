import { useState, useEffect, useCallback, useRef } from 'react'
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
export function useUpcomingSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Cache management
  const cacheRef = useRef({
    data: null,
    timestamp: null,
    isValid: false
  })
  
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = useCallback(() => {
    if (!cacheRef.current.isValid || !cacheRef.current.timestamp) {
      return false
    }
    
    const now = Date.now()
    const age = now - cacheRef.current.timestamp
    return age < CACHE_TTL
  }, [CACHE_TTL])

  /**
   * Fetch upcoming sessions from database
   */
  const fetchSessions = useCallback(async (forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      setSessions(cacheRef.current.data)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch sessions with status = 'upcoming' ordered by scheduled_at
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'upcoming')
        .order('scheduled_at', { ascending: true })

      if (sessionsError) {
        throw sessionsError
      }

      // Fetch tags for all sessions
      const sessionIds = sessionsData.map(session => session.id)
      
      let tagsData = []
      if (sessionIds.length > 0) {
        const { data: fetchedTags, error: tagsError } = await supabase
          .from('session_tags')
          .select('session_id, tag')
          .in('session_id', sessionIds)

        if (tagsError) {
          // Log error but don't fail the entire request
          console.error('Failed to fetch session tags:', tagsError)
        } else {
          tagsData = fetchedTags || []
        }
      }

      // Group tags by session_id
      const tagsBySession = tagsData.reduce((acc, { session_id, tag }) => {
        if (!acc[session_id]) {
          acc[session_id] = []
        }
        acc[session_id].push(tag)
        return acc
      }, {})

      // Merge sessions with their tags
      const sessionsWithTags = sessionsData.map(session => ({
        ...session,
        tags: tagsBySession[session.id] || []
      }))

      // Update cache
      cacheRef.current = {
        data: sessionsWithTags,
        timestamp: Date.now(),
        isValid: true
      }

      setSessions(sessionsWithTags)
      setError(null)
    } catch (err) {
      console.error('Error fetching upcoming sessions:', err)
      setError(err.message || 'Failed to fetch sessions')
      
      // If we have cached data, keep showing it even if refresh fails
      if (cacheRef.current.data) {
        setSessions(cacheRef.current.data)
      }
    } finally {
      setLoading(false)
    }
  }, [isCacheValid])

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
    refetch
  }
}
