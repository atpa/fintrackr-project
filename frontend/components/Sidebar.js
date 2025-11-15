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
  // Sidebar инициализирован без дополнительных обработчиков
  // Профиль и функции темы/выхода убраны
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
