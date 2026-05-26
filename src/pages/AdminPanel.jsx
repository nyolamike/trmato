import { useAuth } from '../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export const AdminPanel = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Flash-message handling: derive the message from navigation state and use
  // an async setState only to dismiss it after 5s (avoids set-state-in-effect).
  const stateMessage = location.state?.message ?? ''
  const [dismissedStateMessage, setDismissedStateMessage] = useState(null)

  useEffect(() => {
    if (!stateMessage) return undefined
    const timer = setTimeout(
      () => setDismissedStateMessage(stateMessage),
      5000
    )
    return () => clearTimeout(timer)
  }, [stateMessage])

  const message =
    stateMessage && dismissedStateMessage !== stateMessage ? stateMessage : ''

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Admin Panel</h1>
            <p className="text-gray-600">Welcome, {user?.username}!</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Home
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Message Display */}
        {message && (
          <div className="mb-6">
            <div className={`p-4 rounded-lg ${
              message.includes('denied') 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">My Sessions</h2>
            <p className="text-gray-600">
              Create and manage your tutoring sessions here.
            </p>
          </div>

          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Enrollments</h2>
            <p className="text-gray-600">
              Review and approve student enrollments here.
            </p>
          </div>

          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Topic Requests</h2>
            <p className="text-gray-600">
              Review student topic requests here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
