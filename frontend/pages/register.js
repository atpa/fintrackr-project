import Auth from '../modules/auth.js';
import initProfileShell from '../modules/profile.js';

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
      alert('Пароли не совпадают');
      return;
    }
    const newUser = { name, email, password };
    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert('Ошибка регистрации: ' + (err.error || resp.statusText));
        return;
      }
      const created = await resp.json();
      // Используем Auth утилиту для сохранения пользователя
      if (Auth.login(created)) {
        window.location.href = 'dashboard.html';
      } else {
        alert('Ошибка сохранения данных');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка сети');
    }
  });
}

if (document.readyState !== 'loading') {
  initRegisterPage();
} else {
  document.addEventListener('DOMContentLoaded', initRegisterPage);
}