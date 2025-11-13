/**
 * Централизованная утилита для работы с аутентификацией
 * Управляет localStorage и состоянием пользователя
 */

const Auth = {
  /**
   * Ключ для хранения данных пользователя в localStorage
   */
  USER_KEY: 'user',
  
  /**
   * Ключ для хранения темы
   */
  THEME_KEY: 'ft_theme',

  /**
   * Проверяет, авторизован ли пользователь
   * @returns {boolean}
   */
  isLoggedIn() {
    try {
      return !!localStorage.getItem(this.USER_KEY);
    } catch (e) {
      console.error('Auth: localStorage недоступен', e);
      return false;
    }
  },

  /**
   * Получает данные текущего пользователя
   * @returns {Object|null}
   */
  getUser() {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      console.error('Auth: Ошибка парсинга данных пользователя', e);
      return null;
    }
  },

  /**
   * Сохраняет данные пользователя (вход в систему)
   * @param {Object} user - объект пользователя {id, name, email}
   * @returns {boolean} успех операции
   */
  login(user) {
    try {
      if (!user || !user.email) {
        console.error('Auth: Некорректные данные пользователя');
        return false;
      }
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    } catch (e) {
      console.error('Auth: Ошибка сохранения пользователя', e);
      return false;
    }
  },

  /**
   * Удаляет данные пользователя (выход из системы)
   * @returns {boolean} успех операции
   */
  logout() {
    try {
      localStorage.removeItem(this.USER_KEY);
      return true;
    } catch (e) {
      console.error('Auth: Ошибка удаления данных пользователя', e);
      return false;
    }
  },

  /**
   * Проверяет, требует ли текущая страница авторизации
   * @param {string} currentPage - имя текущей страницы
   * @returns {boolean}
   */
  requiresAuth(currentPage) {
    const publicPages = [
      'landing.html',
      'index.html',
      'login.html',
      'register.html',
      'features.html',
      'benefits.html',
      'about.html'
    ];
    return !publicPages.includes(currentPage.toLowerCase());
  },

  /**
   * Перенаправляет пользователя на страницу входа, если не авторизован
   */
  redirectIfNotAuthenticated() {
    const currentPage = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
    
    if (this.requiresAuth(currentPage) && !this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  },

  /**
   * Получает текущую тему
   * @returns {string} 'dark' или 'light'
   */
  getTheme() {
    try {
      return localStorage.getItem(this.THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  },

  /**
   * Сохраняет тему
   * @param {string} theme - 'dark' или 'light'
   */
  setTheme(theme) {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (e) {
      console.error('Auth: Ошибка сохранения темы', e);
    }
  }
};

export default Auth;
