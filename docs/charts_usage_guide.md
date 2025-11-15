# 📊 Руководство по использованию графиков ApexCharts

## Быстрый старт

### Импорт модуля
```javascript
import { renderBarChart, renderDonutChart, renderMultiBarChart, renderLineChart } from '../modules/charts.js';
```

## API функций

### 1. Столбчатая диаграмма
```javascript
renderBarChart(elementId, labels, values, currency)
```

**Параметры:**
- `elementId` (string) - ID контейнера
- `labels` (string[]) - Названия категорий
- `values` (number[]) - Значения
- `currency` (string, optional) - Валюта (по умолчанию 'USD')

**Пример:**
```javascript
const categories = ['Продукты', 'Транспорт', 'Развлечения'];
const expenses = [1500, 800, 600];
await renderBarChart('expenseChart', categories, expenses, 'RUB');
```

### 2. Круговая диаграмма (Donut)
```javascript
renderDonutChart(elementId, labels, values, currency)
```

**Параметры:** те же, что у `renderBarChart`

**Пример:**
```javascript
await renderDonutChart('expensePie', categories, expenses, 'USD');
```

### 3. Множественные столбцы (сравнение)
```javascript
renderMultiBarChart(elementId, labels, series, currency)
```

**Параметры:**
- `elementId` (string) - ID контейнера
- `labels` (string[]) - Подписи оси X
- `series` (Array<{name: string, data: number[]}>) - Серии данных
- `currency` (string, optional) - Валюта

**Пример:**
```javascript
await renderMultiBarChart(
  'forecastChart',
  ['30 дней'],
  [
    { name: 'Доход', data: [5000] },
    { name: 'Расход', data: [3500] }
  ],
  'EUR'
);
```

### 4. Линейный график (тренды)
```javascript
renderLineChart(elementId, labels, series, currency)
```

**Параметры:** те же, что у `renderMultiBarChart`

**Пример:**
```javascript
await renderLineChart(
  'trendChart',
  ['Янв', 'Фев', 'Мар', 'Апр'],
  [
    { name: 'Доходы', data: [4000, 4500, 4200, 5000] },
    { name: 'Расходы', data: [3000, 3200, 3100, 3500] }
  ],
  'PLN'
);
```

## HTML разметка

### Контейнер для графика
```html
<div class="chart-container">
  <div id="myChart" aria-label="Описание графика" role="img"></div>
</div>
```

### Split контейнер (график + список)
```html
<div class="chart-container chart-container--split">
  <div id="myChart" aria-label="График расходов" role="img"></div>
  <div class="top-list">
    <h3>Топ категорий</h3>
    <ul id="topCategories"></ul>
  </div>
</div>
```

## Стилизация

### Базовые стили
Графики автоматически используют CSS переменные:
- `--primary` - основной цвет
- `--accent` - акцентный цвет
- `--text` - цвет текста
- `--bg-base` - фон
- `--border-color` - цвет границ

### Тёмная тема
Графики автоматически адаптируются при наличии:
```javascript
document.documentElement.classList.contains('dark')
// или
document.body.classList.contains('dark')
```

### Кастомные размеры
```css
.chart-container {
  min-height: 400px; /* изменить высоту */
}
```

## Адаптивность

### Автоматическое масштабирование
Графики адаптируются под размер контейнера:
- 360px - минимальная ширина (мобильные)
- 768px - планшеты
- 1024px+ - десктоп

### Отключение легенды на мобильных
```javascript
responsive: [{
  breakpoint: 768,
  options: {
    legend: {
      show: false
    }
  }
}]
```

## Продвинутые настройки

### Изменение анимации
Отредактируйте `getBaseOptions()` в `charts.js`:
```javascript
animations: {
  speed: 1200, // медленнее
  easing: 'easein' // другой эффект
}
```

### Добавление новых цветов
```javascript
colors: [
  colors.primary,
  colors.accent,
  colors.danger,
  '#your-color' // свой цвет
]
```

