import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 px-4 py-12">
          <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Please refresh the page and try again.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
