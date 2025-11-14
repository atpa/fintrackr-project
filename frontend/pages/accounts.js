import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

/**
 * Функции для страницы счётов: загрузка, отображение и добавление новых.
 */

/**
 * Отрисовывает таблицу счетов.
 */
function renderAccounts(accounts, tableBody) {
  tableBody.innerHTML = '';
  accounts.forEach(acc => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = acc.name;
    const currencyTd = document.createElement('td');
    currencyTd.textContent = acc.currency;
    const balanceTd = document.createElement('td');
    balanceTd.textContent = Number(acc.balance).toFixed(2);
    balanceTd.className = acc.balance < 0 ? 'status-expense' : 'status-income';
    tr.append(nameTd, currencyTd, balanceTd);
    tableBody.appendChild(tr);
  });
}

async function initAccountsPage() {
  const tableBody = document.querySelector('#accountsTable tbody');
  if (!tableBody) return;
  let accounts = await fetchData('/api/accounts');
  renderAccounts(accounts, tableBody);
  const form = document.getElementById('addAccountForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const newAccount = {
        name: document.getElementById('accName').value,
        currency: document.getElementById('accCurrency').value,
        balance: parseFloat(document.getElementById('accBalance').value) || 0
      };
      try {
        const resp = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAccount)
        });
        if (!resp.ok) {
          const err = await resp.json();
          alert('Ошибка: ' + (err.error || 'не удалось добавить счёт'));
          return;
        }
        const created = await resp.json();
        accounts.push(created);
        renderAccounts(accounts, tableBody);
        form.reset();
      } catch (err) {
        console.error(err);
        alert('Ошибка сети');
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initAccountsPage();
} else {
  document.addEventListener('DOMContentLoaded', initAccountsPage);
}