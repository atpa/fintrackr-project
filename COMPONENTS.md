# 🎨 UI Components Documentation — FinTrackr v2.0

Полная документация по универсальным UI-компонентам с примерами использования, API-референсом и визуальными примерами.

## 📦 Импорты

**Для старых страниц** (`frontend/pages/*.js`):
```js
import { ... } from '../src/components/ComponentName.js';
```

**Для новой архитектуры** (`frontend/src/pages/*.js`):
```js
import { ... } from '@components/ComponentName.js';
```

## Toast

Импорт:

```js
import { toastSuccess, toastError, toastWarning, toastInfo } from '../src/components/Toast.js';
```

Примеры:

```js
toastSuccess('Сохранено!');
toastError('Ошибка сохранения', { duration: 5000 });
toastWarning('Проверьте данные');
toastInfo('Готово', { position: 'bottom-right' });
```

API: showToast({ message, variant, duration, position, dismissible, onClick, onClose }) и сокращения: toastSuccess, toastError, toastWarning, toastInfo.

## ModalBase

Импорт:

```js
import { openModal, confirmModal } from '../src/components/ModalBase.js';
```

Примеры:

```js
// Открыть модалку с произвольным контентом
const { close } = openModal({
  title: 'Заголовок',
  content: '<p>Контент</p>',
  size: 'md',
  actions: [
    { label: 'Отмена', variant: 'secondary', onClick: close },
    { label: 'OK', variant: 'primary', onClick: () => { /* ... */ close(); } },
  ],
});

// Подтверждение
const ok = await confirmModal({
  title: 'Удалить запись?',
  message: 'Это действие нельзя отменить',
  danger: true,
});
if (ok) { /* ... */ }
```

Параметры: title, content (HTML/DOM), size (sm|md|lg|xl|fullscreen), actions [{label, variant, onClick}], closeOnBackdrop, closeOnEsc, showCloseButton, onOpen, onClose.

## FormBase

Импорт:

```js
import { createForm } from '../src/components/FormBase.js';
```

Пример:

```js
const form = createForm({
  fields: [
    { name: 'name', type: 'text', label: 'Название', validation: { required: true, minLength: 2 } },
    { name: 'amount', type: 'number', label: 'Сумма', validation: { required: true, min: 0 } },
    { name: 'type', type: 'radio', options: ['income','expense'], label: 'Тип' },
    { name: 'category', type: 'select', label: 'Категория', options: ['Food','Transport'], placeholder: 'Выберите...' },
  ],
  submitLabel: 'Сохранить',
  onSubmit: async (values) => { /* отправка */ },
  validateOnBlur: true,
  validateOnChange: true,
});
container.appendChild(form);
```

Валидация: required, email, min, max, minLength, maxLength, pattern, numeric, alphanumeric, а также custom (fn).

## SkeletonLoader (быстрый пример)

```js
import { /* create...Skeleton helpers */ } from '../src/components/SkeletonLoader.js';
// showSkeleton(selector, skeletonEl), hideSkeleton(selector, realEl)
```

## CardAccount

**Импорт:**
```js
import { createCardAccount, renderAccountCards } from '@components/CardAccount.js';
```

**API:**
```js
// Создать одну карточку счёта
const cardElement = createCardAccount(account, {
  onEdit: (acc) => { /* открыть форму редактирования */ },
  onDelete: (acc) => { /* подтвердить удаление */ }
});

// Отрендерить список карточек
renderAccountCards(accounts, 'container-id', {
  onEdit: (acc) => { /* ... */ },
  onDelete: (acc) => { /* ... */ },
  emptyMessage: 'Нет счетов'  // опционально
});
```

**Параметры account:**
```js
{
  id: Number,
  name: String,
  balance: Number,
  currency: String ('USD'|'EUR'|'PLN'|'RUB')
}
```

---

## CardTransaction

**Импорт:**
```js
import { 
  createCardTransaction, 
  createCompactTransactionCard, 
  renderTransactionCards 
} from '@components/CardTransaction.js';
```

