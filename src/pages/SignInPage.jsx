import { SignIn } from '../components/SignIn'
import { useNavigate } from 'react-router-dom'

export const SignInPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            TrMato MVP Platform
          </h1>
          <p className="text-lg text-gray-600">
            Sign in to your account
          </p>
        </header>

        <div className="max-w-md mx-auto">
          <SignIn />
          
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
