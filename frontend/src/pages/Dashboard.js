/**
 * Dashboard Page — главная страница с виджетами и графиками
 * @module pages/Dashboard
 * @description Использует новую архитектуру: store + charts + components
 */

import globalStore from '@modules/store.js';
import { 
  createExpensesByCategoryChart, 
  createCashflowChart,
  createBudgetForecastChart,
  renderChart 
} from '@modules/charts.js';
import { 
  formatCurrency, 
  formatDate, 
  calculateBudgetProgress 
} from '@modules/helpers.js';
import { createCompactTransactionCard } from '@components/CardTransaction.js';

// API endpoint
const API = '/api';

/**
 * Состояние страницы
 */
const pageState = {
  transactions: [],
  accounts: [],
  categories: [],
  budgets: [],
  loading: true
};

/**
 * Загрузка всех данных для дашборда
 */
async function loadDashboardData() {
  globalStore.state.isLoading = true;
  pageState.loading = true;
  
  try {
    // Параллельные запросы для оптимизации
    const [txRes, accRes, catRes, budRes] = await Promise.all([
      fetch(`${API}/transactions`),
      fetch(`${API}/accounts`),
      fetch(`${API}/categories`),
      fetch(`${API}/budgets`)
    ]);

    pageState.transactions = await txRes.json();
    pageState.accounts = await accRes.json();
    pageState.categories = await catRes.json();
    pageState.budgets = await budRes.json();

    // Обновляем global store
    globalStore.batch({
      transactions: pageState.transactions,
      accounts: pageState.accounts,
      categories: pageState.categories,
      budgets: pageState.budgets
    });

    renderDashboard();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // TODO: Показать toast с ошибкой
  } finally {
    globalStore.state.isLoading = false;
    pageState.loading = false;
  }
}

/**
 * Рендеринг всех виджетов дашборда
 */
function renderDashboard() {
  renderStatsCards();
  renderRecentTransactions();
  renderCharts();
}

/**
 * Карточки со статистикой (верхний ряд)
 */
function renderStatsCards() {
  const { accounts, transactions } = pageState;
  const userCurrency = globalStore.state.currency || 'USD';

  // Общий баланс
  const totalBalance = accounts.reduce((sum, acc) => {
    // TODO: Конвертировать в userCurrency
    return sum + Number(acc.balance || 0);
  }, 0);

  // Доходы/расходы за текущий месяц
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const monthTxs = transactions.filter(tx => tx.date?.startsWith(currentMonth));
  const income = monthTxs
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  
  const expense = monthTxs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

  // Обновляем DOM
  const balanceEl = document.getElementById('totalBalance');
  const incomeEl = document.getElementById('monthIncome');
  const expenseEl = document.getElementById('monthExpense');

  if (balanceEl) {
    balanceEl.textContent = formatCurrency(totalBalance, userCurrency);
  }
  if (incomeEl) {
    incomeEl.textContent = formatCurrency(income, userCurrency);
  }
  if (expenseEl) {
    expenseEl.textContent = formatCurrency(expense, userCurrency);
  }
}

/**
 * Последние транзакции (виджет)
 */
function renderRecentTransactions() {
  const container = document.getElementById('recentTransactionsList');
  if (!container) return;

  const recent = pageState.transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  container.innerHTML = '';

  if (recent.length === 0) {
    container.innerHTML = '<p class="text-muted">Нет транзакций</p>';
    return;
  }

  recent.forEach(tx => {
    const card = createCompactTransactionCard(tx, {
      categories: pageState.categories
    });
    container.appendChild(card);
  });
}

/**
 * Графики (Chart.js)
 */
function renderCharts() {
  const { transactions, categories, budgets } = pageState;
  const userCurrency = globalStore.state.currency || 'USD';

  // Фильтруем расходы для donut chart
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  // Donut Chart — расходы по категориям
  const expensesConfig = createExpensesByCategoryChart(expenses, categories, userCurrency);
  renderChart('expensePie', expensesConfig);

  // Bar Chart — cashflow по месяцам
  const cashflowConfig = createCashflowChart(transactions, userCurrency, 6);
  renderChart('cashflowChart', cashflowConfig);

  // Line Chart — прогноз бюджета
  const forecastConfig = createBudgetForecastChart(budgets, transactions, userCurrency);
  renderChart('budgetForecastChart', forecastConfig);
}

/**
 * Инициализация страницы
 */
function init() {
  // Загружаем данные
  loadDashboardData();

  // Подписываемся на изменения store (реактивность)
  globalStore.subscribe('currency', (newCurrency) => {
    // При смене валюты перерисовываем виджеты
    renderDashboard();
  });

  // Обновление каждые 30 секунд (опционально)
  // setInterval(loadDashboardData, 30000);
}

// Запуск при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export для тестирования
export { loadDashboardData, renderDashboard, renderStatsCards, renderRecentTransactions, renderCharts };