**API:**
```js
// Полная карточка транзакции
const cardElement = createCardTransaction(transaction, context, {
  onEdit: (tx) => { /* ... */ },
  onDelete: (tx) => { /* ... */ }
});

// Компактная карточка (для виджетов)
const compactCard = createCompactTransactionCard(transaction, context);

// Отрендерить список
renderTransactionCards(transactions, 'container-id', context, {
  onEdit: (tx) => { /* ... */ },
  onDelete: (tx) => { /* ... */ },
  compact: false  // true для компактного вида
});
```

**Параметры transaction:**
```js
{
  id: Number,
  type: String ('income'|'expense'),
  amount: Number,
  currency: String,
  category_id: Number,
  account_id: Number,
  date: String (ISO date),
  note: String
}
```

**Параметры context:**
```js
{
  categories: Array,  // { id, name, kind }
  accounts: Array     // { id, name, currency }
}
```

---

## TableBase

**Импорт:**
```js
import { createTable, renderTable, createTableWrapper } from '@components/TableBase.js';
```

**API:**
```js
// Создать таблицу с сортировкой
const tableElement = createTable({
  columns: [
    { key: 'name', label: 'Название', sortable: true },
    { key: 'amount', label: 'Сумма', sortable: true, align: 'right' },
    { key: 'date', label: 'Дата', sortable: true }
  ],
  data: items,
  renderCell: (item, column) => {
    if (column.key === 'amount') {
      return `<strong>${item.amount}</strong>`;
    }
    return item[column.key];
  },
  onSort: (sortKey, direction) => { /* обновить данные */ }
});

// Отрендерить с оберткой (включает search и pagination)
const wrapper = createTableWrapper({
  title: 'Транзакции',
  searchPlaceholder: 'Поиск...',
  onSearch: (query) => { /* фильтрация */ },
  tableConfig: { /* ... */ },
  paginationConfig: {
    currentPage: 1,
    totalPages: 5,
    onPageChange: (page) => { /* ... */ }
  }
});
```

**Параметры columns:**
```js
{
  key: String,          // ключ данных
  label: String,        // заголовок столбца
  sortable: Boolean,    // разрешить сортировку
  align: String,        // 'left'|'center'|'right'
  width: String         // '100px'|'20%'
}
```

---

## SkeletonLoader (быстрый пример)

```js
import { /* create...Skeleton helpers */ } from '../src/components/SkeletonLoader.js';
// showSkeleton(selector, skeletonEl), hideSkeleton(selector, realEl)
```

**API:**
```js
import {
  createTextSkeleton,
  createAccountCardSkeleton,
  createTransactionListSkeleton,
  createTableSkeleton,
  createFormSkeleton,
  createChartSkeleton,
  createStatsCardsSkeleton,
  showSkeleton,
  hideSkeleton
} from '@components/SkeletonLoader.js';

// Показать skeleton при загрузке
const skeleton = createAccountCardSkeleton(3); // 3 карточки
showSkeleton('#accounts-container', skeleton);

// Загрузить данные
const accounts = await fetchAccounts();

// Заменить skeleton на реальный контент
const realContent = renderAccountCards(accounts);
hideSkeleton('#accounts-container', realContent);
```

**Доступные типы:**
- `createTextSkeleton(lines, width)` — текстовые строки
- `createAccountCardSkeleton(count)` — карточки счетов
- `createTransactionListSkeleton(count)` — список транзакций
- `createTableSkeleton(rows, columns)` — таблица
- `createFormSkeleton(fields)` — форма
- `createChartSkeleton(type)` — график ('bar'|'line'|'pie')
- `createStatsCardsSkeleton(count)` — статистические карточки

---

## Layout Components

### Sidebar

**Импорт:**
```js
import { createSidebar, toggleSidebar, initResponsiveSidebar } from '@layout/Sidebar.js';
```

**API:**
```js
// Создать сайдбар с навигацией
const sidebar = createSidebar({
  currentPage: 'dashboard',  // активная страница
  collapsed: false           // начальное состояние
});

// Переключить состояние
toggleSidebar();

// Инициализировать responsive поведение
initResponsiveSidebar(); // auto-collapse < 1200px
```

**Навигация (24 страницы):**
- Dashboard, Accounts, Transactions, Categories
- Budgets, Goals, Planned, Subscriptions
- Recurring, Rules, Reports, Forecast
- Converter, Sync, Premium, Education
- Settings

