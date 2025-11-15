/**
 * FinTrackr Unified Sidebar Component
 * Single source of truth для навигации
 * Используется во всех страницах приложения
 */

export function renderSidebar() {
  return `
    <aside class="sidebar" id="sidebar" role="navigation" aria-label="Боковая навигация">
      <div class="sidebar-top">
        <div class="sidebar-header">
          <a href="dashboard.html" class="logo" aria-label="FinTrackr логотип">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
              <rect width="24" height="24" rx="6" fill="var(--primary)"></rect>
              <path d="M6 12h12M6 8h12M6 16h12" stroke="#fff" stroke-width="1.2" stroke-linecap="round"></path>
            </svg>
            <span class="logo-text">FinTrackr</span>
          </a>
        </div>
      </div>

      <div class="sidebar-scroll">
        <nav class="sidebar-nav" aria-label="Меню приложения">
          <!-- Основное -->
          <div class="nav-section">
            <h3 class="nav-section-title">Основное</h3>
            <ul class="nav-list">
              <li class="nav-item">
                <a href="dashboard.html" class="nav-link">
                  <span class="nav-icon">🏠</span>
                  <span class="nav-label">Дэшборд</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="accounts.html" class="nav-link">
                  <span class="nav-icon">💼</span>
                  <span class="nav-label">Счёта</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="transactions.html" class="nav-link">
                  <span class="nav-icon">🔁</span>
                  <span class="nav-label">Операции</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="categories.html" class="nav-link">
                  <span class="nav-icon">🔖</span>
                  <span class="nav-label">Категории</span>
                </a>
              </li>
            </ul>
          </div>

          <!-- Планирование -->
          <div class="nav-section">
            <h3 class="nav-section-title">Планирование</h3>
            <ul class="nav-list">
              <li class="nav-item">
                <a href="budgets.html" class="nav-link">
                  <span class="nav-icon">📊</span>
                  <span class="nav-label">Бюджеты</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="goals.html" class="nav-link">
                  <span class="nav-icon">🎯</span>
                  <span class="nav-label">Цели</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="planned.html" class="nav-link">
                  <span class="nav-icon">📅</span>
                  <span class="nav-label">Планируемые</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="recurring.html" class="nav-link">
                  <span class="nav-icon">🔄</span>
                  <span class="nav-label">Регулярные</span>
                </a>
              </li>
            </ul>
          </div>

          <!-- Аналитика -->
          <div class="nav-section">
            <h3 class="nav-section-title">Аналитика</h3>
            <ul class="nav-list">
              <li class="nav-item">
                <a href="reports.html" class="nav-link">
                  <span class="nav-icon">📈</span>
                  <span class="nav-label">Отчёты</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="forecast.html" class="nav-link">
                  <span class="nav-icon">🔮</span>
                  <span class="nav-label">Прогнозы</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="rules.html" class="nav-link">
                  <span class="nav-icon">⚙️</span>
                  <span class="nav-label">Правила</span>
                </a>
              </li>
            </ul>
          </div>

          <!-- Дополнительно -->
          <div class="nav-section">
            <h3 class="nav-section-title">Дополнительно</h3>
            <ul class="nav-list">
              <li class="nav-item">
                <a href="education.html" class="nav-link">
                  <span class="nav-icon">📚</span>
                  <span class="nav-label">Обучение</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="premium.html" class="nav-link">
                  <span class="nav-icon">⭐</span>
                  <span class="nav-label">Премиум</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="settings.html" class="nav-link">
                  <span class="nav-icon">⚙️</span>
                  <span class="nav-label">Настройки</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <div class="sidebar-footer-content">
            <!-- User Profile -->
            <div class="sidebar-user-profile" id="sidebarUserProfile">
              <div class="user-avatar" id="sidebarUserAvatar">
                <span class="user-initials">ГП</span>
              </div>
              <div class="user-info">
                <div class="user-name" id="sidebarUserName">Гость</div>
                <div class="user-email" id="sidebarUserEmail">guest@fintrackr.app</div>
              </div>
            </div>

            <!-- Footer Actions -->
            <div class="sidebar-footer-actions">
              <button 
                class="sidebar-footer-btn theme-toggle-btn" 
                id="sidebarThemeToggle"
                aria-label="Переключить тему"
                title="Переключить тему">
                <span class="btn-icon" id="themeIcon">🌙</span>
                <span class="btn-label">Тема</span>
              </button>
              <button 
                class="sidebar-footer-btn logout-btn" 
                id="sidebarLogout"
                aria-label="Выйти из аккаунта"
                title="Выйти">
                <span class="btn-icon">🚪</span>
                <span class="btn-label">Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
    
    <!-- Sidebar Backdrop для мобильных -->
    <div class="sidebar-backdrop" id="sidebarBackdrop" aria-hidden="true"></div>
  `;
}

/**
 * Инициализирует sidebar после рендеринга
 * Подключает обработчики событий и настраивает состояние
 */
export function initSidebar() {
  // Подключить Auth module для отображения пользователя
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    const user = Auth.getUser();
    updateUserProfile(user);
  }

  // Обработчик выхода
  const logoutBtn = document.getElementById('sidebarLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Обработчик переключения темы
  const themeToggle = document.getElementById('sidebarThemeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', handleThemeToggle);
    updateThemeIcon();
  }
}

/**
 * Обновляет отображение профиля пользователя в sidebar
 */
function updateUserProfile(user) {
  const nameEl = document.getElementById('sidebarUserName');
  const emailEl = document.getElementById('sidebarUserEmail');
  const avatarEl = document.getElementById('sidebarUserAvatar');

  if (nameEl) nameEl.textContent = user.name || 'Пользователь';
  if (emailEl) emailEl.textContent = user.email || '';
  
  // Генерируем инициалы из имени
  if (avatarEl && user.name) {
    const initials = user.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    avatarEl.querySelector('.user-initials').textContent = initials;
  }
}

/**
 * Обработчик выхода из аккаунта
 */
async function handleLogout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      // Очистить localStorage
      if (typeof Auth !== 'undefined') {
        Auth.clearUser();
      }
      localStorage.removeItem('user');
      
      // Редирект на страницу входа
      window.location.href = '/login.html';
    } else {
      console.error('Ошибка выхода:', await response.text());
      alert('Не удалось выйти из аккаунта');
    }
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    alert('Ошибка сети');
  }
}

/**
 * Переключатель темы
 */
function handleThemeToggle() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  updateThemeIcon(newTheme);
}

/**
 * Обновляет иконку темы
 */
function updateThemeIcon(theme) {
  const iconEl = document.getElementById('themeIcon');
  if (!iconEl) return;
  
  const currentTheme = theme || document.documentElement.getAttribute('data-theme') || 'light';
  iconEl.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
}

/**
 * Инжектит sidebar в указанный контейнер и инициализирует
 */
export function mountSidebar(containerId = 'sidebar-mount') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Sidebar mount point #${containerId} not found`);
    return;
  }

  // Рендерим HTML
  container.innerHTML = renderSidebar();
  
  // Инициализируем функционал
  initSidebar();
  
  // Возвращаем reference на sidebar element
  return document.getElementById('sidebar');
}

// Default export для удобного импорта
export default {
  renderSidebar,
  initSidebar,
  mountSidebar
};
