/**
 * Инициализация страницы настроек. Загружает и сохраняет параметры профиля и уведомлений.
 */
async function initSettingsPage() {
  await Auth.redirectIfNotAuthenticated();
  try {
    await Auth.syncSession();
  } catch (err) {
    // если не удалось синхронизироваться, перенаправление уже выполнено
  }
  // Попытка загрузить сохранённые настройки
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('settings')) || {};
  } catch (err) {
    settings = {};
  }
  // Текущий пользователь (если есть)
  const currentUser = Auth.getUser() || {};
  // Элементы профиля
  const nameInput = document.getElementById('profileName');
  const currencySelect = document.getElementById('profileCurrency');
  const timezoneSelect = document.getElementById('profileTimezone');
  // Элемент выбора отчётной валюты
  const reportCurrencySelect = document.getElementById('reportCurrencySelect');
  // Элемент выбора валюты баланса
  const balanceCurrencySelect = document.getElementById('balanceCurrencySelect');
  // Заполняем значениями: сначала из settings, затем из текущего пользователя
  if (nameInput) nameInput.value = settings.name || currentUser.name || '';
  if (currencySelect) currencySelect.value = settings.currency || 'USD';
  if (timezoneSelect) timezoneSelect.value = settings.timezone || 'Europe/Warsaw';
  if (reportCurrencySelect) reportCurrencySelect.value = settings.reportCurrency || settings.currency || 'USD';
  if (balanceCurrencySelect) balanceCurrencySelect.value = settings.balanceCurrency || settings.currency || 'USD';
  // Элементы уведомлений
  const notifyEmail = document.getElementById('notifyEmail');
  const notifyTelegram = document.getElementById('notifyTelegram');
  const notifyPush = document.getElementById('notifyPush');
  if (notifyEmail) notifyEmail.checked = settings.notifications?.email || false;
  if (notifyTelegram) notifyTelegram.checked = settings.notifications?.telegram || false;
  if (notifyPush) notifyPush.checked = settings.notifications?.push || false;
  // Обработчик формы профиля
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', e => {
      e.preventDefault();
      settings.name = nameInput.value.trim();
      settings.currency = currencySelect.value;
      settings.timezone = timezoneSelect.value;
      try {
        localStorage.setItem('settings', JSON.stringify(settings));
        alert('Профиль сохранён');
      } catch (err) {
        console.error(err);
        alert('Не удалось сохранить настройки');
      }
    });
  }
  // Обработчик формы уведомлений
  const notifyForm = document.getElementById('notifyForm');
  if (notifyForm) {
    notifyForm.addEventListener('submit', e => {
      e.preventDefault();
      settings.notifications = {
        email: !!notifyEmail.checked,
        telegram: !!notifyTelegram.checked,
        push: !!notifyPush.checked
      };
      try {
        localStorage.setItem('settings', JSON.stringify(settings));
        alert('Настройки уведомлений сохранены');
      } catch (err) {
        console.error(err);
        alert('Не удалось сохранить настройки');
      }
    });
  }

  // Обработчик формы отчётной валюты
  const reportForm = document.getElementById('reportCurrencyForm');
  if (reportForm) {
    reportForm.addEventListener('submit', e => {
      e.preventDefault();
      settings.reportCurrency = reportCurrencySelect.value;
      try {
        localStorage.setItem('settings', JSON.stringify(settings));
        alert('Валюта отчётов сохранена');
      } catch (err) {
        console.error(err);
        alert('Не удалось сохранить валюту отчётов');
      }
    });
  }

  // Обработчик формы валюты баланса
  const balanceForm = document.getElementById('balanceCurrencyForm');
  if (balanceForm) {
    balanceForm.addEventListener('submit', e => {
      e.preventDefault();
      settings.balanceCurrency = balanceCurrencySelect.value;
      try {
        localStorage.setItem('settings', JSON.stringify(settings));
        alert('Валюта баланса сохранена');
      } catch (err) {
        console.error(err);
        alert('Не удалось сохранить валюту баланса');
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initSettingsPage().catch(err => console.error('Settings init error', err));
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initSettingsPage().catch(err => console.error('Settings init error', err));
  });
}