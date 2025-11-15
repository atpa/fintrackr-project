const transactionsState = {
  all: [],
  filtered: [],
  accounts: [],
  categories: [],
};

const pagination = new Pagination({
  currentPage: 1,
  pageSize: 10,
  containerId: 'transactionsPagination',
  onPageChange: (page) => {
    pagination.currentPage = page;
    renderTransactionsCards();
  }
});

// Функция setFieldError заменена на утилиту validation.js

// Функции пагинации заменены на утилиту Pagination (см. строки 8-17)

function renderTransactions() {
  const listEl = document.getElementById('transactionsList');
  const tableBody = document.querySelector('#transactionsTable tbody');
  const items = pagination.paginate(transactionsState.filtered);

  // Card list rendering if container exists
  if (listEl) {
    listEl.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'tx-item';
      empty.innerHTML = '<div class="tx-main"><span class="tx-title">Пока нет операций</span><span class="tx-meta">Добавьте первую транзакцию</span></div>';
      listEl.appendChild(empty);
      pagination.render(transactionsState.filtered.length);
      return;
    }
    items.forEach((tx) => {
      const account = transactionsState.accounts.find((a) => a.id === tx.account_id);
      const category = transactionsState.categories.find((c) => c.id === tx.category_id);
      const amountStr = typeof formatCurrency === 'function'
        ? formatCurrency(Number(tx.amount), tx.currency)
        : `${Number(tx.amount).toFixed(2)} ${tx.currency}`;

      const item = document.createElement('div');
      item.className = 'tx-item';
      
      // XSS FIX: Use textContent for user-provided data
      const txMain = document.createElement('div');
      txMain.className = 'tx-main';
      const txTitle = document.createElement('span');
      txTitle.className = 'tx-title';
      txTitle.textContent = `${category ? category.name : '—'} — ${account ? account.name : '—'}`;
      const txMeta = document.createElement('span');
      txMeta.className = 'tx-meta';
      txMeta.textContent = tx.date + (tx.note ? ' • ' + tx.note : '');
      txMain.append(txTitle, txMeta);
      
      const txCategory = document.createElement('div');
      txCategory.className = 'tx-category';
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = tx.type === 'income' ? 'Доход' : 'Расход';
      txCategory.appendChild(chip);
      
      const txAmount = document.createElement('div');
      txAmount.className = `tx-amount ${tx.type === 'income' ? 'tx-amount--income' : 'tx-amount--expense'}`;
      txAmount.textContent = amountStr;
      
      item.append(txMain, txCategory, txAmount);
      
      // REFACTOR: Replace inline styles with CSS class
      const actions = document.createElement('div');
      actions.className = 'tx-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-secondary';
      editBtn.textContent = 'Редактировать';
      editBtn.dataset.action = 'edit';
      editBtn.dataset.id = tx.id;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger';
      delBtn.textContent = 'Удалить';
      delBtn.dataset.action = 'delete';
      delBtn.dataset.id = tx.id;
      actions.append(editBtn, delBtn);
      item.appendChild(actions);
      listEl.appendChild(item);
    });
    pagination.render(transactionsState.filtered.length);
    return;
  }

  // Fallback: legacy table rendering
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!items.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.innerHTML = '<div class="table-empty-state">Операций пока нет. Добавьте первую транзакцию, чтобы увидеть её здесь.</div>';
    row.appendChild(cell);
    tableBody.appendChild(row);
    pagination.render(transactionsState.filtered.length);
    return;
  }
  items.forEach((tx) => {
    const tr = document.createElement('tr');
    const dateTd = document.createElement('td');
    dateTd.textContent = tx.date;
    const accTd = document.createElement('td');
    const account = transactionsState.accounts.find((a) => a.id === tx.account_id);
    accTd.textContent = account ? account.name : '—';
    const catTd = document.createElement('td');
    const category = transactionsState.categories.find((c) => c.id === tx.category_id);
    catTd.textContent = category ? category.name : '—';
    const typeTd = document.createElement('td');
    typeTd.textContent = tx.type === 'income' ? 'Доход' : 'Расход';
    typeTd.className = tx.type === 'income' ? 'status-income' : 'status-expense';
    const amountTd = document.createElement('td');
    const amount = typeof formatCurrency === 'function' ? formatCurrency(Number(tx.amount), tx.currency) : `${Number(tx.amount).toFixed(2)} ${tx.currency}`;
    amountTd.textContent = amount;
    amountTd.className = tx.type === 'income' ? 'status-income' : 'status-expense';
    const noteTd = document.createElement('td');
    noteTd.textContent = tx.note || '';
    const actionsTd = document.createElement('td');
    actionsTd.style.display = 'flex';
    actionsTd.style.gap = '0.5rem';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-secondary';
    editBtn.textContent = 'Редактировать';
    editBtn.dataset.action = 'edit';
    editBtn.dataset.id = tx.id;
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = 'Удалить';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = tx.id;
    actionsTd.append(editBtn, deleteBtn);
    tr.append(dateTd, accTd, catTd, typeTd, amountTd, noteTd, actionsTd);
    tableBody.appendChild(tr);
  });
  pagination.render(transactionsState.filtered.length);
}

