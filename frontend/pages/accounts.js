/**
 * Страница "Счёта" — использует новую архитектуру v2.0
 * Компоненты: Layout, CardAccount, FormBase, ModalBase, Toast, SkeletonLoader
 */

import { initLayout } from '../src/layout/Layout.js';
import { globalStore } from '../src/modules/store.js';
import { renderAccountCards } from '../src/components/CardAccount.js';
import { createForm } from '../src/components/FormBase.js';
import { openModal, confirmModal } from '../src/components/ModalBase.js';
import { toastSuccess, toastError, toastWarning } from '../src/components/Toast.js';
import { createAccountCardSkeleton, showSkeleton, hideSkeleton } from '../src/components/SkeletonLoader.js';

let accountsData = [];

/**
 * Загружает счета с API
 */
async function loadAccounts() {
  const container = document.getElementById('accountsGrid');
  if (!container) return;

  // Показываем skeleton во время загрузки
  showSkeleton(container, createAccountCardSkeleton(3));

  try {
    const response = await fetch('/api/accounts');
    if (!response.ok) throw new Error('Failed to load accounts');
    
    accountsData = await response.json();
    globalStore.accounts = accountsData;
    
    // Скрываем skeleton и показываем реальные данные
    hideSkeleton(container, renderAccountCards(accountsData, {
      onEdit: handleEditAccount,
      onDelete: handleDeleteAccount
    }));

  } catch (error) {
    console.error('Error loading accounts:', error);
    hideSkeleton(container, '<p class="error-message">Ошибка загрузки счетов</p>');
    toastError('Не удалось загрузить счета');
  }
}

/**
 * Создаёт форму добавления счёта в модальном окне
 */
function showAddAccountModal() {
  const formContainer = document.createElement('div');
  
  const form = createForm({
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Название счёта',
        placeholder: 'Например: Основная карта',
        validation: {
          required: true,
          minLength: 2,
          maxLength: 50
        }
      },
      {
        name: 'currency',
        type: 'select',
        label: 'Валюта',
        options: [
          { value: 'USD', label: 'USD — Доллар США' },
          { value: 'EUR', label: 'EUR — Евро' },
          { value: 'PLN', label: 'PLN — Польский злотый' },
          { value: 'RUB', label: 'RUB — Российский рубль' }
        ],
        validation: { required: true }
      },
      {
        name: 'balance',
        type: 'number',
        label: 'Начальный баланс',
        placeholder: '0.00',
        value: '0',
        validation: {
          numeric: true,
          min: -1000000,
          max: 1000000000
        }
      }
    ],
    submitLabel: 'Создать счёт',
    onSubmit: async (data, formElement) => {
      try {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            currency: data.currency,
            balance: parseFloat(data.balance) || 0
          })
        });

        if (!response.ok) {
          const error = await response.json();
          toastError(error.error || 'Не удалось создать счёт');
          return;
        }

        const newAccount = await response.json();
        accountsData.push(newAccount);
        globalStore.accounts = accountsData;
        
        // Обновляем отображение
        const container = document.getElementById('accountsGrid');
        if (container) {
          container.innerHTML = '';
          container.appendChild(renderAccountCards(accountsData, {
            onEdit: handleEditAccount,
            onDelete: handleDeleteAccount
          }));
        }

        toastSuccess('Счёт успешно создан!');
        modal.close();
        
      } catch (error) {
        console.error('Error creating account:', error);
        toastError('Ошибка сети при создании счёта');
      }
    }
  });

  formContainer.appendChild(form);

  const modal = openModal({
    title: 'Добавить счёт',
    content: formContainer,
    size: 'md',
    actions: [
      {
        label: 'Отмена',
        variant: 'secondary',
        onClick: (close) => close()
      }
    ]
  });
}

/**
 * Редактирование счёта
 */
