/**
 * Helper Functions — утилиты форматирования и вычислений
 * @module helpers
 */

/**
 * Форматирование валюты
 * @param {number} amount - сумма
 * @param {string} currency - код валюты (USD, EUR, PLN, RUB)
 * @returns {string} отформатированная строка
 */
export function formatCurrency(amount, currency = 'USD') {
  const symbols = {
    USD: '$',
    EUR: '€',
    PLN: 'zł',
    RUB: '₽'
  };

  const formatted = Number(amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${formatted} ${symbols[currency] || currency}`;
}

/**
 * Форматирование даты
 * @param {string|Date} date - дата
 * @param {string} format - формат ('short', 'long', 'iso')
 * @returns {string} отформатированная дата
 */
export function formatDate(date, format = 'short') {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '—';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('ru-RU');
    case 'long':
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    case 'iso':
      return d.toISOString().split('T')[0];
    default:
      return d.toLocaleDateString('ru-RU');
  }
}

/**
 * Конвертация валюты (с hardcoded rates, в будущем — API)
 * @param {number} amount - сумма
 * @param {string} fromCurrency - из валюты
 * @param {string} toCurrency - в валюту
 * @returns {number} сконвертированная сумма
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;

  // TODO: Заменить на API-запрос к exchangerate.host
  const rates = {
    USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
    EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
    PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
    RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 }
  };

  const rate = rates[fromCurrency]?.[toCurrency] || 1;
  return amount * rate;
}

/**
 * Группировка транзакций по дате/категории/счёту
 * @param {Array} transactions - массив транзакций
 * @param {string} groupBy - тип группировки ('date', 'category', 'account', 'month')
 * @returns {Object} сгруппированные транзакции
 */
export function groupTransactions(transactions, groupBy = 'date') {
  return transactions.reduce((acc, tx) => {
    let key;
    
    switch (groupBy) {
      case 'month':
        key = tx.date?.substring(0, 7) || 'unknown'; // YYYY-MM
        break;
      case 'category':
        key = tx.category_id || 'uncategorized';
        break;
      case 'account':
        key = tx.account_id || 'unknown';
        break;
      case 'date':
      default:
        key = tx.date || 'unknown';
        break;
    }

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(tx);
    
    return acc;
  }, {});
}

/**
 * Вычисление процента выполнения бюджета
 * @param {number} spent - потрачено
 * @param {number} limit - лимит
 * @returns {number} процент (0-100)
 */
export function calculateBudgetProgress(spent, limit) {
  if (!limit || limit <= 0) return 0;
  return Math.min(Math.round((spent / limit) * 100), 100);
}

/**
 * Вычисление прогресса достижения цели
 * @param {number} current - текущая сумма
 * @param {number} target - целевая сумма
 * @returns {number} процент (0-100)
 */
export function calculateGoalProgress(current, target) {
  if (!target || target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

/**
 * Дебаунс функции
 * @param {Function} func - функция для дебаунса
 * @param {number} wait - задержка в мс
 * @returns {Function} дебаунснутая функция
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

/**
 * Генерация уникального ID (UUID v4 упрощённый)
 * @returns {string} уникальный ID
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Безопасное получение вложенного свойства объекта
 * @param {Object} obj - объект
 * @param {string} path - путь (например, 'user.profile.name')
 * @param {*} defaultValue - значение по умолчанию
 * @returns {*} значение или defaultValue
 */
export function get(obj, path, defaultValue = undefined) {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

/**
 * Глубокое клонирование объекта
 * @param {*} obj - объект для клонирования
 * @returns {*} клонированный объект
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}
