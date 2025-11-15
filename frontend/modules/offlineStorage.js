/**
 * Offline Storage using IndexedDB
 * Handles offline transaction storage and sync
 */

const DB_NAME = 'FinTrackrDB';
const DB_VERSION = 1;
const STORE_NAMES = {
  TRANSACTIONS: 'pending_transactions',
  ACCOUNTS: 'accounts_cache',
  CATEGORIES: 'categories_cache',
  BUDGETS: 'budgets_cache',
  SYNC_QUEUE: 'sync_queue',
};

class OfflineStorage {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Pending transactions store
        if (!db.objectStoreNames.contains(STORE_NAMES.TRANSACTIONS)) {
          const transactionsStore = db.createObjectStore(STORE_NAMES.TRANSACTIONS, {
            keyPath: 'tempId',
            autoIncrement: true,
          });
          transactionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          transactionsStore.createIndex('synced', 'synced', { unique: false });
        }

        // Accounts cache store
        if (!db.objectStoreNames.contains(STORE_NAMES.ACCOUNTS)) {
          const accountsStore = db.createObjectStore(STORE_NAMES.ACCOUNTS, {
            keyPath: 'id',
          });
          accountsStore.createIndex('user_id', 'user_id', { unique: false });
        }

        // Categories cache store
        if (!db.objectStoreNames.contains(STORE_NAMES.CATEGORIES)) {
          const categoriesStore = db.createObjectStore(STORE_NAMES.CATEGORIES, {
            keyPath: 'id',
          });
          categoriesStore.createIndex('user_id', 'user_id', { unique: false });
        }

        // Budgets cache store
        if (!db.objectStoreNames.contains(STORE_NAMES.BUDGETS)) {
          const budgetsStore = db.createObjectStore(STORE_NAMES.BUDGETS, {
            keyPath: 'id',
          });
          budgetsStore.createIndex('user_id', 'user_id', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORE_NAMES.SYNC_QUEUE)) {
          const syncQueueStore = db.createObjectStore(STORE_NAMES.SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncQueueStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * Add pending transaction (offline)
   */
  async addPendingTransaction(transaction) {
    const tx = this.db.transaction([STORE_NAMES.TRANSACTIONS], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.TRANSACTIONS);

    const pendingTx = {
      ...transaction,
      timestamp: Date.now(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(pendingTx);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending transactions
   */
  async getPendingTransactions() {
    const tx = this.db.transaction([STORE_NAMES.TRANSACTIONS], 'readonly');
    const store = tx.objectStore(STORE_NAMES.TRANSACTIONS);
    const index = store.index('synced');

    return new Promise((resolve, reject) => {
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark transaction as synced
   */
  async markTransactionSynced(tempId) {
    const tx = this.db.transaction([STORE_NAMES.TRANSACTIONS], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.TRANSACTIONS);

    return new Promise((resolve, reject) => {
      const request = store.get(tempId);
      request.onsuccess = () => {
        const transaction = request.result;
        if (transaction) {
          transaction.synced = true;
          transaction.syncedAt = Date.now();
          const updateRequest = store.put(transaction);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete synced transactions (cleanup)
   */
  async deleteSyncedTransactions() {
    const tx = this.db.transaction([STORE_NAMES.TRANSACTIONS], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.TRANSACTIONS);
    const index = store.index('synced');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(true);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache accounts for offline access
   */
  async cacheAccounts(accounts) {
    const tx = this.db.transaction([STORE_NAMES.ACCOUNTS], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.ACCOUNTS);

    // Clear existing
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new
    for (const account of accounts) {
      store.add(account);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get cached accounts
   */
  async getCachedAccounts() {
    const tx = this.db.transaction([STORE_NAMES.ACCOUNTS], 'readonly');
    const store = tx.objectStore(STORE_NAMES.ACCOUNTS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache categories
   */
  async cacheCategories(categories) {
    const tx = this.db.transaction([STORE_NAMES.CATEGORIES], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.CATEGORIES);

    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    for (const category of categories) {
      store.add(category);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get cached categories
   */
  async getCachedCategories() {
    const tx = this.db.transaction([STORE_NAMES.CATEGORIES], 'readonly');
    const store = tx.objectStore(STORE_NAMES.CATEGORIES);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add to sync queue
   */
  async addToSyncQueue(action) {
    const tx = this.db.transaction([STORE_NAMES.SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.SYNC_QUEUE);

    const queueItem = {
      ...action,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync queue
   */
  async getSyncQueue() {
    const tx = this.db.transaction([STORE_NAMES.SYNC_QUEUE], 'readonly');
    const store = tx.objectStore(STORE_NAMES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    const tx = this.db.transaction([STORE_NAMES.SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data
   */
  async clearAll() {
    const storeNames = Object.values(STORE_NAMES);
    const tx = this.db.transaction(storeNames, 'readwrite');

    for (const storeName of storeNames) {
      const store = tx.objectStore(storeName);
      store.clear();
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;
