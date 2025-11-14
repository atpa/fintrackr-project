/**
 * SkeletonLoader.js - Компонент skeleton loading states
 * 
 * Функциональность:
 * - Готовые skeleton для карточек, таблиц, форм
 * - Анимация пульсации
 * - Различные размеры и варианты
 * - Кастомизация количества элементов
 */

/**
 * Создаёт skeleton элемент
 * @param {Object} config
 * @returns {HTMLElement}
 */
function createSkeletonElement(config = {}) {
  const {
    width = '100%',
    height = '16px',
    borderRadius = '4px',
    className = '',
  } = config;

  const skeleton = document.createElement('div');
  skeleton.className = `skeleton ${className}`;
  skeleton.style.width = width;
  skeleton.style.height = height;
  skeleton.style.borderRadius = borderRadius;

  return skeleton;
}

/**
 * Создаёт skeleton для текста
 * @param {number} lines - Количество строк
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createTextSkeleton(lines = 3, options = {}) {
  const { lastLineWidth = '70%' } = options;
  
  const container = document.createElement('div');
  container.className = 'skeleton-text-container';
  
  for (let i = 0; i < lines; i++) {
    const isLast = i === lines - 1;
    const line = createSkeletonElement({
      width: isLast ? lastLineWidth : '100%',
      height: '14px',
      className: 'skeleton-text-line',
    });
    container.appendChild(line);
  }
  
  return container;
}

/**
 * Создаёт skeleton для карточки счёта
 * @param {number} count - Количество карточек
 * @returns {HTMLElement}
 */
export function createAccountCardSkeleton(count = 3) {
  const container = document.createElement('div');
  container.className = 'skeleton-cards-grid';
  
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    
    // Header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '12px';
    
    const icon = createSkeletonElement({ width: '40px', height: '40px', borderRadius: '50%' });
    const title = createSkeletonElement({ width: '120px', height: '16px' });
    
    header.appendChild(icon);
    header.appendChild(title);
    card.appendChild(header);
    
    // Balance
    const balance = createSkeletonElement({ width: '150px', height: '32px', className: 'skeleton-balance' });
    card.appendChild(balance);
    
    // Currency
    const currency = createSkeletonElement({ width: '80px', height: '14px' });
    card.appendChild(currency);
    
    container.appendChild(card);
  }
  
  return container;
}

/**
 * Создаёт skeleton для списка транзакций
 * @param {number} count - Количество транзакций
 * @returns {HTMLElement}
 */
export function createTransactionListSkeleton(count = 5) {
  const container = document.createElement('div');
  container.className = 'skeleton-transactions';
  
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'skeleton-transaction-item';
    
    const icon = createSkeletonElement({ width: '40px', height: '40px', borderRadius: '50%' });
    
    const info = document.createElement('div');
    info.style.flex = '1';
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.style.gap = '8px';
    
    const desc = createSkeletonElement({ width: '60%', height: '16px' });
    const date = createSkeletonElement({ width: '40%', height: '12px' });
    
    info.appendChild(desc);
    info.appendChild(date);
    
    const amount = createSkeletonElement({ width: '80px', height: '20px' });
    
    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(amount);
    container.appendChild(item);
  }
  
  return container;
}

/**
 * Создаёт skeleton для таблицы
 * @param {Object} config
 * @returns {HTMLElement}
 */
export function createTableSkeleton(config = {}) {
  const { 
    columns = 4, 
    rows = 5,
    hasHeader = true,
  } = config;
  
  const table = document.createElement('div');
  table.className = 'skeleton-table';
  
  // Header
  if (hasHeader) {
    const header = document.createElement('div');
    header.className = 'skeleton-table-header';
    
    for (let i = 0; i < columns; i++) {
      const cell = createSkeletonElement({ 
        width: '100%', 
        height: '16px',
        className: 'skeleton-table-header-cell',
      });
      header.appendChild(cell);
    }
    
    table.appendChild(header);
  }
  
  // Rows
  const tbody = document.createElement('div');
  tbody.className = 'skeleton-table-body';
  
  for (let i = 0; i < rows; i++) {
    const row = document.createElement('div');
    row.className = 'skeleton-table-row';
    
    for (let j = 0; j < columns; j++) {
      const cell = createSkeletonElement({ 
        width: '90%', 
        height: '14px',
        className: 'skeleton-table-cell',
      });
      row.appendChild(cell);
    }
    
    tbody.appendChild(row);
  }
  
  table.appendChild(tbody);
  
  return table;
}

