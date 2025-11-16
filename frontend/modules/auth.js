import { postData, onUnauthorized, ensureCsrfToken } from './api.js';

const PUBLIC_PAGES = new Set([
  'landing.html',
  'index.html',
  'login.html',
  'register.html',
  'features.html',
  'benefits.html',
  'about.html',
  'premium.html',
  'education.html',
]);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function shouldAttachCsrf(input) {
  if (typeof window === 'undefined') {
    return false;
  }
  let url;
  try {
    if (typeof input === 'string') {
      url = new URL(input, window.location.origin);
    } else if (input instanceof Request) {
      url = new URL(input.url);
    } else {
      url = new URL(String(input), window.location.origin);
    }
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) {
    return false;
  }
  if (!url.pathname.startsWith('/api/')) {
    return false;
  }
  return !['/api/login', '/api/register', '/api/refresh'].includes(url.pathname);
}

const Auth = {
  USER_KEY: 'user',
  THEME_KEY: 'ft_theme',
  _cache: null,
  _sessionPromise: null,

  _storage() {
    try {
      return window.sessionStorage;
    } catch (error) {
      console.error('Auth: sessionStorage недоступен', error);
      return null;
    }
  },

  _readUserFromStorage() {
    const storage = this._storage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Auth: ошибка чтения пользователя из sessionStorage', error);
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
    } catch (error) {
      console.error('Auth: ошибка записи пользователя в sessionStorage', error);
    }
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  getUser() {
    if (this._cache) return this._cache;
    const stored = this._readUserFromStorage();
    if (stored) {
      this._cache = stored;
    }
    return stored;
  },

  setUser(user) {
    if (!user || !user.email) {
      console.warn('Auth: нельзя сохранить пустого пользователя');
      return false;
    }
    this._cache = user;
    this._writeUserToStorage(user);
    return true;
  },

  login(userPayload) {
    const user = userPayload?.user || userPayload;
    return this.setUser(user);
  },

  clearUser() {
    this._cache = null;
    this._writeUserToStorage(null);
  },

  requiresAuth(pageName) {
    const current = (pageName || this._currentPage()).toLowerCase();
    return !PUBLIC_PAGES.has(current);
  },

  _currentPage() {
    const path = window.location.pathname.split('/').pop();
    return (path || 'index.html').toLowerCase();
  },

  async syncSession(force = false) {
    if (!force) {
      const cached = this.getUser();
      if (cached) {
        return cached;
      }
    }

    if (this._sessionPromise && !force) {
      return this._sessionPromise;
    }

    this._sessionPromise = (async () => {
      const response = await fetch('/api/session', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) {
        throw new Error('Unauthenticated');
      }

      const payload = await response.json();
      if (payload?.user) {
        this.setUser(payload.user);
        return payload.user;
      }
      throw new Error('Session payload is empty');
    })()
      .catch((error) => {
        this.clearUser();
        throw error;
      })
      .finally(() => {
        this._sessionPromise = null;
      });

    return this._sessionPromise;
  },

  async requireAuth() {
    try {
      return await this.syncSession();
    } catch (error) {
      this.handleUnauthorized();
      throw error;
    }
  },

  async logout() {
    try {
      await postData('/api/logout', {}, { csrf: true });
    } catch (error) {
      console.warn('Auth: ошибка выхода', error);
    } finally {
      this.clearUser();
    }
    return true;
  },

  handleUnauthorized() {
    this.clearUser();
    const current = this._currentPage();
    if (this.requiresAuth(current)) {
      window.location.href = 'login.html';
    }
  },

  getTheme() {
    try {
      return localStorage.getItem(this.THEME_KEY) || 'light';
    } catch (error) {
      return 'light';
    }
  },

  setTheme(theme) {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      console.error('Auth: ошибка смены темы', error);
    }
  },
};

onUnauthorized(() => Auth.handleUnauthorized());

if (typeof window !== 'undefined' && window.fetch && !window.__fintrackrFetchWrapped) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const options = { ...init };
    options.credentials = options.credentials || 'include';
    const method = (options.method || 'GET').toUpperCase();
    const needsCsrf =
      !SAFE_METHODS.has(method) &&
      shouldAttachCsrf(typeof input === 'string' ? input : input.url);

    if (needsCsrf) {
      const headers = new Headers(options.headers || {});
      if (!headers.has('X-CSRF-Token')) {
        const token = await ensureCsrfToken();
        headers.set('X-CSRF-Token', token);
      }
      options.headers = headers;
    }

    return originalFetch(input, options);
  };
  window.__fintrackrFetchWrapped = true;
}

export default Auth;
