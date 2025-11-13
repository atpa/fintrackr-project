import Auth from './auth.js';

const DEFAULT_PUBLIC_PAGES = new Set([
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

function getCurrentPage() {
  const parts = window.location.pathname.split('/');
  const last = parts.pop() || '';
  return (last || 'index.html').toLowerCase();
}

function updateProfileSummary(user) {
  const profileName = document.querySelector('.profile-name');
  const profileEmail = document.querySelector('.profile-email');

  if (profileName) {
    profileName.textContent = user?.name || 'Пользователь';
  }

  if (profileEmail) {
    profileEmail.textContent = user?.email || '';
  }
}

function toggleAuthLinks(user, logoutRedirect) {
  const loginLink = document.querySelector('.login-link');
  const registerLink = document.querySelector('.register-link');
  const logoutLink = document.querySelector('.logout-link');

  if (user) {
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (logoutLink) {
      logoutLink.style.display = 'inline-block';
      logoutLink.addEventListener('click', (event) => {
        event.preventDefault();
        Auth.logout();
        window.location.href = logoutRedirect;
      }, { once: true });
    }
  } else {
    if (logoutLink) logoutLink.style.display = 'none';
    if (loginLink) loginLink.style.display = 'inline-block';
    if (registerLink) registerLink.style.display = 'inline-block';
  }
}

function setupProfileShell({
  requireAuth = true,
  loginPath = 'login.html',
  logoutRedirect = 'landing.html',
  publicPages = DEFAULT_PUBLIC_PAGES,
} = {}) {
  const currentPage = getCurrentPage();
  const isPublic = publicPages.has(currentPage);

  if (requireAuth && !isPublic && !Auth.isLoggedIn()) {
    window.location.href = loginPath;
    return;
  }

  const user = Auth.getUser();
  updateProfileSummary(user);
  toggleAuthLinks(user, logoutRedirect);
}

export function initProfileShell(options = {}) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupProfileShell(options), {
      once: true,
    });
  } else {
    setupProfileShell(options);
  }
}

export function loadProfileSettings(storageKey = 'settings') {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Не удалось прочитать настройки профиля', error);
    return {};
  }
}

export function saveProfileSettings(settings, storageKey = 'settings') {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Не удалось сохранить настройки профиля', error);
    return false;
  }
}

export function applyProfileFormFields({
  settings = {},
  nameInput = document.getElementById('profileName'),
  currencySelect = document.getElementById('profileCurrency'),
  timezoneSelect = document.getElementById('profileTimezone'),
  reportCurrencySelect = document.getElementById('reportCurrencySelect'),
  balanceCurrencySelect = document.getElementById('balanceCurrencySelect'),
} = {}) {
  const user = Auth.getUser() || {};

  if (nameInput) nameInput.value = settings.name || user.name || '';
  if (currencySelect) currencySelect.value = settings.currency || 'USD';
  if (timezoneSelect) timezoneSelect.value = settings.timezone || 'Europe/Warsaw';
  if (reportCurrencySelect)
    reportCurrencySelect.value =
      settings.reportCurrency || settings.currency || 'USD';
  if (balanceCurrencySelect)
    balanceCurrencySelect.value =
      settings.balanceCurrency || settings.currency || 'USD';
}

export default initProfileShell;