---

### Header

**Импорт:**
```js
import { createHeader } from '@layout/Header.js';
```

**API:**
```js
const header = createHeader({
  title: 'Мои счета',
  user: {
    name: 'Иван Иванов',
    email: 'ivan@example.com'
  },
  onLogout: () => { /* выход */ },
  onThemeToggle: (theme) => { /* сменить тему */ }
});
```

**Функции:**
- Логотип + заголовок страницы
- Dropdown профиля (имя, email, настройки, выход)
- Переключатель темы (light/dark)
- Мобильная кнопка-гамбургер для сайдбара

---

### Layout

**Импорт:**
```js
import { createLayout, initLayout } from '@layout/Layout.js';
```

**API:**
```js
// Создать полный layout (Header + Sidebar + Content)
const layout = createLayout({
  title: 'Дашборд',
  user: { name: 'User', email: 'user@mail.com' },
  currentPage: 'dashboard',
  content: '<div>Контент страницы</div>'
});

// Инициализировать с callback
initLayout({
  title: 'Дашборд',
  user: { /* ... */ },
  currentPage: 'dashboard',
  onReady: () => {
    // Загрузить данные и отрендерить контент
    loadDashboard();
  }
});
```

**Методы:**
- `showLoader()` — показать индикатор загрузки
- `hideLoader()` — скрыть индикатор
- Responsive закрытие sidebar на mobile < 900px

---

## Store (State Management)

**Импорт:**
```js
import globalStore from '@modules/store.js';
```

**API:**
```js
// Чтение состояния
const user = globalStore.state.user;
const accounts = globalStore.state.accounts;

// Изменение состояния (автоматически уведомляет подписчиков)
globalStore.state.isLoading = true;
globalStore.state.accounts = [...newAccounts];

// Подписка на изменения
const unsubscribe = globalStore.subscribe('user', (newValue, oldValue) => {
  console.log('User changed:', newValue);
});

// Пакетное обновление (один trigger для всех подписчиков)
globalStore.batch({
  accounts: [...],
  transactions: [...],
  isLoading: false
});

// Сброс состояния
globalStore.reset();
```

**Глобальное состояние:**
```js
{
  user: null,           // текущий пользователь
  accounts: [],         // список счетов
  transactions: [],     // транзакции
  categories: [],       // категории
  budgets: [],          // бюджеты
  filters: {            // фильтры
    dateFrom: null,
    dateTo: null,
    type: 'all',
    categoryId: null,
    accountId: null
  },
  ui: {                 // UI состояние
    sidebarCollapsed: false,
    theme: 'light',
    isLoading: false
  }
}
```

---

## Charts (Визуализация)

**Импорт:**
```js
import {
  createExpensesByCategoryChart,
  createCashflowChart,
  createBudgetForecastChart,
  renderChart
} from '@modules/charts.js';
```

**API:**
```js
// Donut chart — расходы по категориям
const expensesConfig = createExpensesByCategoryChart(
  expenses,      // транзакции
  categories,    // категории
  'USD'          // валюта
);
renderChart('canvas-id', expensesConfig);

// Bar chart — cashflow по месяцам
const cashflowConfig = createCashflowChart(
  transactions,  // все транзакции
  6,             // последние 6 месяцев
  'RUB'          // валюта
);
renderChart('cashflow-canvas', cashflowConfig);

// Line chart — прогноз бюджета
const forecastConfig = createBudgetForecastChart(
  budgets,       // бюджеты
  transactions,  // транзакции
  3              // прогноз на 3 месяца
);
renderChart('forecast-canvas', forecastConfig);
```

**Требование:** Chart.js должен быть подключен (CDN или npm)

---

## Helpers (Утилиты)

**Импорт:**
```js
import {
  formatCurrency,
  formatDate,
  convertCurrency,
  groupTransactions,
  calculateBudgetProgress,
  debounce,
  generateId,
  deepClone
} from '@modules/helpers.js';
```

