const accountState = {
  all: [],
  filtered: [],
  currentPage: 1,
  pageSize: 10,
};

function setFieldError(input, message) {
  if (!input) return;
  const field = input.closest('.form-field');
  const errorEl = field ? field.querySelector('.form-error') : null;
  if (errorEl) errorEl.textContent = message || '';
  if (message) {
    input.classList.add('has-error');
  } else {
    input.classList.remove('has-error');
  }
}

function paginate(list) {
  const start = (accountState.currentPage - 1) * accountState.pageSize;
  return list.slice(start, start + accountState.pageSize);
}

function renderPagination(total) {
  const container = document.getElementById('accountsPagination');
  if (!container) return;
  container.innerHTML = '';
  const pages = Math.max(1, Math.ceil(total / accountState.pageSize));
  for (let i = 1; i <= pages; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i;
    if (i === accountState.currentPage) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      accountState.currentPage = i;
      renderAccounts();
    });
    container.appendChild(btn);
  }
}

function renderAccounts() {
  const tbody = document.querySelector('#accountsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const items = paginate(accountState.filtered);
  if (!items.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.innerHTML =
      '<div class="table-empty-state">Пока что счёта не добавлены. Создайте первый счёт, чтобы отслеживать баланс.</div>';
    row.appendChild(cell);
    tbody.appendChild(row);
    renderPagination(accountState.filtered.length);
    return;
  }

  items.forEach((acc) => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = acc.name;
    const currencyTd = document.createElement('td');
    currencyTd.textContent = acc.currency;
    const balanceTd = document.createElement('td');
    const balanceValue = Number(acc.balance) || 0;
    balanceTd.textContent = balanceValue.toFixed(2);
    balanceTd.className = balanceValue < 0 ? 'status-expense' : 'status-income';
    tr.append(nameTd, currencyTd, balanceTd);
    tbody.appendChild(tr);
  });

  renderPagination(accountState.filtered.length);
}

function applyFilters() {
  const search = document.getElementById('accountSearch')?.value.trim().toLowerCase() || '';
  const currency = document.getElementById('accountCurrencyFilter')?.value || '';
  accountState.filtered = accountState.all.filter((acc) => {
    const matchesSearch = !search || acc.name.toLowerCase().includes(search);
    const matchesCurrency = !currency || acc.currency === currency;
    return matchesSearch && matchesCurrency;
  });
  accountState.currentPage = 1;
  renderAccounts();
}

function bindFilters() {
  const searchInput = document.getElementById('accountSearch');
  const currencySelect = document.getElementById('accountCurrencyFilter');
  const pageSizeSelect = document.getElementById('accountsPageSize');
  searchInput?.addEventListener('input', () => {
    accountState.currentPage = 1;
    applyFilters();
  });
  currencySelect?.addEventListener('change', () => {
    accountState.currentPage = 1;
    applyFilters();
  });
  pageSizeSelect?.addEventListener('change', () => {
    accountState.pageSize = Number(pageSizeSelect.value) || 10;
    accountState.currentPage = 1;
    renderAccounts();
  });
}

function bindForm() {
  const form = document.getElementById('addAccountForm');
  if (!form) return;
  const nameInput = document.getElementById('accName');
  const currencySelect = document.getElementById('accCurrency');
  const balanceInput = document.getElementById('accBalance');

  nameInput?.addEventListener('input', () => setFieldError(nameInput, ''));
  currencySelect?.addEventListener('change', () => setFieldError(currencySelect, ''));
  balanceInput?.addEventListener('input', () => setFieldError(balanceInput, ''));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput?.value.trim();
    const currency = currencySelect?.value;
    const balanceRaw = balanceInput?.value;
    const balance = balanceRaw ? Number(balanceRaw) : 0;
    let valid = true;
    if (!name) {
      setFieldError(nameInput, 'Введите название счёта');
      valid = false;
    }
    if (!currency) {
      setFieldError(currencySelect, 'Выберите валюту');
      valid = false;
    }
    if (balanceRaw && !isFinite(balance)) {
      setFieldError(balanceInput, 'Введите корректное число');
      valid = false;
    }
    if (!valid) return;

    try {
      const resp = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, currency, balance }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        UI.showToast({ type: 'danger', message: err.error || 'Не удалось добавить счёт' });
        return;
      }
      const created = await resp.json();
      accountState.all.push(created);
      UI.showToast({ type: 'success', message: 'Счёт добавлен' });
      form.reset();
      applyFilters();
    } catch (error) {
      console.error(error);
      UI.showToast({ type: 'danger', message: 'Ошибка сети. Попробуйте позже.' });
    }
  });
}

async function initAccountsPage() {
  const tableBody = document.querySelector('#accountsTable tbody');
  if (!tableBody) return;
  const accounts = await fetchData('/api/accounts');
  accountState.all = Array.isArray(accounts) ? accounts : [];
  accountState.filtered = accountState.all.slice();
  bindFilters();
  bindForm();
  applyFilters();
}

if (document.readyState !== 'loading') {
  initAccountsPage();
} else {
  document.addEventListener('DOMContentLoaded', initAccountsPage);
}
