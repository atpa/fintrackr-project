import fetchData, { postData } from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';
import Auth from '../modules/auth.js';

initNavigation();
initProfileShell();

function renderAccounts(accounts, tableBody) {
  tableBody.innerHTML = '';
  accounts.forEach((account) => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = account.name;
    const currencyTd = document.createElement('td');
    currencyTd.textContent = account.currency;
    const balanceTd = document.createElement('td');
    balanceTd.textContent = Number(account.balance).toFixed(2);
    balanceTd.className = account.balance < 0 ? 'status-expense' : 'status-income';
    tr.append(nameTd, currencyTd, balanceTd);
    tableBody.appendChild(tr);
  });
}

async function initAccountsPage() {
  const tableBody = document.querySelector('#accountsTable tbody');
  if (!tableBody) return;

  await Auth.requireAuth().catch(() => null);

  let accounts = await fetchData('/api/accounts');
  renderAccounts(accounts, tableBody);

  const form = document.getElementById('addAccountForm');
  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const newAccount = {
      name: document.getElementById('accName')?.value?.trim(),
      currency: document.getElementById('accCurrency')?.value,
      balance: parseFloat(document.getElementById('accBalance')?.value) || 0,
    };

    if (!newAccount.name || !newAccount.currency) {
      alert('Please provide an account name and currency.');
      return;
    }

    try {
      const created = await postData('/api/accounts', newAccount);
      accounts.push(created);
      renderAccounts(accounts, tableBody);
      form.reset();
    } catch (error) {
      alert(error.message || 'Unable to create account.');
    }
  });
}

if (document.readyState !== 'loading') {
  initAccountsPage();
} else {
  document.addEventListener('DOMContentLoaded', initAccountsPage);
}
