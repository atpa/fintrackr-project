/**
 * Общие функции для загрузки данных и построения графиков
 */

// REMOVED: X-User-Id header interceptor (deprecated after JWT-only authentication)
// Server now uses JWT tokens exclusively via HttpOnly cookies
// Authentication is handled automatically by the browser for same-site requests

/**
 * Загружает данные с API сервера.
 * @param {string} endpoint Например: "/api/accounts"
 * @returns {Promise<any[]>}
 */
async function fetchData(endpoint) {
  const resp = await fetch(endpoint);
  if (resp.status === 401) {
    await Auth.handleUnauthorized();
    return [];
  }
  if (!resp.ok) {
    console.error(`Ошибка запроса ${endpoint}:`, resp.status);
    return [];
  }
  return await resp.json();
}

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
  try {
    const settings = JSON.parse(localStorage.getItem("settings")) || {};
    return settings.reportCurrency || settings.currency || "USD";
  } catch (err) {
    return "USD";
  }
}

/**
 * Возвращает выбранную пользователем валюту для отображения общих показателей (баланс, доходы и расходы).
 * При отсутствии настроек пытается использовать выбранную валюту отчётов, затем основную валюту профиля, либо USD.
 * @returns {string}
 */
function getBalanceCurrency() {
  try {
    const settings = JSON.parse(localStorage.getItem("settings")) || {};
    return (
      settings.balanceCurrency ||
      settings.reportCurrency ||
      settings.currency ||
      "USD"
    );
  } catch (err) {
    return "USD";
  }
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

const workspaceDataState = {
  collectionsPromise: null,
};

function formatMonthLabel(dateObj = new Date()) {
  try {
    return dateObj.toLocaleString("ru-RU", { month: "long", year: "numeric" });
  } catch (error) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
  }
}

async function loadWorkspaceCollections() {
  if (workspaceDataState.collectionsPromise) {
    return workspaceDataState.collectionsPromise;
  }
  workspaceDataState.collectionsPromise = (async () => {
    const [accounts, transactions, budgets, subscriptions] = await Promise.all([
      fetchData("/api/accounts"),
      fetchData("/api/transactions"),
      fetchData("/api/budgets"),
      fetchData("/api/subscriptions"),
    ]);
    return {
      accounts: Array.isArray(accounts) ? accounts : [],
      transactions: Array.isArray(transactions) ? transactions : [],
      budgets: Array.isArray(budgets) ? budgets : [],
      subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
    };
  })().catch((error) => {
    console.error("Не удалось загрузить данные рабочего пространства", error);
    return { accounts: [], transactions: [], budgets: [], subscriptions: [] };
  });
  return workspaceDataState.collectionsPromise;
}

function computeWorkspaceMetrics(collections) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const balanceCurrency = getBalanceCurrency();
  let totalBalance = 0;
  collections.accounts.forEach((account) => {
    const balance = convertAmount(
      Number(account.balance) || 0,
      account.currency || balanceCurrency,
      balanceCurrency
    );
    totalBalance += balance;
  });

  let monthExpense = 0;
  let monthIncome = 0;
  collections.transactions.forEach((tx) => {
    if (!tx.date || !tx.date.startsWith(monthKey)) return;
    const converted = convertAmount(
      Number(tx.amount) || 0,
      tx.currency || balanceCurrency,
      balanceCurrency
    );
    if (tx.type === "expense") monthExpense += converted;
    if (tx.type === "income") monthIncome += converted;
  });

  const monthBudgets = collections.budgets.filter((budget) => budget.month === monthKey);
  const budgetLimit = monthBudgets.reduce((sum, budget) => sum + (Number(budget.limit) || 0), 0);
  const budgetSpent = monthBudgets.reduce((sum, budget) => sum + (Number(budget.spent) || 0), 0);

  const activePlan = collections.subscriptions.find(
    (sub) => !sub.status || sub.status === "active"
  );

  return {
    balanceCurrency,
    totalBalance,
    monthExpense,
    monthIncome,
    budgetLimit,
    budgetSpent,
    monthLabel: formatMonthLabel(now),
    planTitle: activePlan ? activePlan.title : "Free",
  };
}

