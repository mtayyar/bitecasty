import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const Register = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('Starting registration process...')
      
      // Get the current site URL for redirect
      const siteUrl = window.location.origin
      
      // Register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
          emailRedirectTo: `${siteUrl}/auth/confirm`
        },
      })
      
      if (authError) {
        console.error('Auth error during registration:', authError)
        throw authError
      }
      
      console.log('Auth registration successful:', authData)
      
      if (authData.user) {
        // Wait a moment for the auth to complete and trigger to run
        console.log('Waiting for database trigger to create user profile...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Check if the user profile was created
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single()
        
        if (userError) {
          console.error('Error checking user profile:', userError)
          
          // If the profile wasn't created automatically, create it manually
          console.log('Attempting to create user profile manually...')
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: authData.user.id,
                username,
                full_name: null,
                avatar_url: null,
                bio: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
          
          if (insertError) {
            console.error('Error creating user profile manually:', insertError)
            throw new Error(`Failed to create user profile: ${insertError.message}`)
          }
          
          console.log('User profile created manually')
        } else {
          console.log('User profile created by trigger:', userData)
        }
        
        // Show a message about email confirmation
        alert('Registration successful! Please check your email to confirm your account.')
        
        // Redirect to login page
        navigate('/login')
      } else {
        throw new Error('Registration failed: No user data returned')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      setError(error.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Join BiteCasty</h1>
        <p className="text-gray-600 dark:text-gray-400">Create an account to start sharing audio</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="input w-full"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input w-full"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input w-full"
            minLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? 'Loading...' : 'Sign Up'}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  )
}

export default Register 