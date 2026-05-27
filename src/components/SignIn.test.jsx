import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import SignIn from './SignIn'
import { AuthProvider } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      resend: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const renderSignIn = (props = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <SignIn {...props} />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('SignIn Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  })

  describe('Rendering', () => {
    it('should render all form fields', () => {
      renderSignIn()
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render switch to sign up link when callback provided', () => {
      const onSwitchToSignUp = vi.fn()
      renderSignIn({ onSwitchToSignUp })
      
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })
  })

  describe('Email Validation', () => {
    it('should validate email format using regex', () => {
      renderSignIn()
      
      const emailInput = screen.getByLabelText(/email/i)
      
      // Test that the email input has type="email" for HTML5 validation
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('should show error for invalid email format on submit', async () => {
      renderSignIn()
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      // Submit the form
      fireEvent.submit(submitButton.closest('form'))
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should show error for empty email', async () => {
      renderSignIn()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should accept valid email format', async () => {
      renderSignIn()
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      
      // Should not show error
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })
  })

  describe('Password Validation', () => {
    it('should show error for empty password', async () => {
      renderSignIn()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission - Requirement 1.2', () => {
    it('should call signIn with correct parameters on valid submission', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null
      })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '123', email: 'test@example.com', role: 'student' },
              error: null
            })
          })
        })
      })

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    it('should display error message for invalid credentials - Requirement 11.4', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      })

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
    })

    it('should redirect to dashboard on successful login', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null
      })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '123', email: 'test@example.com', role: 'student' },
              error: null
            })
          })
        })
      })

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should call onSuccess callback when provided', async () => {
      const onSuccess = vi.fn()
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null
      })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '123', email: 'test@example.com', role: 'student' },
              error: null
            })
          })
        })
      })

      renderSignIn({ onSuccess })
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ id: '123' })
      })
    })

    it('should disable submit button while submitting', async () => {
      supabase.auth.signInWithPassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })

    it('should handle email not confirmed error', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' }
      })

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please confirm your email address/i)).toBeInTheDocument()
      })
    })

    it('should handle generic errors', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      })

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Inline Error Display', () => {
    it('should display validation errors inline below fields', async () => {
      renderSignIn()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const emailError = screen.getByText(/email is required/i)
        const passwordError = screen.getByText(/password is required/i)
        
        expect(emailError).toBeInTheDocument()
        expect(passwordError).toBeInTheDocument()
      })
    })

    it('should clear error when user starts typing', async () => {
      renderSignIn()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
    })

    it('should clear server error when user makes changes', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      })

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
      
      // Change email
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
      
      expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
    })
  })

  describe('Switch to Sign Up', () => {
    it('should call onSwitchToSignUp when sign up link clicked', () => {
      const onSwitchToSignUp = vi.fn()
      renderSignIn({ onSwitchToSignUp })
      
      const signUpButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(signUpButton)
      
      expect(onSwitchToSignUp).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper autocomplete attributes', () => {
      renderSignIn()
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('should have proper input types', () => {
      renderSignIn()
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Additional Edge Cases - Requirement 1.5', () => {
    it('should accept valid email with subdomain', async () => {
      renderSignIn()
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'test@mail.example.com' } })
      
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })

    it('should accept valid email with numbers', async () => {
      renderSignIn()
      
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'user123@example.com' } })
      
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })

    it('should display both validation errors simultaneously', async () => {
      renderSignIn()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should clear validation errors when fields become valid', async () => {
      renderSignIn()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
      
      // Fix fields
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument()
    })

    it('should prevent form submission when validation fails', async () => {
      renderSignIn()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // Submit with empty fields - this should trigger validation
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
      
      // Verify signIn was not called
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('should handle unexpected server errors gracefully', async () => {
      supabase.auth.signInWithPassword.mockRejectedValue(new Error('Unexpected error'))

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        // The component shows "An unexpected error occurred. Please try again."
        expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
      })
    })

    it('should re-enable submit button after error', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      })

      renderSignIn()
      
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
      
      // Button should be enabled again
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Email Confirmation Resend', () => {
    const triggerUnconfirmedSignIn = async (email = 'test@example.com') => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' }
      })

      renderSignIn()

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: email }
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      })

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/please confirm your email address/i)
        ).toBeInTheDocument()
      })
    }

    it('shows the resend confirmation button only after an unconfirmed-email error', async () => {
      // Sanity: no resend button before any error
      renderSignIn()
      expect(
        screen.queryByRole('button', { name: /resend confirmation/i })
      ).not.toBeInTheDocument()
    })

    it('does NOT show the resend button for invalid-credentials errors', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      })

      renderSignIn()

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      })

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email or password/i)
        ).toBeInTheDocument()
      })

      expect(
        screen.queryByRole('button', { name: /resend confirmation/i })
      ).not.toBeInTheDocument()
    })

    it('shows the resend button after an unconfirmed-email error', async () => {
      await triggerUnconfirmedSignIn()

      expect(
        screen.getByRole('button', { name: /resend confirmation email/i })
      ).toBeInTheDocument()
    })

    it('calls supabase.auth.resend with type=signup and the form email when clicked', async () => {
      supabase.auth.resend.mockResolvedValue({ data: {}, error: null })

      await triggerUnconfirmedSignIn('learner@matovu.io')

      fireEvent.click(
        screen.getByRole('button', { name: /resend confirmation email/i })
      )

      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'learner@matovu.io'
        })
      })
    })

    it('shows a success message after the confirmation email is resent', async () => {
      supabase.auth.resend.mockResolvedValue({ data: {}, error: null })

      await triggerUnconfirmedSignIn('learner@matovu.io')

      fireEvent.click(
        screen.getByRole('button', { name: /resend confirmation email/i })
      )

      await waitFor(() => {
        expect(
          screen.getByText(/confirmation email sent to/i)
        ).toBeInTheDocument()
      })
      expect(screen.getByText(/learner@matovu\.io/)).toBeInTheDocument()

      // After success the button is replaced by the success message
      expect(
        screen.queryByRole('button', { name: /resend confirmation email/i })
      ).not.toBeInTheDocument()
    })

    it('shows an error message when the resend request fails', async () => {
      supabase.auth.resend.mockResolvedValue({
        data: null,
        error: { message: 'For security reasons, please wait before resending.' }
      })

      await triggerUnconfirmedSignIn()

      fireEvent.click(
        screen.getByRole('button', { name: /resend confirmation email/i })
      )

      await waitFor(() => {
        expect(
          screen.getByText(/for security reasons, please wait before resending/i)
        ).toBeInTheDocument()
      })

      // Button remains so the user can retry
      expect(
        screen.getByRole('button', { name: /resend confirmation email/i })
      ).toBeInTheDocument()
    })

    it('disables the resend button while the request is in flight', async () => {
      let resolveResend
      supabase.auth.resend.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveResend = resolve
          })
      )

      await triggerUnconfirmedSignIn()

      const resendButton = screen.getByRole('button', {
        name: /resend confirmation email/i
      })
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /sending/i })
        ).toBeDisabled()
      })

      resolveResend({ data: {}, error: null })

      await waitFor(() => {
        expect(
          screen.getByText(/confirmation email sent to/i)
        ).toBeInTheDocument()
      })
    })

    it('hides the resend button when the user edits the email field', async () => {
      await triggerUnconfirmedSignIn()

      expect(
        screen.getByRole('button', { name: /resend confirmation email/i })
      ).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'different@example.com' }
      })

      expect(
        screen.queryByRole('button', { name: /resend confirmation email/i })
      ).not.toBeInTheDocument()
    })
  })
})
