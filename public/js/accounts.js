const accountState = {
  all: [],
  filtered: [],
};

// Инициализация пагинации с помощью утилиты
const pagination = new Pagination({
  currentPage: 1,
  pageSize: 10,
  containerId: 'accountsPagination',
  onPageChange: (page) => {
    pagination.currentPage = page;
    renderAccounts();
  }
});

// Функция setFieldError заменена на утилиту validation.js

// Функции пагинации заменены на утилиту Pagination (см. строки 6-13)

function renderAccounts() {
  const list = document.getElementById('accountsList');
  const items = pagination.paginate(accountState.filtered);

  if (!list) return;
  list.innerHTML = '';
  
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<div class="empty-icon">💼</div><p class="empty-text">Пока нет кошельков</p><p class="empty-hint">Добавьте первый счёт выше</p>';
    list.appendChild(empty);
    pagination.render(accountState.filtered.length);
    return;
  }
  
  items.forEach((acc) => {
    const card = document.createElement('div');
    card.className = 'wallet-card';
    const balance = Number(acc.balance) || 0;
    const balanceClass = balance < 0 ? 'negative' : '';
    
    // XSS FIX: Use textContent for user-provided data (acc.name)
    const header = document.createElement('div');
    header.className = 'wallet-header';
    const icon = document.createElement('div');
    icon.className = 'wallet-icon';
    icon.textContent = '💳';
    const name = document.createElement('div');
    name.className = 'wallet-name';
    name.textContent = acc.name || 'Без названия';
    header.append(icon, name);
    
    const balanceDiv = document.createElement('div');
    balanceDiv.className = `wallet-balance ${balanceClass}`;
    balanceDiv.textContent = `${balance.toFixed(2)} `;
    const currencySpan = document.createElement('span');
    currencySpan.className = 'currency';
    currencySpan.textContent = acc.currency || 'USD';
    balanceDiv.appendChild(currencySpan);
    
    const meta = document.createElement('div');
    meta.className = 'wallet-meta';
    meta.textContent = `ID: ${acc.id || '—'}`;
    
    card.append(header, balanceDiv, meta);
    list.appendChild(card);
  });

  pagination.render(accountState.filtered.length);
}function applyFilters() {
  const search = document.getElementById('accountSearch')?.value.trim().toLowerCase() || '';
  const currency = document.getElementById('accountCurrencyFilter')?.value || '';
  accountState.filtered = accountState.all.filter((acc) => {
    const matchesSearch = !search || acc.name.toLowerCase().includes(search);
    const matchesCurrency = !currency || acc.currency === currency;
    return matchesSearch && matchesCurrency;
  });
  pagination.goToPage(1);
  renderAccounts();
}

function bindFilters() {
  const searchInput = document.getElementById('accountSearch');
  const currencySelect = document.getElementById('accountCurrencyFilter');
  const pageSizeSelect = document.getElementById('accountsPageSize');
  searchInput?.addEventListener('input', () => {
    pagination.goToPage(1);
    applyFilters();
  });
  currencySelect?.addEventListener('change', () => {
    pagination.goToPage(1);
    applyFilters();
  });
  pageSizeSelect?.addEventListener('change', () => {
    pagination.setPageSize(Number(pageSizeSelect.value) || 10);
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
