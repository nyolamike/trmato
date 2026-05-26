import { useState } from 'react'
import SignUp from './SignUp'
import SignIn from './SignIn'

/**
 * Demo component showing how to use SignUp and SignIn components
 * This demonstrates the switching between sign up and sign in views
 */
const AuthDemo = () => {
  const [view, setView] = useState('signin') // 'signin' or 'signup'

  const handleSignUpSuccess = () => {
    console.log('Sign up successful!')
    // You can redirect or show a success message here
    setView('signin')
  }

  const handleSignInSuccess = (user) => {
    console.log('Sign in successful!', user)
    // You can redirect to dashboard or other page here
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {view === 'signin' ? (
        <SignIn
          onSuccess={handleSignInSuccess}
          onSwitchToSignUp={() => setView('signup')}
        />
      ) : (
        <SignUp
          onSuccess={handleSignUpSuccess}
          onSwitchToSignIn={() => setView('signin')}
        />
      )}
    </div>
  )
}

export default AuthDemo
