/**
 * Advanced Toast Notification System
 * Modern, accessible toast notifications with queue management
 */

class ToastManager {
  constructor(options = {}) {
    this.container = null;
    this.queue = [];
    this.activeToasts = new Set();
    this.maxToasts = options.maxToasts || 3;
    this.defaultDuration = options.defaultDuration || 5000;
    this.position = options.position || 'top-right';
    
    this.init();
  }
  
  /**
   * Initialize toast container
   */
  init() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.className = `toast-container toast-${this.position}`;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Уведомления');
    this.container.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(this.container);
  }
  
  /**
   * Show a toast notification
   * 
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   * @returns {Object} Toast instance
   */
  show(message, options = {}) {
    const toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : this.defaultDuration,
      dismissible: options.dismissible !== false,
      action: options.action || null,
      icon: options.icon || this.getDefaultIcon(options.type || 'info'),
      onDismiss: options.onDismiss || null
    };
    
    // Check if we can show immediately
    if (this.activeToasts.size < this.maxToasts) {
      this.renderToast(toast);
    } else {
      this.queue.push(toast);
    }
    
    return toast;
  }
  
  /**
   * Show success toast
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }
  
  /**
   * Show error toast
   */
  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }
  
  /**
   * Show warning toast
   */
  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }
  
  /**
   * Show info toast
   */
  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }
  
  /**
   * Show loading toast
   */
  loading(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'loading',
      duration: 0, // Don't auto-dismiss loading toasts
      dismissible: false
    });
  }
  
  /**
   * Render toast in DOM
   */
  renderToast(toast) {
    const element = document.createElement('div');
    element.className = `toast toast-${toast.type}`;
    element.id = toast.id;
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'assertive');
    element.setAttribute('aria-atomic', 'true');
    
    // Build toast content
    let html = '<div class="toast-content">';
    
    // Icon
    if (toast.icon) {
      html += `<div class="toast-icon">${toast.icon}</div>`;
    }
    
    // Message
    html += `<div class="toast-message">${this.escapeHtml(toast.message)}</div>`;
    
    // Action button
    if (toast.action) {
      html += `<button class="toast-action-btn" data-action="custom">${this.escapeHtml(toast.action.text)}</button>`;
    }
    
    // Dismiss button
    if (toast.dismissible) {
      html += '<button class="toast-dismiss" aria-label="Закрыть" data-action="dismiss">✕</button>';
    }
    
    html += '</div>';
    
    // Progress bar for auto-dismiss toasts
    if (toast.duration > 0) {
      html += '<div class="toast-progress"><div class="toast-progress-bar"></div></div>';
    }
    
    element.innerHTML = html;
    
    // Add event listeners
    const dismissBtn = element.querySelector('[data-action="dismiss"]');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismiss(toast.id));
    }
    
    const actionBtn = element.querySelector('[data-action="custom"]');
    if (actionBtn && toast.action && toast.action.callback) {
      actionBtn.addEventListener('click', () => {
        toast.action.callback();
        this.dismiss(toast.id);
      });
    }
    
    // Add to container with animation
    this.container.appendChild(element);
    this.activeToasts.add(toast.id);
    
    // Trigger reflow for animation
    element.offsetHeight;
    element.classList.add('toast-enter');
    
    // Auto-dismiss if duration is set
    if (toast.duration > 0) {
      const progressBar = element.querySelector('.toast-progress-bar');
      if (progressBar) {
        progressBar.style.transition = `width ${toast.duration}ms linear`;
        setTimeout(() => {
          progressBar.style.width = '100%';
        }, 10);
      }
      
      toast.timeout = setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.duration);
    }
    
    // Store element reference
    toast.element = element;
  }
  
  /**
   * Dismiss a toast
   */
  dismiss(toastId) {
    const toast = Array.from(this.activeToasts).find(id => id === toastId);
    if (!toast) return;
    
    const element = document.getElementById(toastId);
    if (!element) return;
    
    // Clear timeout if exists
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }
    
    // Animate out
    element.classList.remove('toast-enter');
    element.classList.add('toast-exit');
    
    // Remove after animation
    setTimeout(() => {
      element.remove();
      this.activeToasts.delete(toastId);
      
      // Call onDismiss callback
      if (toast.onDismiss) {
        toast.onDismiss();
      }
      
      // Show next toast from queue
      if (this.queue.length > 0) {
        const nextToast = this.queue.shift();
        this.renderToast(nextToast);
      }
    }, 300);
  }
  
  /**
   * Update an existing toast
   */
  update(toastId, updates) {
    const element = document.getElementById(toastId);
    if (!element) return;
    
    if (updates.message) {
      const messageEl = element.querySelector('.toast-message');
      if (messageEl) {
        messageEl.textContent = updates.message;
      }
    }
    
    if (updates.type) {
      element.className = `toast toast-${updates.type}`;
    }
  }
  
  /**
   * Clear all toasts
   */
  clearAll() {
    this.activeToasts.forEach(id => this.dismiss(id));
    this.queue = [];
  }
  
  /**
   * Get default icon for toast type
   */
  getDefaultIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '⟳'
    };
    return icons[type] || icons.info;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
const toast = new ToastManager();

// Export both class and instance
export default toast;
export { ToastManager };
