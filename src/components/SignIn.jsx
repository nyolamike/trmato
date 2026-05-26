import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const SignIn = ({ onSuccess, onSwitchToSignUp }) => {
  const { signIn, resendConfirmation, user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const [resendStatus, setResendStatus] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [resendError, setResendError] = useState('')

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Handle redirect after successful login
  useEffect(() => {
    if (shouldRedirect && user && !onSuccess) {
      // Role-based redirect: students → Student_Dashboard, teachers → Admin_Panel
      if (user.role === 'teacher') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
      setShouldRedirect(false)
    }
  }, [shouldRedirect, user, navigate, onSuccess])

  const validateForm = () => {
    const newErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    // Clear server error when user makes changes
    if (serverError) {
      setServerError('')
    }
    // If the user edits the email, the unconfirmed-email state no longer
    // applies to whatever they're now typing.
    if (name === 'email' && needsEmailConfirmation) {
      setNeedsEmailConfirmation(false)
      setResendStatus('idle')
      setResendError('')
    }
  }

  const handleResendConfirmation = async () => {
    if (!formData.email) return

    setResendStatus('sending')
    setResendError('')

    try {
      const { error } = await resendConfirmation(formData.email)

      if (error) {
        setResendStatus('error')
        setResendError(error.message || 'Failed to resend confirmation email.')
      } else {
        setResendStatus('sent')
      }
    } catch (error) {
      console.error('Resend confirmation error:', error)
      setResendStatus('error')
      setResendError('An unexpected error occurred. Please try again.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setNeedsEmailConfirmation(false)
    setResendStatus('idle')
    setResendError('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await signIn(formData.email, formData.password)

      if (error) {
        // Handle specific authentication errors
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('invalid') ||
            error.message.includes('credentials')) {
          setServerError('Invalid email or password')
        } else if (error.message.includes('Email not confirmed')) {
          setServerError('Please confirm your email address')
          setNeedsEmailConfirmation(true)
        } else {
          setServerError(error.message || 'Failed to sign in. Please try again.')
        }
      } else if (data?.user) {
        // Success - redirect based on user role
        if (onSuccess) {
          onSuccess(data.user)
        } else {
          // Trigger redirect after user state updates
          setShouldRedirect(true)
        }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Sign In
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
              disabled={isSubmitting}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Server Error Message */}
          {serverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <p className="text-sm text-red-800">{serverError}</p>

              {needsEmailConfirmation && (
                <div className="text-sm">
                  {resendStatus === 'sent' ? (
                    <p className="text-green-700">
                      Confirmation email sent to{' '}
                      <span className="font-medium">{formData.email}</span>.
                      Please check your inbox (and spam folder).
                    </p>
                  ) : (
                    <>
                      <p className="text-red-800">
                        Didn&apos;t get the confirmation email?
                      </p>
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendStatus === 'sending'}
                        className={`mt-1 inline-flex items-center text-sm font-medium underline-offset-2 hover:underline ${
                          resendStatus === 'sending'
                            ? 'text-gray-500 cursor-not-allowed'
                            : 'text-blue-700 hover:text-blue-800'
                        }`}
                      >
                        {resendStatus === 'sending'
                          ? 'Sending...'
                          : 'Resend confirmation email'}
                      </button>
                      {resendStatus === 'error' && resendError && (
                        <p className="mt-1 text-red-700">{resendError}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Switch to Sign Up */}
        {onSwitchToSignUp && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SignIn
export { SignIn }
