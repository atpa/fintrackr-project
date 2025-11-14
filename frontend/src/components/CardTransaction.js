/**
 * CardTransaction Component — карточка транзакции
 * @module components/CardTransaction
 * @description Универсальный компонент для отображения транзакции
 */

import { formatCurrency, formatDate } from '../modules/helpers.js';

/**
 * Создание карточки транзакции
 * @param {Object} transaction - объект транзакции
 * @param {Object} context - контекст (categories, accounts)
 * @param {Object} options - опции рендеринга
 * @returns {HTMLElement} DOM-элемент карточки
 */
export function createCardTransaction(transaction, context = {}, options = {}) {
  const {
    categories = [],
    accounts = [],
    onEdit = null,
    onDelete = null,
    showActions = true
  } = { ...context, ...options };

  const item = document.createElement('div');
  item.className = 'tx-item';
  item.setAttribute('data-transaction-id', transaction.id);

  // Main info
  const main = document.createElement('div');
  main.className = 'tx-main';

  const title = document.createElement('span');
  title.className = 'tx-title';
  title.textContent = transaction.description || 'Без описания';

  const account = accounts.find(a => a.id === transaction.account_id);
  const category = categories.find(c => c.id === transaction.category_id);

  const meta = document.createElement('span');
  meta.className = 'tx-meta';
  const metaParts = [
    formatDate(transaction.date, 'short'),
    category ? `${category.icon || ''} ${category.name}`.trim() : null,
    account ? account.name : null
  ].filter(Boolean);
  meta.textContent = metaParts.join(' • ');

  main.append(title, meta);

  // Category chip
  const categoryCol = document.createElement('div');
  categoryCol.className = 'tx-category';
  
  if (category) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `${category.icon || ''} ${category.name}`.trim();
    categoryCol.appendChild(chip);
  }

  // Amount
  const amountCol = document.createElement('div');
  amountCol.className = `tx-amount ${transaction.type}`;
  const sign = transaction.type === 'income' ? '+' : '-';
  amountCol.textContent = `${sign}${formatCurrency(Math.abs(transaction.amount), transaction.currency)}`;

  // Actions
  const actionsCol = document.createElement('div');
  actionsCol.className = 'tx-actions';

  if (showActions) {
    if (onEdit) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.title = 'Редактировать';
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onEdit(transaction);
      });
      actionsCol.appendChild(editBtn);
    }

    if (onDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon';
      deleteBtn.title = 'Удалить';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onDelete(transaction);
      });
      actionsCol.appendChild(deleteBtn);
    }
  }

  item.append(main, categoryCol, amountCol, actionsCol);

  return item;
}

/**
 * Рендеринг списка транзакций
 * @param {Array} transactions - массив транзакций
 * @param {string} containerId - ID контейнера
 * @param {Object} context - контекст (categories, accounts)
 * @param {Object} options - опции рендеринга
 */
export function renderTransactionCards(transactions, containerId, context = {}, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found`);
    return;
  }

  container.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tx-item empty-state';
    empty.innerHTML = `
      <div class="tx-main">
        <span class="tx-title">Пока нет транзакций</span>
        <span class="tx-meta">Добавьте первую операцию</span>
      </div>
    `;
    container.appendChild(empty);
    return;
  }

  transactions.forEach(tx => {
    const card = createCardTransaction(tx, context, options);
    container.appendChild(card);
  });
}

/**
 * Создание компактной карточки для виджета (dashboard)
 * @param {Object} transaction - объект транзакции
 * @param {Object} context - контекст (categories)
 * @returns {HTMLElement} компактная карточка
 */
export function createCompactTransactionCard(transaction, context = {}) {
  const { categories = [] } = context;
  
  const item = document.createElement('div');
  item.className = 'tx-compact';

  const category = categories.find(c => c.id === transaction.category_id);
  const icon = document.createElement('span');
  icon.className = 'tx-compact-icon';
  icon.textContent = category?.icon || '💰';

  const info = document.createElement('div');
  info.className = 'tx-compact-info';

  const desc = document.createElement('div');
  desc.className = 'tx-compact-desc';
  desc.textContent = transaction.description || 'Транзакция';

  const date = document.createElement('div');
  date.className = 'tx-compact-date';
  date.textContent = formatDate(transaction.date, 'short');

  info.append(desc, date);

  const amount = document.createElement('div');
  amount.className = `tx-compact-amount ${transaction.type}`;
  const sign = transaction.type === 'income' ? '+' : '-';
  amount.textContent = `${sign}${formatCurrency(Math.abs(transaction.amount), transaction.currency)}`;

  item.append(icon, info, amount);

  return item;
}

export default { 
  createCardTransaction, 
  renderTransactionCards,
  createCompactTransactionCard 
};
