/**
 * FinTrackr Service Worker
 * Provides offline functionality, caching, and background sync for PWA
 */

const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `fintrackr-${CACHE_VERSION}`;

// Resources to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/landing.html',
  '/dashboard.html',
  '/login.html',
  '/register.html',
  '/accounts.html',
  '/transactions.html',
  '/budgets.html',
  '/goals.html',
  '/categories.html',
  '/css/style.css',
  '/css/design-system.css',
  '/css/icons.css',
  '/css/transitions.css',
  '/icons/icons.svg',
  '/js/app.js',
  '/js/login.js',
  '/js/register.js',
  '/js/accounts.js',
  '/js/transactions.js',
  '/js/budgets.js',
  '/js/goals.js',
  '/js/categories.js',
  '/js/dashboard.js',
  '/manifest.json',
  '/offline.html'
];

// API endpoints that should always use network-first strategy
const API_ENDPOINTS = /^\/api\//;

// Dynamic cache for runtime assets
const RUNTIME_CACHE = `fintrackr-runtime-${CACHE_VERSION}`;

// Background sync tag
const SYNC_TAG = 'sync-transactions';

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove old versions of our cache
              return cacheName.startsWith('fintrackr-') && cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Strategy 1: Network-first for API calls
  if (API_ENDPOINTS.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy 2: Cache-first for static assets
  event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy: Try cache first, fallback to network
 * Best for static assets that don't change often
 */
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    
    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 * Best for API calls and dynamic content
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful API responses
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

/**
 * Message event - handle commands from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

/**
 * Sync event - background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

/**
 * Sync offline transactions when back online
 */
async function syncTransactions() {
  try {
    // This would sync any offline transactions stored in IndexedDB
    console.log('[SW] Syncing offline transactions...');
    
    // TODO: Implement IndexedDB sync logic when offline mode is added
    
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

/**
 * Push event - handle push notifications
 */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'У вас есть новое уведомление',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'FinTrackr', options)
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if no existing window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