async function handleEditAccount(accountId) {
  const account = accountsData.find(a => a.id === accountId);
  if (!account) {
    toastError('Счёт не найден');
    return;
  }

  const formContainer = document.createElement('div');
  
  const form = createForm({
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Название счёта',
        value: account.name,
        validation: {
          required: true,
          minLength: 2,
          maxLength: 50
        }
      },
      {
        name: 'currency',
        type: 'select',
        label: 'Валюта',
        value: account.currency,
        options: [
          { value: 'USD', label: 'USD — Доллар США' },
          { value: 'EUR', label: 'EUR — Евро' },
          { value: 'PLN', label: 'PLN — Польский злотый' },
          { value: 'RUB', label: 'RUB — Российский рубль' }
        ],
        validation: { required: true }
      },
      {
        name: 'balance',
        type: 'number',
        label: 'Текущий баланс',
        value: account.balance.toString(),
        validation: {
          numeric: true,
          min: -1000000,
          max: 1000000000
        }
      }
    ],
    submitLabel: 'Сохранить изменения',
    onSubmit: async (data) => {
      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            currency: data.currency,
            balance: parseFloat(data.balance)
          })
        });

        if (!response.ok) {
          const error = await response.json();
          toastError(error.error || 'Не удалось обновить счёт');
          return;
        }

        const updatedAccount = await response.json();
        const index = accountsData.findIndex(a => a.id === accountId);
        if (index !== -1) {
          accountsData[index] = updatedAccount;
          globalStore.accounts = accountsData;
        }
        
        // Обновляем отображение
        const container = document.getElementById('accountsGrid');
        if (container) {
          container.innerHTML = '';
          container.appendChild(renderAccountCards(accountsData, {
            onEdit: handleEditAccount,
            onDelete: handleDeleteAccount
          }));
        }

        toastSuccess('Счёт успешно обновлён!');
        modal.close();
        
      } catch (error) {
        console.error('Error updating account:', error);
        toastError('Ошибка сети при обновлении счёта');
      }
    }
  });

  formContainer.appendChild(form);

  const modal = openModal({
    title: 'Редактировать счёт',
    content: formContainer,
    size: 'md',
    actions: [
      {
        label: 'Отмена',
        variant: 'secondary',
        onClick: (close) => close()
      }
    ]
  });
}

/**
 * Удаление счёта
 */
async function handleDeleteAccount(accountId) {
  const account = accountsData.find(a => a.id === accountId);
  if (!account) {
    toastError('Счёт не найден');
    return;
  }

  const confirmed = await confirmModal({
    title: 'Удалить счёт?',
    message: `Вы уверены, что хотите удалить счёт "${account.name}"? Все связанные транзакции будут без счёта.`,
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    danger: true
  });

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/accounts/${accountId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      toastError(error.error || 'Не удалось удалить счёт');
      return;
    }

    accountsData = accountsData.filter(a => a.id !== accountId);
    globalStore.accounts = accountsData;
    
    // Обновляем отображение
    const container = document.getElementById('accountsGrid');
    if (container) {
      container.innerHTML = '';
      container.appendChild(renderAccountCards(accountsData, {
        onEdit: handleEditAccount,
        onDelete: handleDeleteAccount
      }));
    }

    toastSuccess('Счёт успешно удалён');
    
  } catch (error) {
    console.error('Error deleting account:', error);
    toastError('Ошибка сети при удалении счёта');
  }
}

/**
 * Инициализация страницы
 */
async function initAccountsPage() {
  // Инициализируем Layout
  const layout = await initLayout({
    contentId: 'accounts-content',
    showHeader: true,
    showSidebar: true,
    onReady: async () => {
      // Загружаем счета после инициализации Layout
      await loadAccounts();

      // Обработчик кнопки "Добавить счёт"
      const addButton = document.getElementById('addAccountBtn');
      if (addButton) {
        addButton.addEventListener('click', showAddAccountModal);
      }

      // Поиск и фильтрация (базовая реализация)
      const searchInput = document.getElementById('accountSearch');
      const currencyFilter = document.getElementById('accountCurrencyFilter');
      
      const applyFilters = () => {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const selectedCurrency = currencyFilter?.value || '';
        
        const filtered = accountsData.filter(acc => {
          const matchesSearch = acc.name.toLowerCase().includes(searchTerm);
          const matchesCurrency = !selectedCurrency || acc.currency === selectedCurrency;
          return matchesSearch && matchesCurrency;
        });

        const container = document.getElementById('accountsGrid');
        if (container) {
          container.innerHTML = '';
          container.appendChild(renderAccountCards(filtered, {
            onEdit: handleEditAccount,
            onDelete: handleDeleteAccount
          }));
        }
      };

      searchInput?.addEventListener('input', applyFilters);
      currencyFilter?.addEventListener('change', applyFilters);
    }
  });
}

// Запуск при загрузке страницы
if (document.readyState !== 'loading') {
  initAccountsPage();
} else {
  document.addEventListener('DOMContentLoaded', initAccountsPage);
}