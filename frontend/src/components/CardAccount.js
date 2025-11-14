/**
 * CardAccount Component — карточка счёта
 * @module components/CardAccount
 * @description Универсальный компонент для отображения банковского счёта
 */

import { formatCurrency } from '../modules/helpers.js';

/**
 * Создание карточки счёта
 * @param {Object} account - объект счёта
 * @param {Object} options - опции рендеринга
 * @returns {HTMLElement} DOM-элемент карточки
 */
export function createCardAccount(account, options = {}) {
  const {
    onEdit = null,
    onDelete = null,
    showActions = true
  } = options;

  const card = document.createElement('div');
  card.className = 'wallet-card';
  card.setAttribute('data-account-id', account.id);

  // Header с иконкой и названием
  const header = document.createElement('div');
  header.className = 'wallet-header';

  const icon = document.createElement('div');
  icon.className = 'wallet-icon';
  icon.textContent = account.icon || '💼';

  const nameWrapper = document.createElement('div');
  nameWrapper.className = 'wallet-info';

  const name = document.createElement('div');
  name.className = 'wallet-name';
  name.textContent = account.name;

  const type = document.createElement('div');
  type.className = 'wallet-type';
  type.textContent = account.type || 'Основной';

  nameWrapper.append(name, type);
  header.append(icon, nameWrapper);

  // Balance
  const balance = document.createElement('div');
  balance.className = 'wallet-balance';
  balance.innerHTML = `
    ${formatCurrency(account.balance, account.currency)}
    <span class="currency">${account.currency}</span>
  `;

  // Actions (если нужны)
  if (showActions) {
    const actions = document.createElement('div');
    actions.className = 'wallet-actions';

    if (onEdit) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.title = 'Редактировать';
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onEdit(account);
      });
      actions.appendChild(editBtn);
    }

    if (onDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon';
      deleteBtn.title = 'Удалить';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onDelete(account);
      });
      actions.appendChild(deleteBtn);
    }

    card.appendChild(actions);
  }

  card.append(header, balance);

  // Hover эффект (опционально)
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-2px)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
  });

  return card;
}

/**
 * Рендеринг списка карточек счетов
 * @param {Array} accounts - массив счетов
 * @param {string} containerId - ID контейнера
 * @param {Object} options - опции рендеринга
 */
export function renderAccountCards(accounts, containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found`);
    return;
  }

  container.innerHTML = '';

  if (!accounts || accounts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <p class="empty-icon">💼</p>
      <p class="empty-title">Нет счетов</p>
      <p class="empty-text">Добавьте первый счёт для отслеживания финансов</p>
    `;
    container.appendChild(empty);
    return;
  }

  accounts.forEach(account => {
    const card = createCardAccount(account, options);
    container.appendChild(card);
  });
}

export default { createCardAccount, renderAccountCards };
