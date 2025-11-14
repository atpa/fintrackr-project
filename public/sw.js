/**
 * Service Worker для FinTrackr PWA
 * Обеспечивает offline-режим, кэширование и фоновую синхронизацию
 */

const CACHE_VERSION = 'fintrackr-v1.0.1';
const CACHE_NAME = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Статические ресурсы для кэширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/transactions.html',
  '/accounts.html',
  '/budgets.html',
  '/categories.html',
  '/goals.html',
  '/reports.html',
  '/settings.html',
  '/css/style.css',
  '/css/layout-components.css',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/transactions.js',
  '/js/accounts.js',
  '/js/budgets.js',
  '/js/categories.js',
  '/js/goals.js',
  '/js/reports.js',
  '/js/settings.js',
  '/manifest.json'
];

// API endpoints для кэширования (GET запросы)
const CACHEABLE_API_ENDPOINTS = [
  '/api/accounts',
  '/api/transactions',
  '/api/categories',
  '/api/budgets',
  '/api/goals'
];

/**
 * Установка Service Worker - кэширование статических ресурсов
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Static assets cached successfully');
      return self.skipWaiting(); // Активировать немедленно
    })
  );
});

/**
 * Активация Service Worker - очистка старых кэшей
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('fintrackr-') && name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Service Worker activated');
      return self.clients.claim(); // Захватить все открытые вкладки
    })
  );
});

/**
 * Перехват запросов - стратегия кэширования
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем запросы к другим доменам
  if (url.origin !== location.origin) {
    return;
  }

  // Стратегия для API: Network First (с fallback на кэш)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Стратегия для статики: Cache First (с fallback на сеть)
  event.respondWith(cacheFirstStrategy(request, CACHE_NAME, DYNAMIC_CACHE));
});

/**
 * Стратегия Cache First - сначала кэш, потом сеть
 */
async function cacheFirstStrategy(request, staticCache, dynamicCache) {
  try {
    // Проверяем статический кэш
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Если нет в кэше - запрос к сети
    const response = await fetch(request);
    
    // Кэшируем успешные ответы (только GET запросы)
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(dynamicCache);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    
    // Fallback: offline страница (если есть)
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    // Если нет offline страницы - возвращаем базовый ответ
    return new Response('Offline - resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Стратегия Network First - сначала сеть, потом кэш
 */
async function networkFirstStrategy(request, apiCache) {
  try {
    // Пытаемся загрузить из сети с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 сек таймаут

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Кэшируем успешные GET запросы
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(apiCache);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.warn('[SW] Network request failed, trying cache:', error);

    // Fallback на кэш
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Returning cached API response');
      return cached;
    }

    // Если нет в кэше - возвращаем ошибку
    return new Response(
      JSON.stringify({ 
        error: 'Offline - unable to fetch data',
        offline: true 
      }), 
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Background Sync - синхронизация offline транзакций
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncOfflineTransactions());
  }
});

/**
 * Синхронизация offline транзакций при восстановлении сети
 */
async function syncOfflineTransactions() {
  try {
    console.log('[SW] Syncing offline transactions...');
    
    // Получаем очередь из IndexedDB (реализуется на клиенте)
    const clients = await self.clients.matchAll();
    
    // Отправляем сообщение всем клиентам для синхронизации
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_QUEUE',
        timestamp: Date.now()
      });
    });

    console.log('[SW] Sync message sent to clients');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Повторить попытку позже
  }
}

/**
 * Push Notifications - уведомления (для будущих фич)
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'FinTrackr';
  const options = {
    body: data.body || 'You have a new update',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    data: data.url || '/dashboard.html'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification Click - обработка кликов по уведомлениям
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data || '/dashboard.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Проверяем, есть ли уже открытая вкладка
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Если нет - открываем новую
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Message Handler - обработка сообщений от клиентов
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

console.log('[SW] Service Worker script loaded');

