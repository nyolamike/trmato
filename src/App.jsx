import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { StudentDashboard } from './pages/StudentDashboard'
import { AdminPanel } from './pages/AdminPanel'
import { TopicRequestPage } from './pages/TopicRequestPage'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/topic-requests" element={<TopicRequestPage />} />

            {/* Protected Student Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Teacher Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
