/**
 * Common Initialization for All Pages
 * Sets up global error handling and auth
 */

import { setupGlobalErrorHandlers, handleError } from './errorHandler.js';
import { onUnauthorized } from './api.js';
import Auth from './auth.js';

// Track if initialization has been done
let initialized = false;

/**
 * Initialize common functionality
 * Call this at the start of every page
 */
export function initCommon() {
  if (initialized) {
    return;
  }

  // Setup global error handlers
  setupGlobalErrorHandlers();

  // Setup unauthorized handler for API requests
  onUnauthorized(({ endpoint, error }) => {
    console.warn('[Auth] Unauthorized request:', endpoint);
    
    // Clear auth state
    Auth.clearAuth();
    
    // Show error message
    handleError(error, {
      showToastMessage: true,
      silent: false
    });
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login.html') && 
        !window.location.pathname.includes('/register.html') &&
        !window.location.pathname.includes('/landing.html')) {
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1000);
    }
  });

  initialized = true;
}

/**
 * Initialize page with auth requirement
 * Combines initCommon with auth check
 */
export async function initWithAuth() {
  initCommon();
  await Auth.requireAuth();
}

export default {
  initCommon,
  initWithAuth
};