/**
 * Создаёт skeleton для формы
 * @param {number} fields - Количество полей
 * @returns {HTMLElement}
 */
export function createFormSkeleton(fields = 4) {
  const container = document.createElement('div');
  container.className = 'skeleton-form';
  
  for (let i = 0; i < fields; i++) {
    const field = document.createElement('div');
    field.className = 'skeleton-form-field';
    
    const label = createSkeletonElement({ width: '120px', height: '14px' });
    const input = createSkeletonElement({ 
      width: '100%', 
      height: '40px',
      className: 'skeleton-form-input',
    });
    
    field.appendChild(label);
    field.appendChild(input);
    container.appendChild(field);
  }
  
  // Buttons
  const buttons = document.createElement('div');
  buttons.className = 'skeleton-form-buttons';
  buttons.style.display = 'flex';
  buttons.style.gap = '12px';
  buttons.style.justifyContent = 'flex-end';
  
  const btn1 = createSkeletonElement({ width: '100px', height: '40px', borderRadius: '8px' });
  const btn2 = createSkeletonElement({ width: '120px', height: '40px', borderRadius: '8px' });
  
  buttons.appendChild(btn1);
  buttons.appendChild(btn2);
  container.appendChild(buttons);
  
  return container;
}

/**
 * Создаёт skeleton для графика
 * @param {Object} config
 * @returns {HTMLElement}
 */
export function createChartSkeleton(config = {}) {
  const { 
    type = 'bar', // 'bar', 'line', 'pie'
    width = '100%',
    height = '300px',
  } = config;
  
  const container = document.createElement('div');
  container.className = 'skeleton-chart';
  container.style.width = width;
  container.style.height = height;
  
  if (type === 'bar') {
    const bars = document.createElement('div');
    bars.className = 'skeleton-chart-bars';
    bars.style.display = 'flex';
    bars.style.alignItems = 'flex-end';
    bars.style.gap = '16px';
    bars.style.height = '100%';
    
    for (let i = 0; i < 6; i++) {
      const bar = createSkeletonElement({ 
        width: '100%', 
        height: `${Math.random() * 60 + 40}%`,
        className: 'skeleton-chart-bar',
      });
      bars.appendChild(bar);
    }
    
    container.appendChild(bars);
  } else if (type === 'pie') {
    const circle = createSkeletonElement({ 
      width: '200px', 
      height: '200px',
      borderRadius: '50%',
      className: 'skeleton-chart-pie',
    });
    circle.style.margin = '0 auto';
    container.appendChild(circle);
  } else if (type === 'line') {
    const line = createSkeletonElement({ 
      width: '100%', 
      height: '100%',
      className: 'skeleton-chart-line',
    });
    container.appendChild(line);
  }
  
  return container;
}

/**
 * Создаёт skeleton для stats карточек
 * @param {number} count - Количество карточек
 * @returns {HTMLElement}
 */
export function createStatsCardsSkeleton(count = 4) {
  const container = document.createElement('div');
  container.className = 'skeleton-stats-grid';
  
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-stat-card';
    
    const label = createSkeletonElement({ width: '80px', height: '14px' });
    const value = createSkeletonElement({ 
      width: '120px', 
      height: '36px',
      className: 'skeleton-stat-value',
    });
    const note = createSkeletonElement({ width: '100px', height: '12px' });
    
    card.appendChild(label);
    card.appendChild(value);
    card.appendChild(note);
    container.appendChild(card);
  }
  
  return container;
}

/**
 * Показывает skeleton в контейнере
 * @param {string|HTMLElement} container
 * @param {HTMLElement} skeleton
 */
export function showSkeleton(container, skeleton) {
  const el = typeof container === 'string' 
    ? document.getElementById(container) || document.querySelector(container)
    : container;
    
  if (el) {
    el.innerHTML = '';
    el.appendChild(skeleton);
  }
}

/**
 * Скрывает skeleton и показывает контент
 * @param {string|HTMLElement} container
 * @param {string|HTMLElement} content
 */
export function hideSkeleton(container, content) {
  const el = typeof container === 'string' 
    ? document.getElementById(container) || document.querySelector(container)
    : container;
    
  if (el) {
    if (typeof content === 'string') {
      el.innerHTML = content;
    } else {
      el.innerHTML = '';
      el.appendChild(content);
    }
  }
}
