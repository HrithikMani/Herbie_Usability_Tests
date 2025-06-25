// src/hooks.server.js
import { dev } from '$app/environment';

export async function handle({ event, resolve }) {
  // In development, we proxy API requests to the Express server
  if (dev && event.url.pathname.startsWith('/api')) {
    // Let the proxy handle API requests (handled by Vite config)
    return resolve(event);
  }
  
  // Handle CORS headers for development
  if (dev) {
    const response = await resolve(event);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    return response;
  }
  
  return resolve(event);
}