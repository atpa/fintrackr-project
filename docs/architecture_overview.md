# Архитектура FinTrackr после рефакторинга

Документ фиксирует целевую архитектуру MVP после разделения ответственностей и подготовки к дальнейшему развитию.

## Обзор

Архитектура приложения разделена на два основных контекста — **backend API** и **frontend SPA/MPA**. Backend отвечает за выдачу данных и статических ресурсов, а frontend — за визуализацию и навигацию пользователя по финансовым данным.

```mermaid
flowchart TD
    subgraph Client[Browser]
        UI[UI Components\n(Dashboard, Accounts, Transactions, Budgets)]
        Theme[Theme Manager]
        DataLayer[Data Service\n(fetch wrapper)]
    end

    subgraph Server[Node.js Backend]
        HTTP[HTTP Server & Router]
        Controllers[Endpoint Handlers]
        DataAccess[Data Access Layer]
        Storage[(data.json / future DB)]
        Static[Static Assets Delivery]
    end

    subgraph Integrations[Future Services]
        OpenBanking[[Open Banking APIs]]
        Currency[[FX Rates Provider]]
        AIEngine[[AI Analytics Service]]
    end

    UI -->|user actions| Theme
    UI --> DataLayer
    DataLayer -->|GET /api/*| HTTP
    HTTP --> Controllers
    Controllers --> DataAccess
    DataAccess --> Storage
    Static --> UI

    Controllers -. roadmap .-> Integrations
```

## Backend слои

1. **HTTP Server & Router** (`server.js`)
   - Инициализация Node.js сервера на порту 3000.
   - Раздача статических файлов из `public/`.
   - Маршрутизация REST эндпоинтов `/api/accounts`, `/api/categories`, `/api/transactions`, `/api/budgets`.
2. **Endpoint Handlers** (внутри `server.js`)
   - Обрабатывают запросы, возвращая данные в формате JSON.
   - Подготавливают почву для переноса логики в отдельные контроллеры и middleware.
3. **Data Access Layer**
   - В текущем MVP представлен функциями чтения из `data.json`.
   - Планируется выделение в модуль `repositories/` с поддержкой различных хранилищ.
4. **Storage**
   - Сейчас — локальный файл `backend/data.json`.
   - Следующий этап — переход на реляционную БД с миграциями.

## Frontend компоненты

1. **Dashboard** (`public/index.html`, `public/js/app.js`)
   - Визуализирует агрегированные показатели и графики Canvas.
2. **Accounts** (`public/accounts.html`, `public/js/accounts.js`)
   - Список счетов и балансы.
3. **Transactions** (`public/transactions.html`, `public/js/transactions.js`)
   - Таблица операций, фильтрация по периоду, категориям и типам.
4. **Budgets** (`public/budgets.html`, `public/js/budgets.js`)
   - Карточки бюджетов с прогрессом.
5. **Theme Manager** (`public/css/style.css` и вспомогательные функции JS)
   - Управляет светлой/тёмной темами и адаптивными breakpoint‑ами.
6. **Data Service**
   - Функции `fetch` в `public/js/app.js`, отвечающие за запросы к API и трансформацию данных.

## Потоки данных

1. Пользователь взаимодействует с UI компонентов.
2. Компоненты обращаются к Data Service.
3. Data Service вызывает REST эндпоинты backend.
4. Backend читает данные через Data Access Layer и возвращает JSON.
5. UI обновляет визуализацию.

## Подготовка к развитию

- Выделены точки расширения для подключения внешних интеграций и AI‑сервисов.
- Планируется вынесение бизнес‑логики в отдельные контроллеры и сервисы для упрощения тестирования.
- Документ обновляется вместе с roadmap: каждая новая интеграция фиксируется в блоке `Integrations` диаграммы.
