/**
 * FinTrackr Service Worker DISABLED (stub)
 * Полностью удалены стратегии кэширования и offline. Версия: disabled-2
 */

// Немедленная активация и зачистка существующих кэшей
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Нет fetch перехвата — браузер работает обычно
// Канал для принудительного удаления SW из клиентов
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UNREGISTER_SW') {
    event.waitUntil((async () => {
      const ok = await self.registration.unregister();
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ unregistered: ok });
    })());
  }
});

console.log('[SW] Disabled stub active');

