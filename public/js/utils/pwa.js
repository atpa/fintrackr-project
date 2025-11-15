/**
 * PWA Registration and Installation Handler
 * Manages Service Worker registration and app installation
 */

let deferredPrompt;
let swRegistration;

/**
 * Initialize PWA functionality
 */
export function initPWA() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    registerServiceWorker();
  }

  // Handle install prompt
  window.addEventListener('beforeinstallprompt', handleInstallPrompt);
  
  // Check if already installed
  window.addEventListener('appinstalled', handleAppInstalled);
  
  // Handle online/offline status
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

/**
 * Register the service worker
 */
async function registerServiceWorker() {
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('[PWA] Service Worker registered successfully:', swRegistration.scope);
    
    // Check for updates periodically
    setInterval(() => {
      swRegistration.update();
    }, 60000); // Check every minute
    
    // Handle service worker updates
    swRegistration.addEventListener('updatefound', handleUpdateFound);
    
    // If there's already a waiting service worker, notify user
    if (swRegistration.waiting) {
      showUpdateNotification(swRegistration.waiting);
    }
    
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

/**
 * Handle service worker update
 */
function handleUpdateFound() {
  const newWorker = swRegistration.installing;
  
  newWorker.addEventListener('statechange', () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      // New service worker is installed and ready
      showUpdateNotification(newWorker);
    }
  });
}

/**
 * Show notification about app update
 */
function showUpdateNotification(worker) {
  const updateBanner = document.createElement('div');
  updateBanner.className = 'update-banner';
  updateBanner.innerHTML = `
    <div class="update-banner-content">
      <span class="update-banner-text">Доступна новая версия приложения</span>
      <button class="btn-primary btn-sm update-btn">Обновить</button>
      <button class="btn-secondary btn-sm dismiss-btn">Позже</button>
    </div>
  `;
  
  document.body.appendChild(updateBanner);
  
  // Handle update button
  updateBanner.querySelector('.update-btn').addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  });
  
  // Handle dismiss button
  updateBanner.querySelector('.dismiss-btn').addEventListener('click', () => {
    updateBanner.remove();
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (updateBanner.parentNode) {
      updateBanner.remove();
    }
  }, 10000);
}

/**
 * Handle install prompt
 */
function handleInstallPrompt(e) {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show custom install button if exists
  const installButton = document.getElementById('install-app-btn');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', showInstallPrompt);
  }
  
  console.log('[PWA] Install prompt ready');
}

/**
 * Show install prompt to user
 */
export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`[PWA] User response to install prompt: ${outcome}`);
  
  // Clear the deferred prompt
  deferredPrompt = null;
  
  // Hide install button
  const installButton = document.getElementById('install-app-btn');
  if (installButton) {
    installButton.style.display = 'none';
  }
  
  return outcome === 'accepted';
}

/**
 * Handle app installed event
 */
function handleAppInstalled() {
  console.log('[PWA] App installed successfully');
  
  // Hide install button
  const installButton = document.getElementById('install-app-btn');
  if (installButton) {
    installButton.style.display = 'none';
  }
  
  // Show success message
  if (typeof showSuccess === 'function') {
    showSuccess('Приложение успешно установлено!');
  }
}

/**
 * Handle online event
 */
function handleOnline() {
  console.log('[PWA] Back online');
  
  // Remove offline banner if exists
  const offlineBanner = document.querySelector('.offline-banner');
  if (offlineBanner) {
    offlineBanner.remove();
  }
  
  // Show online notification
  if (typeof showInfo === 'function') {
    showInfo('Соединение восстановлено');
  }
  
  // Trigger sync if service worker supports it
  if ('sync' in swRegistration) {
    swRegistration.sync.register('sync-transactions')
      .catch(err => console.error('[PWA] Sync registration failed:', err));
  }
}

/**
 * Handle offline event
 */
function handleOffline() {
  console.log('[PWA] Gone offline');
  
  // Show offline banner
  showOfflineBanner();
  
  // Show offline notification
  if (typeof showInfo === 'function') {
    showInfo('Работа в оффлайн-режиме. Некоторые функции могут быть недоступны.');
  }
}

/**
 * Show offline banner
 */
function showOfflineBanner() {
  // Don't show duplicate banners
  if (document.querySelector('.offline-banner')) {
    return;
  }
  
  const banner = document.createElement('div');
  banner.className = 'offline-banner';
  banner.innerHTML = `
    <div class="offline-banner-content">
      <span class="offline-icon">📡</span>
      <span class="offline-text">Нет подключения к интернету</span>
    </div>
  `;
  
  document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * Check if app is running as PWA
 */
export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
}

/**
 * Check if app can be installed
 */
export function canInstall() {
  return deferredPrompt !== null && deferredPrompt !== undefined;
}

/**
 * Get app install status
 */
export function getInstallStatus() {
  return {
    isPWA: isPWA(),
    canInstall: canInstall(),
    isOnline: navigator.onLine,
    hasServiceWorker: 'serviceWorker' in navigator
  };
}

// Auto-initialize if document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPWA);
} else {
  initPWA();
}
