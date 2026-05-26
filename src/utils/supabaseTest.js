/**
 * Supabase Connection Test Utility
 * 
 * This file provides a simple function to test your Supabase connection.
 * You can import and call this function from any component to verify the setup.
 * 
 * Usage:
 * import { testSupabaseConnection } from './utils/supabaseTest'
 * 
 * // In your component
 * useEffect(() => {
 *   testSupabaseConnection()
 * }, [])
 */

import { supabase } from './supabase'

/**
 * Test the Supabase connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection...')
    
    // Try to get the current session (doesn't require any tables to exist)
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Supabase connection error:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('📊 Session status:', session ? 'Authenticated' : 'Not authenticated')
    
    return true
  } catch (error) {
    console.error('❌ Unexpected error testing Supabase:', error)
    return false
  }
}

/**
 * Get Supabase client info (for debugging)
 * @returns {Object} Client configuration info
 */
export const getSupabaseInfo = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
  
  return {
    url: url || 'Not configured',
    hasAnonKey: hasKey,
    isConfigured: !!(url && hasKey)
  }
}
