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
  if (pages <= 1) return;
  for (let i = 1; i <= pages; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-ghost btn-sm';
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
  const list = document.getElementById('accountsList');
  const items = paginate(accountState.filtered);

  if (!list) return;
  list.innerHTML = '';
  
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<div class="empty-icon">💼</div><p class="empty-text">Пока нет кошельков</p><p class="empty-hint">Добавьте первый счёт выше</p>';
    list.appendChild(empty);
    renderPagination(accountState.filtered.length);
    return;
  }
  
  items.forEach((acc) => {
    const card = document.createElement('div');
    card.className = 'wallet-card';
    const balance = Number(acc.balance) || 0;
    const balanceClass = balance < 0 ? 'negative' : '';
    card.innerHTML = `
      <div class="wallet-header">
        <div class="wallet-icon">💳</div>
        <div class="wallet-name">${acc.name || 'Без названия'}</div>
      </div>
      <div class="wallet-balance ${balanceClass}">${balance.toFixed(2)} <span class="currency">${acc.currency || 'USD'}</span></div>
      <div class="wallet-meta">ID: ${acc.id || '—'}</div>
    `;
    list.appendChild(card);
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
  const list = document.getElementById('accountsList');
  if (!list) return;
  
  try {
    const accounts = await fetchData('/api/accounts');
    accountState.all = Array.isArray(accounts) ? accounts : [];
    accountState.filtered = accountState.all.slice();
    bindFilters();
    bindForm();
    applyFilters();
  } catch (error) {
    console.error('Не удалось загрузить счета:', error);
    if (list) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p class="empty-text">Ошибка загрузки данных</p></div>';
    }
  }
}

if (document.readyState !== 'loading') {
  initAccountsPage();
} else {
  document.addEventListener('DOMContentLoaded', initAccountsPage);
}
