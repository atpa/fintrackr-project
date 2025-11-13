import fetchData from '../modules/api.js';
import initNavigation from '../modules/navigation.js';
import initProfileShell, { loadProfileSettings } from '../modules/profile.js';

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

/**
 * Строит простой столбчатый график на элементе canvas
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} labels названия столбцов
 * @param {number[]} values значения столбцов
 */
function drawBarChart(canvas, labels, values) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const styles = getComputedStyle(document.documentElement);
  const barColor =
    styles.getPropertyValue("--primary-light").trim() || "#3b82f6";
  const textColor = styles.getPropertyValue("--text").trim() || "#1a202c";
  const maxVal = Math.max(...values, 1);
  const barWidth = (width / labels.length) * 0.6;
  const offsetX = (width / labels.length) * 0.2;
  ctx.font = "12px sans-serif";
  let progress = 0;
  // Выделяем пространство под подписи: чем меньше столбиков, тем меньше зарезервированная область
  const reservedBottom = labels.length <= 3 ? 80 : 120;

  /**
   * Разбивает строку на две строки, если она слишком длинная. Пытается разделить по пробелам.
   * Если пробелов нет или текст короткий, возвращает исходную строку как один элемент массива.
   * @param {string} text
   * @param {number} maxLen
   * @returns {string[]}
   */
  function wrapLabel(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const parts = text.split(/\s+/);
    if (parts.length === 1) {
      // нет пробелов, делим примерно пополам
      const mid = Math.ceil(text.length / 2);
      return [text.slice(0, mid), text.slice(mid)];
    }
    const lines = [];
    let current = "";
    parts.forEach((word) => {
      if ((current + " " + word).trim().length <= maxLen) {
        current = (current + " " + word).trim();
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function animate() {
    progress = Math.min(progress + 0.03, 1);
    ctx.clearRect(0, 0, width, height);
    labels.forEach((label, i) => {
      const targetHeight =
        (values[i] / maxVal) * (height - reservedBottom - 20);
      const barHeight = targetHeight * progress;
      const x = i * (width / labels.length) + offsetX;
      const y = height - barHeight - reservedBottom;
      // Столбик
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barWidth, barHeight);
      // Подписи категорий: рисуем по центру зарезервированной области, разбивая текст на 2 строки при необходимости
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      const wrapped = wrapLabel(label, 10);
      const baseY = height - reservedBottom + 20;
      wrapped.forEach((line, idx) => {
        ctx.fillText(line, x + barWidth / 2, baseY + idx * 14);
      });
      // Значения над столбиками
      if (progress > 0.95) {
        ctx.fillText(values[i].toFixed(0), x + barWidth / 2, y - 5);
      }
    });
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

/**
 * Рисует круговую диаграмму на canvas. Используется для распределения расходов по категориям.
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} labels
 * @param {number[]} values
 */
function drawPieChart(canvas, labels, values) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const total = values.reduce((sum, v) => sum + v, 0);
  const radius = Math.min(canvas.width, canvas.height) / 2 - 20;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const styles = getComputedStyle(document.documentElement);
  // Набор цветов для секторов; используем оттенки из нашей палитры и дополнительные, чтобы избежать повторений
  const palette = [
    styles.getPropertyValue("--primary").trim(),
    styles.getPropertyValue("--primary-light").trim(),
    styles.getPropertyValue("--accent").trim(),
    styles.getPropertyValue("--danger").trim(),
    "#1e8f5e",
    "#e0a96d",
    "#b55c4a",
    "#ff8c66",
    "#a64b4a",
    "#e0a96d",
  ];
  let startAngle = -Math.PI / 2;
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const angle = total ? (val / total) * Math.PI * 2 : 0;
    const endAngle = startAngle + angle;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length] || "#ccc";
    ctx.fill();
    startAngle = endAngle;
  }
}

/**
 * Инициализация дэшборда: загрузка данных и построение графика
 */
async function initDashboard() {
  // Если пользователь не авторизован, перенаправляем на страницу входа
  try {
    const stored = localStorage.getItem("user");
    if (!stored) {
      window.location.href = "login.html";
      return;
    }
  } catch (e) {
    // если localStorage недоступен, просто продолжаем
  }
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
  const canvas = document.getElementById("expenseChart");
  if (canvas) {
    drawBarChart(canvas, labels, values);
  }

  // Рисуем круговую диаграмму расходов по категориям, если на странице есть соответствующий элемент
  const pieCanvas = document.getElementById("expensePie");
  if (pieCanvas) {
    drawPieChart(pieCanvas, labels, values);
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

