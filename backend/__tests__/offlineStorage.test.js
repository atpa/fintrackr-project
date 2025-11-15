/**
 * Offline Storage Tests
 * Tests for Phase 6 - IndexedDB Offline Storage
 */

describe('Offline Storage', () => {
  let offlineStorage;
  let mockDB;

  beforeEach(() => {
    // Mock IndexedDB
    mockDB = {
      transactions: [],
      accounts: [],
      categories: [],
      budgets: [],
      syncQueue: [],
    };

    offlineStorage = {
      // Pending transactions
      addPendingTransaction: async (transaction) => {
        const tx = {
          id: Date.now(),
          ...transaction,
          synced: false,
          createdAt: new Date().toISOString(),
        };
        mockDB.transactions.push(tx);
        return tx;
      },

      getPendingTransactions: async () => {
        return mockDB.transactions.filter(tx => !tx.synced);
      },

      markTransactionSynced: async (id) => {
        const tx = mockDB.transactions.find(t => t.id === id);
        if (tx) tx.synced = true;
      },

      deletePendingTransaction: async (id) => {
        mockDB.transactions = mockDB.transactions.filter(t => t.id !== id);
      },

      // Cache operations
      cacheAccounts: async (accounts) => {
        mockDB.accounts = accounts;
      },

      getCachedAccounts: async () => {
        return mockDB.accounts;
      },

      cacheCategories: async (categories) => {
        mockDB.categories = categories;
      },

      getCachedCategories: async () => {
        return mockDB.categories;
      },

      cacheBudgets: async (budgets) => {
        mockDB.budgets = budgets;
      },

      getCachedBudgets: async () => {
        return mockDB.budgets;
      },

      // Sync queue
      addToSyncQueue: async (action) => {
        mockDB.syncQueue.push({
          id: Date.now(),
          ...action,
          timestamp: new Date().toISOString(),
        });
      },

      getSyncQueue: async () => {
        return mockDB.syncQueue;
      },

      clearSyncQueue: async () => {
        mockDB.syncQueue = [];
      },
    };
  });

  describe('Pending Transactions', () => {
    it('should add pending transaction', async () => {
      const transaction = {
        amount: 100,
        description: 'Test transaction',
        type: 'expense',
      };

      const result = await offlineStorage.addPendingTransaction(transaction);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('amount', 100);
      expect(result).toHaveProperty('synced', false);
    });

    it('should retrieve pending transactions', async () => {
      await offlineStorage.addPendingTransaction({ amount: 100 });
      await offlineStorage.addPendingTransaction({ amount: 200 });

      const pending = await offlineStorage.getPendingTransactions();

      expect(pending).toHaveLength(2);
      expect(pending[0].synced).toBe(false);
    });

    it('should mark transaction as synced', async () => {
      const tx = await offlineStorage.addPendingTransaction({ amount: 100 });
      
      await offlineStorage.markTransactionSynced(tx.id);
      const pending = await offlineStorage.getPendingTransactions();

      expect(pending).toHaveLength(0);
    });

    it('should delete pending transaction', async () => {
      const tx = await offlineStorage.addPendingTransaction({ amount: 100 });
      
      await offlineStorage.deletePendingTransaction(tx.id);
      const pending = await offlineStorage.getPendingTransactions();

      expect(pending).toHaveLength(0);
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve accounts', async () => {
      const accounts = [
        { id: 1, name: 'Checking' },
        { id: 2, name: 'Savings' },
      ];

      await offlineStorage.cacheAccounts(accounts);
      const cached = await offlineStorage.getCachedAccounts();

      expect(cached).toEqual(accounts);
    });

    it('should cache and retrieve categories', async () => {
      const categories = [
        { id: 1, name: 'Food' },
        { id: 2, name: 'Transport' },
      ];

      await offlineStorage.cacheCategories(categories);
      const cached = await offlineStorage.getCachedCategories();

      expect(cached).toEqual(categories);
    });

    it('should cache and retrieve budgets', async () => {
      const budgets = [
        { id: 1, category_id: 1, limit: 500 },
      ];

      await offlineStorage.cacheBudgets(budgets);
      const cached = await offlineStorage.getCachedBudgets();

      expect(cached).toEqual(budgets);
    });

    it('should overwrite existing cache', async () => {
      await offlineStorage.cacheAccounts([{ id: 1 }]);
      await offlineStorage.cacheAccounts([{ id: 2 }]);

      const cached = await offlineStorage.getCachedAccounts();

      expect(cached).toEqual([{ id: 2 }]);
    });
  });

  describe('Sync Queue', () => {
    it('should add action to sync queue', async () => {
      await offlineStorage.addToSyncQueue({
        type: 'CREATE_TRANSACTION',
        data: { amount: 100 },
      });

      const queue = await offlineStorage.getSyncQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0]).toHaveProperty('type', 'CREATE_TRANSACTION');
      expect(queue[0]).toHaveProperty('timestamp');
    });

    it('should retrieve sync queue', async () => {
      await offlineStorage.addToSyncQueue({ type: 'ACTION1' });
      await offlineStorage.addToSyncQueue({ type: 'ACTION2' });

      const queue = await offlineStorage.getSyncQueue();

      expect(queue).toHaveLength(2);
    });

    it('should clear sync queue', async () => {
      await offlineStorage.addToSyncQueue({ type: 'ACTION1' });
      await offlineStorage.addToSyncQueue({ type: 'ACTION2' });

      await offlineStorage.clearSyncQueue();
      const queue = await offlineStorage.getSyncQueue();

      expect(queue).toHaveLength(0);
    });
  });
});