function updateHeaderMetrics(metrics) {
  const currencyChip = document.getElementById("headerCurrencyChip");
  const periodChip = document.getElementById("headerPeriodChip");
  if (currencyChip) currencyChip.textContent = `Валюта: ${metrics.balanceCurrency}`;
  if (periodChip) periodChip.textContent = `Период: ${metrics.monthLabel}`;
}

function updateSidebarSnapshot(user, metrics) {
  const heroName = document.querySelector(".sidebar-hero-name");
  if (heroName) {
    heroName.textContent = user?.name ? `Привет, ${user.name.split(" ")[0]}` : "Добро пожаловать";
  }
  const heroSubtitle = document.querySelector(".sidebar-hero-subtitle");
  if (heroSubtitle) {
    heroSubtitle.textContent = `Расходы за месяц: ${formatCurrency(
      metrics.monthExpense,
      metrics.balanceCurrency
    )}`;
  }
  const heroEyebrow = document.querySelector(".sidebar-hero-eyebrow");
  if (heroEyebrow) {
    heroEyebrow.textContent = metrics.planTitle === "Free" ? "Базовый план" : metrics.planTitle;
  }
  const planValue = document.getElementById("planCardValue");
  if (planValue) {
    if (metrics.budgetLimit > 0) {
      planValue.textContent = `${metrics.budgetSpent.toFixed(0)} / ${metrics.budgetLimit.toFixed(
        0
      )} ${metrics.balanceCurrency}`;
    } else {
      planValue.textContent = `${metrics.monthExpense.toFixed(0)} ${metrics.balanceCurrency}`;
    }
  }
  const planHint = document.getElementById("planCardHint");
  if (planHint) {
    planHint.textContent = metrics.budgetLimit
      ? "Все бюджеты активны и обновляются автоматически"
      : "Добавьте первый бюджет, чтобы контролировать траты";
  }
  const progressBar = document.getElementById("planProgressBar");
  if (progressBar) {
    const progress = metrics.budgetLimit
      ? Math.min(100, Math.round((metrics.budgetSpent / metrics.budgetLimit) * 100))
      : Math.min(100, Math.round((metrics.monthExpense / Math.max(metrics.totalBalance, 1)) * 100));
    progressBar.style.width = `${isFinite(progress) ? progress : 0}%`;
  }
}