**API:**
```js
// Форматирование валюты
formatCurrency(1234.56, 'USD');  // "$1,234.56"
formatCurrency(1234.56, 'RUB');  // "1 234,56 ₽"

// Форматирование даты
formatDate('2025-11-14', 'short');     // "14.11.2025"
formatDate('2025-11-14', 'long');      // "14 ноября 2025"
formatDate('2025-11-14', 'relative');  // "сегодня"

// Конвертация валют
convertCurrency(100, 'USD', 'EUR');    // 94

// Группировка транзакций по периоду
groupTransactions(transactions, 'month');  // { '2025-01': [...], '2025-02': [...] }
groupTransactions(transactions, 'week');
groupTransactions(transactions, 'day');

// Прогресс бюджета
calculateBudgetProgress(budget, spent);  // { percent: 75, status: 'warning' }

// Debounce для поиска
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

// Генерация ID
generateId();  // "1731592800000_xyz123"

// Глубокое клонирование
const copy = deepClone(originalObject);
```

---

## Примечания

- **Для старых страниц** используйте относительные импорты: `../src/components/`
- **Для новой архитектуры** используйте алиасы Vite: `@components`, `@modules`, `@layout`
- **Vite build** требуется после изменений: `npm run build`
- **CSS стили** для компонентов в `public/css/layout-components.css`
- **Dark mode** поддерживается через `data-theme="dark"` на `<html>`

---

## Миграция страниц

### Чеклист для миграции legacy страниц:

1. ✅ Заменить `alert()` → `toastSuccess/Error/Warning/Info`
2. ✅ Заменить `confirm()` → `confirmModal()`
3. ✅ Использовать `Layout.js` для header + sidebar
4. ✅ Заменить inline forms на `FormBase.js`
5. ✅ Добавить `SkeletonLoader` при загрузке данных
6. ✅ Использовать `globalStore` для state management
7. ✅ Подключить через `vite.config.js` entry point

### Пример миграции (accounts.html):

**До** (~180 строк HTML):
```html
<body>
  <nav>...</nav>
  <main>
    <h1>Мои счета</h1>
    <div id="accounts-list">...</div>
  </main>
  <script src="js/accounts.js"></script>
</body>
```

**После** (~35 строк HTML):
```html
<body>
  <div id="app"></div>
  <script type="module" src="/js/accounts.js"></script>
</body>
```

**frontend/pages/accounts.js**:
```js
import { initLayout } from '@layout/Layout.js';
import { renderAccountCards } from '@components/CardAccount.js';
import { toastSuccess, toastError } from '@components/Toast.js';
import { confirmModal } from '@components/ModalBase.js';

initLayout({
  title: 'Мои счета',
  currentPage: 'accounts',
  onReady: async () => {
    const accounts = await fetchAccounts();
    renderAccountCards(accounts, 'content', {
      onEdit: editAccount,
      onDelete: async (acc) => {
        const ok = await confirmModal({ title: 'Удалить счёт?', danger: true });
        if (ok) {
          await deleteAccount(acc.id);
          toastSuccess('Счёт удалён');
        }
      }
    });
  }
});
```

---

## API Layer (Unified API Client)

**Импорт:**
```js
import API from '@modules/api.js';
// Или отдельные API модули:
import { TransactionsAPI, AccountsAPI } from '@modules/api.js';
```

**Структура API:**
```js
API = {
  transactions: TransactionsAPI,
  accounts: AccountsAPI,
  categories: CategoriesAPI,
  budgets: BudgetsAPI,
  goals: GoalsAPI,
  subscriptions: SubscriptionsAPI,
  planned: PlannedAPI,
  rules: RulesAPI,
  sync: SyncAPI,
  utils: UtilsAPI
}
```

**Примеры использования:**

### CRUD операции
```js
// Получить все транзакции
const transactions = await API.transactions.getAll();

// Получить с фильтрами
const filtered = await API.transactions.getAll({
  type: 'expense',
  categoryId: 5,
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31'
});

// Создать транзакцию
const newTx = await API.transactions.create({
  account_id: 1,
  category_id: 2,
  type: 'expense',
  amount: 100,
  currency: 'USD',
  date: '2025-11-14',
  note: 'Grocery shopping'
});

// Обновить транзакцию
const updated = await API.transactions.update(5, {
  amount: 150,
  note: 'Updated note'
});

// Удалить транзакцию
await API.transactions.delete(5);

// Аналогично для всех остальных entity:
await API.accounts.create({ name: 'Savings', currency: 'USD', balance: 1000 });
await API.categories.update(3, { name: 'New name' });
await API.budgets.delete(7);
```

