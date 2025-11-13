import Auth from '../modules/auth.js';
import initProfileShell from '../modules/profile.js';

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
    if (!email || !password) return;
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await resp.json();
      if (!resp.ok) {
        alert(result.error || 'Ошибка входа');
        return;
      }
      // Используем Auth утилиту для сохранения пользователя
      if (Auth.login(result)) {
        window.location.href = 'dashboard.html';
      } else {
        alert('Ошибка сохранения данных');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка подключения к серверу');
    }
  });
});