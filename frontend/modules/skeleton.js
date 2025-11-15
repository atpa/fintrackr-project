/**
 * Loading Skeleton System
 * Create placeholder loading states for better perceived performance
 */

/**
 * Skeleton component generator
 */
class SkeletonLoader {
  constructor() {
    this.templates = {
      text: this.textSkeleton,
      card: this.cardSkeleton,
      list: this.listSkeleton,
      table: this.tableSkeleton,
      dashboard: this.dashboardSkeleton,
      transaction: this.transactionSkeleton
    };
  }
  
  /**
   * Show skeleton loader in container
   * 
   * @param {string|HTMLElement} container - Container selector or element
   * @param {string} type - Skeleton type
   * @param {Object} options - Options
   */
  show(container, type = 'card', options = {}) {
    const element = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
      
    if (!element) return;
    
    // Store original content
    if (!element.dataset.skeletonOriginal) {
      element.dataset.skeletonOriginal = element.innerHTML;
    }
    
    // Generate and insert skeleton
    const skeleton = this.generate(type, options);
    element.innerHTML = skeleton;
    element.classList.add('skeleton-loading');
  }
  
  /**
   * Hide skeleton and restore original content
   * 
   * @param {string|HTMLElement} container - Container selector or element
   * @param {string} newContent - New content to display (optional)
   */
  hide(container, newContent = null) {
    const element = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
      
    if (!element) return;
    
    // Restore content
    if (newContent) {
      element.innerHTML = newContent;
    } else if (element.dataset.skeletonOriginal) {
      element.innerHTML = element.dataset.skeletonOriginal;
      delete element.dataset.skeletonOriginal;
    }
    
    element.classList.remove('skeleton-loading');
  }
  
  /**
   * Generate skeleton HTML
   */
  generate(type, options = {}) {
    const template = this.templates[type];
    if (!template) {
      console.warn(`Unknown skeleton type: ${type}`);
      return this.cardSkeleton(options);
    }
    return template.call(this, options);
  }
  
  /**
   * Text skeleton
   */
  textSkeleton(options = {}) {
    const lines = options.lines || 3;
    const width = options.width || '100%';
    
    let html = '<div class="skeleton-text-group">';
    for (let i = 0; i < lines; i++) {
      const lineWidth = i === lines - 1 ? '70%' : width;
      html += `<div class="skeleton-text" style="width: ${lineWidth}"></div>`;
    }
    html += '</div>';
    
    return html;
  }
  
  /**
   * Card skeleton
   */
  cardSkeleton(options = {}) {
    const count = options.count || 1;
    let html = '';
    
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-text-group">
              <div class="skeleton-text" style="width: 60%"></div>
              <div class="skeleton-text" style="width: 40%"></div>
            </div>
          </div>
          <div class="skeleton-body">
            ${this.textSkeleton({ lines: 3 })}
          </div>
        </div>
      `;
    }
    
    return html;
  }
  
  /**
   * List skeleton
   */
  listSkeleton(options = {}) {
    const items = options.items || 5;
    let html = '<div class="skeleton-list">';
    
    for (let i = 0; i < items; i++) {
      html += `
        <div class="skeleton-list-item">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-text-group" style="flex: 1">
            <div class="skeleton-text" style="width: 70%"></div>
            <div class="skeleton-text" style="width: 50%"></div>
          </div>
          <div class="skeleton-rect" style="width: 60px; height: 24px"></div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Table skeleton
   */
  tableSkeleton(options = {}) {
    const rows = options.rows || 5;
    const cols = options.cols || 4;
    
    let html = '<div class="skeleton-table"><table><thead><tr>';
    
    // Header
    for (let c = 0; c < cols; c++) {
      html += '<th><div class="skeleton-text"></div></th>';
    }
    html += '</tr></thead><tbody>';
    
    // Rows
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td><div class="skeleton-text"></div></td>';
      }
      html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    return html;
  }
  
  /**
   * Dashboard skeleton
   */
  dashboardSkeleton(options = {}) {
    return `
      <div class="skeleton-dashboard">
        <div class="skeleton-stats">
          ${this.statCard()}
          ${this.statCard()}
          ${this.statCard()}
          ${this.statCard()}
        </div>
        <div class="skeleton-charts">
          <div class="skeleton-chart"></div>
          <div class="skeleton-chart"></div>
        </div>
      </div>
    `;
  }
  
  /**
   * Stat card skeleton
   */
  statCard() {
    return `
      <div class="skeleton-stat-card">
        <div class="skeleton-text" style="width: 50%"></div>
        <div class="skeleton-text skeleton-text-large" style="width: 40%"></div>
        <div class="skeleton-text" style="width: 60%"></div>
      </div>
    `;
  }
  
  /**
   * Transaction skeleton
   */
  transactionSkeleton(options = {}) {
    const items = options.items || 5;
    let html = '<div class="skeleton-transactions">';
    
    for (let i = 0; i < items; i++) {
      html += `
        <div class="skeleton-transaction-item">
          <div class="skeleton-circle"></div>
          <div class="skeleton-transaction-content">
            <div class="skeleton-text" style="width: 60%"></div>
            <div class="skeleton-text" style="width: 40%"></div>
          </div>
          <div class="skeleton-transaction-amount">
            <div class="skeleton-text" style="width: 80px"></div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
}

// Create global instance
const skeleton = new SkeletonLoader();

// Utility function for async operations
async function withSkeleton(containerOrConfig, asyncFn) {
  let container, type, options;
  
  if (typeof containerOrConfig === 'string' || containerOrConfig instanceof HTMLElement) {
    container = containerOrConfig;
    type = 'card';
    options = {};
  } else {
    container = containerOrConfig.container;
    type = containerOrConfig.type || 'card';
    options = containerOrConfig.options || {};
  }
  
  try {
    skeleton.show(container, type, options);
    const result = await asyncFn();
    return result;
  } finally {
    skeleton.hide(container);
  }
}

export default skeleton;
export { SkeletonLoader, withSkeleton };
