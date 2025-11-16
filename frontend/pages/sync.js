import fetchData, { postData, deleteData } from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

async function loadBanks() {
  try {
    return await fetchData('/api/banks');
  } catch (err) {
    console.error('Не удалось загрузить банки', err);
    return [];
  }
}

async function loadAccounts() {
  try {
    return await fetchData('/api/accounts');
  } catch (err) {
    console.error('Не удалось загрузить счета', err);
    return [];
  }
}

async function loadConnections() {
  try {
    return await fetchData('/api/sync/connections');
  } catch (err) {
    console.error('Не удалось загрузить подключения', err);
    return [];
  }
}

function renderConnections(connections) {
  const listEl = document.getElementById('connectionsList');
  const resultEl = document.getElementById('syncResult');
  if (!listEl) return;
  if (!connections || connections.length === 0) {
    listEl.innerHTML = '<p>Нет подключённых банков.</p>';
    return;
  }
  const html = connections
    .map(
      (conn) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; background:#fff; padding:0.75rem 1rem; border-radius:8px; box-shadow:0 2px 6px var(--card-shadow); margin-bottom:0.5rem;">
          <div>
            <strong>${conn.bank_name}</strong><br />
            <small>Счёт ID ${conn.account_id || '-'}</small>
          </div>
          <div>
            <button class="btn-secondary" data-sync-id="${conn.id}">Синхронизировать</button>
            <button class="btn-link" data-remove-id="${conn.id}">Удалить</button>
          </div>
        </div>`
    )
    .join('');
  listEl.innerHTML = html;

  listEl.querySelectorAll('button[data-sync-id]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      const id = Number(event.currentTarget.getAttribute('data-sync-id'));
      if (!id) return;
      if (resultEl) resultEl.textContent = 'Синхронизация...';
      try {
        const data = await postData('/api/sync/transactions', { connection_id: id });
        let html = `<p><strong>Синхронизировано операций:</strong> ${data.synced}</p>`;
        if (Array.isArray(data.transactions) && data.transactions.length) {
          html += '<p>Полученные операции:</p><ul>';
          data.transactions.forEach((tx) => {
            html += `<li>${tx.date}: ${tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)} ${tx.currency} (${tx.description})</li>`;
          });
          html += '</ul>';
        }
        resultEl.innerHTML = html;
      } catch (error) {
        console.error(error);
        resultEl.textContent = error.message || 'Ошибка синхронизации';
      }
    });
  });

  listEl.querySelectorAll('button[data-remove-id]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      const id = Number(event.currentTarget.getAttribute('data-remove-id'));
      if (!id) return;
      if (!confirm('Удалить подключение?')) return;
      try {
        await deleteData(`/api/sync/connections/${id}`);
        const updated = await loadConnections();
        renderConnections(updated);
      } catch (error) {
        alert(error.message || 'Не удалось удалить подключение');
      }
    });
  });
}

async function initSyncPage() {
  const bankSelect = document.getElementById('bankSelect');
  const accountSelect = document.getElementById('accountSelect');
  const connectForm = document.getElementById('connectForm');
  const resultEl = document.getElementById('syncResult');

  const [banks, accounts, connections] = await Promise.all([
    loadBanks(),
    loadAccounts(),
    loadConnections(),
  ]);

  if (bankSelect) {
    bankSelect.innerHTML = banks.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
  }

  if (accountSelect) {
    accountSelect.innerHTML = accounts
      .map((a) => `<option value="${a.id}">${a.name} (${a.currency})</option>`)
      .join('');
  }

  renderConnections(connections);

  if (connectForm) {
    connectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (resultEl) resultEl.textContent = '';
      const bankId = Number(bankSelect.value);
      const accId = Number(accountSelect.value);
      const login = document.getElementById('bankLogin').value;
      const password = document.getElementById('bankPassword').value;
      try {
        const data = await postData('/api/sync/connect', {
          bank_id: bankId,
          account_id: accId,
          login,
          password,
        });
        connectForm.reset();
        resultEl.textContent = `Банк ${data.bank_name} подключён к счёту ID ${data.account_id}.`;
        const updated = await loadConnections();
        renderConnections(updated);
      } catch (err) {
        resultEl.textContent = err.message || 'Не удалось подключить банк';
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initSyncPage();
} else {
  document.addEventListener('DOMContentLoaded', initSyncPage);
}
