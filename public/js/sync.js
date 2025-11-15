/**
 * Логика для страницы синхронизации с банками.
 * Позволяет подключать банковские аккаунты к выбранным счётам,
 * выводить список подключённых аккаунтов и синхронизировать транзакции для каждой связи.
 */

async function loadBanks() {
  try {
    const resp = await fetch('/api/banks');
    if (!resp.ok) return [];
    return await resp.json();
  } catch (err) {
    console.error('Ошибка загрузки банков', err);
    return [];
  }
}

async function loadAccounts() {
  try {
    const resp = await fetch('/api/accounts');
    if (!resp.ok) return [];
    return await resp.json();
  } catch (err) {
    console.error('Ошибка загрузки счетов', err);
    return [];
  }
}

async function loadConnections() {
  try {
    const resp = await fetch('/api/sync/connections');
    if (!resp.ok) return [];
    return await resp.json();
  } catch (err) {
    console.error('Ошибка загрузки подключений', err);
    return [];
  }
}

/**
 * Отрисовывает список подключённых банковских аккаунтов.
 * @param {Array} connections
 */
function renderConnections(connections) {
  const listEl = document.getElementById('connectionsList');
  const resultEl = document.getElementById('syncResult');
  if (!listEl) return;
  if (!connections || connections.length === 0) {
    listEl.innerHTML = '<p>Нет подключённых банковских аккаунтов.</p>';
    return;
  }
  // XSS FIX: Use textContent for user-provided data
  listEl.innerHTML = '';
  connections.forEach(conn => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:1rem; background:#fff; padding:0.75rem 1rem; border-radius:8px; box-shadow:0 2px 6px var(--card-shadow); margin-bottom:0.5rem;';
    
    const info = document.createElement('div');
    const bankName = document.createElement('strong');
    bankName.textContent = conn.bank_name;
    const accountId = document.createElement('small');
    accountId.textContent = `Счёт ID ${conn.account_id}`;
    info.appendChild(bankName);
    info.appendChild(document.createElement('br'));
    info.appendChild(accountId);
    
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.dataset.syncId = conn.id;
    btn.textContent = 'Синхронизировать';
    
    wrapper.appendChild(info);
    wrapper.appendChild(btn);
    listEl.appendChild(wrapper);
  });
  // навешиваем обработчики на кнопки синхронизации
  listEl.querySelectorAll('button[data-sync-id]').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = Number(e.currentTarget.getAttribute('data-sync-id'));
      if (!id) return;
      if (resultEl) resultEl.textContent = 'Синхронизация...';
      try {
        const resp = await fetch('/api/sync/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connection_id: id })
        });
        const data = await resp.json();
        if (!resp.ok) {
          resultEl.textContent = data.error || data.message || 'Ошибка синхронизации';
          return;
        }
        // Выводим результат
        let html = `<p><strong>Синхронизировано транзакций:</strong> ${data.synced}</p>`;
        if (data.transactions && data.transactions.length) {
          html += '<p>Добавленные транзакции:</p><ul>';
          data.transactions.forEach(tx => {
            html += `<li>${tx.date}: ${tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(
              2
            )} ${tx.currency} (Категория ID ${tx.category_id || '—'})</li>`;
          });
          html += '</ul>';
          html += '<p>Проверьте раздел “Операции” для просмотра новых трат.</p>';
        }
        resultEl.innerHTML = html;
      } catch (err) {
        console.error(err);
        resultEl.textContent = 'Ошибка сети';
      }
    });
  });
}

async function initSyncPage() {
  // Проверка авторизации: эта страница доступна только после входа
  try {
    const stored = localStorage.getItem('user');
    if (!stored) {
      window.location.href = 'login.html';
      return;
    }
  } catch (e) {
    // продолжаем
  }
  const bankSelect = document.getElementById('bankSelect');
  const accountSelect = document.getElementById('accountSelect');
  const connectForm = document.getElementById('connectForm');
  const resultEl = document.getElementById('syncResult');
  // Загружаем список банков и счетов
  const [banks, accounts, connections] = await Promise.all([
    loadBanks(),
    loadAccounts(),
    loadConnections()
  ]);
  // Заполняем select банков
  if (bankSelect) {
    bankSelect.innerHTML = banks
      .map(b => `<option value="${b.id}">${b.name}</option>`)
      .join('');
  }
  // Заполняем select счетов
  if (accountSelect) {
    accountSelect.innerHTML = accounts
      .map(a => `<option value="${a.id}">${a.name} (${a.currency})</option>`)
      .join('');
  }
  // Показываем уже подключённые связи
  renderConnections(connections);
  // Обработчик на добавление нового соединения
  if (connectForm) {
    connectForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (resultEl) resultEl.textContent = '';
      const bankId = Number(bankSelect.value);
      const accId = Number(accountSelect.value);
      const login = document.getElementById('bankLogin').value;
      const password = document.getElementById('bankPassword').value;
      try {
        const resp = await fetch('/api/sync/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bank_id: bankId, account_id: accId, login, password })
        });
        const data = await resp.json();
        if (!resp.ok) {
          resultEl.textContent = data.error || 'Не удалось подключить банк';
          return;
        }
        // Очистить форму
        connectForm.reset();
        // Обновить список подключений
        const updated = await loadConnections();
        renderConnections(updated);
        resultEl.textContent = `Банк ${data.bank_name} подключён к счёту ID ${data.account_id}.`;
      } catch (err) {
        console.error(err);
        resultEl.textContent = 'Ошибка сети';
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initSyncPage();
} else {
  document.addEventListener('DOMContentLoaded', initSyncPage);
}