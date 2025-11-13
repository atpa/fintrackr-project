import initNavigation from '../modules/navigation.js';
import initProfileShell, {
  applyProfileFormFields,
  loadProfileSettings,
  saveProfileSettings,
} from '../modules/profile.js';
import initNotificationPreferences from '../modules/notifications.js';

initNavigation();
initProfileShell();

function initSettingsPage() {
  let settings = loadProfileSettings();
  applyProfileFormFields({ settings });

  const nameInput = document.getElementById('profileName');
  const currencySelect = document.getElementById('profileCurrency');
  const timezoneSelect = document.getElementById('profileTimezone');
  const reportCurrencySelect = document.getElementById('reportCurrencySelect');
  const balanceCurrencySelect = document.getElementById('balanceCurrencySelect');

  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      settings = {
        ...settings,
        name: nameInput ? nameInput.value.trim() : settings.name,
        currency: currencySelect ? currencySelect.value : settings.currency,
        timezone: timezoneSelect ? timezoneSelect.value : settings.timezone,
      };

      if (saveProfileSettings(settings)) {
        alert('Профиль сохранён');
      } else {
        alert('Не удалось сохранить настройки');
      }
    });
  }

  const reportForm = document.getElementById('reportCurrencyForm');
  if (reportForm) {
    reportForm.addEventListener('submit', (event) => {
      event.preventDefault();
      settings = {
        ...settings,
        reportCurrency: reportCurrencySelect ? reportCurrencySelect.value : settings.reportCurrency,
      };

      if (saveProfileSettings(settings)) {
        alert('Валюта отчётов сохранена');
      } else {
        alert('Не удалось сохранить валюту отчётов');
      }
    });
  }

  const balanceForm = document.getElementById('balanceCurrencyForm');
  if (balanceForm) {
    balanceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      settings = {
        ...settings,
        balanceCurrency: balanceCurrencySelect ? balanceCurrencySelect.value : settings.balanceCurrency,
      };

      if (saveProfileSettings(settings)) {
        alert('Валюта баланса сохранена');
      } else {
        alert('Не удалось сохранить валюту баланса');
      }
    });
  }

  initNotificationPreferences();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}