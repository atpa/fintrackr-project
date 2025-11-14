import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

/**
 * Функции для управления бюджетами: отображение и установка лимитов.
 */

function renderBudgets(budgets, categories, tbody, transactions) {
  tbody.innerHTML = '';
  budgets.forEach(budget => {
    const tr = document.createElement('tr');
    const cat = categories.find(c => c.id === budget.category_id);
    const categoryTd = document.createElement('td');
    categoryTd.textContent = cat ? cat.name : '—';
    const monthTd = document.createElement('td');
    monthTd.textContent = budget.month;
    const limitTd = document.createElement('td');
    const spentTd = document.createElement('td');
    const progressTd = document.createElement('td');
    let displayLimit;
    let dynamicLimit = Number(budget.limit) || 0;
    const bCur = budget.currency || 'USD';
    // Если бюджет процентный, вычисляем фактический лимит исходя из суммы доходов (конвертируем в валюту бюджета)
    if (budget.type === 'percent' && budget.percent != null) {
      let incomes = 0;
      if (Array.isArray(transactions)) {
        transactions.forEach(tx => {
          if (tx.type === 'income') {
            const dt = new Date(tx.date);
            const month = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
            if (month === budget.month) {
              const add = typeof convertAmount === 'function' ? convertAmount(Number(tx.amount), tx.currency || 'USD', bCur) : Number(tx.amount);
              incomes += add;
            }
          }
        });
      }
      dynamicLimit = incomes * (Number(budget.percent) / 100);
      const limText = typeof formatCurrency === 'function' ? formatCurrency(dynamicLimit, bCur) : `${dynamicLimit.toFixed(2)} ${bCur}`;
      displayLimit = `${Number(budget.percent).toFixed(1)}% (${limText})`;
    } else {
      displayLimit = typeof formatCurrency === 'function' ? formatCurrency(budget.limit, bCur) : `${Number(budget.limit).toFixed(2)} ${bCur}`;
    }
    limitTd.textContent = displayLimit;
    const spentText = typeof formatCurrency === 'function' ? formatCurrency(budget.spent, bCur) : `${Number(budget.spent).toFixed(2)} ${bCur}`;
    spentTd.textContent = spentText;
    const percentage = dynamicLimit > 0 ? Math.min(100, (Number(budget.spent) / dynamicLimit) * 100) : 0;
    const barContainer = document.createElement('div');
    barContainer.style.backgroundColor = '#e2e8f0';
    barContainer.style.borderRadius = '4px';
    barContainer.style.height = '12px';
    barContainer.style.width = '100%';
    const bar = document.createElement('div');
    bar.style.height = '100%';
    bar.style.borderRadius = '4px';
    bar.style.width = percentage + '%';
    bar.style.backgroundColor = percentage > 100 ? 'var(--danger)' : 'var(--primary)';
    barContainer.appendChild(bar);
    progressTd.appendChild(barContainer);
    tr.append(categoryTd, monthTd, limitTd, spentTd, progressTd);
    tbody.appendChild(tr);
  });
}

async function initBudgetsPage() {
  const tbody = document.querySelector('#budgetsTable tbody');
  if (!tbody) return;
  const [budgets, categories, transactions] = await Promise.all([
    fetchData('/api/budgets'),
    fetchData('/api/categories'),
    fetchData('/api/transactions')
  ]);
  renderBudgets(budgets, categories, tbody, transactions);
  // Populate category dropdown for budget form
  const catSelect = document.getElementById('budgetCategory');
  if (catSelect) {
    catSelect.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      catSelect.appendChild(opt);
    });
  }
  // Handle budget limit form
  const form = document.getElementById('addBudgetForm');
  if (form) {
    // Переключение отображения полей лимита и процента в зависимости от типа
    const typeSelect = document.getElementById('budgetType');
    const limitContainer = document.getElementById('limitContainer');
    const percentContainer = document.getElementById('percentContainer');
    if (typeSelect && limitContainer && percentContainer) {
      const toggleFields = () => {
        if (typeSelect.value === 'percent') {
          percentContainer.style.display = '';
          limitContainer.style.display = 'none';
        } else {
          percentContainer.style.display = 'none';
          limitContainer.style.display = '';
        }
      };
      typeSelect.addEventListener('change', toggleFields);
      toggleFields();
    }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const catSel = document.getElementById('budgetCategory');
      const monthInput = document.getElementById('budgetMonth');
      const typeSel = document.getElementById('budgetType');
      const limitInput = document.getElementById('budgetLimit');
      const percentInput = document.getElementById('budgetPercent');

      const payload = {
        category_id: Number(catSel.value),
        month: monthInput.value,
        limit: parseFloat(limitInput.value),
        type: typeSel?.value || 'fixed',
        percent: percentInput?.value ? parseFloat(percentInput.value) : null,
        currency: document.getElementById('budgetCurrency')?.value || 'USD'
      };

      // Клиентская валидация
      if (!payload.month) {
        monthInput.setCustomValidity('Выберите месяц');
        monthInput.reportValidity();
        setTimeout(() => monthInput.setCustomValidity(''), 1500);
        return;
      }
      if (!payload.category_id) {
        catSel.setCustomValidity('Выберите категорию');
        catSel.reportValidity();
        setTimeout(() => catSel.setCustomValidity(''), 1500);
        return;
      }
      if (payload.type === 'percent') {
        const p = Number(payload.percent);
        if (!isFinite(p) || p < 0 || p > 100) {
          percentInput.setCustomValidity('Процент должен быть числом от 0 до 100');
          percentInput.reportValidity();
          setTimeout(() => percentInput.setCustomValidity(''), 1500);
          return;
        }
        // для процентного лимита поле limit можно игнорировать/очищать
        payload.limit = 0;
      } else {
        const l = Number(payload.limit);
        if (!isFinite(l) || l < 0) {
          limitInput.setCustomValidity('Лимит должен быть числом 0 или больше');
          limitInput.reportValidity();
          setTimeout(() => limitInput.setCustomValidity(''), 1500);
          return;
        }
        payload.percent = null;
      }
      try {
        const resp = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const err = await resp.json();
          alert('Ошибка: ' + (err.error || 'не удалось сохранить бюджет'));
          return;
        }
        const updated = await resp.json();
        // Если бюджет существует, обновляем, иначе добавляем
        const idx = budgets.findIndex(b => b.id === updated.id);
        if (idx !== -1) {
          budgets[idx] = updated;
        } else {
          budgets.push(updated);
        }
        renderBudgets(budgets, categories, tbody);
        form.reset();
      } catch (err) {
        console.error(err);
        alert('Ошибка сети');
      }
    });
  }
}

if (document.readyState !== 'loading') {
  initBudgetsPage();
} else {
  document.addEventListener('DOMContentLoaded', initBudgetsPage);
}