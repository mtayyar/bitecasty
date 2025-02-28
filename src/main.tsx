import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { SocialProvider } from './contexts/SocialContext'

// Try to register service worker if available
try {
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js')
        console.log('Service worker registered successfully')
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