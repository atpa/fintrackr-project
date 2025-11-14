/**
 * Common UI Utilities for FinTrackr
 * Shared pagination, form validation, and data display helpers
 */

/**
 * Set field error message
 * @param {HTMLInputElement|HTMLSelectElement} input - Form field
 * @param {string} message - Error message to display
 */
export function setFieldError(input, message) {
  if (!input) return;
  input.classList.add('is-invalid');
  const errorId = input.dataset.errorFor || input.id;
  const errorEl = document.querySelector(`[data-error-for="${errorId}"]`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

/**
 * Clear field error
 * @param {HTMLInputElement|HTMLSelectElement} input - Form field
 */
export function clearFieldError(input) {
  if (!input) return;
  input.classList.remove('is-invalid');
  const errorId = input.dataset.errorFor || input.id;
  const errorEl = document.querySelector(`[data-error-for="${errorId}"]`);
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}

/**
 * Clear all field errors in a form
 * @param {HTMLFormElement} form - Form element
 */
export function clearAllFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll('.is-invalid').forEach(input => {
    clearFieldError(input);
  });
}

/**
 * Pagination state and rendering
 */
export class Pagination {
  constructor(options = {}) {
    this.currentPage = options.currentPage || 1;
    this.pageSize = options.pageSize || 10;
    this.containerId = options.containerId || 'pagination';
    this.onPageChange = options.onPageChange || (() => {});
  }

  /**
   * Render pagination controls
   * @param {number} totalItems - Total number of items
   */
  render(totalItems) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / this.pageSize);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const buttons = [];
    
    // Previous button
    if (this.currentPage > 1) {
      buttons.push(`<button class="btn-secondary" data-page="${this.currentPage - 1}">←</button>`);
    }

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      buttons.push(`<button class="btn-secondary" data-page="1">1</button>`);
      if (startPage > 2) {
        buttons.push(`<span class="pagination-ellipsis">...</span>`);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === this.currentPage ? ' btn-primary' : '';
      buttons.push(`<button class="btn-secondary${activeClass}" data-page="${i}">${i}</button>`);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(`<span class="pagination-ellipsis">...</span>`);
      }
      buttons.push(`<button class="btn-secondary" data-page="${totalPages}">${totalPages}</button>`);
    }

    // Next button
    if (this.currentPage < totalPages) {
      buttons.push(`<button class="btn-secondary" data-page="${this.currentPage + 1}">→</button>`);
    }

    container.innerHTML = buttons.join('');

    // Attach event listeners
    container.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page !== this.currentPage) {
          this.currentPage = page;
          this.onPageChange(page);
        }
      });
    });
  }

  /**
   * Get paginated slice of data
   * @param {Array} data - Full dataset
   * @returns {Array} - Paginated slice
   */
  paginate(data) {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return data.slice(start, end);
  }

  /**
   * Set page size and reset to first page
   * @param {number} size - New page size
   */
  setPageSize(size) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  /**
   * Reset to first page
   */
  reset() {
    this.currentPage = 1;
  }
}

/**
 * Format currency with proper symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, EUR, PLN, RUB)
 * @returns {string} - Formatted string
 */
export function formatCurrency(amount, currency = 'USD') {
  const symbols = {
    USD: '$',
    EUR: '€',
    PLN: 'zł',
    RUB: '₽'
  };
  const symbol = symbols[currency] || currency;
  const num = Number(amount).toFixed(2);
  return `${num} ${symbol}`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
