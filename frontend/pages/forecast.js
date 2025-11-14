import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell from '../modules/profile.js';

initNavigation();
initProfileShell();

/**
 * Логика для страницы прогноза: загрузка данных прогноза и отображение графика.
 */
async function initForecastPage() {
  // Получаем прогноз на 30 дней с сервера
  let forecast;
  try {
    forecast = await fetchData('/api/forecast');
  } catch (err) {
    console.error('Ошибка прогноза:', err);
    forecast = { predicted_income: 0, predicted_expense: 0 };
  }
  // Получаем дополнительные данные для анализа риска
  const [transactions, budgets, categories] = await Promise.all([
    fetchData('/api/transactions'),
    fetchData('/api/budgets'),
    fetchData('/api/categories')
  ]);
  // Рассчитываем прогнозы на 7, 30 и 90 дней.
  // Считаем, что сервер возвращает прогноз в долларах (USD). Далее конвертируем суммы в выбранную валюту отчёта.
  const reportCurrency = typeof getReportCurrency === 'function' ? getReportCurrency() : 'USD';
  const income30USD = Number(forecast.predicted_income || 0);
  const expense30USD = Number(forecast.predicted_expense || 0);
  // Пересчёт на разные горизонты в долларах
  const income7USD = income30USD / 30 * 7;
  const expense7USD = expense30USD / 30 * 7;
  const income90USD = income30USD / 30 * 90;
  const expense90USD = expense30USD / 30 * 90;
  // Конвертируем полученные значения в выбранную валюту (если доступны функции конвертации)
  const income30 = typeof convertAmount === 'function' ? convertAmount(income30USD, 'USD', reportCurrency) : income30USD;
  const expense30 = typeof convertAmount === 'function' ? convertAmount(expense30USD, 'USD', reportCurrency) : expense30USD;
  const income7 = typeof convertAmount === 'function' ? convertAmount(income7USD, 'USD', reportCurrency) : income7USD;
  const expense7 = typeof convertAmount === 'function' ? convertAmount(expense7USD, 'USD', reportCurrency) : expense7USD;
  const income90 = typeof convertAmount === 'function' ? convertAmount(income90USD, 'USD', reportCurrency) : income90USD;
  const expense90 = typeof convertAmount === 'function' ? convertAmount(expense90USD, 'USD', reportCurrency) : expense90USD;
  // Обновляем интерфейс
  const income7El = document.getElementById('forecastIncome7');
  const exp7El = document.getElementById('forecastExpense7');
  const income30El = document.getElementById('forecastIncome30');
  const exp30El = document.getElementById('forecastExpense30');
  const income90El = document.getElementById('forecastIncome90');
  const exp90El = document.getElementById('forecastExpense90');
  if (income7El) income7El.textContent = income7.toFixed(2);
  if (exp7El) exp7El.textContent = expense7.toFixed(2);
  if (income30El) income30El.textContent = income30.toFixed(2);
  if (exp30El) exp30El.textContent = expense30.toFixed(2);
  if (income90El) income90El.textContent = income90.toFixed(2);
  if (exp90El) exp90El.textContent = expense90.toFixed(2);
  // Рисуем сравнительный столбчатый график на 30 дней
  const chartCanvas = document.getElementById('forecastChart');
  if (chartCanvas) {
    drawBarChart(chartCanvas, ['Доход 30д', 'Расход 30д'], [income30, expense30]);
  }
  // Вычисляем категории, находящиеся в зоне риска (используем текущий месяц)
  const riskList = document.getElementById('riskList');
  if (riskList) {
    riskList.innerHTML = '';
    // Группируем бюджеты по категории и месяцу
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    budgets.forEach(budget => {
      if (budget.month === currentMonth) {
        const spent = Number(budget.spent) || 0;
        const limit = Number(budget.limit) || 0;
        const ratio = limit > 0 ? spent / limit : 0;
        if (ratio >= 0.8) {
          const cat = categories.find(c => c.id === budget.category_id);
          const name = cat ? cat.name : 'Неизвестно';
          const li = document.createElement('li');
          li.textContent = `${name}: потрачено ${(ratio * 100).toFixed(0)}% из лимита`;
          li.style.color = ratio >= 1 ? 'var(--danger)' : 'var(--accent)';
          riskList.appendChild(li);
        }
      }
    });
    if (!riskList.children.length) {
      const li = document.createElement('li');
      li.textContent = 'Категории с риском превышения бюджета отсутствуют';
      riskList.appendChild(li);
    }
  }
}

if (document.readyState !== 'loading') {
  initForecastPage();
} else {
  document.addEventListener('DOMContentLoaded', initForecastPage);
}