function applyFilters() {
  const start = document.getElementById('filterStart')?.value || '';
  const end = document.getElementById('filterEnd')?.value || '';
  const categoryId = document.getElementById('filterCategory')?.value || '';
  const type = document.getElementById('filterType')?.value || '';
  const search = document.getElementById('filterSearch')?.value.trim().toLowerCase() || '';

  transactionsState.filtered = transactionsState.all
    .slice()
    .filter((tx) => {
      let ok = true;
      if (start) {
        ok = ok && new Date(tx.date) >= new Date(start);
      }
      if (ok && end) {
        ok = ok && new Date(tx.date) <= new Date(end);
      }
      if (ok && categoryId) {
        ok = ok && String(tx.category_id) === String(categoryId);
      }
      if (ok && type) {
        ok = ok && tx.type === type;
      }
      if (ok && search) {
        const account = transactionsState.accounts.find((a) => a.id === tx.account_id);
        const category = transactionsState.categories.find((c) => c.id === tx.category_id);
        const haystack = [
          tx.note || '',
          account?.name || '',
          category?.name || '',
          String(tx.amount),
        ]
          .join(' ')
          .toLowerCase();
        ok = haystack.includes(search);
      }
      return ok;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  pagination.goToPage(1);
  window.allTransactions = transactionsState.all.slice();
  renderTransactions();
}

function populateSelect(select, items, getValue, getLabel) {
  if (!select) return;
  select.innerHTML = '';
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  });
}

function populateFilterCategories() {
  const filterSelect = document.getElementById('filterCategory');
  if (!filterSelect) return;
  const currentValue = filterSelect.value;
  filterSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Все';
  filterSelect.appendChild(defaultOption);
  transactionsState.categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    if (String(cat.id) === String(currentValue)) {
      option.selected = true;
    }
    filterSelect.appendChild(option);
  });
}

function attachPaginationControls() {
  const pageSizeSelect = document.getElementById('transactionsPageSize');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      pagination.setPageSize(Number(pageSizeSelect.value) || 10);
      renderTransactions();
    });
  }
}

function bindFilterForm() {
  const form = document.getElementById('filterTxForm');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilters();
    });
  }
  document.getElementById('filterSearch')?.addEventListener('input', () => {
    pagination.goToPage(1);
    applyFilters();
  });
  // Quick period buttons (Today / Week / Month)
  document.querySelectorAll('[data-quick-period]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-quick-period');
      const start = document.getElementById('filterStart');
      const end = document.getElementById('filterEnd');
      const today = new Date();
      let from = new Date(today);
      if (p === 'today') {
        from = new Date(today);
      } else if (p === 'week') {
        from.setDate(today.getDate() - 7);
      } else if (p === 'month') {
        from.setMonth(today.getMonth() - 1);
      }
      const toISO = (d) => d.toISOString().slice(0, 10);
      if (start) start.value = toISO(from);
      if (end) end.value = toISO(today);
      pagination.goToPage(1);
      applyFilters();
    });
  });
}

