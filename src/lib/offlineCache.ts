/**
 * Utility functions for caching audio files for offline playback
 */

const CACHE_NAME = 'bitecasty-audio-cache-v1';

/**
 * Cache an audio file for offline playback
 * @param url The URL of the audio file to cache
 * @returns A promise that resolves when the file is cached
 */
export const cacheAudioFile = async (url: string): Promise<boolean> => {
  try {
    // Check if the Cache API is available
    if (!('caches' in window)) {
      console.warn('Cache API not available');
      return false;
    }

    // Open the cache
    const cache = await caches.open(CACHE_NAME);
    
    // Check if the file is already cached
    const response = await cache.match(url);
    if (response) {
      console.log('Audio file already cached:', url);
      return true;
    }
    
    // Fetch the file and add it to the cache
    console.log('Caching audio file:', url);
    const fetchResponse = await fetch(url, { mode: 'no-cors' });
    
    // Clone the response before putting it in the cache
    await cache.put(url, fetchResponse.clone());
    
    console.log('Audio file cached successfully:', url);
    return true;
  } catch (error) {
    console.error('Error caching audio file:', error);
    return false;
  }
};

/**
 * Check if an audio file is cached for offline playback
 * @param url The URL of the audio file to check
 * @returns A promise that resolves to true if the file is cached
 */
export const isAudioFileCached = async (url: string): Promise<boolean> => {
  try {
    // Check if the Cache API is available
    if (!('caches' in window)) {
      return false;
    }

    // Open the cache
    const cache = await caches.open(CACHE_NAME);
    
    // Check if the file is cached
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    console.error('Error checking if audio file is cached:', error);
    return false;
  }
};

/**
 * Remove an audio file from the cache
 * @param url The URL of the audio file to remove
 * @returns A promise that resolves to true if the file was removed
 */
export const removeAudioFileFromCache = async (url: string): Promise<boolean> => {
  try {
    // Check if the Cache API is available
    if (!('caches' in window)) {
      return false;
    }

    // Open the cache
    const cache = await caches.open(CACHE_NAME);
    
    // Remove the file from the cache
    const result = await cache.delete(url);
    
    if (result) {
      console.log('Audio file removed from cache:', url);
    } else {
      console.log('Audio file not found in cache:', url);
    }
    
    return result;
  } catch (error) {
    console.error('Error removing audio file from cache:', error);
    return false;
  }
};

/**
 * Clear all cached audio files
 * @returns A promise that resolves to true if the cache was cleared
 */
export const clearAudioCache = async (): Promise<boolean> => {
  try {
    // Check if the Cache API is available
    if (!('caches' in window)) {
      return false;
    }

    // Delete the cache
    const result = await caches.delete(CACHE_NAME);
    
    if (result) {
      console.log('Audio cache cleared');
    } else {
      console.log('Audio cache not found');
    }
    
    return result;
  } catch (error) {
    console.error('Error clearing audio cache:', error);
    return false;
  }
}; 