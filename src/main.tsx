import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { SocialProvider } from './contexts/SocialContext'

// Enable background audio playback
if ('mediaSession' in navigator) {
  document.addEventListener('visibilitychange', () => {
    // Keep audio playing when the page is hidden
    if (document.hidden) {
      // This prevents some browsers from pausing media when the page is hidden
      navigator.mediaSession.playbackState = 'playing';
    }
  });
}

// Try to register service worker if available
try {
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service worker registered successfully')
        
        // Set up a keepalive for the service worker
        setInterval(() => {
          registration.active?.postMessage('keepalive');
        }, 20000); // Send a message every 20 seconds
        
        // Request wake lock if available
        if ('wakeLock' in navigator) {
          let wakeLock: any = null;
          
          const requestWakeLock = async () => {
            try {
              wakeLock = await (navigator as any).wakeLock.request('screen');
              console.log('Wake Lock is active');
              
              wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
              });
            } catch (err) {
              console.error(`Wake Lock error: ${err}`);
            }
          };
          
          // Request wake lock when audio is playing
          document.addEventListener('play', () => {
            requestWakeLock();
          }, true);
          
          // Release wake lock when audio is paused
          document.addEventListener('pause', () => {
            if (wakeLock) {
              wakeLock.release();
              wakeLock = null;
            }
          }, true);
          
          // Re-request wake lock when document becomes visible
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !wakeLock) {
              requestWakeLock();
            }
          });
        }
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }
  }
  
  registerServiceWorker()
} catch (error) {
  console.warn('Service worker registration skipped:', error)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocialProvider>
          <App />
        </SocialProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
) 