/**
 * Offline Queue Manager для FinTrackr
 * Сохраняет транзакции в IndexedDB когда нет сети и синхронизирует при восстановлении
 */

const DB_NAME = 'fintrackr-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'transaction-queue';

/**
 * Инициализация IndexedDB
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Создаём хранилище для очереди транзакций
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

/**
 * Добавить транзакцию в offline очередь
 */
async function addToOfflineQueue(transaction) {
  try {
    const db = await openDatabase();
    const tx = db.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);

    const queueItem = {
      ...transaction,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => {
        console.log('[OfflineQueue] Transaction added to queue:', request.result);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Failed to add transaction:', error);
    throw error;
  }
}

/**
 * Получить все несинхронизированные транзакции
 */
async function getPendingTransactions() {
  try {
    const db = await openDatabase();
    const tx = db.transaction([QUEUE_STORE], 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const index = store.index('synced');

    return new Promise((resolve, reject) => {
      const request = index.getAll(false); // synced = false
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Failed to get pending transactions:', error);
    return [];
  }
}

/**
 * Пометить транзакцию как синхронизированную
 */
async function markAsSynced(id) {
  try {
    const db = await openDatabase();
    const tx = db.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          item.syncedAt = Date.now();
          
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => {
            console.log('[OfflineQueue] Transaction marked as synced:', id);
            resolve();
          };
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(); // Уже удалено
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Failed to mark as synced:', error);
    throw error;
  }
}

/**
 * Удалить транзакцию из очереди
 */
async function removeFromQueue(id) {
  try {
    const db = await openDatabase();
    const tx = db.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log('[OfflineQueue] Transaction removed from queue:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Failed to remove from queue:', error);
    throw error;
  }
}

/**
 * Увеличить счётчик попыток синхронизации
 */
async function incrementRetryCount(id) {
  try {
    const db = await openDatabase();
    const tx = db.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastRetry = Date.now();
          
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve(item.retryCount);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(0);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Failed to increment retry count:', error);
    return 0;
  }
}

/**
 * Синхронизировать все pending транзакции с сервером
 */
async function syncWithServer() {
  try {
    console.log('[OfflineQueue] Starting sync...');
    
    const pending = await getPendingTransactions();
    console.log('[OfflineQueue] Found pending transactions:', pending.length);

    if (pending.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    const MAX_RETRIES = 3;

    for (const item of pending) {
      try {
        // Проверяем количество попыток
        if (item.retryCount >= MAX_RETRIES) {
          console.warn('[OfflineQueue] Max retries reached for item:', item.id);
          failed++;
          continue;
        }

        // Удаляем служебные поля перед отправкой
        const { id, timestamp, synced: _, syncedAt, retryCount, lastRetry, ...transactionData } = item;

        // Отправляем на сервер
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transactionData)
        });

        if (response.ok) {
          await markAsSynced(id);
          synced++;
          console.log('[OfflineQueue] Transaction synced:', id);
          
          // Опционально: удаляем после успешной синхронизации
          // await removeFromQueue(id);
        } else {
          await incrementRetryCount(id);
          failed++;
          console.error('[OfflineQueue] Sync failed for transaction:', id, response.status);
        }
      } catch (error) {
        await incrementRetryCount(item.id);
        failed++;
        console.error('[OfflineQueue] Sync error for transaction:', item.id, error);
      }
    }

    console.log('[OfflineQueue] Sync complete:', { synced, failed });
    return { success: true, synced, failed };
  } catch (error) {
    console.error('[OfflineQueue] Sync with server failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Очистить все синхронизированные транзакции
 */
async function clearSyncedTransactions() {
  try {
    const db = await openDatabase();
    const tx = db.transaction([QUEUE_STORE], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const index = store.index('synced');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(true));
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          console.log('[OfflineQueue] Cleared synced transactions:', deleted);
          resolve(deleted);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Failed to clear synced transactions:', error);
    return 0;
  }
}

/**
 * Получить статистику очереди
 */
async function getQueueStats() {
  try {
    const db = await openDatabase();
    const tx = db.transaction([QUEUE_STORE], 'readonly');
    const store = tx.objectStore(QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const countRequest = store.count();
      const indexRequest = store.index('synced').count(false);

      Promise.all([
        new Promise((res) => { countRequest.onsuccess = () => res(countRequest.result); }),
        new Promise((res) => { indexRequest.onsuccess = () => res(indexRequest.result); })
      ]).then(([total, pending]) => {
        resolve({
          total,
          pending,
          synced: total - pending
        });
      }).catch(reject);
    });
  } catch (error) {
    console.error('[OfflineQueue] Failed to get queue stats:', error);
    return { total: 0, pending: 0, synced: 0 };
  }
}

/**
 * Автоматическая синхронизация при восстановлении сети
 */
function setupAutoSync() {
  // Слушаем события online/offline
  window.addEventListener('online', async () => {
    console.log('[OfflineQueue] Network restored, starting auto-sync...');
    
    // Небольшая задержка для стабилизации соединения
    setTimeout(async () => {
      const result = await syncWithServer();
      
      // Показываем уведомление пользователю
      if (result.synced > 0) {
        showSyncNotification(`Синхронизировано транзакций: ${result.synced}`);
      }
      
      if (result.failed > 0) {
        showSyncNotification(`Не удалось синхронизировать: ${result.failed}`, 'error');
      }
    }, 2000);
  });

  // Слушаем сообщения от Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'SYNC_OFFLINE_QUEUE') {
        console.log('[OfflineQueue] Sync request from Service Worker');
        await syncWithServer();
      }
    });
  }
}

/**
 * Показать уведомление о синхронизации (интеграция с Toast)
 */
function showSyncNotification(message, type = 'success') {
  // Используем Toast если доступен (из frontend/src/components/Toast.js)
  if (window.toastSuccess && type === 'success') {
    window.toastSuccess(message);
  } else if (window.toastError && type === 'error') {
    window.toastError(message);
  } else {
    console.log('[OfflineQueue]', message);
  }
}

// Инициализация при загрузке
if (typeof window !== 'undefined') {
  setupAutoSync();
  console.log('[OfflineQueue] Offline queue manager initialized');
}

// Экспорт для использования в других модулях
export {
  openDatabase,
  addToOfflineQueue,
  getPendingTransactions,
  markAsSynced,
  removeFromQueue,
  syncWithServer,
  clearSyncedTransactions,
  getQueueStats,
  setupAutoSync
};
