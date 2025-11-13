/**
 * Функции для управления бюджетами: отображение и установка лимитов.
 */

function renderBudgets(budgets, categories, tbody) {
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
    let dynamicLimit = budget.limit;
    // Если бюджет процентный, вычисляем фактический лимит исходя из суммы доходов
    if (budget.type === 'percent' && budget.percent != null) {
      const incomes = window.incomesByMonth ? window.incomesByMonth[budget.month] || 0 : 0;
      dynamicLimit = incomes * (Number(budget.percent) / 100);
      displayLimit = `${Number(budget.percent).toFixed(1)}% (${dynamicLimit.toFixed(2)})`;
    } else {
      displayLimit = Number(budget.limit).toFixed(2);
    }
    limitTd.textContent = displayLimit;
    spentTd.textContent = Number(budget.spent).toFixed(2);
    const percentage = dynamicLimit > 0 ? Math.min(100, (budget.spent / dynamicLimit) * 100) : 0;
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
  // Считаем суммарные доходы по месяцам для расчёта процентных бюджетов
  const incomesByMonth = {};
  if (Array.isArray(transactions)) {
    transactions.forEach(tx => {
      if (tx.type === 'income') {
        const dt = new Date(tx.date);
        const month = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
        incomesByMonth[month] = (incomesByMonth[month] || 0) + Number(tx.amount);
      }
    });
  }
  // Делаем объект доходов глобальным, чтобы renderBudgets мог использовать
  window.incomesByMonth = incomesByMonth;
  renderBudgets(budgets, categories, tbody);
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
      const payload = {
        category_id: Number(document.getElementById('budgetCategory').value),
        month: document.getElementById('budgetMonth').value,
        limit: parseFloat(document.getElementById('budgetLimit').value),
        type: document.getElementById('budgetType')?.value || 'fixed',
        percent: document.getElementById('budgetPercent')?.value ? parseFloat(document.getElementById('budgetPercent').value) : null
      };
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