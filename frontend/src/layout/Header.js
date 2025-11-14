/**
 * Header.js - Универсальный хедер с логотипом, заголовком, профилем и темой
 * 
 * Функциональность:
 * - Адаптивный логотип и заголовок страницы
 * - Выпадающее меню профиля (настройки, выход)
 * - Переключатель темы (светлая/тёмная)
 * - Мобильная кнопка-гамбургер для сайдбара
 * - Интеграция с globalStore для данных пользователя
 */

import { globalStore } from '@modules/store.js';

// Конфигурация страниц для заголовков
const PAGE_TITLES = {
  'dashboard': 'Панель управления',
  'transactions': 'Операции',
  'accounts': 'Счета',
  'categories': 'Категории',
  'budgets': 'Бюджеты',
  'goals': 'Цели',
  'planned': 'Планируемое',
  'subscriptions': 'Подписки',
  'recurring': 'Регулярные',
  'reports': 'Отчёты',
  'forecast': 'Прогноз',
  'rules': 'Правила',
  'converter': 'Конвертер валют',
  'sync': 'Синхронизация',
  'settings': 'Настройки',
  'education': 'Финансовая грамотность',
  'premium': 'Premium',
};

/**
 * Создаёт элемент хедера
 * @param {Object} options - Опции для создания хедера
 * @param {string} options.pageId - ID текущей страницы для заголовка
 * @param {Function} options.onToggleSidebar - Callback для открытия/закрытия сайдбара
 * @param {Function} options.onThemeToggle - Callback для смены темы
 * @param {Function} options.onLogout - Callback для выхода
 * @returns {HTMLElement} Элемент хедера
 */
export function createHeader(options = {}) {
  const {
    pageId = 'dashboard',
    onToggleSidebar = null,
    onThemeToggle = null,
    onLogout = null,
  } = options;

  const user = globalStore.state.user;
  const theme = globalStore.state.theme;
  const pageTitle = PAGE_TITLES[pageId] || 'FinTrackr';

  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <!-- Мобильная кнопка-гамбургер для открытия сайдбара -->
    <button class="header-hamburger" aria-label="Открыть меню">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <!-- Логотип и заголовок страницы -->
    <div class="header-left">
      <div class="header-logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="var(--primary-color)"/>
        </svg>
        <span class="logo-text">FinTrackr</span>
      </div>
      <h1 class="page-title">${pageTitle}</h1>
    </div>

    <!-- Правая часть: тема + профиль -->
    <div class="header-right">
      <!-- Переключатель темы -->
      <button class="theme-toggle" aria-label="Переключить тему">
        ${theme === 'dark' 
          ? '<svg viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
        }
      </button>

      <!-- Профиль пользователя -->
      <div class="header-profile">
        <button class="profile-button" aria-haspopup="true" aria-expanded="false">
          <div class="profile-avatar">${user ? user.name.charAt(0).toUpperCase() : 'U'}</div>
          <span class="profile-name">${user ? user.name : 'Пользователь'}</span>
          <svg class="profile-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>
        </button>

        <!-- Выпадающее меню -->
        <div class="profile-dropdown" hidden>
          <div class="profile-dropdown-header">
            <div class="profile-dropdown-avatar">${user ? user.name.charAt(0).toUpperCase() : 'U'}</div>
            <div class="profile-dropdown-info">
              <div class="profile-dropdown-name">${user ? user.name : 'Пользователь'}</div>
              <div class="profile-dropdown-email">${user ? user.email : ''}</div>
            </div>
          </div>
          <div class="profile-dropdown-divider"></div>
          <a href="/settings.html" class="profile-dropdown-item">
            <svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
            Настройки
          </a>
          <button class="profile-dropdown-item profile-logout">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" stroke="currentColor" stroke-width="2" fill="none"/></svg>
            Выйти
          </button>
        </div>
      </div>
    </div>
  `;

  // Обработчики событий
  const hamburger = header.querySelector('.header-hamburger');
  const themeToggle = header.querySelector('.theme-toggle');
  const profileButton = header.querySelector('.profile-button');
  const profileDropdown = header.querySelector('.profile-dropdown');
  const logoutButton = header.querySelector('.profile-logout');

  // Гамбургер для мобильного меню
  if (hamburger && onToggleSidebar) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      onToggleSidebar();
      hamburger.classList.toggle('active');
    });
  }

  // Переключение темы
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      globalStore.state.theme = newTheme;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('fintrackr-theme', newTheme);
      
      // Обновляем иконку темы
      themeToggle.innerHTML = newTheme === 'dark' 
        ? '<svg viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
      
      if (onThemeToggle) onThemeToggle(newTheme);
    });
  }

  // Выпадающее меню профиля
  if (profileButton && profileDropdown) {
    profileButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = profileButton.getAttribute('aria-expanded') === 'true';
      profileButton.setAttribute('aria-expanded', !isExpanded);
      profileDropdown.hidden = isExpanded;
    });

    // Закрытие при клике вне меню
    document.addEventListener('click', () => {
      profileButton.setAttribute('aria-expanded', 'false');
      profileDropdown.hidden = true;
    });
  }

  // Выход
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      if (onLogout) {
        await onLogout();
      } else {
        // Стандартный выход через API
        try {
          await fetch('/api/logout', { method: 'POST' });
          localStorage.removeItem('user');
          globalStore.state.user = null;
          globalStore.state.isAuthenticated = false;
          window.location.href = '/login.html';
        } catch (error) {
          console.error('Ошибка выхода:', error);
        }
      }
    });
  }

  return header;
}

/**
 * Инициализирует хедер на странице
 * @param {string} containerId - ID контейнера для хедера (опционально, по умолчанию prepend к body)
 * @param {Object} options - Опции создания хедера
 */
export function initHeader(containerId = null, options = {}) {
  // Определяем текущую страницу из URL
  const currentPath = window.location.pathname;
  const currentPage = currentPath
    .replace(/^\//, '')
    .replace(/\.html$/, '') || 'dashboard';

  // Восстанавливаем тему из localStorage
  const savedTheme = localStorage.getItem('fintrackr-theme') || 'light';
  globalStore.state.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Создаём хедер
  const header = createHeader({
    pageId: currentPage,
    ...options,
  });

  // Добавляем в DOM
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      container.appendChild(header);
    }
  } else {
    // По умолчанию добавляем в начало body
    document.body.prepend(header);
  }

  return header;
}

/**
 * Обновляет заголовок страницы в хедере
 * @param {string} pageId - ID страницы из PAGE_TITLES
 */
export function updatePageTitle(pageId) {
  const titleElement = document.querySelector('.page-title');
  if (titleElement && PAGE_TITLES[pageId]) {
    titleElement.textContent = PAGE_TITLES[pageId];
  }
}
