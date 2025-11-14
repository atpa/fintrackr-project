/**
 * API Layer - Unified API client for all backend requests
 * @module api
 * @description Provides CRUD methods for all entities with error handling and retry logic
 */

import { toastError } from '../components/Toast.js';

// API configuration
const API_BASE = '/api';
const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 2;

/**
 * Base fetch wrapper with error handling
 * @private
 */
async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Retry wrapper for failed requests
 * @private
 */
async function requestWithRetry(endpoint, options = {}, retries = MAX_RETRIES) {
  try {
    return await request(endpoint, options);
  } catch (error) {
    if (retries > 0 && error.message !== 'Request timeout') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return requestWithRetry(endpoint, options, retries - 1);
    }
    throw error;
  }
}

// ======================
// Transactions API
// ======================

export const TransactionsAPI = {
  /**
   * Get all transactions
   * @param {Object} filters - Optional filters (type, categoryId, accountId, dateFrom, dateTo)
   * @returns {Promise<Array>}
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null) params.append(key, value);
    });
    const query = params.toString() ? `?${params}` : '';
    return requestWithRetry(`/transactions${query}`);
  },

  /**
   * Get single transaction by ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    return requestWithRetry(`/transactions/${id}`);
  },

  /**
   * Create new transaction
   * @param {Object} data - Transaction data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return requestWithRetry('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update transaction
   * @param {number} id
   * @param {Object} data - Updated transaction data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return requestWithRetry(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete transaction
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return requestWithRetry(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Accounts API
// ======================

export const AccountsAPI = {
  async getAll() {
    return requestWithRetry('/accounts');
  },

  async getById(id) {
    return requestWithRetry(`/accounts/${id}`);
  },

  async create(data) {
    return requestWithRetry('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return requestWithRetry(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return requestWithRetry(`/accounts/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Categories API
// ======================

export const CategoriesAPI = {
  async getAll() {
    return requestWithRetry('/categories');
  },

  async getById(id) {
    return requestWithRetry(`/categories/${id}`);
  },

  async create(data) {
    return requestWithRetry('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return requestWithRetry(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return requestWithRetry(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Budgets API
// ======================

export const BudgetsAPI = {
  async getAll() {
    return requestWithRetry('/budgets');
  },

  async getById(id) {
    return requestWithRetry(`/budgets/${id}`);
  },

  async create(data) {
    return requestWithRetry('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return requestWithRetry(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return requestWithRetry(`/budgets/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Goals API
// ======================

export const GoalsAPI = {
  async getAll() {
    return requestWithRetry('/goals');
  },

  async getById(id) {
    return requestWithRetry(`/goals/${id}`);
  },

  async create(data) {
    return requestWithRetry('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return requestWithRetry(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return requestWithRetry(`/goals/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Subscriptions API
// ======================

export const SubscriptionsAPI = {
  async getAll() {
    return requestWithRetry('/subscriptions');
  },

  async getById(id) {
    return requestWithRetry(`/subscriptions/${id}`);
  },

  async create(data) {
    return requestWithRetry('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return requestWithRetry(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return requestWithRetry(`/subscriptions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Planned Operations API
// ======================

export const PlannedAPI = {
  async getAll() {
    return requestWithRetry('/planned');
  },

  async getById(id) {
    return requestWithRetry(`/planned/${id}`);
  },

  async create(data) {
    return requestWithRetry('/planned', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return requestWithRetry(`/planned/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return requestWithRetry(`/planned/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Rules API
// ======================

export const RulesAPI = {
  async getAll() {
    return requestWithRetry('/rules');
  },

  async getById(id) {
    return requestWithRetry(`/rules/${id}`);
  },

  async create(data) {
    return requestWithRetry('/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return requestWithRetry(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return requestWithRetry(`/rules/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// Bank Sync API
// ======================

export const SyncAPI = {
  async getBanks() {
    return requestWithRetry('/banks');
  },

  async getConnections() {
    return requestWithRetry('/sync/connections');
  },

  async connect(data) {
    return requestWithRetry('/sync/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async syncTransactions(connectionId) {
    return requestWithRetry('/sync/transactions', {
      method: 'POST',
      body: JSON.stringify({ connection_id: connectionId }),
    });
  },
};

// ======================
// Utility API
// ======================

export const UtilsAPI = {
  /**
   * Convert currency
   * @param {number} amount
   * @param {string} from - Source currency
   * @param {string} to - Target currency
   * @returns {Promise<Object>}
   */
  async convertCurrency(amount, from, to) {
    const params = new URLSearchParams({ from, to, amt: amount });
    return requestWithRetry(`/convert?${params}`);
  },

  /**
   * Get exchange rates
   * @param {string} base - Base currency
   * @param {string} quote - Quote currency
   * @returns {Promise<Object>}
   */
  async getRates(base, quote) {
    const params = new URLSearchParams({ base, quote });
    return requestWithRetry(`/rates?${params}`);
  },

  /**
   * Get AI forecast
   * @returns {Promise<Object>}
   */
  async getForecast() {
    return requestWithRetry('/forecast');
  },
};

// ======================
// Authentication API
// ======================

export const AuthAPI = {
  /**
   * Register new user
   * @param {Object} data - User data { name, email, password }
   * @returns {Promise<Object>}
   */
  async register(data) {
    return requestWithRetry('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>}
   */
  async login(credentials) {
    return requestWithRetry('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Logout user
   * @returns {Promise<Object>}
   */
  async logout() {
    return requestWithRetry('/logout', {
      method: 'POST',
    });
  },

  /**
   * Check session
   * @returns {Promise<Object>}
   */
  async checkSession() {
    return requestWithRetry('/session');
  },
};

// ======================
// Unified API object
// ======================

export const API = {
  auth: AuthAPI,
  transactions: TransactionsAPI,
  accounts: AccountsAPI,
  categories: CategoriesAPI,
  budgets: BudgetsAPI,
  goals: GoalsAPI,
  subscriptions: SubscriptionsAPI,
  planned: PlannedAPI,
  rules: RulesAPI,
  sync: SyncAPI,
  utils: UtilsAPI,
};

// Default export for backward compatibility
export default API;
