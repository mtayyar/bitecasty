import { useEffect, useState } from 'react';
import useOfflineStatus from '../hooks/useOfflineStatus';

/**
 * Component to display a notification when the user is offline
 */
export function OfflineNotification() {
  const { isOffline } = useOfflineStatus();
  const [show, setShow] = useState(false);

  // Add a slight delay before showing the notification to prevent flashing
  useEffect(() => {
    let timer: number;
    if (isOffline) {
      timer = window.setTimeout(() => setShow(true), 500);
    } else {
      setShow(false);
    }
    return () => clearTimeout(timer);
  }, [isOffline]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto w-full max-w-md px-4 z-50">
      <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
        <div className="flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <span>You are currently offline. Some features may be unavailable.</span>
        </div>
        <button 
          onClick={() => setShow(false)} 
          className="ml-2 text-white hover:text-gray-200"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default OfflineNotification; 