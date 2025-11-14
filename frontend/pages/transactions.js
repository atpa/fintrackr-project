import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

/**
 * Дополнительные функции и логика для страницы операций.
 */

/**
 * Рисует одну строку таблицы операций и добавляет её в DOM.
 * @param {Object} tx  Объект операции
 * @param {Array} accounts Список счетов
 * @param {Array} categories Список категорий
 * @param {HTMLElement} tbody Элемент tbody таблицы
 * @param {boolean} prepend Если true, добавляем строку в начало
 */
function appendTransactionRow(tx, accounts, categories, tbody, prepend = false) {
  const tr = document.createElement('tr');
  const dateTd = document.createElement('td');
  dateTd.textContent = tx.date;
  const accountTd = document.createElement('td');
  const acc = accounts.find(a => a.id === tx.account_id);
  accountTd.textContent = acc ? acc.name : '—';
  const categoryTd = document.createElement('td');
  const cat = categories.find(c => c.id === tx.category_id);
  categoryTd.textContent = cat ? cat.name : '—';
  const typeTd = document.createElement('td');
  typeTd.textContent = tx.type === 'income' ? 'Доход' : 'Расход';
  typeTd.className = tx.type === 'income' ? 'status-income' : 'status-expense';
  const amountTd = document.createElement('td');
  amountTd.textContent = Number(tx.amount).toFixed(2) + ' ' + tx.currency;
  amountTd.className = tx.type === 'income' ? 'status-income' : 'status-expense';
  const noteTd = document.createElement('td');
  noteTd.textContent = tx.note || '';
  const actionsTd = document.createElement('td');
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-secondary tx-del';
  delBtn.setAttribute('data-id', tx.id);
  delBtn.textContent = 'Удалить';
  actionsTd.appendChild(delBtn);

  tr.append(dateTd, accountTd, categoryTd, typeTd, amountTd, noteTd, actionsTd);
  if (prepend && tbody.firstChild) {
    tbody.prepend(tr);
  } else {
    tbody.appendChild(tr);
  }
}

/**
 * Инициализация страницы списка операций: загрузка данных, отрисовка таблицы и настройка формы.
 */
