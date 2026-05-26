import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Fetch user profile with role from users table
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            console.error('Error fetching user profile:', error)
            setUser(null)
          } else {
            setUser(profile)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile with role
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (!error && profile) {
          setUser(profile)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (username, email, password) => {
    try {
      // Create auth user with username in metadata
      // The database trigger will automatically create the users table entry
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role: 'student'
          }
        }
      })

      if (authError) throw authError

      // Wait a moment for the trigger to create the user profile
      if (authData.user) {
        // Fetch the created profile
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        if (profileError) {
          // If there's an error fetching the profile, it might be a unique constraint violation
          // Return the error so the UI can handle it
          return { data: null, error: profileError }
        }
        
        if (profile) {
          setUser(profile)
        } else {
          // If profile not found yet, it will be set by the auth state listener
          console.log('Profile will be loaded by auth state listener')
        }
      }

      return { data: authData, error: null }
    } catch (error) {
      console.error('Error signing up:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      // Fetch user profile with role
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        if (profileError) throw profileError

        setUser(profile)
      }

      return { data: authData, error: null }
    } catch (error) {
      console.error('Error signing in:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error)
      return { error }
    }
  }

  const resendConfirmation = async (email) => {
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error resending confirmation email:', error)
      return { data: null, error }
    }
  }

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
