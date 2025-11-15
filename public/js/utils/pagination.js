/**
 * Утилита пагинации для FinTrackr
 * Используется в accounts.js, categories.js, transactions.js
 */

class Pagination {
  /**
   * @param {Object} options - Конфигурация
   * @param {number} options.currentPage - Текущая страница (по умолчанию 1)
   * @param {number} options.pageSize - Элементов на странице (по умолчанию 10)
   * @param {string} options.containerId - ID контейнера пагинации
   * @param {Function} options.onPageChange - Коллбэк при смене страницы
   */
  constructor(options = {}) {
    this.currentPage = options.currentPage || 1;
    this.pageSize = options.pageSize || 10;
    this.containerId = options.containerId || 'pagination';
    this.onPageChange = options.onPageChange || (() => {});
  }

  /**
   * Рендер кнопок пагинации
   * @param {number} totalItems - Общее количество элементов
   */
  render(totalItems) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';

    for (let i = 1; i <= totalPages; i += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-ghost btn-sm';
      btn.textContent = i;
      
      if (i === this.currentPage) {
        btn.classList.add('active');
      }
      
      btn.addEventListener('click', () => {
        if (i !== this.currentPage) {
          this.currentPage = i;
          this.onPageChange(i);
        }
      });
      
      container.appendChild(btn);
    }
  }

  /**
   * Получить срез данных для текущей страницы
   * @param {Array} data - Полный массив данных
   * @returns {Array} - Срез для текущей страницы
   */
  paginate(data) {
    const start = (this.currentPage - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  }

  /**
   * Установить размер страницы и сбросить на первую страницу
   * @param {number} size - Новый размер страницы
   */
  setPageSize(size) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  /**
   * Перейти на указанную страницу
   * @param {number} page - Номер страницы
   */
  goToPage(page) {
    this.currentPage = page;
  }
}
