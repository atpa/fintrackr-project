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
    // XSS FIX: Use textContent for user-provided data (title, frequency, nextDate)
    listEl.innerHTML = '';
    items.forEach(s => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.cssText = 'align-items:center; gap:.5rem; padding:.5rem 0; border-bottom:1px solid var(--border)';
      
      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = 'flex:2 1 220px';
      const titleStrong = document.createElement('strong');
      titleStrong.textContent = s.title;
      titleDiv.appendChild(titleStrong);
      
      const amountDiv = document.createElement('div');
      amountDiv.style.cssText = 'flex:1 1 140px';
      amountDiv.textContent = fmtAmount(s.amount, s.currency);
      
      const freqDiv = document.createElement('div');
      freqDiv.style.cssText = 'flex:1 1 140px';
      freqDiv.textContent = s.frequency || '';
      
      const dateDiv = document.createElement('div');
      dateDiv.style.cssText = 'flex:1 1 160px';
      dateDiv.textContent = (s.nextDate || s.next_date) ? (s.nextDate || s.next_date) : '—';
      
      const btnDiv = document.createElement('div');
      btnDiv.style.cssText = 'flex:0 0 auto';
      const btn = document.createElement('button');
      btn.className = 'btn-secondary';
      btn.dataset.del = s.id;
      btn.textContent = 'Удалить';
      btnDiv.appendChild(btn);
      
      row.append(titleDiv, amountDiv, freqDiv, dateDiv, btnDiv);
      listEl.appendChild(row);
    });
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
