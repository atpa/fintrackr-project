import Auth from '../modules/auth.js';
import initProfileShell from '../modules/profile.js';
import { postData } from '../modules/api.js';

initProfileShell({ requireAuth: false });

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) {
      alert('�����४�� email � ��஫�');
      return;
    }

    try {
      const result = await postData('/api/login', { email, password }, { csrf: false });
      const payload = result?.user || result;
      if (!Auth.login(payload)) {
        alert('�訡�� ��࠭���� ������');
        return;
      }
      await Auth.syncSession(true).catch(() => null);
      window.location.href = 'dashboard.html';
    } catch (error) {
      alert(error.message || '�訡�� �室�');
    }
  });
});
