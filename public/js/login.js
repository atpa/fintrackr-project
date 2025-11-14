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
      // Сохранение текущего пользователя
      const user = result.user || result;
      if (Auth.login(user)) {
        // Редирект в личный кабинет
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