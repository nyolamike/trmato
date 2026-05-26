import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export const LandingPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Display any messages passed via navigation state
    if (location.state?.message) {
      setMessage(location.state.message)
      // Clear the message after 5 seconds
      const timer = setTimeout(() => setMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  const handleDashboardClick = () => {
    if (user?.role === 'student') {
      navigate('/dashboard')
    } else if (user?.role === 'teacher') {
      navigate('/admin')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setMessage('You have been signed out successfully')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            TrMato MVP Platform
          </h1>
          <p className="text-lg text-gray-600">
            Live tutoring platform for secondary school students in Uganda
          </p>
        </header>

        {/* Message Display */}
        {message && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className={`p-4 rounded-lg ${
              message.includes('denied') || message.includes('sign in') 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Welcome to TrMato</h2>
            
            {user ? (
              <div>
                <p className="text-gray-700 mb-4">
                  Logged in as: <strong>{user.username}</strong> ({user.role})
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDashboardClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to {user.role === 'student' ? 'Dashboard' : 'Admin Panel'}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-700 mb-4">
                  Browse upcoming tutoring sessions or sign in to enroll.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate('/signin')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
