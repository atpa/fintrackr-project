/**
 * Логика для страницы отчётов: генерация диаграммы и текстового анализа.
 */
function groupTransactionsByCategory(transactions, categories) {
  const map = new Map();
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      const cat = categories.find(c => c.id === tx.category_id);
      const key = cat ? cat.name : 'Неизвестно';
      const prev = map.get(key) || 0;
      // Конвертируем сумму операции в валюту отчёта
      const reportCurrency = (typeof getReportCurrency === 'function') ? getReportCurrency() : 'USD';
      const converted = (typeof convertAmount === 'function') ? convertAmount(Number(tx.amount), tx.currency || 'USD', reportCurrency) : Number(tx.amount);
      map.set(key, prev + converted);
    }
  });
  return map;
}

async function generateReport() {
  const period = document.getElementById('reportPeriod').value;
  const monthInput = document.getElementById('reportMonth');
  const yearInput = document.getElementById('reportYear');
  // Загружаем данные
  const [transactions, categories] = await Promise.all([
    fetchData('/api/transactions'),
    fetchData('/api/categories')
  ]);
  // Фильтруем операции по выбранному периоду
  const filtered = transactions.filter(tx => {
    const dt = new Date(tx.date);
    if (period === 'month') {
      const selectedMonth = monthInput.value; // YYYY-MM
      if (!selectedMonth) return false;
      const [year, month] = selectedMonth.split('-').map(Number);
      return dt.getFullYear() === year && (dt.getMonth() + 1) === month;
    } else {
      const selectedYear = parseInt(yearInput.value, 10);
      if (!selectedYear) return false;
      return dt.getFullYear() === selectedYear;
    }
  });
  // Группируем расходы по категориям
  const grouped = groupTransactionsByCategory(filtered, categories);
  const labels = Array.from(grouped.keys());
  const values = Array.from(grouped.values());
  // Сортируем по величине и оставляем топ 8, объединяя остальные в категорию "Другие"
  const combinedLabels = [];
  const combinedValues = [];
  const entries = labels.map((label, idx) => ({ label, value: values[idx] }));
  entries.sort((a, b) => b.value - a.value);
  let otherSum = 0;
  entries.forEach((entry, idx) => {
    if (idx < 8) {
      combinedLabels.push(entry.label);
      combinedValues.push(entry.value);
    } else {
      otherSum += entry.value;
    }
  });
  if (otherSum > 0) {
    combinedLabels.push('Другие');
    combinedValues.push(otherSum);
  }
  // Обновляем график
  const canvas = document.getElementById('reportChart');
  if (canvas) {
    drawBarChart(canvas, combinedLabels, combinedValues);
  }
  // Также отображаем круговую диаграмму по тем же данным, если есть элемент
  const pieCanvas = document.getElementById('reportPie');
  if (pieCanvas) {
    drawPieChart(pieCanvas, combinedLabels, combinedValues);
  }
  // Формируем текстовый отчёт
  const summaryEl = document.getElementById('reportSummary');
  if (summaryEl) {
    // Общие суммы
    // Итоговые суммы: конвертируем каждую операцию в выбранную валюту
    let totalIncome = 0;
    let totalExpense = 0;
    filtered.forEach(tx => {
      const reportCurrency = (typeof getReportCurrency === 'function') ? getReportCurrency() : 'USD';
      const converted = (typeof convertAmount === 'function') ? convertAmount(Number(tx.amount), tx.currency || 'USD', reportCurrency) : Number(tx.amount);
      if (tx.type === 'income') totalIncome += converted;
      else if (tx.type === 'expense') totalExpense += converted;
    });
    const reportCurrency = (typeof getReportCurrency === 'function') ? getReportCurrency() : 'USD';
    
    // XSS FIX: Build summary with textContent instead of innerHTML
    summaryEl.innerHTML = '';
    
    const incomeP = document.createElement('p');
    const incomeStrong = document.createElement('strong');
    incomeStrong.textContent = 'Суммарный доход:';
    incomeP.appendChild(incomeStrong);
    incomeP.appendChild(document.createTextNode(` ${totalIncome.toFixed(2)} ${reportCurrency}`));
    summaryEl.appendChild(incomeP);
    
    const expenseP = document.createElement('p');
    const expenseStrong = document.createElement('strong');
    expenseStrong.textContent = 'Суммарный расход:';
    expenseP.appendChild(expenseStrong);
    expenseP.appendChild(document.createTextNode(` ${totalExpense.toFixed(2)} ${reportCurrency}`));
    summaryEl.appendChild(expenseP);
    
    if (combinedLabels.length > 0) {
      const maxCat = combinedLabels[0];
      const maxVal = combinedValues[0];
      // XSS FIX: Use textContent for category name (user-provided)
      const maxP = document.createElement('p');
      const maxStrong = document.createElement('strong');
      maxStrong.textContent = 'Наибольшие расходы:';
      maxP.appendChild(maxStrong);
      maxP.appendChild(document.createTextNode(` категория "${maxCat}" — ${maxVal.toFixed(2)} ${reportCurrency}`));
      summaryEl.appendChild(maxP);
    }
    // AI‑репортаж: простое текстовое описание тренда
    const aiP = document.createElement('p');
    if (period === 'month') {
      aiP.textContent = 'AI‑отчёт: в этом месяце ваши расходы распределены по категориям, как показано на диаграмме. Обратите внимание на категории с наибольшими тратами.';
    } else {
      aiP.textContent = 'AI‑отчёт: в этом году основные траты приходятся на показанные категории. Анализируйте ваши расходы, чтобы лучше планировать бюджет.';
    }
    summaryEl.appendChild(aiP);
  }
}

async function initReportsPage() {
  // Устанавливаем значения по умолчанию для периода и даты
  const periodSelect = document.getElementById('reportPeriod');
  const monthInput = document.getElementById('reportMonth');
  const yearInput = document.getElementById('reportYear');
  const monthLabel = document.getElementById('reportMonthLabel');
  const yearLabel = document.getElementById('reportYearLabel');
  // Устанавливаем текущий месяц и год
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  if (monthInput) monthInput.value = `${yyyy}-${mm}`;
  if (yearInput) yearInput.value = `${yyyy}`;
  // Переключение между месяцем и годом
  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      if (periodSelect.value === 'month') {
        if (monthLabel) monthLabel.style.display = '';
        if (yearLabel) yearLabel.style.display = 'none';
      } else {
        if (monthLabel) monthLabel.style.display = 'none';
        if (yearLabel) yearLabel.style.display = '';
      }
    });
  }
  // Обработчик кнопки генерации отчёта
  const btn = document.getElementById('generateReport');
  if (btn) {
    btn.addEventListener('click', e => {
      e.preventDefault();
      generateReport();
    });
  }
  // Сразу сгенерируем отчёт для текущего месяца
  generateReport();
}

if (document.readyState !== 'loading') {
  initReportsPage();
} else {
  document.addEventListener('DOMContentLoaded', initReportsPage);
}