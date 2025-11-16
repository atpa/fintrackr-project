import fetchData, { postData, deleteData } from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

(function () {
  const listEl = document.getElementById('subscriptionsList');
  const form = document.getElementById('subForm');
  const titleEl = document.getElementById('subTitle');
  const amountEl = document.getElementById('subAmount');
  const currencyEl = document.getElementById('subCurrency');
  const freqEl = document.getElementById('subFrequency');
  const dateEl = document.getElementById('subDate');

  function fmtAmount(a, c) {
    if (typeof window.formatCurrency === 'function') return window.formatCurrency(a, c);
    const n = Number(a) || 0;
    return `${n.toFixed(2)} ${c || ''}`.trim();
  }

  async function loadSubscriptions() {
    if (listEl) {
      listEl.innerHTML = '<p>Loading…</p>';
    }
    try {
      const items = await fetchData('/api/subscriptions');
      renderList(items);
    } catch (e) {
      listEl.innerHTML = `<p class="text-danger">${e.message || 'Failed to load subscriptions'}</p>`;
    }
  }

  function renderList(items) {
    if (!listEl) return;
    if (!Array.isArray(items) || items.length === 0) {
      listEl.innerHTML = '<p>No subscriptions yet.</p>';
      return;
    }
    const html = items
      .map(
        (s) => `
        <div class="row" style="align-items:center; gap:.5rem; padding:.5rem 0; border-bottom:1px solid var(--border)">
          <div style="flex:2 1 220px"><strong>${escapeHtml(s.title)}</strong></div>
          <div style="flex:1 1 140px">${fmtAmount(s.amount, s.currency)}</div>
          <div style="flex:1 1 140px">${escapeHtml(s.frequency || '')}</div>
          <div style="flex:1 1 160px">${s.nextDate ? escapeHtml(s.nextDate) : '-'}</div>
          <div style="flex:0 0 auto">
            <button class="btn-secondary" data-del="${s.id}">Удалить</button>
          </div>
        </div>`
      )
      .join('');
    listEl.innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = titleEl.value.trim();
      const amount = Number(amountEl.value);
      const currency = currencyEl.value;
      const frequency = freqEl.value;
      const next_date = dateEl.value || null;

      if (!title) return alert('Введите название подписки');
      if (!isFinite(amount) || amount < 0) return alert('Введите корректную сумму');
      if (!next_date) return alert('Укажите дату следующего списания');

      try {
        await postData('/api/subscriptions', { title, amount, currency, frequency, next_date });
        form.reset();
        await loadSubscriptions();
      } catch (err) {
        alert(err.message || 'Не удалось сохранить подписку');
      }
    });
  }

  listEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const id = btn.getAttribute('data-del');
    if (!id) return;
    if (!confirm('Удалить подписку?')) return;
    try {
      await deleteData(`/api/subscriptions/${id}`);
      await loadSubscriptions();
    } catch (err) {
      alert(err.message || 'Не удалось удалить подписку');
    }
  });

  document.addEventListener('DOMContentLoaded', loadSubscriptions);
})();
