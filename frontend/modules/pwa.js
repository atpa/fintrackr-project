/**
 * PWA Registration Module
 * Регистрация Service Worker и настройка PWA функциональности
 */

let deferredPrompt;
let swRegistration;

/**
 * Регистрация Service Worker
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers не поддерживаются');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service Worker зарегистрирован:', registration.scope);

    // Проверка обновлений
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('[PWA] Найдено обновление Service Worker');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Новая версия доступна
          showUpdateNotification();
        }
      });
    });

    swRegistration = registration;
    return registration;
  } catch (error) {
    console.error('[PWA] Ошибка регистрации Service Worker:', error);
    return null;
  }
}

/**
 * Показать уведомление об обновлении
 */
function showUpdateNotification() {
  if (window.toastInfo) {
    window.toastInfo('Доступно обновление приложения. Обновите страницу.', {
      duration: 10000,
      action: {
        label: 'Обновить',
        onClick: () => window.location.reload()
      }
    });
  } else {
    if (confirm('Доступно обновление приложения. Обновить сейчас?')) {
      window.location.reload();
    }
  }
}

/**
 * Установка приложения (Add to Home Screen)
 */
function setupInstallPrompt() {
  // Перехватываем событие beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt готов');
    
    // Показываем кнопку установки (если она есть)
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', showInstallPrompt);
    }
  });

  // Отслеживаем успешную установку
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Приложение установлено');
    deferredPrompt = null;
    
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }

    if (window.toastSuccess) {
      window.toastSuccess('Приложение успешно установлено!');
    }
  });
}

/**
 * Показать промпт установки
 */
async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.warn('[PWA] Install prompt недоступен');
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] Выбор пользователя:', outcome);
    
    if (outcome === 'accepted') {
      console.log('[PWA] Установка принята');
    } else {
      console.log('[PWA] Установка отклонена');
    }

    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Ошибка показа install prompt:', error);
    return false;
  }
}

/**
 * Проверка, установлено ли приложение как PWA
 */
function isInstalledPWA() {
  // Проверяем display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Проверяем iOS
  if (window.navigator.standalone === true) {
    return true;
  }

  return false;
}

/**
 * Получить информацию о сети
 */
function getNetworkInfo() {
  if (!navigator.onLine) {
    return { online: false, type: 'offline' };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    return {
      online: true,
      type: connection.effectiveType || 'unknown',
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  return { online: true, type: 'unknown' };
}

/**
 * Настройка индикатора сети
 */
function setupNetworkIndicator() {
  const updateStatus = () => {
    const isOnline = navigator.onLine;
    const indicator = document.getElementById('network-status');
    
    if (indicator) {
      indicator.className = isOnline ? 'online' : 'offline';
      indicator.textContent = isOnline ? 'Online' : 'Offline';
    }

    document.body.classList.toggle('is-offline', !isOnline);
    console.log('[PWA] Network status:', isOnline ? 'online' : 'offline');
  };

  window.addEventListener('online', () => {
    updateStatus();
    if (window.toastSuccess) {
      window.toastSuccess('Соединение восстановлено');
    }
  });

  window.addEventListener('offline', () => {
    updateStatus();
    if (window.toastWarning) {
      window.toastWarning('Работа в offline режиме');
    }
  });

  updateStatus();
}

/**
 * Очистка кэша Service Worker
 */
async function clearServiceWorkerCache() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Отправляем сообщение SW для очистки кэша
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };

      registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  } catch (error) {
    console.error('[PWA] Ошибка очистки кэша:', error);
    return false;
  }
}

/**
 * Инициализация PWA
 */
async function initPWA() {
  console.log('[PWA] Инициализация PWA...');

  // Регистрация Service Worker
  await registerServiceWorker();

  // Настройка установки
  setupInstallPrompt();

  // Индикатор сети
  setupNetworkIndicator();

  // Проверка, установлено ли приложение
  const installed = isInstalledPWA();
  console.log('[PWA] Приложение установлено:', installed);

  // Информация о сети
  const networkInfo = getNetworkInfo();
  console.log('[PWA] Сеть:', networkInfo);

  console.log('[PWA] Инициализация завершена');
}

// Автоматическая инициализация при загрузке
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
  } else {
    initPWA();
  }
}

// Экспорт
export {
  registerServiceWorker,
  setupInstallPrompt,
  showInstallPrompt,
  isInstalledPWA,
  getNetworkInfo,
  setupNetworkIndicator,
  clearServiceWorkerCache,
  initPWA
};
