/**
 * Global Error Handler
 * Catches unhandled promise rejections and API errors
 * Prevents infinite loading spinners
 */

import { hide as hideLoading, showError } from './loading.js';
import { showToast } from './toast.js';

let errorHandlers = [];
let unhandledRejectionHandler = null;

/**
 * Register a custom error handler
 * @param {Function} handler - Error handler function
 */
export function onError(handler) {
  if (typeof handler === 'function') {
    errorHandlers.push(handler);
  }
}

/**
 * Remove error handler
 * @param {Function} handler - Error handler to remove
 */
export function offError(handler) {
  errorHandlers = errorHandlers.filter(h => h !== handler);
}

/**
 * Handle error with appropriate user feedback
 * @param {Error} error - Error object
 * @param {Object} options - Error handling options
 */
export function handleError(error, options = {}) {
  const {
    containerId = null,
    silent = false,
    showToastMessage = true,
    retryCallback = null
  } = options;

  // Extract error details
  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Произошла ошибка';
  const code = error.code || error.details?.code;

  console.error('[Error Handler]', {
    status,
    message,
    code,
    error
  });

  // Call registered handlers
  errorHandlers.forEach(handler => {
    try {
      handler(error, options);
    } catch (err) {
      console.error('[Error Handler] Handler failed:', err);
    }
  });

  // Hide any loading spinners in container
  if (containerId) {
    try {
      hideLoading(containerId);
    } catch (err) {
      console.warn('[Error Handler] Failed to hide loading:', err);
    }
  }

  // Don't show UI feedback if silent
  if (silent) {
    return;
  }

  // Get user-friendly message
  const userMessage = getUserFriendlyMessage(status, code, message);

  // Show error in container if specified
  if (containerId) {
    showError(containerId, userMessage, retryCallback);
  }

  // Show toast notification
  if (showToastMessage && typeof showToast === 'function') {
    showToast(userMessage, 'error');
  }
}

/**
 * Get user-friendly error message based on status code
 * @param {number} status - HTTP status code
 * @param {string} code - Error code
 * @param {string} originalMessage - Original error message
 * @returns {string} User-friendly message
 */
function getUserFriendlyMessage(status, code, originalMessage) {
  // CSRF errors
  if (code && code.startsWith('CSRF_')) {
    return 'Сессия истекла. Пожалуйста, обновите страницу.';
  }

  // Status-based messages
  switch (status) {
    case 401:
      return 'Необходима авторизация. Пожалуйста, войдите в систему.';
    
    case 403:
      if (code === 'CSRF_TOKEN_INVALID') {
        return 'Сессия истекла. Обновите страницу и попробуйте снова.';
      }
      return 'Доступ запрещён.';
    
    case 404:
      return 'Запрашиваемый ресурс не найден.';
    
    case 408:
      return 'Превышено время ожидания. Проверьте подключение к интернету.';
    
    case 429:
      return 'Слишком много запросов. Пожалуйста, подождите немного.';
    
    case 500:
      return 'Ошибка сервера. Пожалуйста, попробуйте позже.';
    
    case 502:
    case 503:
    case 504:
      return 'Сервис временно недоступен. Попробуйте позже.';
    
    default:
      // Return original message if it looks user-friendly
      if (originalMessage && originalMessage.length < 200 && !originalMessage.includes('Error:')) {
        return originalMessage;
      }
      return 'Произошла ошибка. Пожалуйста, попробуйте позже.';
  }
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  if (!unhandledRejectionHandler) {
    unhandledRejectionHandler = (event) => {
      console.error('[Unhandled Rejection]', event.reason);
      
      // Try to extract error from event
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      // Don't show UI for network errors in background
      const showUI = !error.message?.includes('fetch');

      if (showUI) {
        handleError(error, {
          showToastMessage: true,
          silent: false
        });
      }

      // Prevent default error logging
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  }

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error || event.message);
    
    // Don't show UI for script loading errors
    if (event.message?.includes('Script error')) {
      return;
    }

    // Prevent cascading errors
    event.preventDefault();
  });
}

/**
 * Retry helper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry = null
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx except 408, 429)
      if (error.status >= 400 && error.status < 500) {
        if (error.status !== 408 && error.status !== 429) {
          throw error;
        }
      }

      // Last attempt failed
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with jitter
      const jitter = Math.random() * 0.3 * delay;
      const waitTime = Math.min(delay + jitter, maxDelay);

      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(waitTime)}ms...`);

      // Call retry callback
      if (onRetry) {
        onRetry(attempt + 1, waitTime, error);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Increase delay for next retry
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function
 * @param {Object} options - Error handling options
 */
export function withErrorHandling(fn, options = {}) {
  return async function(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      throw error;
    }
  };
}

// Auto-setup on import
if (typeof window !== 'undefined') {
  setupGlobalErrorHandlers();
}

export default {
  handleError,
  onError,
  offError,
  retryWithBackoff,
  withErrorHandling,
  setupGlobalErrorHandlers
};
