# Authentication UI Components

This directory contains the authentication UI components for the TrMato MVP Platform.

## Components

### SignUp Component

A complete sign-up form with validation for creating new user accounts.

**Features:**
- Username validation (3-30 characters) - Requirement 1.6
- Email format validation using regex - Requirement 1.5
- Password validation (minimum 6 characters)
- Inline error display for validation errors
- Server error handling for duplicate emails/usernames - Requirements 1.7, 1.8
- Integration with AuthContext for user creation
- Default role assignment ('student') - Requirement 1.1
- Mobile-responsive design with Tailwind CSS
- Loading states during submission
- Optional callback for successful signup
- Optional switch to sign-in functionality

**Props:**
- `onSuccess` (function, optional): Callback function called after successful signup
- `onSwitchToSignIn` (function, optional): Callback to switch to sign-in view

**Usage:**
```jsx
import { SignUp } from './components'

function App() {
  const handleSignUpSuccess = () => {
    console.log('User created successfully!')
  }

  const handleSwitchToSignIn = () => {
    // Navigate to sign in page
  }

  return (
    <SignUp 
      onSuccess={handleSignUpSuccess}
      onSwitchToSignIn={handleSwitchToSignIn}
    />
  )
}
```

**Validation Rules:**
- Username: 3-30 characters (enforced client-side)
- Email: Valid email format using regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password: Minimum 6 characters
- All fields are required

**Error Messages:**
- "Username is required" - when username field is empty
- "Username must be between 3 and 30 characters" - when username length is invalid
- "Email is required" - when email field is empty
- "Please enter a valid email address" - when email format is invalid
- "Password is required" - when password field is empty
- "Password must be at least 6 characters" - when password is too short
- "This email is already registered" - when email already exists (Requirement 1.7)
- "This username is already taken" - when username already exists (Requirement 1.8)
- "Email or username already exists" - for generic uniqueness violations

### SignIn Component

A complete sign-in form with validation for authenticating existing users.

**Features:**
- Email format validation using regex
- Password validation
- Inline error display for validation errors
- Server error handling for invalid credentials - Requirement 11.4
- Integration with AuthContext for authentication - Requirement 1.2
- Automatic redirect to dashboard on successful login
- Mobile-responsive design with Tailwind CSS
- Loading states during submission
- Optional callback for successful signin
- Optional switch to sign-up functionality
- Proper autocomplete attributes for password managers

**Props:**
- `onSuccess` (function, optional): Callback function called after successful signin with user data
- `onSwitchToSignUp` (function, optional): Callback to switch to sign-up view

**Usage:**
```jsx
import { SignIn } from './components'
import { useNavigate } from 'react-router-dom'

function App() {
  const navigate = useNavigate()

  const handleSignInSuccess = (user) => {
    console.log('User signed in:', user)
    // Custom redirect logic
    navigate('/dashboard')
  }

  const handleSwitchToSignUp = () => {
    // Navigate to sign up page
  }

  return (
    <SignIn 
      onSuccess={handleSignInSuccess}
      onSwitchToSignUp={handleSwitchToSignUp}
    />
  )
}
```

**Validation Rules:**
- Email: Valid email format using regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password: Required (no minimum length on sign-in)
- All fields are required

**Error Messages:**
- "Email is required" - when email field is empty
- "Please enter a valid email address" - when email format is invalid
- "Password is required" - when password field is empty
- "Invalid email or password" - when credentials are incorrect (Requirement 11.4)
- "Please confirm your email address" - when email is not confirmed
- Generic error messages for other authentication failures

**Default Behavior:**
- If no `onSuccess` callback is provided, redirects to `/dashboard` on successful login
- Requires `react-router-dom` for default redirect functionality

### AuthDemo Component

A demonstration component showing how to implement authentication flow with view switching.

**Features:**
- Toggles between SignIn and SignUp views
- Handles success callbacks
- Shows proper integration pattern
- Full-screen centered layout

**Usage:**
```jsx
import AuthDemo from './components/AuthDemo'

function App() {
  return <AuthDemo />
}
```

## Integration with AuthContext

Both components integrate with the `AuthContext` which provides:
- `signUp(username, email, password)` - Creates new user account
- `signIn(email, password)` - Authenticates existing user
- `user` - Current authenticated user object
- `loading` - Loading state for auth operations

The AuthContext handles:
- Session persistence across page reloads (Requirement 1.3)
- User profile fetching with role information
- Default role assignment ('student') for new users (Requirement 1.1)
- Supabase authentication integration

## Styling

Components use Tailwind CSS with:
- Mobile-first responsive design
- Consistent color scheme (blue primary, red for errors)
- Proper focus states for accessibility
- Loading states with disabled styling
- Error states with red borders and text

## Testing

Comprehensive test suites are provided:
- `SignUp.test.jsx` - 23 tests covering all validation rules and requirements
- `SignIn.test.jsx` - 19 tests covering authentication flow and error handling

Run tests with:
```bash
npm test src/components/SignUp.test.jsx src/components/SignIn.test.jsx
```

## Requirements Coverage

### SignUp Component
- ✅ Requirement 1.1: Create user account with default 'student' role
- ✅ Requirement 1.5: Validate email format using regex
- ✅ Requirement 1.6: Validate username length (3-30 characters)
- ✅ Requirement 1.7: Display error for duplicate email addresses
- ✅ Requirement 1.8: Display error for duplicate usernames

### SignIn Component
- ✅ Requirement 1.2: Authenticate user and establish session
- ✅ Requirement 11.4: Display error for invalid credentials

## File Structure

```
src/components/
├── SignUp.jsx              # Sign-up form component
├── SignUp.test.jsx         # Sign-up component tests
├── SignIn.jsx              # Sign-in form component
├── SignIn.test.jsx         # Sign-in component tests
├── AuthDemo.jsx            # Demo component showing usage
├── index.js                # Component exports
└── README.md               # This file
```

## Future Enhancements

Potential improvements for future iterations:
- Password strength indicator
- "Remember me" functionality
- Password reset flow
- Social authentication (Google, Facebook)
- Two-factor authentication
- Email verification flow
- Username availability check while typing
- Password visibility toggle
- Form field animations
