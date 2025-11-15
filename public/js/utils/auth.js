/**
 * Централизованная утилита для работы с аутентификацией
 * Управляет localStorage и состоянием пользователя
 */

const Auth = {
  /**
   * Ключ для хранения данных пользователя в sessionStorage
   */
  USER_KEY: 'user',

  /**
   * Ключ для хранения темы
   */
  THEME_KEY: 'ft_theme',

  _cache: null,
  _sessionPromise: null,

  _storage() {
    try {
      return window.sessionStorage;
    } catch (err) {
      console.error('Auth: sessionStorage недоступен', err);
      return null;
    }
  },

  _readUserFromStorage() {
    const storage = this._storage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Auth: Ошибка чтения пользователя из sessionStorage', err);
      return null;
    }
  },

  _writeUserToStorage(user) {
    const storage = this._storage();
    if (!storage) return;
    try {
      if (user) {
        storage.setItem(this.USER_KEY, JSON.stringify(user));
      } else {
        storage.removeItem(this.USER_KEY);
      }
    } catch (err) {
      console.error('Auth: Ошибка сохранения пользователя в sessionStorage', err);
    }
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  getUser() {
    if (this._cache) {
      return this._cache;
    }
    const stored = this._readUserFromStorage();
    if (stored) {
      this._cache = stored;
    }
    return stored;
  },

  login(userPayload) {
    const user = userPayload && userPayload.user ? userPayload.user : userPayload;
    if (!user || !user.email) {
      console.error('Auth: Некорректные данные пользователя');
      return false;
    }
    this._cache = user;
    this._writeUserToStorage(user);
    return true;
  },

  clearUser() {
    this._cache = null;
    this._writeUserToStorage(null);
  },

  async logout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (err) {
      console.error('Auth: Ошибка запроса выхода', err);
    } finally {
      this.clearUser();
    }
    return true;
  },

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
    return !publicPages.includes((currentPage || '').toLowerCase());
  },

  async redirectIfNotAuthenticated() {
    const currentPage = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
    if (!this.requiresAuth(currentPage)) return;
    try {
      await this.syncSession();
    } catch (err) {
      this.clearUser();
      window.location.href = 'login.html';
    }
  },

  async syncSession(force = false) {
    if (!force) {
      const cached = this.getUser();
      if (cached) return cached;
    }
    if (this._sessionPromise && !force) {
      return this._sessionPromise;
    }
    this._sessionPromise = (async () => {
      try {
        const resp = await fetch('/api/session', { method: 'GET' });
        if (!resp.ok) {
          throw new Error('Unauthenticated');
        }
        const data = await resp.json();
        if (data && data.user) {
          this._cache = data.user;
          this._writeUserToStorage(data.user);
          return data.user;
        }
        throw new Error('Empty session');
      } catch (err) {
        this.clearUser();
        throw err;
      } finally {
        this._sessionPromise = null;
      }
    })();
    return this._sessionPromise;
  },

  async handleUnauthorized() {
    this.clearUser();
    const currentPage = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
    if (this.requiresAuth(currentPage)) {
      window.location.href = 'login.html';
    }
  },

  getTheme() {
    try {
      return localStorage.getItem(this.THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  },

  setTheme(theme) {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (e) {
      console.error('Auth: Ошибка сохранения темы', e);
    }
  }
};

(function enforceFetchCredentials() {
  if (typeof window === 'undefined' || !window.fetch || window.__authFetchWrapped) {
    return;
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const options = { ...init };
    if (!Object.prototype.hasOwnProperty.call(options, 'credentials')) {
      options.credentials = 'include';
    }
    return originalFetch(input, options);
  };
  window.__authFetchWrapped = true;
})();

// Экспортируем для использования в браузере
if (typeof window !== 'undefined') {
  window.Auth = Auth;
}

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