function getTransactionPayload(source) {
  return {
    account_id: Number(source.accountSelect.value),
    category_id: Number(source.categorySelect.value),
    type: source.typeSelect.value,
    amount: parseFloat(source.amountInput.value),
    currency: source.currencySelect.value,
    date: source.dateInput.value,
    note: source.noteInput.value.trim(),
  };
}

function validateTransactionInputs(payload, source) {
  let valid = true;
  if (!payload.date) {
    setFieldError(source.dateInput, 'Укажите дату операции');
    valid = false;
  }
  if (!payload.account_id) {
    setFieldError(source.accountSelect, 'Выберите счёт');
    valid = false;
  }
  if (!payload.category_id) {
    setFieldError(source.categorySelect, 'Выберите категорию');
    valid = false;
  }
  if (!payload.type) {
    setFieldError(source.typeSelect, 'Выберите тип операции');
    valid = false;
  }
  if (!isFinite(payload.amount) || payload.amount < 0) {
    setFieldError(source.amountInput, 'Введите корректную сумму (0 или больше)');
    valid = false;
  }
  if (!payload.currency) {
    setFieldError(source.currencySelect, 'Выберите валюту');
    valid = false;
  }
  const category = transactionsState.categories.find((c) => c.id === payload.category_id);
  if (category && category.kind !== payload.type) {
    setFieldError(source.categorySelect, 'Тип категории и операции должны совпадать');
    valid = false;
  }
  return valid;
}

function clearTransactionErrors(source) {
  setFieldError(source.dateInput, '');
  setFieldError(source.accountSelect, '');
  setFieldError(source.categorySelect, '');
  setFieldError(source.typeSelect, '');
  setFieldError(source.amountInput, '');
  setFieldError(source.currencySelect, '');
}

async function handleDeleteTransaction(id) {
  const tx = transactionsState.all.find((item) => String(item.id) === String(id));
  if (!tx) return;
  const confirmed = await UI.confirmModal({
    title: 'Удалить операцию',
    description: 'Вы уверены, что хотите удалить эту операцию? Это действие нельзя отменить.',
    confirmText: 'Удалить',
    variant: 'danger',
  });
  if (!confirmed) return;
  try {
    const resp = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      UI.showToast({ type: 'danger', message: err.error || 'Не удалось удалить операцию' });
      return;
    }
    transactionsState.all = transactionsState.all.filter((item) => String(item.id) !== String(id));
    UI.showToast({ type: 'success', message: 'Операция удалена' });
    applyFilters();
  } catch (error) {
    console.error(error);
    UI.showToast({ type: 'danger', message: 'Ошибка сети. Попробуйте позже.' });
  }
}

