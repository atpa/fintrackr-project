import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';
import { API } from '../src/modules/api.js';
import { toastSuccess, toastError } from '../src/components/Toast.js';

initNavigation();
initProfileShell();

/**
 * Отрисовывает таблицу плановых операций.
 * @param {Array} plans
 * @param {Array} accounts
 * @param {Array} categories
 * @param {HTMLElement} tbody
 */
function renderPlannedTable(plans, accounts, categories, tbody) {
  tbody.innerHTML = '';
  if (!plans.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.textContent = 'Нет запланированных операций';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  plans.forEach(plan => {
    const tr = document.createElement('tr');
    const startTd = document.createElement('td');
    startTd.textContent = plan.start_date;
    const freqTd = document.createElement('td');
    // Приводим значения частоты к более понятному виду
    const freqMap = { daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно', yearly: 'Ежегодно' };
    freqTd.textContent = freqMap[plan.frequency] || plan.frequency;
    const accTd = document.createElement('td');
    const acc = accounts.find(a => a.id === plan.account_id);
    accTd.textContent = acc ? acc.name : '—';
    const catTd = document.createElement('td');
    const cat = categories.find(c => c.id === plan.category_id);
    catTd.textContent = cat ? cat.name : '—';
    const typeTd = document.createElement('td');
    typeTd.textContent = plan.type === 'income' ? 'Доход' : 'Расход';
    typeTd.className = plan.type === 'income' ? 'status-income' : 'status-expense';
    const amtTd = document.createElement('td');
    amtTd.textContent = Number(plan.amount).toFixed(2) + ' ' + plan.currency;
    amtTd.className = plan.type === 'income' ? 'status-income' : 'status-expense';
    const noteTd = document.createElement('td');
    noteTd.textContent = plan.note || '';
    tr.append(startTd, freqTd, accTd, catTd, typeTd, amtTd, noteTd);
    tbody.appendChild(tr);
  });
}

async function initPlannedPage() {
  const tbody = document.querySelector('#plannedTable tbody');
  if (!tbody) return;

  try {
    let [plans, accounts, categories] = await Promise.all([
      API.planned.getAll(),
      API.accounts.getAll(),
      API.categories.getAll()
    ]);
    renderPlannedTable(plans, accounts, categories, tbody);
  // Заполняем селекты
  const accSelect = document.getElementById('plannedAccount');
  const catSelect = document.getElementById('plannedCategory');
  if (accSelect) {
    accSelect.innerHTML = '';
    accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = acc.name;
      accSelect.appendChild(opt);
    });
  }
  if (catSelect) {
    catSelect.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      catSelect.appendChild(opt);
    });
  }
  // Устанавливаем дату начала по умолчанию сегодня
  const startDateInput = document.getElementById('plannedStart');
  if (startDateInput) {
    const today = new Date().toISOString().slice(0, 10);
    startDateInput.value = today;
  }
  // Обработчик формы
  const form = document.getElementById('addPlannedForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        account_id: Number(accSelect.value),
        category_id: Number(catSelect.value),
        type: document.getElementById('plannedType').value,
        amount: parseFloat(document.getElementById('plannedAmount').value),
        currency: document.getElementById('plannedCurrency').value,
        start_date: document.getElementById('plannedStart').value,
        frequency: document.getElementById('plannedFrequency').value,
        note: document.getElementById('plannedNote').value
      };
      try {
        const created = await API.planned.create(payload);
        plans.push(created);
        toastSuccess('Плановая операция добавлена!');
        renderPlannedTable(plans, accounts, categories, tbody);
        form.reset();
        // вернуть дату начала к сегодняшнему дню
        if (startDateInput) startDateInput.value = new Date().toISOString().slice(0, 10);
      } catch (error) {
        console.error(error);
        toastError(`Не удалось добавить плановую операцию: ${error.message}`);
      }
    });
  }
  } catch (error) {
    console.error(error);
    toastError(`Не удалось загрузить данные: ${error.message}`);
  }
}

if (document.readyState !== 'loading') {
  initPlannedPage();
} else {
  document.addEventListener('DOMContentLoaded', initPlannedPage);
}