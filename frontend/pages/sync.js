import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';
import { API } from '../src/modules/api.js';
import { toastSuccess, toastError } from '../src/components/Toast.js';

initNavigation();
initProfileShell();

/**
 * Логика для страницы синхронизации с банками.
 * Позволяет подключать банковские аккаунты к выбранным счётам,
 * выводить список подключённых аккаунтов и синхронизировать транзакции для каждой связи.
 */

async function loadBanks() {
  try {
    return await API.sync.getBanks();
  } catch (error) {
    console.error('Ошибка загрузки банков', error);
    toastError(`Не удалось загрузить банки: ${error.message}`);
    return [];
  }
}

async function loadAccounts() {
  try {
    return await API.accounts.getAll();
  } catch (error) {
    console.error('Ошибка загрузки счетов', error);
    toastError(`Не удалось загрузить счета: ${error.message}`);
    return [];
  }
}

async function loadConnections() {
  try {
    return await API.sync.getConnections();
  } catch (error) {
    console.error('Ошибка загрузки подключений', error);
    toastError(`Не удалось загрузить подключения: ${error.message}`);
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
  const html = connections
    .map(
      conn => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; background:#fff; padding:0.75rem 1rem; border-radius:8px; box-shadow:0 2px 6px var(--card-shadow); margin-bottom:0.5rem;">
          <div>
            <strong>${conn.bank_name}</strong><br />
            <small>Счёт ID ${conn.account_id}</small>
          </div>
          <button class="btn-secondary" data-sync-id="${conn.id}">Синхронизировать</button>
        </div>
      `
    )
    .join('');
  listEl.innerHTML = html;
  // навешиваем обработчики на кнопки синхронизации
  listEl.querySelectorAll('button[data-sync-id]').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = Number(e.currentTarget.getAttribute('data-sync-id'));
      if (!id) return;
      if (resultEl) resultEl.textContent = 'Синхронизация...';
      try {
        const data = await API.sync.syncTransactions(id);
        toastSuccess(`Синхронизировано транзакций: ${data.synced}`);
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
      } catch (error) {
        console.error(error);
        resultEl.textContent = 'Ошибка синхронизации';
        toastError(`Не удалось синхронизировать: ${error.message}`);
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
        const data = await API.sync.connect({
          bank_id: bankId,
          account_id: accId,
          login,
          password
        });
        toastSuccess(`Банк ${data.bank_name} подключён к счёту`);
        // Очистить форму
        connectForm.reset();
        // Обновить список подключений
        const updated = await loadConnections();
        renderConnections(updated);
        resultEl.textContent = `Банк ${data.bank_name} подключён к счёту ID ${data.account_id}.`;
      } catch (error) {
        console.error(error);
        resultEl.textContent = 'Ошибка подключения';
        toastError(`Не удалось подключить банк: ${error.message}`);
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initSyncPage();
} else {
  document.addEventListener('DOMContentLoaded', initSyncPage);
}