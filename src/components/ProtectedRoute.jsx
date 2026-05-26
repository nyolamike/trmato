import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * ProtectedRoute component that handles authentication and role-based access control
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {string} [props.requiredRole] - Optional role requirement ('student' or 'teacher')
 * @param {boolean} [props.requireAuth=true] - Whether authentication is required
 */
export const ProtectedRoute = ({ children, requiredRole, requireAuth = true }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to landing page if authentication is required but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/" state={{ from: location, message: 'Please sign in to access this page' }} replace />
  }

  // Handle role-based access control
  if (user && requiredRole) {
    // Prevent students from accessing Admin Panel
    if (requiredRole === 'teacher' && user.role === 'student') {
      return (
        <Navigate 
          to="/dashboard" 
          state={{ 
            from: location, 
            message: 'Access denied. Students cannot access the Admin Panel.' 
          }} 
          replace 
        />
      )
    }

    // Prevent teachers from accessing Student Dashboard
    if (requiredRole === 'student' && user.role === 'teacher') {
      return (
        <Navigate 
          to="/admin" 
          state={{ 
            from: location, 
            message: 'Teachers should use the Admin Panel.' 
          }} 
          replace 
        />
      )
    }
  }

  // User is authorized, render the protected content
  return children
}
