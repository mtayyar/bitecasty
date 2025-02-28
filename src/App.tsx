import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { Session } from '@supabase/supabase-js'
import { testSupabaseConnection } from './lib/supabaseTest'
import { setupLikesTables, resetAllLikesCounts, addCommentsCountColumn, setupAudioCommentsBucket } from './lib/supabaseClient'
import { setupSqlFunctions } from './lib/supabaseFunctions'

// Pages
import Home from './pages/Home'
import CreateAudioPost from './pages/CreateAudioPost'
import FollowingFeedPage from './pages/FollowingFeedPage'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import EditPost from './pages/EditPost'
import Login from './pages/Login'
import Register from './pages/Register'
import EmailConfirmation from './pages/EmailConfirmation'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Define the connection result type
interface ConnectionResult {
  success: boolean;
  message: string;
  error?: {
    message: string;
  };
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Test Supabase connection
    const checkConnection = async () => {
      console.log('Checking Supabase connection...');
      try {
        const result = await testSupabaseConnection() as ConnectionResult;
        console.log('Connection result:', result);
        if (result.success) {
          setConnectionStatus({ success: true, message: 'Connected to Supabase successfully!' });
        } else {
          console.error('Failed to connect to Supabase:', result.error);
          setConnectionStatus({ 
            success: false, 
            message: `Failed to connect to Supabase: ${result.error?.message || 'Unknown error'}` 
          });
          setError('Failed to connect to Supabase. Please check your connection and try again.');
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setConnectionStatus({ 
          success: false, 
          message: `Error checking connection: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
        setError('Error checking connection. Please refresh the page and try again.');
      }
    };

    checkConnection();

    // Check active sessions and sets the user
    console.log('Getting current session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session retrieved:', session ? 'Session exists' : 'No session');
      setSession(session)
      setLoading(false)
    }).catch(error => {
      console.error('Error getting session:', error);
      setError('Error getting session. Please refresh the page and try again.');
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    console.log('Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed, event:', _event);
      console.log('New session:', session ? 'Session exists' : 'No session');
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Fix likes tables on app startup
    const setupTables = async () => {
      try {
        console.log('Checking and setting up database tables...');
        await setupLikesTables();
        
        // Reset all likes counts to ensure accuracy
        console.log('Resetting all likes counts...');
        await resetAllLikesCounts();
        
        // Ensure comments_count column exists
        console.log('Checking comments_count column...');
        await addCommentsCountColumn();
        
        // Set up audio comments bucket
        console.log('Setting up audio comments bucket...');
        await setupAudioCommentsBucket();
        
        console.log('Database setup complete');
      } catch (error) {
        console.error('Error setting up database:', error);
        setError('Error setting up database. Some features may not work correctly.');
      }
    };
    
    if (connectionStatus?.success) {
      setupTables();
    }
  }, [connectionStatus]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p>Loading application...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  console.log('Rendering App component, session:', session ? 'Session exists' : 'No session');

  return (
    <>
      <Routes>
        {/* Root path redirects to login if not authenticated, or home if authenticated */}
        <Route path="/" element={
          session ? <Navigate to="/home" /> : <Navigate to="/login" />
        } />
        
        {/* Auth routes outside of Layout */}
        <Route path="/login" element={
          session ? <Navigate to="/home" /> : <Login />
        } />
        <Route path="/register" element={
          session ? <Navigate to="/home" /> : <Register />
        } />
        <Route path="/auth/confirm" element={<EmailConfirmation />} />
        
        {/* Main app routes with Layout */}
        <Route path="/" element={<Layout session={session} />}>
          <Route path="home" element={
            <ProtectedRoute session={session}>
              <Home session={session} />
            </ProtectedRoute>
          } />
          <Route path="create" element={
            <ProtectedRoute session={session}>
              <CreateAudioPost />
            </ProtectedRoute>
          } />
          <Route path="following" element={
            <ProtectedRoute session={session}>
              <FollowingFeedPage />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute session={session}>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="profile/:id" element={
            <ProtectedRoute session={session}>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute session={session}>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="edit-post/:id" element={
            <ProtectedRoute session={session}>
              <EditPost />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </>
  )
}

export default App 