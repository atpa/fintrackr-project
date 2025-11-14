/**
 * Global State Store — реактивное хранилище с Proxy
 * @module store
 * @description Централизованное управление состоянием приложения
 */

class Store {
  constructor(initialState = {}) {
    this._state = initialState;
    this._listeners = new Map();
    
    // Proxy для отслеживания изменений
    this.state = new Proxy(this._state, {
      set: (target, property, value) => {
        const oldValue = target[property];
        target[property] = value;
        
        // Уведомляем подписчиков об изменении
        if (this._listeners.has(property)) {
          this._listeners.get(property).forEach(callback => {
            callback(value, oldValue);
          });
        }
        
        // Уведомляем общих подписчиков
        if (this._listeners.has('*')) {
          this._listeners.get('*').forEach(callback => {
            callback(property, value, oldValue);
          });
        }
        
        return true;
      }
    });
  }

  /**
   * Подписка на изменение конкретного свойства
   * @param {string} property - название свойства ('*' для всех изменений)
   * @param {Function} callback - функция-обработчик
   * @returns {Function} функция отписки
   */
  subscribe(property, callback) {
    if (!this._listeners.has(property)) {
      this._listeners.set(property, new Set());
    }
    this._listeners.get(property).add(callback);
    
    // Возвращаем функцию отписки
    return () => {
      this._listeners.get(property)?.delete(callback);
    };
  }

  /**
   * Пакетное обновление состояния
   * @param {Object} updates - объект с обновлениями
   */
  batch(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.state[key] = value;
    });
  }

  /**
   * Сброс состояния к начальному
   */
  reset() {
    Object.keys(this._state).forEach(key => {
      delete this._state[key];
    });
  }
}

// Глобальный экземпляр store
const globalStore = new Store({
  // User
  user: null,
  isAuthenticated: false,
  
  // Data
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  subscriptions: [],
  
  // UI State
  isLoading: false,
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  theme: 'light',
  currency: 'USD',
  
  // Filters
  filters: {
    dateFrom: null,
    dateTo: null,
    accountId: null,
    categoryId: null,
    type: null
  }
});

export { globalStore, Store };
export default globalStore;
