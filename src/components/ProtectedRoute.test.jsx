import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

describe('ProtectedRoute - Role-based Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while checking authentication', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    })

    render(
      <MemoryRouter>
        <ProtectedRoute requireAuth={true}>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should allow students to access Student Dashboard', () => {
    const studentUser = {
      id: '123',
      username: 'student1',
      email: 'student@test.com',
      role: 'student'
    }

    mockUseAuth.mockReturnValue({
      user: studentUser,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute requiredRole="student">
          <div>Student Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Student Dashboard')).toBeInTheDocument()
  })

  it('should allow teachers to access Admin Panel', () => {
    const teacherUser = {
      id: '456',
      username: 'teacher1',
      email: 'teacher@test.com',
      role: 'teacher'
    }

    mockUseAuth.mockReturnValue({
      user: teacherUser,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="teacher">
          <div>Admin Panel</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })

  it('should prevent students from accessing Admin Panel (requiredRole=teacher)', () => {
    const studentUser = {
      id: '123',
      username: 'student1',
      email: 'student@test.com',
      role: 'student'
    }

    mockUseAuth.mockReturnValue({
      user: studentUser,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="teacher">
              <div>Admin Panel</div>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={<div>Redirected to Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Should not render admin panel for students (redirects to dashboard)
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
    expect(screen.getByText('Redirected to Dashboard')).toBeInTheDocument()
  })

  it('should prevent teachers from accessing Student Dashboard (requiredRole=student)', () => {
    const teacherUser = {
      id: '456',
      username: 'teacher1',
      email: 'teacher@test.com',
      role: 'teacher'
    }

    mockUseAuth.mockReturnValue({
      user: teacherUser,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="student">
              <div>Student Dashboard</div>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={<div>Redirected to Admin</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Should not render student dashboard for teachers (redirects to admin)
    expect(screen.queryByText('Student Dashboard')).not.toBeInTheDocument()
    expect(screen.getByText('Redirected to Admin')).toBeInTheDocument()
  })

  it('should allow any authenticated user when no role is required', () => {
    const studentUser = {
      id: '123',
      username: 'student1',
      email: 'student@test.com',
      role: 'student'
    }

    mockUseAuth.mockReturnValue({
      user: studentUser,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <ProtectedRoute>
          <div>User Profile</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('User Profile')).toBeInTheDocument()
  })
})
