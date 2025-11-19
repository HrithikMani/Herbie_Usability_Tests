// src/lib/stores/auth.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Authentication state structure
const initialAuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: false
};

// Create the auth store
export const authStore = writable(initialAuthState);

// API base URL - this will be configurable later
const API_BASE_URL = '/api/auth';

// Helper function to make authenticated API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.error || errorData.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Helper function to make authenticated requests with token
async function authenticatedRequest(endpoint, options = {}) {
  const auth = getCurrentAuth();
  
  if (!auth.token) {
    throw new Error('No authentication token available');
  }

  return apiRequest(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      ...options.headers
    }
  });
}

// Get current authentication state
function getCurrentAuth() {
  let currentAuth = initialAuthState;
  authStore.subscribe(value => currentAuth = value)();
  return currentAuth;
}

// Load authentication state from localStorage on app start
export function initializeAuth() {
  if (!browser) return;

  try {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    
    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      authStore.set({
        isAuthenticated: true,
        user: user,
        token: storedToken,
        isLoading: false
      });
      
      // Optionally validate token with server
      validateToken(storedToken);
    }
  } catch (error) {
    console.error('Error initializing auth from localStorage:', error);
    clearAuthData();
  }
}

// Save authentication data to localStorage
function saveAuthData(user, token) {
  if (!browser) return;

  try {
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving auth data to localStorage:', error);
  }
}

// Clear authentication data from localStorage
function clearAuthData() {
  if (!browser) return;

  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  } catch (error) {
    console.error('Error clearing auth data from localStorage:', error);
  }
}

// Validate token with server
async function validateToken(token) {
  try {
    const response = await apiRequest('/validate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.valid) {
      logout();
    }
  } catch (error) {
    console.error('Token validation failed:', error);
    logout();
  }
}

// Login function
export async function login(email, password) {
  authStore.update(state => ({ ...state, isLoading: true }));

  try {
    const response = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success && response.user && response.token) {
      const newAuthState = {
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        isLoading: false
      };

      authStore.set(newAuthState);
      saveAuthData(response.user, response.token);

      return { success: true, user: response.user };
    } else {
      throw new Error(response.error || 'Login failed');
    }
  } catch (error) {
    authStore.update(state => ({ 
      ...state, 
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null
    }));

    return { 
      success: false, 
      error: error.message || 'Login failed' 
    };
  }
}

// Register function
export async function register(userData) {
  authStore.update(state => ({ ...state, isLoading: true }));

  try {
    const response = await apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response.success && response.user && response.token) {
      const newAuthState = {
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        isLoading: false
      };

      authStore.set(newAuthState);
      saveAuthData(response.user, response.token);

      return { success: true, user: response.user };
    } else {
      throw new Error(response.error || 'Registration failed');
    }
  } catch (error) {
    authStore.update(state => ({ 
      ...state, 
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null
    }));

    return { 
      success: false, 
      error: error.message || 'Registration failed' 
    };
  }
}

// Logout function
export function logout() {
  authStore.set(initialAuthState);
  clearAuthData();
  
  // Optionally notify server about logout
  if (browser) {
    const currentAuth = getCurrentAuth();
    if (currentAuth.token) {
      apiRequest('/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAuth.token}`
        }
      }).catch(error => {
        console.warn('Logout notification to server failed:', error);
      });
    }
  }
}

// Update user profile
export async function updateProfile(profileData) {
  try {
    const response = await authenticatedRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });

    if (response.success && response.user) {
      authStore.update(state => ({
        ...state,
        user: response.user
      }));

      // Update localStorage
      saveAuthData(response.user, getCurrentAuth().token);

      return { success: true, user: response.user };
    } else {
      throw new Error(response.error || 'Profile update failed');
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Profile update failed'
    };
  }
}

// Change password
export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await authenticatedRequest('/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    if (response.success) {
      return { success: true };
    } else {
      throw new Error(response.error || 'Password change failed');
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Password change failed'
    };
  }
}

// Request password reset
export async function requestPasswordReset(email) {
  try {
    const response = await apiRequest('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    return {
      success: response.success,
      message: response.message || 'Password reset email sent'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Password reset request failed'
    };
  }
}

// Reset password with token
export async function resetPassword(token, newPassword) {
  try {
    const response = await apiRequest('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        newPassword
      })
    });

    return {
      success: response.success,
      message: response.message || 'Password reset successful'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Password reset failed'
    };
  }
}

// Derived stores for common auth checks
export const isAuthenticated = writable(false);
export const currentUser = writable(null);
export const isLoading = writable(false);

// Subscribe to authStore changes and update derived stores
authStore.subscribe(auth => {
  isAuthenticated.set(auth.isAuthenticated);
  currentUser.set(auth.user);
  isLoading.set(auth.isLoading);
});

// Initialize auth when this module loads
if (browser) {
  initializeAuth();
}

// Utility functions for components
export function requireAuth() {
  const auth = getCurrentAuth();
  return auth.isAuthenticated;
}

export function getAuthToken() {
  const auth = getCurrentAuth();
  return auth.token;
}

export function getCurrentUser() {
  const auth = getCurrentAuth();
  return auth.user;
}

// Auth guard function for page protection
export function authGuard() {
  if (!browser) return true; // Allow SSR
  
  const auth = getCurrentAuth();
  return auth.isAuthenticated;
}