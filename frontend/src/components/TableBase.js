/**
 * TableBase Component — универсальная таблица с сортировкой и пагинацией
 * @module components/TableBase
 * @description Реюзабельный компонент таблицы для любых данных
 */

/**
 * Создание таблицы с данными
 * @param {Object} config - конфигурация таблицы
 * @returns {HTMLElement} DOM-элемент таблицы
 */
export function createTable(config) {
  const {
    columns = [],
    data = [],
    sortable = true,
    striped = true,
    hover = true,
    className = ''
  } = config;

  const table = document.createElement('table');
  table.className = `table ${striped ? 'table-striped' : ''} ${hover ? 'table-hover' : ''} ${className}`.trim();

  // Thead
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    
    if (col.width) {
      th.style.width = col.width;
    }

    if (sortable && col.sortable !== false) {
      th.style.cursor = 'pointer';
      th.classList.add('sortable');
      th.setAttribute('data-sort-key', col.key);
      
      const sortIcon = document.createElement('span');
      sortIcon.className = 'sort-icon';
      sortIcon.innerHTML = '⇅';
      th.appendChild(sortIcon);
    }

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');
  
  if (data.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = columns.length;
    emptyCell.className = 'text-center text-muted';
    emptyCell.textContent = 'Нет данных';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  } else {
    data.forEach(row => {
      const tr = document.createElement('tr');
      
      columns.forEach(col => {
        const td = document.createElement('td');
        
        if (col.render) {
          // Кастомный рендерер
          const content = col.render(row[col.key], row);
          if (typeof content === 'string') {
            td.innerHTML = content;
          } else if (content instanceof Node) {
            td.appendChild(content);
          }
        } else {
          // Дефолтный рендеринг
          td.textContent = row[col.key] ?? '—';
        }
        
        if (col.align) {
          td.style.textAlign = col.align;
        }
        
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);

  return table;
}

/**
 * Рендеринг таблицы в контейнер с сортировкой
 * @param {string} containerId - ID контейнера
 * @param {Object} config - конфигурация таблицы
 * @param {Object} options - опции (onSort, onRowClick)
 */
export function renderTable(containerId, config, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found`);
    return;
  }

  const table = createTable(config);
  
  // Добавляем обработчики сортировки
  if (config.sortable !== false && options.onSort) {
    const headers = table.querySelectorAll('th[data-sort-key]');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const sortKey = th.getAttribute('data-sort-key');
        const currentDirection = th.getAttribute('data-sort-direction') || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        
        // Обновляем иконки
        headers.forEach(h => {
          h.removeAttribute('data-sort-direction');
          h.querySelector('.sort-icon').innerHTML = '⇅';
        });
        
        th.setAttribute('data-sort-direction', newDirection);
        th.querySelector('.sort-icon').innerHTML = newDirection === 'asc' ? '↑' : '↓';
        
        options.onSort(sortKey, newDirection);
      });
    });
  }

  // Добавляем обработчики клика по строке
  if (options.onRowClick) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        options.onRowClick(config.data[index], row);
      });
    });
  }

  container.innerHTML = '';
  container.appendChild(table);
}

/**
 * Создание обёртки таблицы с controls (pagination, search)
 * @param {Object} config - конфигурация
 * @returns {HTMLElement} обёртка с таблицей и controls
 */
export function createTableWrapper(config) {
  const {
    tableConfig,
    showSearch = false,
    showPagination = false,
    onSearch = null,
    onPageChange = null
  } = config;

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';

  // Search bar
  if (showSearch) {
    const searchBar = document.createElement('div');
    searchBar.className = 'table-search';
    
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Поиск...';
    input.className = 'form-control';
    
    if (onSearch) {
      input.addEventListener('input', (e) => {
        onSearch(e.target.value);
      });
    }
    
    searchBar.appendChild(input);
    wrapper.appendChild(searchBar);
  }

  // Table
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  const table = createTable(tableConfig);
  tableContainer.appendChild(table);
  wrapper.appendChild(tableContainer);

  // Pagination
  if (showPagination) {
    const pagination = document.createElement('div');
    pagination.className = 'table-pagination';
    pagination.innerHTML = `
      <div class="pagination-info">Показано: 1-10 из 50</div>
      <div class="pagination-controls">
        <button class="btn-pagination" data-action="prev">← Назад</button>
        <span class="pagination-pages">Страница 1 из 5</span>
        <button class="btn-pagination" data-action="next">Вперед →</button>
      </div>
    `;
    
    if (onPageChange) {
      pagination.querySelectorAll('.btn-pagination').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          onPageChange(action);
        });
      });
    }
    
    wrapper.appendChild(pagination);
  }

  return wrapper;
}

export default { createTable, renderTable, createTableWrapper };