### Утилиты
```js
// Конвертация валют
const result = await API.utils.convertCurrency(100, 'USD', 'EUR');
// { from: 'USD', to: 'EUR', amount: 94 }

// Получить курсы
const rates = await API.utils.getRates('USD', 'EUR');
// { base: 'USD', quote: 'EUR', rate: 0.94 }

// AI прогноз
const forecast = await API.utils.getForecast();
// { predicted_income: 5000, predicted_expense: 3000 }
```

### Банковская синхронизация
```js
// Получить список банков
const banks = await API.sync.getBanks();

// Подключить банк
await API.sync.connect({
  bank_id: 1,
  account_id: 2,
  credentials: { /* ... */ }
});

// Синхронизировать транзакции
const result = await API.sync.syncTransactions(connectionId);
// { synced: 5, transactions: [...], skipped: [...] }
```

**Особенности:**
- ✅ Автоматический retry при ошибках (до 2 раз)
- ✅ Timeout 10 секунд для всех запросов
- ✅ Обработка ошибок с понятными сообщениями
- ✅ Backward compatibility с `fetchData()`

---

## Validation (Универсальная валидация)

**Импорт:**
```js
import { ValidationRules, Schemas, validateEntity, validateForm } from '@modules/validation.js';
```

**Правила валидации:**

```js
// Базовые правила
ValidationRules.required(value)          // Обязательное поле
ValidationRules.email(value)             // Email формат
ValidationRules.minLength(5)(value)      // Минимальная длина
ValidationRules.maxLength(50)(value)     // Максимальная длина
ValidationRules.min(0)(value)            // Минимальное значение
ValidationRules.max(1000)(value)         // Максимальное значение
ValidationRules.pattern(/regex/, msg)(value)  // Regex паттерн
ValidationRules.numeric(value)           // Только числа
ValidationRules.alphanumeric(value)      // Буквы и цифры
ValidationRules.url(value)               // URL формат
ValidationRules.date(value)              // Дата YYYY-MM-DD
ValidationRules.currency(value)          // USD|EUR|PLN|RUB
ValidationRules.positive(value)          // Положительное число
```

**Использование схем:**

```js
// Валидация по схеме entity
const { isValid, errors } = validateEntity('transaction', {
  account_id: 1,
  category_id: 2,
  type: 'expense',
  amount: -100,  // ❌ Ошибка: должно быть положительным
  currency: 'USD',
  date: '2025-11-14',
  note: 'Test'
});

if (!isValid) {
  console.error(errors);
  // { amount: 'Значение должно быть положительным' }
}
```

**Валидация форм:**

```js
const form = document.querySelector('form');

// Валидировать форму и показать ошибки в DOM
const { isValid, values, errors } = validateForm(form, Schemas.transaction);

if (isValid) {
  // Отправить данные
  await API.transactions.create(values);
} else {
  // Ошибки уже показаны в DOM с классом .field-error
  console.log('Форма содержит ошибки:', errors);
}
```

**Создание кастомных валидаторов:**

```js
import { createValidator } from '@modules/validation.js';

const isEvenNumber = createValidator(
  (value) => Number(value) % 2 === 0,
  'Число должно быть четным'
);

const error = isEvenNumber(5);
// 'Число должно быть четным'
```

**Доступные схемы:**
- `Schemas.account` - Валидация счета
- `Schemas.transaction` - Валидация транзакции
- `Schemas.category` - Валидация категории
- `Schemas.budget` - Валидация бюджета
- `Schemas.goal` - Валидация цели
- `Schemas.subscription` - Валидация подписки
- `Schemas.planned` - Валидация планируемой операции

---

**Версия документации**: 1.1  
**Последнее обновление**: 2025-11-14  
**Статус**: Фазы 2-3 завершены ✅, Фаза 4 в процессе (40%)
