import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../utils/supabase'

// Mock the supabase client
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}))

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, signUp, signIn, signOut } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'no user'}</div>
      <button onClick={() => signUp('testuser', 'test@example.com', 'password123')}>
        Sign Up
      </button>
      <button onClick={() => signIn('test@example.com', 'password123')}>
        Sign In
      </button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock for getSession
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    
    // Default mock for onAuthStateChange
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })
  })

  describe('Requirement 1.1: signUp creates user with role student', () => {
    it('should create a new user account with role student by default', async () => {
      const mockAuthUser = {
        id: 'user-123',
        email: 'test@example.com',
      }
      
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        created_at: new Date().toISOString(),
      }

      // Mock successful auth signup
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      })

      // Mock profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      })

      supabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Click sign up button
      const signUpButton = screen.getByText('Sign Up')
      signUpButton.click()

      // Wait for signup to complete
      await waitFor(() => {
        const userElement = screen.getByTestId('user')
        expect(userElement).not.toHaveTextContent('no user')
      })

      // Verify signUp was called with correct parameters
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            username: 'testuser',
            role: 'student',
          },
        },
      })

      // Verify user state is set correctly
      const userElement = screen.getByTestId('user')
      const userData = JSON.parse(userElement.textContent)
      expect(userData.role).toBe('student')
      expect(userData.username).toBe('testuser')
      expect(userData.email).toBe('test@example.com')
    })

    it('should handle signup errors gracefully', async () => {
      const mockError = new Error('Email already exists')
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      const signUpButton = screen.getByText('Sign Up')
      signUpButton.click()

      await waitFor(() => {
        // User should remain null on error
        expect(screen.getByTestId('user')).toHaveTextContent('no user')
      })
    })
  })

  describe('Requirement 1.2: signIn authenticates user and establishes session', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockAuthUser = {
        id: 'user-456',
        email: 'test@example.com',
      }
      
      const mockProfile = {
        id: 'user-456',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        created_at: new Date().toISOString(),
      }

      // Mock successful sign in
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: { access_token: 'token123' } },
        error: null,
      })

      // Mock profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })

      supabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Click sign in button
      const signInButton = screen.getByText('Sign In')
      signInButton.click()

      // Wait for sign in to complete
      await waitFor(() => {
        const userElement = screen.getByTestId('user')
        expect(userElement).not.toHaveTextContent('no user')
      })

      // Verify signInWithPassword was called
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })

      // Verify profile was fetched
      expect(supabase.from).toHaveBeenCalledWith('users')
      expect(mockSelect).toHaveBeenCalledWith('*')

      // Verify user state is set
      const userElement = screen.getByTestId('user')
      const userData = JSON.parse(userElement.textContent)
      expect(userData.id).toBe('user-456')
      expect(userData.email).toBe('test@example.com')
    })

    it('should handle invalid credentials', async () => {
      const mockError = new Error('Invalid login credentials')
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      const signInButton = screen.getByText('Sign In')
      signInButton.click()

      await waitFor(() => {
        // User should remain null on error
        expect(screen.getByTestId('user')).toHaveTextContent('no user')
      })
    })
  })

  describe('Requirement 1.3: Session persists across page reloads', () => {
    it('should restore user session on mount when session exists', async () => {
      const mockSession = {
        user: {
          id: 'user-789',
          email: 'test@example.com',
        },
        access_token: 'token123',
      }
      
      const mockProfile = {
        id: 'user-789',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        created_at: new Date().toISOString(),
      }

      // Mock existing session
      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      // Mock profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })

      supabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Wait for session to be restored
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Verify getSession was called
      expect(supabase.auth.getSession).toHaveBeenCalled()

      // Verify profile was fetched
      expect(supabase.from).toHaveBeenCalledWith('users')

      // Verify user is set from session
      const userElement = screen.getByTestId('user')
      const userData = JSON.parse(userElement.textContent)
      expect(userData.id).toBe('user-789')
      expect(userData.role).toBe('student')
    })

    it('should handle no existing session on mount', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // User should be null when no session exists
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
    })

    it('should listen for auth state changes', async () => {
      const mockCallback = vi.fn()
      
      supabase.auth.onAuthStateChange.mockImplementation((callback) => {
        mockCallback.mockImplementation(callback)
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Verify onAuthStateChange was called
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
    })
  })

  describe('Requirement 1.4: signOut terminates session and clears user state', () => {
    it('should clear session and user state on sign out', async () => {
      const mockProfile = {
        id: 'user-999',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        created_at: new Date().toISOString(),
      }

      // Start with an active session
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-999', email: 'test@example.com' },
          },
        },
        error: null,
      })

      // Mock profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })

      supabase.from.mockReturnValue({
        select: mockSelect,
      })

      // Mock successful sign out
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Wait for session to be restored
      await waitFor(() => {
        const userElement = screen.getByTestId('user')
        expect(userElement).not.toHaveTextContent('no user')
      })

      // Click sign out button
      const signOutButton = screen.getByText('Sign Out')
      signOutButton.click()

      // Wait for sign out to complete
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no user')
      })

      // Verify signOut was called
      expect(supabase.auth.signOut).toHaveBeenCalled()

      // Verify user state is cleared
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
    })

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed')
      
      supabase.auth.signOut.mockResolvedValue({
        error: mockError,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      const signOutButton = screen.getByText('Sign Out')
      signOutButton.click()

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled()
      })

      // Even on error, the function should be called
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Loading state', () => {
    it('should show loading state during initialization', () => {
      supabase.auth.getSession.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 100))
      )

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially should be loading
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    })

    it('should clear loading state after initialization', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
    })
  })

  describe('Error handling', () => {
    it('should handle profile fetch errors during initialization', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-error', email: 'test@example.com' },
          },
        },
        error: null,
      })

      // Mock profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Profile not found'),
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })

      supabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // User should be null when profile fetch fails
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
    })
  })
})
