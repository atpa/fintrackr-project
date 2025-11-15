import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

(function () {
  // Simple subscriptions page controller
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
    listEl.innerHTML = '<p>Загрузка…</p>';
    try {
      const res = await fetch('/api/subscriptions');
      if (!res.ok) throw new Error('Failed to load');
      const items = await res.json();
      renderList(items);
    } catch (e) {
      listEl.innerHTML = `<p class="text-danger">Ошибка загрузки: ${e.message}</p>`;
    }
  }

  function renderList(items) {
    if (!Array.isArray(items) || items.length === 0) {
      listEl.innerHTML = '<p>Подписок пока нет.</p>';
      return;
    }
    const html = items
      .map(
        (s) => `
        <div class="row" style="align-items:center; gap:.5rem; padding:.5rem 0; border-bottom:1px solid var(--border)">
          <div style="flex:2 1 220px"><strong>${escapeHtml(s.title)}</strong></div>
          <div style="flex:1 1 140px">${fmtAmount(s.amount, s.currency)}</div>
          <div style="flex:1 1 140px">${escapeHtml(s.frequency || '')}</div>
          <div style="flex:1 1 160px">${(s.nextDate || s.next_date) ? escapeHtml(s.nextDate || s.next_date) : '—'}</div>
          <div style="flex:0 0 auto">
            <button class="btn-secondary" data-del="${s.id}">Удалить</button>
          </div>
        </div>`
      )
      .join('');
    listEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
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

      try {
        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, amount, currency, frequency, next_date }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Не удалось добавить подписку');
        }
        // Reset and refresh
        form.reset();
        await loadSubscriptions();
      } catch (err) {
        alert(err.message);
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
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить');
      await loadSubscriptions();
    } catch (err) {
      alert(err.message);
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', loadSubscriptions);
})();
