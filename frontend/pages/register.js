import Auth from '../modules/auth.js';
import initProfileShell from '../modules/profile.js';
import { postData } from '../modules/api.js';

initProfileShell({ requireAuth: false });

async function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('regName')?.value?.trim();
    const email = document.getElementById('regEmail')?.value?.trim();
    const password = document.getElementById('regPassword')?.value;
    const confirm = document.getElementById('regConfirm')?.value;

    if (!name || !email || !password) {
      alert('Fill in name, email, and password.');
      return;
    }
    if (password !== confirm) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const created = await postData('/api/register', { name, email, password }, { csrf: false });
      const payload = created?.user || created;
      if (!Auth.login(payload)) {
        alert('Failed to save session data.');
        return;
      }
      await Auth.syncSession(true).catch(() => null);
      window.location.href = 'dashboard.html';
    } catch (error) {
      alert(error.message || 'Registration failed.');
    }
  });
}

if (document.readyState !== 'loading') {
  initRegisterPage();
} else {
  document.addEventListener('DOMContentLoaded', initRegisterPage);
}
