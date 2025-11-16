import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell, { loadProfileSettings } from '../modules/profile.js';
import Auth from '../modules/auth.js';
import { renderBarChart, renderDonutChart } from '../modules/charts.js';

/**
 * Общие функции для загрузки данных и построения графиков
 */

// ---- Конвертация валют и выбор отчётной валюты ----
// Клиентская таблица курсов валют. Эти значения соответствуют данным на сервере (endpoints /api/rates).
const RATE_MAP = {
  USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
  EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
  PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
  RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 },
};

/**
 * Форматирование суммы и валюты для отображения.
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
function formatCurrency(amount, currency) {
  const n = Number(amount) || 0;
  return `${n.toFixed(2)} ${currency || ''}`.trim();
}

/**
 * Возвращает выбранную пользователем валюту отчётов из настроек.
 * Пытается прочитать поле reportCurrency, затем падает назад на основную валюту профиля или 'USD'.
 * @returns {string}
 */
function getReportCurrency() {
  const settings = loadProfileSettings();
  return settings.reportCurrency || settings.currency || "USD";
}

/**
 * Возвращает выбранную пользователем валюту для отображения общих показателей (баланс, доходы и расходы).
 * При отсутствии настроек пытается использовать выбранную валюту отчётов, затем основную валюту профиля, либо USD.
 * @returns {string}
 */
function getBalanceCurrency() {
  const settings = loadProfileSettings();
  return (
    settings.balanceCurrency ||
    settings.reportCurrency ||
    settings.currency ||
    "USD"
  );
}

/**
 * Конвертирует сумму из одной валюты в другую по фиксированным курсам.
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
function convertAmount(amount, from, to) {
  if (from === to) return Number(amount) || 0;
  const rates = RATE_MAP[from];
  if (rates && rates[to]) {
    return Number(amount) * rates[to];
  }
  return Number(amount) || 0;
}

// Старые функции canvas удалены - используем ApexCharts

/**
 * Инициализация дэшборда: загрузка данных и построение графика
 */
async function initDashboard() {
  // Гарантируем, что сессия актуальна перед загрузкой данных
  await Auth.requireAuth();

  const transactions = await fetchData("/api/transactions");
  const categories = await fetchData("/api/categories");
  // Выбранная пользователем валюта для отчётов
  const reportCurrency = getReportCurrency();
  // Выбранная пользователем валюта для баланса
  const balanceCurrency = getBalanceCurrency();
  // группируем расходы по категориям
  const expenseMap = new Map();
  transactions.forEach((tx) => {
    if (tx.type === "expense") {
      const cat = categories.find((c) => c.id === tx.category_id);
      const key = cat ? cat.name : "Неизвестно";
      const prev = expenseMap.get(key) || 0;
      // конвертируем сумму в валюту отчёта
      const converted = convertAmount(
        Number(tx.amount),
        tx.currency || "USD",
        reportCurrency
      );
      expenseMap.set(key, prev + converted);
    }
  });
  const labels = Array.from(expenseMap.keys());
  const values = Array.from(expenseMap.values());
  
  // Рендерим графики с помощью ApexCharts
  if (document.getElementById("expenseChart")) {
    await renderBarChart("expenseChart", labels, values, reportCurrency);
  }

  // Рисуем круговую диаграмму расходов по категориям
  if (document.getElementById("expensePie")) {
    await renderDonutChart("expensePie", labels, values, reportCurrency);
  }

  // Показываем топ‑категории (по убыванию суммы расходов)
  const topListEl = document.getElementById("topCategories");
  if (topListEl) {
    // Сортируем пары ключ‑значение
    const sortedEntries = Array.from(expenseMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    topListEl.innerHTML = "";
    const maxItems = 5;
    sortedEntries.slice(0, maxItems).forEach(([name, val]) => {
      const li = document.createElement("li");
      li.textContent = `${name}: ${val.toFixed(2)} ${reportCurrency}`;
      topListEl.appendChild(li);
    });
    if (!sortedEntries.length) {
      const li = document.createElement("li");
      li.textContent = "Нет данных";
      topListEl.appendChild(li);
    }
  }
  // Показ общих показателей с учётом выбранной валюты
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((tx) => {
    // Общие суммы (баланс, доходы и расходы) конвертируются в валюту баланса
    const converted = convertAmount(
      Number(tx.amount),
      tx.currency || "USD",
      balanceCurrency
    );
    if (tx.type === "income") totalIncome += converted;
    else if (tx.type === "expense") totalExpense += converted;
  });
  const balanceEl = document.getElementById("totalBalance");
  const incomeEl = document.getElementById("totalIncome");
  const expenseEl = document.getElementById("totalExpense");
  if (balanceEl)
    balanceEl.textContent = (totalIncome - totalExpense).toFixed(2);
  if (incomeEl) incomeEl.textContent = totalIncome.toFixed(2);
  if (expenseEl) expenseEl.textContent = totalExpense.toFixed(2);
  // Обновляем код валюты на странице для общих показателей (все элементы с классом currency-code)
  try {
    document.querySelectorAll(".currency-code").forEach((el) => {
      el.textContent = balanceCurrency;
    });
  } catch (err) {
    // ignore
  }

  // Финансовое здоровье: соотношение (доходы - расходы) к доходам
  const healthRatio =
    totalIncome > 0
      ? Math.max((totalIncome - totalExpense) / totalIncome, 0)
      : 0;
  const healthEl = document.getElementById("financialHealth");
  const healthProgress = document.getElementById("healthProgress");
  if (healthEl) healthEl.textContent = (healthRatio * 100).toFixed(0) + "%";
  if (healthProgress)
    healthProgress.style.width = (healthRatio * 100).toFixed(0) + "%";

  // AI‑прогноз: загружаем прогноз на 30 дней
  try {
    const forecast = await fetchData("/api/forecast");
    const aiIncomeEl = document.getElementById("aiIncome");
    const aiExpenseEl = document.getElementById("aiExpense");
    if (forecast && aiIncomeEl && aiExpenseEl) {
      // Прогноз приходит в долларах (USD), конвертируем в валюту отчёта
      // Для общих показателей используем валюту баланса
      const convInc = convertAmount(
        Number(forecast.predicted_income || 0),
        "USD",
        balanceCurrency
      );
      const convExp = convertAmount(
        Number(forecast.predicted_expense || 0),
        "USD",
        balanceCurrency
      );
      aiIncomeEl.textContent = convInc.toFixed(2);
      aiExpenseEl.textContent = convExp.toFixed(2);
    }
  } catch (err) {
    console.error("Ошибка загрузки AI‑прогноза", err);
  }
}

initNavigation();
initProfileShell();

const onReady = () => {
  if (document.getElementById("expenseChart")) {
    initDashboard();
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onReady);
} else {
  onReady();
}

// === Theme toggle (persisted) ===
(function () {
  // Check if theme toggle already exists
  if (document.querySelector(".theme-toggle")) return;
  
  try {
    const saved = localStorage.getItem("ft_theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    }
  } catch (e) {}

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    document.body.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("ft_theme", isDark ? "dark" : "light");
    } catch (e) {}
    btn.textContent = isDark ? "Light" : "Dark";
  }

  const btn = document.createElement("button");
  btn.className = "theme-toggle";
  btn.textContent = document.documentElement.classList.contains("dark")
    ? "Light"
    : "Dark";
  btn.addEventListener("click", toggleTheme);
  document.addEventListener("DOMContentLoaded", () =>
    document.body.appendChild(btn)
  );
})();