async function hydrateWorkspaceShell(user) {
  if (!user || !isWorkspacePage()) return;
  try {
    const collections = await loadWorkspaceCollections();
    const metrics = computeWorkspaceMetrics(collections);
    updateHeaderMetrics(metrics);
    updateSidebarSnapshot(user, metrics);
  } catch (error) {
    console.error("Не удалось обновить состояние личного кабинета", error);
  }
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

function getUserInitials(name) {
  if (!name) return "👤";
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "👤";
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "👤";
}

function isWorkspacePage() {
  const body = document.body;
  if (!body) return false;
  return body.classList.contains("workspace-page") || 
         (!body.classList.contains("landing-page") && !body.classList.contains("auth-page"));
}

function renderAppHeader(user) {
  const header = document.querySelector("header");
  if (!header || !isWorkspacePage()) return;
  if (header.dataset.enhanced === "true") return;

  const pageTitle =
    header.dataset.pageTitle ||
    (document.body && document.body.dataset.pageTitle) ||
    (document.title || "FinTrackr")
      .replace(/FinTrackr\s?[–-]\s?/i, "")
      .trim() ||
    "FinTrackr";

  const pageSubtitle =
    header.dataset.pageSubtitle ||
    (document.body && document.body.dataset.pageSubtitle) ||
    "Прогнозы, бюджеты и уведомления в едином месте";

    header.classList.add("app-header");
    header.dataset.enhanced = "true";
    header.innerHTML = `
      <div class="header-inner">
        <div class="header-left">
          <button class="burger" aria-label="Меню" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
          <div class="header-pills header-pills--left" role="tablist" aria-label="Период">
            <button class="header-pill" type="button">Сводка недели</button>
            <button class="header-pill header-pill--muted" type="button">AI советчик</button>
          </div>
        </div>
        <div class="header-center">
          <div class="header-title-wrap">
            <h1 class="header-title">${pageTitle}</h1>
          </div>
          <p class="header-subtitle">${pageSubtitle}</p>
        </div>
        <div class="header-right">
          <label class="header-search" aria-label="Поиск по данным FinTrackr">
            <span class="header-search-icon">🔍</span>
            <input type="search" placeholder="Поиск по операциям, счетам и категориям" />
          </label>
          <span class="header-pill header-pill--muted" id="headerCurrencyChip">Валюта: USD</span>
          <a href="planned.html" class="header-quick" aria-label="Планирование">Планы</a>
          <a href="transactions.html#new" class="header-primary" aria-label="Добавить операцию">+ Операция</a>
          <button class="header-icon" type="button" aria-label="Уведомления">
            <span class="header-icon-dot"></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-4-5.66V4a2 2 0 1 0-4 0v1.34A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" fill="currentColor" />
            </svg>
          </button>
          <div class="header-profile" id="headerProfile" aria-haspopup="menu" aria-expanded="false">
            <div class="profile-avatar-sm" id="headerAvatar">👤</div>
            <div class="header-dropdown" id="headerDropdown" role="menu" hidden>
              <div class="header-dropdown-info">
                <p class="header-profile-name" id="headerProfileName">Гость</p>
                <p class="header-profile-email" id="headerProfileEmail">Войдите, чтобы синхронизировать</p>
              </div>
              <button type="button" class="dropdown-item" id="headerLogoutBtn">Выход</button>
            </div>
          </div>
        </div>
      </div>
    `;

  const currencyChip = document.getElementById("headerCurrencyChip");
  if (currencyChip) {
    currencyChip.textContent = `Валюта: ${getBalanceCurrency()}`;
  }

  const headerAvatar = document.getElementById("headerAvatar");
  if (headerAvatar) {
    headerAvatar.textContent = getUserInitials(user && user.name);
  }

  const headerName = document.getElementById("headerProfileName");
  const headerEmail = document.getElementById("headerProfileEmail");
  if (headerName) headerName.textContent = user?.name || "Гость";
  if (headerEmail)
    headerEmail.textContent = user?.email || "Войдите, чтобы синхронизировать";
  const searchInputEl = header.querySelector(".header-search input");
  if (searchInputEl) {
    searchInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = searchInputEl.value.trim();
        if (val) {
          window.location.href = `transactions.html?search=${encodeURIComponent(val)}`;
        }
      }
    });
  }

  // Dropdown logic for header profile
  const profileEl = document.getElementById("headerProfile");
  const dropdownEl = document.getElementById("headerDropdown");
  const logoutBtn = document.getElementById("headerLogoutBtn");
  if (profileEl && dropdownEl) {
    function closeDropdown() {
      dropdownEl.hidden = true;
      profileEl.setAttribute("aria-expanded", "false");
    }
    function toggleDropdown(e) {
      e.stopPropagation();
      const isHidden = dropdownEl.hidden;
      dropdownEl.hidden = !isHidden;
      profileEl.setAttribute("aria-expanded", String(isHidden));
    }
    profileEl.addEventListener("click", toggleDropdown);
    document.addEventListener("click", (e) => {
      if (!profileEl.contains(e.target)) closeDropdown();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDropdown();
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch (e) {}
      if (window.Auth && typeof window.Auth.logout === "function") {
        try { await window.Auth.logout(); } catch (e) {}
      }
      window.location.href = "login.html";
    });
  }

  const searchInput = header.querySelector(".header-search input");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const detail = (event.target && event.target.value) || "";
      document.dispatchEvent(
        new CustomEvent("fintrackr:search", { detail })
      );
    });
  }
}

