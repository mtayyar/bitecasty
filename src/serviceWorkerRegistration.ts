/**
 * Service worker registration
 */

// Check if service workers are supported
const isServiceWorkerSupported = 'serviceWorker' in navigator;

/**
 * Register the service worker
 */
export const registerServiceWorker = async (): Promise<void> => {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported in this browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered successfully:', registration);
    
    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('New service worker is being installed');
        
        newWorker.addEventListener('statechange', () => {
          console.log('Service worker state changed:', newWorker.state);
        });
      }
    });
  } catch (error) {
    console.error('Error registering service worker:', error);
  }
};

/**
 * Unregister the service worker
 */
export const unregisterServiceWorker = async (): Promise<void> => {
  if (!isServiceWorkerSupported) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const unregistered = await registration.unregister();
      if (unregistered) {
        console.log('Service worker unregistered successfully');
      } else {
        console.warn('Service worker could not be unregistered');
      }
    }
  } catch (error) {
    console.error('Error unregistering service worker:', error);
  }
};

/**
 * Check if there's a service worker update available
 */
export const checkForServiceWorkerUpdate = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return !!registration.waiting;
    }
    return false;
  } catch (error) {
    console.error('Error checking for service worker update:', error);
    return false;
  }
};

/**
 * Force the service worker to update
 */
export const forceServiceWorkerUpdate = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      // Send a message to the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error forcing service worker update:', error);
    return false;
  }
}; 