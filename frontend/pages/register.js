import Auth from '../modules/auth.js';
import initProfileShell from '../modules/profile.js';
import { API } from '../src/modules/api.js';
import { toastError } from '../src/components/Toast.js';

initProfileShell({ requireAuth: false });

/**
 * Логика регистрации пользователя. Отправляет данные на сервер и перенаправляет на дэшборд.
 */
async function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    
    if (password !== confirm) {
      toastError('Пароли не совпадают');
      return;
    }

    const newUser = { name, email, password };
    try {
      const response = await API.auth.register(newUser);
      // Backend возвращает { user: {...} }, извлекаем объект пользователя
      const user = response.user || response;
      // Используем Auth утилиту для сохранения пользователя
      if (Auth.login(user)) {
        window.location.href = 'dashboard.html';
      } else {
        toastError('Ошибка сохранения данных');
      }
    } catch (error) {
      console.error(error);
      toastError(error.message || 'Ошибка регистрации');
    }
  });
}

if (document.readyState !== 'loading') {
  initRegisterPage();
} else {
  document.addEventListener('DOMContentLoaded', initRegisterPage);
}