/**
 * Chart Configuration Module
 * @module charts
 * @description Генерация конфигураций для Chart.js/Recharts
 */

import { formatCurrency } from './helpers.js';

/**
 * Donut Chart — расходы по категориям
 * @param {Array} expenses - массив расходов с category_id и amount
 * @param {Array} categories - массив категорий
 * @param {string} currency - валюта для форматирования
 * @returns {Object} конфигурация Chart.js
 */
export function createExpensesByCategoryChart(expenses, categories, currency = 'USD') {
  // Группируем расходы по категориям
  const groupedByCategory = expenses.reduce((acc, tx) => {
    const categoryId = tx.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = 0;
    }
    acc[categoryId] += Math.abs(Number(tx.amount));
    return acc;
  }, {});

  // Сортируем по сумме (топ-5)
  const sorted = Object.entries(groupedByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const labels = sorted.map(([catId]) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? `${cat.icon || ''} ${cat.name}`.trim() : 'Без категории';
  });

  const data = sorted.map(([, amount]) => amount);

  return {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF'
        ],
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              return `${context.label}: ${formatCurrency(value, currency)}`;
            }
          }
        }
      }
    }
  };
}

/**
 * Bar Chart — доходы/расходы по месяцам
 * @param {Array} transactions - массив транзакций
 * @param {string} currency - валюта
 * @param {number} months - количество месяцев для отображения
 * @returns {Object} конфигурация Chart.js
 */
export function createCashflowChart(transactions, currency = 'USD', months = 6) {
  const now = new Date();
  const monthLabels = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    monthLabels.push(date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }));

    const monthTxs = transactions.filter(tx => tx.date?.startsWith(monthKey));
    
    const income = monthTxs
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
    
    const expense = monthTxs
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    incomeData.push(income);
    expenseData.push(expense);
  }

  return {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'Доходы',
          data: incomeData,
          backgroundColor: '#28a745',
          borderRadius: 4
        },
        {
          label: 'Расходы',
          data: expenseData,
          backgroundColor: '#dc3545',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatCurrency(value, currency)
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y, currency)}`;
            }
          }
        }
      }
    }
  };
}

/**
 * Line Chart — прогноз бюджета
 * @param {Array} budgets - массив бюджетов
 * @param {Array} transactions - массив транзакций
 * @param {string} currency - валюта
 * @returns {Object} конфигурация Chart.js
 */
export function createBudgetForecastChart(budgets, transactions, currency = 'USD') {
  const now = new Date();
  const labels = [];
  const spentData = [];
  const limitData = [];
  const forecastData = [];

  // Последние 3 месяца + 1 прогнозный
  for (let i = 2; i >= -1; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    labels.push(date.toLocaleDateString('ru-RU', { month: 'short' }));

    const monthBudgets = budgets.filter(b => b.month === monthKey);
    const totalLimit = monthBudgets.reduce((sum, b) => sum + Number(b.limit || 0), 0);
    const totalSpent = monthBudgets.reduce((sum, b) => sum + Number(b.spent || 0), 0);

    limitData.push(totalLimit);
    
    if (i === -1) {
      // Прогноз: средние расходы за последние 2 месяца
      const avgSpent = spentData.length > 0 
        ? spentData.reduce((a, b) => a + b, 0) / spentData.length 
        : 0;
      forecastData.push(avgSpent);
      spentData.push(null); // Для прогнозного месяца нет факта
    } else {
      spentData.push(totalSpent);
      forecastData.push(null);
    }
  }

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Лимит',
          data: limitData,
          borderColor: '#ffc107',
          backgroundColor: 'transparent',
          borderDash: [5, 5]
        },
        {
          label: 'Потрачено',
          data: spentData,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Прогноз',
          data: forecastData,
          borderColor: '#6c757d',
          backgroundColor: 'transparent',
          borderDash: [10, 5],
          pointStyle: 'rectRot'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatCurrency(value, currency)
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  };
}

/**
 * Инициализация графика на странице
 * @param {string} canvasId - ID canvas-элемента
 * @param {Object} config - конфигурация Chart.js
 * @returns {Chart} экземпляр графика
 */
export function renderChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`Canvas #${canvasId} not found`);
    return null;
  }

  // Уничтожаем старый график, если существует
  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
  }

  // TODO: Добавить проверку загрузки Chart.js
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded');
    return null;
  }

  canvas._chartInstance = new Chart(canvas.getContext('2d'), config);
  return canvas._chartInstance;
}
