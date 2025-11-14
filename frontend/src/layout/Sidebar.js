/**
 * Sidebar Component — минималистичная навигация с иконками
 * @module layout/Sidebar
 * @description Адаптивный sidebar с auto-collapse < 1200px
 */

import globalStore from '../modules/store.js';

/**
 * Конфигурация навигации
 */
const NAV_ITEMS = [
  {
    section: 'Финансы',
    items: [
      { icon: '📊', label: 'Дашборд', href: 'dashboard.html', id: 'dashboard' },
      { icon: '💼', label: 'Счета', href: 'accounts.html', id: 'accounts' },
      { icon: '📝', label: 'Транзакции', href: 'transactions.html', id: 'transactions' },
      { icon: '📁', label: 'Категории', href: 'categories.html', id: 'categories' },
      { icon: '📊', label: 'Бюджеты', href: 'budgets.html', id: 'budgets' },
      { icon: '🎯', label: 'Цели', href: 'goals.html', id: 'goals' },
      { icon: '📅', label: 'Планируемые', href: 'planned.html', id: 'planned' },
      { icon: '🔁', label: 'Регулярные', href: 'recurring.html', id: 'recurring' }
    ]
  },
  {
    section: 'Аналитика',
    items: [
      { icon: '📈', label: 'Отчёты', href: 'reports.html', id: 'reports' },
      { icon: '🔮', label: 'Прогнозы', href: 'forecast.html', id: 'forecast' }
    ]
  },
  {
    section: 'Инструменты',
    items: [
      { icon: '💱', label: 'Конвертер', href: 'converter.html', id: 'converter' },
      { icon: '🔔', label: 'Подписки', href: 'subscriptions.html', id: 'subscriptions' },
      { icon: '🤖', label: 'Правила', href: 'rules.html', id: 'rules' },
      { icon: '🔗', label: 'Синхронизация', href: 'sync.html', id: 'sync' }
    ]
  }
];

/**
 * Создание sidebar-элемента
 * @param {Object} options - опции (collapsed, currentPage)
 * @returns {HTMLElement} sidebar DOM-элемент
 */
export function createSidebar(options = {}) {
  const {
    collapsed = globalStore.state.sidebarCollapsed,
    currentPage = globalStore.state.currentPage
  } = options;

  const sidebar = document.createElement('nav');
  sidebar.className = `sidebar ${collapsed ? 'sidebar-collapsed' : ''}`;
  sidebar.setAttribute('role', 'navigation');
  sidebar.setAttribute('aria-label', 'Main navigation');

  // Logo
  const logo = document.createElement('div');
  logo.className = 'sidebar-logo';
  logo.innerHTML = `
    <a href="dashboard.html" class="logo-link">
      <span class="logo-icon">💰</span>
      <span class="logo-text">FinTrackr</span>
    </a>
  `;
  sidebar.appendChild(logo);

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'sidebar-toggle';
  toggleBtn.setAttribute('aria-label', collapsed ? 'Развернуть меню' : 'Свернуть меню');
  toggleBtn.innerHTML = collapsed ? '→' : '←';
  toggleBtn.addEventListener('click', () => {
    toggleSidebar();
  });
  sidebar.appendChild(toggleBtn);

  // Navigation sections
  NAV_ITEMS.forEach(section => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'nav-section';

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'nav-section-title';
    sectionTitle.textContent = section.section;
    sectionEl.appendChild(sectionTitle);

    const navList = document.createElement('ul');
    navList.className = 'nav-list';

    section.items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'nav-item';

      const link = document.createElement('a');
      link.href = item.href;
      link.className = `nav-link ${currentPage === item.id ? 'active' : ''}`;
      link.setAttribute('data-page', item.id);
      
      const icon = document.createElement('span');
      icon.className = 'nav-icon';
      icon.textContent = item.icon;
      
      const label = document.createElement('span');
      label.className = 'nav-label';
      label.textContent = item.label;
      
      // Tooltip для collapsed-режима
      if (collapsed) {
        link.setAttribute('title', item.label);
        link.setAttribute('data-tooltip', item.label);
      }

      link.append(icon, label);
      li.appendChild(link);
      navList.appendChild(li);
    });

    sectionEl.appendChild(navList);
    sidebar.appendChild(sectionEl);
  });

  // Footer (settings + help)
  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';
  footer.innerHTML = `
    <a href="settings.html" class="nav-link" ${collapsed ? 'title="Настройки"' : ''}>
      <span class="nav-icon">⚙️</span>
      <span class="nav-label">Настройки</span>
    </a>
    <a href="education.html" class="nav-link" ${collapsed ? 'title="Обучение"' : ''}>
      <span class="nav-icon">📚</span>
      <span class="nav-label">Обучение</span>
    </a>
  `;
  sidebar.appendChild(footer);

  return sidebar;
}

/**
 * Переключение состояния sidebar (collapsed/expanded)
 */
export function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
  globalStore.state.sidebarCollapsed = isCollapsed;
  
  // Обновляем кнопку
  const toggleBtn = sidebar.querySelector('.sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = isCollapsed ? '→' : '←';
    toggleBtn.setAttribute('aria-label', isCollapsed ? 'Развернуть меню' : 'Свернуть меню');
  }

  // Добавляем/убираем tooltips
  const links = sidebar.querySelectorAll('.nav-link');
  links.forEach(link => {
    const label = link.querySelector('.nav-label')?.textContent;
    if (isCollapsed && label) {
      link.setAttribute('title', label);
      link.setAttribute('data-tooltip', label);
    } else {
      link.removeAttribute('title');
      link.removeAttribute('data-tooltip');
    }
  });

  // Сохраняем в localStorage
  localStorage.setItem('sidebarCollapsed', isCollapsed);
}

/**
 * Auto-collapse при ширине < 1200px
 */
export function initResponsiveSidebar() {
  const mediaQuery = window.matchMedia('(max-width: 1200px)');
  
  function handleResize(e) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    if (e.matches) {
      // < 1200px — сворачиваем
      sidebar.classList.add('sidebar-collapsed');
      globalStore.state.sidebarCollapsed = true;
    } else {
      // >= 1200px — восстанавливаем из localStorage
      const savedState = localStorage.getItem('sidebarCollapsed') === 'true';
      sidebar.classList.toggle('sidebar-collapsed', savedState);
      globalStore.state.sidebarCollapsed = savedState;
    }
  }

  mediaQuery.addEventListener('change', handleResize);
  handleResize(mediaQuery); // Initial check
}

/**
 * Инициализация sidebar на странице
 * @param {string} containerId - ID контейнера для sidebar
 * @param {Object} options - опции
 */
export function initSidebar(containerId = 'sidebar-container', options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Sidebar container #${containerId} not found`);
    return;
  }

  // Восстанавливаем состояние из localStorage
  const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  options.collapsed = savedCollapsed;

  // Определяем текущую страницу
  const currentPath = window.location.pathname.split('/').pop();
  const currentPage = currentPath.replace('.html', '') || 'dashboard';
  options.currentPage = currentPage;

  const sidebar = createSidebar(options);
  container.appendChild(sidebar);

  // Инициализируем responsive behavior
  initResponsiveSidebar();
}

export default { createSidebar, toggleSidebar, initSidebar, initResponsiveSidebar };
