import { useEffect } from "react";

// Temporary component to clean up old service workers and caches
export function UnregisterSWOnce() {
  useEffect(() => {
    // Skip cleanup entirely to preserve auth sessions
    console.log('Skipping storage cleanup to preserve authentication');
    return;
    
    // Unregister any existing service workers
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('Unregistered service worker:', registration);
        });
      });
    }
    
    // Clear old caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log('Deleted cache:', cacheName);
        });
      });
    }
  }, []);

  return null;
}