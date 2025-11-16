import Auth from '../modules/auth.js';
import initProfileShell from '../modules/profile.js';
import { postData } from '../modules/api.js';

initProfileShell({ requireAuth: false });

async function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const confirm = document.getElementById('regConfirm')?.value;

    if (!name || !email || !password) {
      alert('������� ���, email � ��஫�');
      return;
    }
    if (password !== confirm) {
      alert('��஫� �� ᮢ������');
      return;
    }

    try {
      const created = await postData('/api/register', { name, email, password }, { csrf: false });
      const payload = created?.user || created;
      if (!Auth.login(payload)) {
        alert('�訡�� ��࠭���� ������');
        return;
      }
      await Auth.syncSession(true).catch(() => null);
      window.location.href = 'dashboard.html';
    } catch (error) {
      alert(error.message || '�訡�� ॣ����樨');
    }
  });
}

if (document.readyState !== 'loading') {
  initRegisterPage();
} else {
  document.addEventListener('DOMContentLoaded', initRegisterPage);
}
