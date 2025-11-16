/**
 * Loading State Manager
 * Provides consistent loading indicators across the application
 */

/**
 * Show loading indicator in container
 * @param {string} containerId - DOM element ID
 * @param {string} message - Optional loading message
 */
export function show(containerId, message = 'Загрузка...') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Loading container not found: ${containerId}`);
    return;
  }
  
  // Check if loading spinner already exists
  if (container.querySelector('.loading-spinner')) {
    return;
  }
  
  // Store original content
  if (!container.dataset.originalContent) {
    container.dataset.originalContent = container.innerHTML;
  }
  
  // Add loading indicator
  container.innerHTML = `
    <div class="loading-spinner" role="status" aria-live="polite">
      <div class="spinner"></div>
      <p class="loading-message">${message}</p>
    </div>
  `;
  
  container.classList.add('loading-active');
}

/**
 * Hide loading indicator and restore original content
 * @param {string} containerId - DOM element ID
 */
export function hide(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Loading container not found: ${containerId}`);
    return;
  }
  
  // Restore original content if it was saved
  if (container.dataset.originalContent) {
    container.innerHTML = container.dataset.originalContent;
    delete container.dataset.originalContent;
  } else {
    // Just remove spinner if no original content
    const spinner = container.querySelector('.loading-spinner');
    if (spinner) {
      spinner.remove();
    }
  }
  
  container.classList.remove('loading-active');
}

/**
 * Show error message in container
 * @param {string} containerId - DOM element ID
 * @param {string} message - Error message
 * @param {Function} retryCallback - Optional retry function
 */
export function showError(containerId, message, retryCallback = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Error container not found: ${containerId}`);
    return;
  }
  
  const retryButton = retryCallback 
    ? `<button class="btn btn--secondary" onclick="(${retryCallback.toString()})()">Повторить</button>`
    : '';
  
  container.innerHTML = `
    <div class="error-message" role="alert">
      <div class="error-icon">⚠️</div>
      <p class="error-text">${message}</p>
      ${retryButton}
    </div>
  `;
  
  container.classList.add('error-active');
}

/**
 * Show empty state message
 * @param {string} containerId - DOM element ID
 * @param {string} message - Empty state message
 * @param {string} actionText - Optional CTA text
 * @param {Function} actionCallback - Optional CTA callback
 */
export function showEmpty(containerId, message, actionText = null, actionCallback = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Empty container not found: ${containerId}`);
    return;
  }
  
  const actionButton = (actionText && actionCallback)
    ? `<button class="btn btn--primary" onclick="(${actionCallback.toString()})()">
         ${actionText}
       </button>`
    : '';
  
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">${message}</p>
      ${actionButton}
    </div>
  `;
  
  container.classList.add('empty-active');
}

/**
 * Wrap async function with loading state
 * @param {string} containerId - DOM element ID
 * @param {Function} asyncFn - Async function to execute
 * @param {string} loadingMessage - Optional loading message
 * @returns {Promise<any>} Result of async function
 */
export async function withLoading(containerId, asyncFn, loadingMessage = 'Загрузка...') {
  try {
    show(containerId, loadingMessage);
    const result = await asyncFn();
    hide(containerId);
    return result;
  } catch (error) {
    showError(containerId, error.message || 'Произошла ошибка');
    throw error;
  }
}

/**
 * Default export for convenience
 */
export default {
  show,
  hide,
  showError,
  showEmpty,
  withLoading
};
