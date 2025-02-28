import { useState, useEffect } from 'react';

/**
 * Custom hook to track online/offline status
 * @returns An object with isOffline status
 */
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Function to update status
    const handleStatusChange = () => {
      setIsOffline(!navigator.onLine);
    };

    // Add event listeners
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Clean up
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return { isOffline };
}

export default useOfflineStatus; 