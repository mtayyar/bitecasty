import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('Verifying your email...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the access_token and refresh_token from the URL
        const params = new URLSearchParams(location.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (!accessToken || !refreshToken) {
          setError('Invalid confirmation link. Missing tokens.');
          return;
        }

        if (type !== 'signup' && type !== 'recovery') {
          setError('Invalid confirmation link type.');
          return;
        }

        // Set the session with the tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          setError(`Failed to verify email: ${sessionError.message}`);
          return;
        }

        // Get the user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('Error getting user:', userError);
          setError(`Failed to get user: ${userError?.message || 'User not found'}`);
          return;
        }

        setMessage('Email verified successfully! Redirecting...');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setError(`An error occurred: ${error.message || 'Unknown error'}`);
      }
    };

    handleEmailConfirmation();
  }, [location, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-center">Email Verification</h1>
        
        {error ? (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="mt-4 w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="mb-4 rounded-md bg-blue-50 p-4 text-blue-700">
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailConfirmation; 