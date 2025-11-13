import { loadProfileSettings, saveProfileSettings } from './profile.js';

export function initNotificationPreferences({
  formSelector = '#notifyForm',
  storageKey = 'settings',
  onSuccess,
  onError,
} = {}) {
  const run = () => {
    const form =
      typeof formSelector === 'string'
        ? document.querySelector(formSelector)
        : formSelector;

    if (!form) {
      return;
    }

    const emailCheckbox = form.querySelector('#notifyEmail');
    const telegramCheckbox = form.querySelector('#notifyTelegram');
    const pushCheckbox = form.querySelector('#notifyPush');

    const settings = loadProfileSettings(storageKey);
    const notifications = settings.notifications || {};

    if (emailCheckbox) emailCheckbox.checked = !!notifications.email;
    if (telegramCheckbox) telegramCheckbox.checked = !!notifications.telegram;
    if (pushCheckbox) pushCheckbox.checked = !!notifications.push;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      settings.notifications = {
        email: emailCheckbox ? !!emailCheckbox.checked : false,
        telegram: telegramCheckbox ? !!telegramCheckbox.checked : false,
        push: pushCheckbox ? !!pushCheckbox.checked : false,
      };

      if (saveProfileSettings(settings, storageKey)) {
        if (typeof onSuccess === 'function') {
          onSuccess(settings.notifications);
        } else {
          alert('Настройки уведомлений сохранены');
        }
      } else if (typeof onError === 'function') {
        onError();
      } else {
        alert('Не удалось сохранить настройки уведомлений');
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

export default initNotificationPreferences;
