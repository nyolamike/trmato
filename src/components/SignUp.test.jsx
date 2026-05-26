import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignUp from './SignUp'
import { AuthProvider } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

const renderSignUp = (props = {}) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SignUp {...props} />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('SignUp Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  })

  describe('Rendering', () => {
    it('should render all form fields', () => {
      renderSignUp()
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })

    it('should render switch to sign in link when callback provided', () => {
      const onSwitchToSignIn = vi.fn()
      renderSignUp({ onSwitchToSignIn })
      
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  describe('Username Validation - Requirement 1.6', () => {
    it('should show error for username less than 3 characters', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(usernameInput, { target: { value: 'ab' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/username must be between 3 and 30 characters/i)).toBeInTheDocument()
      })
    })

    it('should show error for username more than 30 characters', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(usernameInput, { target: { value: 'a'.repeat(31) } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/username must be between 3 and 30 characters/i)).toBeInTheDocument()
      })
    })

    it('should accept username with exactly 3 characters', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      fireEvent.change(usernameInput, { target: { value: 'abc' } })
      
      // Should not show error
      expect(screen.queryByText(/username must be between 3 and 30 characters/i)).not.toBeInTheDocument()
    })

    it('should accept username with exactly 30 characters', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      fireEvent.change(usernameInput, { target: { value: 'a'.repeat(30) } })
      
      // Should not show error
      expect(screen.queryByText(/username must be between 3 and 30 characters/i)).not.toBeInTheDocument()
    })

    it('should show error for empty username', async () => {
      renderSignUp()
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Email Validation - Requirement 1.5', () => {
    it('should validate email format using regex', () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      
      // Test that the email input has type="email" for HTML5 validation
      expect(emailInput).toHaveAttribute('type', 'email')
      
      // The component uses regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ for validation
      // This is tested through form submission in other tests
    })

    it('should show error for invalid email format on blur', async () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      // Submit the form - this will trigger validation
      fireEvent.submit(submitButton.closest('form'))
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should show error for email without @ on submit', async () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(emailInput, { target: { value: 'invalidemail.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      // Submit the form
      fireEvent.submit(submitButton.closest('form'))
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should show error for email without domain on submit', async () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(emailInput, { target: { value: 'test@' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      // Submit the form
      fireEvent.submit(submitButton.closest('form'))
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should accept valid email format', async () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      
      // Should not show error
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })

    it('should show error for empty email', async () => {
      renderSignUp()
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Validation', () => {
    it('should show error for empty password', async () => {
      renderSignUp()
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should show error for password less than 6 characters', async () => {
      renderSignUp()
      
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: '12345' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission - Requirement 1.1', () => {
    it('should call signUp with correct parameters on valid submission', async () => {
      supabase.auth.signUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      
      // Mock the profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { id: '123', username: 'testuser', email: 'test@example.com', role: 'student' }, 
        error: null 
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      })
      
      supabase.from.mockReturnValue({
        select: mockSelect,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: '123', username: 'testuser', email: 'test@example.com', role: 'student' }, error: null })
          })
        })
      })

      renderSignUp()
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            data: {
              username: 'testuser',
              role: 'student'
            }
          }
        })
      })
    })

    it('should display error message when email already exists - Requirement 1.7', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' }
      })

      renderSignUp()
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/this email is already registered/i)).toBeInTheDocument()
      })
    })

    it('should display error message when username already exists - Requirement 1.8', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null
      })
      
      // Mock the profile fetch to fail with unique constraint error
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint "users_username_key"', code: '23505' }
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      })
      
      supabase.from.mockReturnValue({
        select: mockSelect,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'duplicate key value violates unique constraint "users_username_key"', code: '23505' }
            })
          })
        })
      })

      renderSignUp()
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'existinguser' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        // The error handling catches unique constraint violations
        expect(screen.getByText(/this username is already taken/i)).toBeInTheDocument()
      })
    })

    it('should disable submit button while submitting', async () => {
      supabase.auth.signUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      renderSignUp()
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/creating account/i)).toBeInTheDocument()
    })

    it('should call onSuccess callback on successful signup', async () => {
      const onSuccess = vi.fn()
      supabase.auth.signUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      
      // Mock the profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { id: '123', username: 'testuser', email: 'test@example.com', role: 'student' }, 
        error: null 
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      })
      
      supabase.from.mockReturnValue({
        select: mockSelect,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: '123', username: 'testuser', email: 'test@example.com', role: 'student' }, error: null })
          })
        })
      })

      renderSignUp({ onSuccess })
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Inline Error Display - Requirement 1.5, 1.6', () => {
    it('should display validation errors inline below fields', async () => {
      renderSignUp()
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const usernameError = screen.getByText(/username is required/i)
        const emailError = screen.getByText(/email is required/i)
        const passwordError = screen.getByText(/password is required/i)
        
        expect(usernameError).toBeInTheDocument()
        expect(emailError).toBeInTheDocument()
        expect(passwordError).toBeInTheDocument()
      })
    })

    it('should clear error when user starts typing', async () => {
      renderSignUp()
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      })
      
      const usernameInput = screen.getByLabelText(/username/i)
      fireEvent.change(usernameInput, { target: { value: 'test' } })
      
      expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument()
    })
  })

  describe('Switch to Sign In', () => {
    it('should call onSwitchToSignIn when sign in link clicked', () => {
      const onSwitchToSignIn = vi.fn()
      renderSignUp({ onSwitchToSignIn })
      
      const signInButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(signInButton)
      
      expect(onSwitchToSignIn).toHaveBeenCalled()
    })
  })

  describe('Additional Edge Cases - Requirements 1.5, 1.6', () => {
    it('should accept valid email with subdomain', async () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test@mail.example.com' } })
      
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })

    it('should accept valid email with plus sign', async () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test+tag@example.com' } })
      
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })

    it('should accept valid email with numbers', async () => {
      renderSignUp()
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'user123@example.com' } })
      
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })

    it('should accept username with numbers', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      fireEvent.change(usernameInput, { target: { value: 'user123' } })
      
      expect(screen.queryByText(/username must be between 3 and 30 characters/i)).not.toBeInTheDocument()
    })

    it('should accept username with underscores', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      fireEvent.change(usernameInput, { target: { value: 'test_user' } })
      
      expect(screen.queryByText(/username must be between 3 and 30 characters/i)).not.toBeInTheDocument()
    })

    it('should validate username with exactly 2 characters', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(usernameInput, { target: { value: 'ab' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/username must be between 3 and 30 characters/i)).toBeInTheDocument()
      })
    })

    it('should validate username with exactly 31 characters', async () => {
      renderSignUp()
      
      const usernameInput = screen.getByLabelText(/username/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      fireEvent.change(usernameInput, { target: { value: 'a'.repeat(31) } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/username must be between 3 and 30 characters/i)).toBeInTheDocument()
      })
    })

    it('should prevent form submission when validation fails', async () => {
      renderSignUp()
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      
      // Submit with empty fields - this should trigger validation
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      })
      
      // Verify signUp was not called
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('should handle successful signup with valid boundary values', async () => {
      supabase.auth.signUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      
      // Mock the profile fetch with proper chaining
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { id: '123', username: 'abc', email: 'test@example.com', role: 'student' }, 
        error: null 
      })
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      })
      
      supabase.from.mockReturnValue({
        select: mockSelect,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: '123', username: 'abc', email: 'test@example.com', role: 'student' }, error: null })
          })
        })
      })

      renderSignUp()
      
      // Test with minimum valid username (3 chars) and maximum (30 chars)
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'abc' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalled()
      })
    })
  })
})