function enhanceSidebar(user) {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar || sidebar.dataset.enhanced === "true" || !isWorkspacePage()) {
    return;
  }

  const navContainer =
    sidebar.querySelector(".sidebar-scroll") || sidebar.querySelector(".sidebar-nav");
  if (!navContainer) {
    return;
  }

  const host = navContainer.parentElement || sidebar;

  const hero = document.createElement("div");
  hero.className = "sidebar-hero";
  hero.innerHTML = `
    <p class="sidebar-hero-eyebrow">Free</p>
    <h2 class="sidebar-hero-name">Добро пожаловать</h2>
    <p class="sidebar-hero-subtitle">Расходы за месяц: 0</p>
    <div class="sidebar-hero-actions">
      <a href="accounts.html" class="sidebar-hero-link">Счета</a>
      <a href="transactions.html#new" class="sidebar-hero-link sidebar-hero-link--primary" data-action="new-transaction">Новая</a>
    </div>
  `;

  host.insertBefore(hero, navContainer);

  const planCard = document.createElement("div");
  planCard.className = "sidebar-plan-card";
  planCard.innerHTML = `
    <div class="plan-card-header">
      <span class="plan-card-label">Лимит расходов</span>
      <span class="plan-card-pill">Beta</span>
    </div>
    <p class="plan-card-value" id="planCardValue">0 USD</p>
    <div class="plan-card-progress">
      <span class="plan-card-progress-bar" id="planProgressBar" style="width: 0%"></span>
    </div>
    <p class="plan-card-hint" id="planCardHint">Добавьте бюджет, чтобы отслеживать прогресс автоматически.</p>
  `;

  host.insertBefore(planCard, navContainer);

  const heroName = hero.querySelector(".sidebar-hero-name");
  if (heroName && user?.name) {
    // XSS FIX: Use textContent for user-provided data
    const firstName = String(user.name).split(" ")[0];
    heroName.textContent = `Привет, ${firstName}`;
  } else if (heroName) {
    heroName.textContent = "Добро пожаловать";
  }

  const heroSubtitle = hero.querySelector(".sidebar-hero-subtitle");
  if (heroSubtitle) {
    heroSubtitle.textContent = user
      ? "Продолжайте держать расходы под контролем"
      : "Авторизуйтесь, чтобы синхронизировать данные";
  }

  sidebar.dataset.enhanced = "true";
}

/**
 * Инициализация дэшборда: загрузка данных и построение графика
 */
async function initDashboard() {
  let currentUser = Auth.getUser();
  if (!currentUser) {
    try {
      currentUser = await Auth.syncSession();
    } catch (err) {
      currentUser = null;
    }
    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }
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

// Навигация и аутентификация: настройка бургер‑меню и ссылок входа/выхода
document.addEventListener("DOMContentLoaded", async () => {
  const currentPage =
    window.location.pathname.split("/").pop().toLowerCase() || "index.html";
  let user = null;
  try {
    user = await Auth.syncSession();
  } catch (err) {
    user = Auth.getUser();
  }

  if (Auth.requiresAuth(currentPage) && !user) {
    window.location.href = "login.html";
    return;
  }

  renderAppHeader(user);
  enhanceSidebar(user);
  hydrateWorkspaceShell(user);

  // Legacy sidebar profile/auth link handlers removed - now handled in renderAppHeader dropdown

  if (document.getElementById("expenseChart")) {
    initDashboard();
  }

  /* Sidebar state manager for new sidebar component */
  (function sidebarManager() {
    const sidebar = document.querySelector(".sidebar");
    const sidebarBackdrop = document.querySelector(".sidebar-backdrop");
    const burger = document.querySelector(".burger");

    if (!sidebar) return; // Exit if sidebar not on page

    function openSidebar() {
      sidebar.classList.add("open");
      sidebarBackdrop.classList.add("open");
      burger.classList.add("open");
      burger.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
      sidebar.classList.remove("open");
      sidebarBackdrop.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }

    function toggleSidebar() {
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }

    // Wire up burger button (mobile)
    if (burger) {
      burger.addEventListener("click", toggleSidebar);
    }

    // Close sidebar when backdrop clicked (mobile)
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener("click", closeSidebar);
    }

    // Close sidebar on nav link click (mobile)
    document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 1024) {
          closeSidebar();
        }
      });
    });

    // Handle sidebar logout buttons
    document
      .querySelectorAll(".sidebar .logout-btn")
      .forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            await Auth.logout();
          } catch (err) {
            console.error("Logout error", err);
          }
          window.location.href = "landing.html";
        });
      });

    // Close sidebar on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        closeSidebar();
      }
    });

    // Close sidebar when resizing to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) {
        closeSidebar();
      }
    });
  })();
});

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

// Highlight active item in the sidebar on every page
(function () {
  const cur = location.pathname
    .replace(/\/index\.html$/, "/")
    .replace(/\.html$/, "");

  document.querySelectorAll(".sidebar .nav-link[href]").forEach((a) => {
    try {
      const href = new URL(a.getAttribute("href"), location.origin).pathname
        .replace(/\/index\.html$/, "/")
        .replace(/\.html$/, "");

      // Highlight current page
      if (href === cur || (href === "/" && cur === "/")) {
        a.classList.add("active");
      }
    } catch (e) {}
  });
})();