### Экспорт графика
```javascript
chart: {
  toolbar: {
    show: true,
    tools: {
      download: true // включить кнопку экспорта
    }
  }
}
```

## Отладка

### Проверка загрузки библиотеки
```javascript
if (window.ApexCharts) {
  console.log('✅ ApexCharts загружен');
} else {
  console.error('❌ ApexCharts не загружен');
}
```

### Проверка рендеринга
```javascript
const chart = await renderBarChart('test', ['A'], [10], 'USD');
if (chart) {
  console.log('✅ График отрисован');
}
```

## Производительность

### Оптимизация больших датасетов
Для >50 категорий используйте группировку:
```javascript
const topN = 10;
const sorted = entries.sort((a, b) => b.value - a.value);
const top = sorted.slice(0, topN);
const other = sorted.slice(topN).reduce((sum, e) => sum + e.value, 0);
if (other > 0) {
  top.push({ label: 'Другие', value: other });
}
```

### Кэширование графиков
```javascript
let cachedChart = null;

async function updateChart(data) {
  if (cachedChart) {
    cachedChart.destroy(); // удалить старый
  }
  cachedChart = await renderBarChart('chart', data.labels, data.values);
}
```

## Примеры использования

### Dashboard - расходы по категориям
```javascript
async function initDashboard() {
  const transactions = await fetchData('/api/transactions');
  const categories = await fetchData('/api/categories');
  
  // Группировка данных
  const expenseMap = new Map();
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      const catName = categories.find(c => c.id === tx.category_id)?.name || 'Другое';
      expenseMap.set(catName, (expenseMap.get(catName) || 0) + tx.amount);
    }
  });
  
  const labels = Array.from(expenseMap.keys());
  const values = Array.from(expenseMap.values());
  
  // Рендерим график
  await renderBarChart('expenseChart', labels, values, 'USD');
}
```

### Reports - отчёт за период
```javascript
async function generateReport(startDate, endDate) {
  const transactions = await fetchData(`/api/transactions?start=${startDate}&end=${endDate}`);
  
  // Группировка и сортировка
  const grouped = groupByCategory(transactions);
  const sorted = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
  
  // Топ 8 + остальные
  const top8 = sorted.slice(0, 8);
  const other = sorted.slice(8).reduce((sum, [_, val]) => sum + val, 0);
  
  const labels = top8.map(([name]) => name);
  const values = top8.map(([_, val]) => val);
  
  if (other > 0) {
    labels.push('Другие');
    values.push(other);
  }
  
  // Два графика: столбцы и круг
  await Promise.all([
    renderBarChart('reportChart', labels, values, 'RUB'),
    renderDonutChart('reportPie', labels, values, 'RUB')
  ]);
}
```

### Forecast - прогноз на 30 дней
```javascript
async function showForecast() {
  const forecast = await fetchData('/api/forecast');
  
  const income = forecast.predicted_income;
  const expense = forecast.predicted_expense;
  
  await renderMultiBarChart(
    'forecastChart',
    ['30 дней'],
    [
      { name: 'Прогноз дохода', data: [income] },
      { name: 'Прогноз расхода', data: [expense] }
    ],
    'USD'
  );
}
```

## Устранение неполадок

### График не отображается
1. Проверьте ID контейнера: `document.getElementById('yourId')`
2. Убедитесь, что контейнер существует до вызова функции
3. Проверьте консоль на ошибки загрузки ApexCharts

### Неправильные цвета
1. Проверьте CSS переменные: `getComputedStyle(document.documentElement)`
2. Убедитесь, что `tokens.css` загружен

### Медленный рендеринг
1. Уменьшите количество точек данных (< 50)
2. Отключите анимации: `animations: { enabled: false }`
3. Упростите градиенты

---

**Версия:** 1.0  
**Дата:** 2025-01-16  
**Документация ApexCharts:** https://apexcharts.com/docs/
