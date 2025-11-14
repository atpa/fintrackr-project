import Auth from '../modules/auth.js';
import initProfileShell from '../modules/profile.js';
import { API } from '../src/modules/api.js';
import { toastError } from '../src/components/Toast.js';

initProfileShell({ requireAuth: false });

// Скрипт для формы входа
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const email = emailEl.value.trim();
    const password = passEl.value;
    
    if (!email || !password) {
      toastError('Заполните все поля');
      return;
    }

    try {
      const result = await API.auth.login({ email, password });
      // Используем Auth утилиту для сохранения пользователя
      if (Auth.login(result)) {
        window.location.href = 'dashboard.html';
      } else {
        toastError('Ошибка сохранения данных');
      }
    } catch (error) {
      console.error(error);
      toastError(error.message || 'Ошибка подключения к серверу');
    }
  });
});