function openTransactionModal(tx) {
  const form = document.createElement('form');
  form.className = 'form-grid';

  const dateField = document.createElement('div');
  dateField.className = 'form-field';
  const dateLabel = document.createElement('label');
  dateLabel.textContent = 'Дата';
  dateLabel.setAttribute('for', 'modalTxDate');
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'modalTxDate';
  dateInput.value = tx.date;
  const dateError = document.createElement('span');
  dateError.className = 'form-error';
  dateField.append(dateLabel, dateInput, dateError);

  const accountField = document.createElement('div');
  accountField.className = 'form-field';
  const accountLabel = document.createElement('label');
  accountLabel.textContent = 'Счёт';
  accountLabel.setAttribute('for', 'modalTxAccount');
  const accountSelect = document.createElement('select');
  accountSelect.id = 'modalTxAccount';
  populateSelect(accountSelect, transactionsState.accounts, (acc) => acc.id, (acc) => acc.name);
  accountSelect.value = tx.account_id;
  const accountError = document.createElement('span');
  accountError.className = 'form-error';
  accountField.append(accountLabel, accountSelect, accountError);

  const categoryField = document.createElement('div');
  categoryField.className = 'form-field';
  const categoryLabel = document.createElement('label');
  categoryLabel.textContent = 'Категория';
  categoryLabel.setAttribute('for', 'modalTxCategory');
  const categorySelect = document.createElement('select');
  categorySelect.id = 'modalTxCategory';
  populateSelect(categorySelect, transactionsState.categories, (cat) => cat.id, (cat) => cat.name);
  categorySelect.value = tx.category_id;
  const categoryError = document.createElement('span');
  categoryError.className = 'form-error';
  categoryField.append(categoryLabel, categorySelect, categoryError);

  const typeField = document.createElement('div');
  typeField.className = 'form-field';
  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Тип';
  typeLabel.setAttribute('for', 'modalTxType');
  const typeSelect = document.createElement('select');
  typeSelect.id = 'modalTxType';
  typeSelect.innerHTML = '<option value="income">Доход</option><option value="expense">Расход</option>';
  typeSelect.value = tx.type;
  const typeError = document.createElement('span');
  typeError.className = 'form-error';
  typeField.append(typeLabel, typeSelect, typeError);

  const amountField = document.createElement('div');
  amountField.className = 'form-field';
  const amountLabel = document.createElement('label');
  amountLabel.textContent = 'Сумма';
  amountLabel.setAttribute('for', 'modalTxAmount');
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.step = '0.01';
  amountInput.min = '0';
  amountInput.id = 'modalTxAmount';
  amountInput.value = tx.amount;
  const amountError = document.createElement('span');
  amountError.className = 'form-error';
  amountField.append(amountLabel, amountInput, amountError);

  const currencyField = document.createElement('div');
  currencyField.className = 'form-field';
  const currencyLabel = document.createElement('label');
  currencyLabel.textContent = 'Валюта';
  currencyLabel.setAttribute('for', 'modalTxCurrency');
  const currencySelect = document.createElement('select');
  currencySelect.id = 'modalTxCurrency';
  ['USD', 'EUR', 'PLN', 'RUB'].forEach((code) => {
    const option = new Option(code, code, tx.currency === code, tx.currency === code);
    currencySelect.appendChild(option);
  });
  const currencyError = document.createElement('span');
  currencyError.className = 'form-error';
  currencyField.append(currencyLabel, currencySelect, currencyError);

  const noteField = document.createElement('div');
  noteField.className = 'form-field';
  noteField.style.flex = '1 1 240px';
  const noteLabel = document.createElement('label');
  noteLabel.textContent = 'Примечание';
  noteLabel.setAttribute('for', 'modalTxNote');
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.id = 'modalTxNote';
  noteInput.value = tx.note || '';
  noteField.append(noteLabel, noteInput);

  form.append(
    dateField,
    accountField,
    categoryField,
    typeField,
    amountField,
    currencyField,
    noteField,
  );

  const source = {
    dateInput,
    accountSelect,
    categorySelect,
    typeSelect,
    amountInput,
    currencySelect,
    noteInput,
  };

  Object.values(source).forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.addEventListener('input', () => setFieldError(el, ''));
      el.addEventListener('change', () => setFieldError(el, ''));
    }
  });

  form.addEventListener('submit', (event) => event.preventDefault());

  UI.openModal({
    title: 'Редактирование операции',
    content: form,
    actions: [
      {
        label: 'Отмена',
        variant: 'secondary',
        onClick: () => UI.closeModal(),
      },
      {
        label: 'Сохранить',
        variant: 'primary',
        type: 'submit',
        onClick: async (event) => {
          event.preventDefault();
          clearTransactionErrors(source);
          const payload = getTransactionPayload(source);
          if (!validateTransactionInputs(payload, source)) {
            return;
          }
          try {
            const resp = await fetch(`/api/transactions/${tx.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!resp.ok) {
              const err = await resp.json().catch(() => ({}));
              UI.showToast({
                type: 'danger',
                message: err.error || 'Не удалось обновить операцию',
              });
              return;
            }
            const updated = await resp.json();
            const index = transactionsState.all.findIndex((item) => item.id === updated.id);
            if (index > -1) {
              transactionsState.all[index] = updated;
            }
            UI.showToast({ type: 'success', message: 'Операция обновлена' });
            UI.closeModal();
            applyFilters();
          } catch (error) {
            console.error(error);
            UI.showToast({ type: 'danger', message: 'Ошибка сети. Попробуйте позже.' });
          }
        },
      },
    ],
  });
}

function bindTableActions() {
  const tbody = document.querySelector('#transactionsTable tbody');
  if (tbody) {
    tbody.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button?.dataset.action) return;
      const id = button.dataset.id;
      if (!id) return;
      if (button.dataset.action === 'delete') {
        handleDeleteTransaction(id);
      } else if (button.dataset.action === 'edit') {
        const tx = transactionsState.all.find((item) => String(item.id) === String(id));
        if (tx) openTransactionModal(tx);
      }
    });
  }
  const listEl = document.getElementById('transactionsList');
  if (listEl) {
    listEl.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button?.dataset.action) return;
      const id = button.dataset.id;
      if (!id) return;
      if (button.dataset.action === 'delete') {
        handleDeleteTransaction(id);
      } else if (button.dataset.action === 'edit') {
        const tx = transactionsState.all.find((item) => String(item.id) === String(id));
        if (tx) openTransactionModal(tx);
      }
    });
  }
}

function bindAddForm() {
  const form = document.getElementById('addTransactionForm');
  if (!form) return;
  const dateInput = document.getElementById('txDate');
  const accountSelect = document.getElementById('txAccount');
  const categorySelect = document.getElementById('txCategory');
  const typeSelect = document.getElementById('txType');
  const amountInput = document.getElementById('txAmount');
  const currencySelect = document.getElementById('txCurrency');
  const noteInput = document.getElementById('txNote');

  const source = {
    dateInput,
    accountSelect,
    categorySelect,
    typeSelect,
    amountInput,
    currencySelect,
    noteInput,
  };

  Object.values(source).forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.addEventListener('input', () => setFieldError(el, ''));
      el.addEventListener('change', () => setFieldError(el, ''));
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearTransactionErrors(source);
    let payload = getTransactionPayload(source);

    if (!validateTransactionInputs(payload, source)) {
      return;
    }

    if (payload.note) {
      const noteLower = payload.note.toLowerCase();
      for (const rule of window.autoRules || []) {
        if (noteLower.includes(rule.keyword)) {
          payload = { ...payload, category_id: Number(rule.category_id) };
          if (categorySelect) {
            categorySelect.value = payload.category_id;
          }
          break;
        }
      }
    }

    try {
      const resp = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        UI.showToast({ type: 'danger', message: err.error || 'Не удалось добавить операцию' });
        return;
      }
      const created = await resp.json();
      transactionsState.all.unshift(created);
      UI.showToast({ type: 'success', message: 'Операция добавлена' });
      form.reset();
      applyFilters();
    } catch (error) {
      console.error(error);
      UI.showToast({ type: 'danger', message: 'Ошибка сети. Попробуйте позже.' });
    }
  });
}

async function initTransactionsPage() {
  const hasList = document.getElementById('transactionsList');
  const hasTable = document.querySelector('#transactionsTable tbody');
  if (!hasList && !hasTable) return;
  const [transactions, accounts, categories, rules] = await Promise.all([
    fetchData('/api/transactions'),
    fetchData('/api/accounts'),
    fetchData('/api/categories'),
    fetchData('/api/rules'),
  ]);
  transactionsState.all = Array.isArray(transactions) ? transactions : [];
  transactionsState.accounts = Array.isArray(accounts) ? accounts : [];
  transactionsState.categories = Array.isArray(categories) ? categories : [];
  transactionsState.filtered = transactionsState.all.slice();
  window.autoRules = Array.isArray(rules) ? rules : [];
  window.allTransactions = transactionsState.all.slice();

  populateSelect(
    document.getElementById('txAccount'),
    transactionsState.accounts,
    (acc) => acc.id,
    (acc) => acc.name,
  );
  populateSelect(
    document.getElementById('txCategory'),
    transactionsState.categories,
    (cat) => cat.id,
    (cat) => cat.name,
  );
  populateFilterCategories();
  attachPaginationControls();
  bindFilterForm();
  bindTableActions();
  bindAddForm();
  applyFilters();
}

if (document.readyState !== 'loading') {
  initTransactionsPage();
} else {
  document.addEventListener('DOMContentLoaded', initTransactionsPage);
}