async function initTransactionsPage() {
  const tbody = document.querySelector('#transactionsTable tbody');
  if (!tbody) return;
  const [transactions, accounts, categories, rules] = await Promise.all([
    fetchData('/api/transactions'),
    fetchData('/api/accounts'),
    fetchData('/api/categories'),
    fetchData('/api/rules')
  ]);
  // Сохраняем правила в глобальную переменную для автокатегоризации
  window.autoRules = Array.isArray(rules) ? rules : [];
  // Сохраняем полный список операций для фильтрации
  window.allTransactions = Array.isArray(transactions) ? transactions.slice() : [];
  // Заполняем выпадающие списки формы
  const accountSelect = document.getElementById('txAccount');
  const categorySelect = document.getElementById('txCategory');
  if (accountSelect) {
    accountSelect.innerHTML = '';
    accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = acc.name;
      accountSelect.appendChild(opt);
    });
  }
  if (categorySelect) {
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });
  }
  // Функция для отрисовки таблицы на основе массива операций
  function renderTable(list) {
    tbody.innerHTML = '';
    if (!list.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'Нет операций';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    // Сортируем по дате (сначала новые)
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    list.forEach(tx => appendTransactionRow(tx, accounts, categories, tbody));
  }
  // Первичная отрисовка
  renderTable(window.allTransactions);
  // Обработчик отправки формы добавления операции
  const form = document.getElementById('addTransactionForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const dateInput = document.getElementById('txDate');
      const amountInput = document.getElementById('txAmount');
      const newTx = {
        account_id: Number(accountSelect.value),
        category_id: Number(categorySelect.value),
        type: document.getElementById('txType').value,
        amount: parseFloat(document.getElementById('txAmount').value),
        currency: document.getElementById('txCurrency').value,
        date: document.getElementById('txDate').value,
        note: document.getElementById('txNote').value
      };
      // Простая клиентская валидация с подсказками браузера
      if (!newTx.date) {
        dateInput.setCustomValidity('Укажите дату операции');
        dateInput.reportValidity();
        setTimeout(() => dateInput.setCustomValidity(''), 1500);
        return;
      }
      if (!isFinite(newTx.amount) || newTx.amount < 0) {
        amountInput.setCustomValidity('Введите корректную сумму (0 или больше)');
        amountInput.reportValidity();
        setTimeout(() => amountInput.setCustomValidity(''), 1500);
        return;
      }
      // Автоматическая категоризация: если заметка содержит ключевое слово из правил, назначаем категорию
      if (newTx.note) {
        const noteLower = newTx.note.toLowerCase();
        for (const rule of window.autoRules || []) {
          if (noteLower.includes(rule.keyword)) {
            newTx.category_id = Number(rule.category_id);
            break;
          }
        }
      }
      try {
        const resp = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTx)
        });
        if (!resp.ok) {
          const err = await resp.json();
          alert('Ошибка: ' + (err.error || 'не удалось добавить операцию'));
          return;
        }
        const created = await resp.json();
        // Добавляем в общий массив
        window.allTransactions.unshift(created);
        // Добавляем в таблицу в начало
        appendTransactionRow(created, accounts, categories, tbody, true);
        // Обновляем балансы счетов c учётом конвертации в валюту счёта
        accounts.forEach(acc => {
          if (acc.id === created.account_id) {
            const adj = typeof convertAmount === 'function' ? convertAmount(Number(created.amount), created.currency || 'USD', acc.currency || 'USD') : Number(created.amount);
            if (created.type === 'income') acc.balance += adj;
            else acc.balance -= adj;
          }
        });
        form.reset();
      } catch (err) {
        console.error(err);
        alert('Ошибка сети');
      }
    });
  }
  // Обработчик фильтрации
  const filterForm = document.getElementById('filterTxForm');
  if (filterForm) {
    filterForm.addEventListener('submit', e => {
      e.preventDefault();
      const start = document.getElementById('filterStart').value;
      const end = document.getElementById('filterEnd').value;
      const catId = document.getElementById('filterCategory').value;
      const type = document.getElementById('filterType').value;
      const filtered = window.allTransactions.filter(tx => {
        let ok = true;
        if (start) {
          ok = ok && new Date(tx.date) >= new Date(start);
        }
        if (end) {
          ok = ok && new Date(tx.date) <= new Date(end);
        }
        if (catId) {
          ok = ok && String(tx.category_id) === String(catId);
        }
        if (type) {
          ok = ok && tx.type === type;
        }
        return ok;
      });
      renderTable(filtered);
    });
    // Заполняем селект категорий в фильтре
    const filterCategorySelect = document.getElementById('filterCategory');
    if (filterCategorySelect) {
      // добавим категории, если их ещё нет
      if (filterCategorySelect.options.length <= 1) {
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.name;
          filterCategorySelect.appendChild(opt);
        });
      }
    }
  }

  // Делегирование кликов по кнопкам удаления
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('.tx-del');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!id) return;
    if (!confirm('Удалить операцию?')) return;
    try {
      const resp = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert('Ошибка: ' + (err.error || 'не удалось удалить операцию'));
        return;
      }
      // Удаляем из локального массива и перерисовываем
      window.allTransactions = (window.allTransactions || []).filter(tx => String(tx.id) !== String(id));
      renderTable(window.allTransactions);
    } catch (err) {
      console.error(err);
      alert('Ошибка сети');
    }
  });
}

// Запуск инициализации после загрузки страницы
if (document.readyState !== 'loading') {
  initTransactionsPage();
} else {
  document.addEventListener('DOMContentLoaded', initTransactionsPage);
}