/**
 * Layout.js - Универсальная обёртка страницы с Header + Sidebar + Content
 * 
 * Функциональность:
 * - Создаёт единую структуру для всех страниц приложения
 * - Интегрирует хедер и сайдбар
 * - Управляет респонсивным поведением (мобильное меню)
 * - Автоматическое определение текущей страницы
 * - Синхронизация состояния между компонентами
 */

import { initHeader } from './Header.js';
import { initSidebar, toggleSidebar } from './Sidebar.js';
import { globalStore } from '@modules/store.js';

/**
 * Создаёт базовую структуру страницы
 * @param {Object} options - Опции создания лейаута
 * @param {string} options.contentId - ID контейнера для основного контента
 * @param {boolean} options.showHeader - Показывать ли хедер (по умолчанию true)
 * @param {boolean} options.showSidebar - Показывать ли сайдбар (по умолчанию true)
 * @param {Function} options.onReady - Callback после полной инициализации лейаута
 * @returns {Object} Объект с методами управления лейаутом
 */
export function createLayout(options = {}) {
  const {
    contentId = 'main-content',
    showHeader = true,
    showSidebar = true,
    onReady = null,
  } = options;

  // Проверяем, что DOM готов
  if (document.readyState === 'loading') {
    throw new Error('Layout должен создаваться после загрузки DOM. Используйте DOMContentLoaded.');
  }

  // Создаём контейнер приложения, если его нет
  let appContainer = document.querySelector('.app-container');
  if (!appContainer) {
    appContainer = document.createElement('div');
    appContainer.className = 'app-container';
    document.body.appendChild(appContainer);
  }

  // Структура лейаута
  appContainer.innerHTML = `
    ${showSidebar ? '<div id="sidebar-container"></div>' : ''}
    <div class="app-main">
      ${showHeader ? '<div id="header-container"></div>' : ''}
      <main class="app-content" id="${contentId}">
        <!-- Контент страницы будет здесь -->
        <div class="content-loader">
          <div class="loader"></div>
          <p>Загрузка...</p>
        </div>
      </main>
    </div>
  `;

  // Инициализируем компоненты
  let headerInstance = null;
  let sidebarInstance = null;

  if (showSidebar) {
    sidebarInstance = initSidebar('sidebar-container', {
      onNavigate: (href) => {
        console.log('Навигация на:', href);
      }
    });
  }

  if (showHeader) {
    headerInstance = initHeader('header-container', {
      onToggleSidebar: () => {
        toggleSidebar();
        // Добавляем класс для overlay на мобильных
        document.body.classList.toggle('sidebar-open');
      },
      onThemeToggle: (theme) => {
        console.log('Тема изменена на:', theme);
      }
    });
  }

  // Закрытие сайдбара при клике на overlay (мобильные устройства)
  const handleOverlayClick = (e) => {
    if (
      window.innerWidth < 900 &&
      !e.target.closest('.sidebar') &&
      !e.target.closest('.header-hamburger') &&
      document.body.classList.contains('sidebar-open')
    ) {
      toggleSidebar();
      document.body.classList.remove('sidebar-open');
    }
  };
  document.addEventListener('click', handleOverlayClick);

  // Убираем loader после инициализации
  setTimeout(() => {
    const loader = document.querySelector('.content-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
    if (onReady) onReady();
  }, 100);

  // API для управления лейаутом
  return {
    header: headerInstance,
    sidebar: sidebarInstance,
    contentContainer: document.getElementById(contentId),
    
    /**
     * Показывает индикатор загрузки
     */
    showLoader() {
      const content = document.getElementById(contentId);
      if (content) {
        content.classList.add('loading');
        globalStore.state.isLoading = true;
      }
    },

    /**
     * Скрывает индикатор загрузки
     */
    hideLoader() {
      const content = document.getElementById(contentId);
      if (content) {
        content.classList.remove('loading');
        globalStore.state.isLoading = false;
      }
    },

    /**
     * Очищает контент и показывает новый
     * @param {string|HTMLElement} content - HTML строка или элемент
     */
    setContent(content) {
      const container = document.getElementById(contentId);
      if (container) {
        if (typeof content === 'string') {
          container.innerHTML = content;
        } else {
          container.innerHTML = '';
          container.appendChild(content);
        }
      }
    },

    /**
     * Уничтожает лейаут и очищает обработчики
     */
    destroy() {
      document.removeEventListener('click', handleOverlayClick);
      if (appContainer) {
        appContainer.remove();
      }
    }
  };
}

/**
 * Инициализирует лейаут на текущей странице
 * Использует стандартные настройки для большинства страниц
 * @param {Object} options - Опции создания лейаута
 * @returns {Object} Объект с методами управления лейаутом
 */
export function initLayout(options = {}) {
  // Ждём загрузки DOM
  if (document.readyState === 'loading') {
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', () => {
        resolve(createLayout(options));
      });
    });
  }

  return createLayout(options);
}

/**
 * Вспомогательная функция для страниц без авторизации (login, register, landing)
 * Создаёт упрощённый лейаут без сайдбара и хедера
 * @param {Object} options - Опции создания лейаута
 */
export function createPublicLayout(options = {}) {
  return createLayout({
    showHeader: false,
    showSidebar: false,
    ...options,
  });
}
