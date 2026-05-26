import React from 'react'

function App() {
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

        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Project Initialized</h2>
            <p className="text-gray-700 mb-4">
              The TrMato platform has been successfully initialized with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>React with Vite</li>
              <li>Tailwind CSS (mobile-first configuration)</li>
              <li>React Router DOM</li>
              <li>Supabase client library</li>
              <li>Organized folder structure</li>
            </ul>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Next steps:</strong> Configure your Supabase credentials in the .env file
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
