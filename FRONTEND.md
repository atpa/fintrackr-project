# FRONTEND.md — FinTrackr

This document summarizes the state of the FinTrackr frontend after the audit and bug fixes.

## Stack overview
- **Vite** builds every entry defined in `vite.config.js` (all pages plus the shared Sidebar component) into `public/js/` and `dist/assets/`.
- **Vanilla modules** live under `frontend/modules/`, page controllers under `frontend/pages/`, and the Sidebar component under `frontend/components/Sidebar.js`.
- **Static shells** in `public/*.html` load the compiled bundles via `<script type="module">`.
- **PWA** adds a manifest, service worker (`public/sw.js`) and IndexedDB storage (`frontend/modules/offlineStorage.js`).

## Core modules
| Module | Responsibility |
|--------|----------------|
| `frontend/modules/api.js` | Central HTTP client (CSRF token cache, JSON parsing, retries, `onUnauthorized` hook). Exports `fetchData`, `postData`, `putData`, `deleteData`, `request`, `ensureCsrfToken`, `onUnauthorized`. |
| `frontend/modules/auth.js` | Session bootstrap (sessionStorage cache, `/api/session`, `/api/logout`, theme helpers). Wraps `window.fetch` so every unsafe request carries credentials and a CSRF token. Redirects to `login.html` on 401. |
| `frontend/modules/profile.js` | Boots the protected workspace layout (checks auth, fills user info, wires login/logout links). Accepts options for public pages, login redirect, etc. |
| `frontend/modules/navigation.js` | Sidebar interactions (burger, backdrop, active link highlight, resize/escape listeners). |
| `frontend/modules/charts.js` | ApexCharts helpers (bar & donut builders with consistent colors/fonts). |
| `frontend/modules/offlineStorage.js` | IndexedDB wrapper for pending transactions, account/category caches, budgets and a sync queue. |
| `frontend/modules/loading.js`, `toast.js`, `notifications.js`, `skeleton.js` | UI utilities (spinners, toasts, notification preferences, skeletons). |

## Build workflow
```bash
# Generate production bundles
npx vite build --config vite.config.js

# Inspect generated files
ls public/js
```
Vite keeps `public/js/<entry>.js` aligned with `frontend/pages/<entry>.js`, so the static HTML shells only need `<script type="module" src="/js/<entry>.js"></script>`.

## Pages & data flow
- **Workspace pages** (`accounts`, `categories`, `budgets`, `goals`, `transactions`, `planned`, `reports`, `dashboard`, `settings`, `subscriptions`, `sync`, `forecast`, `converter`, `education`, etc.) all call `initNavigation()` and `initProfileShell()` to enforce layout + auth.
- **Dashboard (`frontend/pages/dashboard.js`)** pulls `/api/transactions`, `/api/categories`, `/api/analytics/forecast` and renders ApexCharts widgets.
- **Transactions** handles `/api/transactions`, `/api/accounts`, `/api/categories`, `/api/rules` with inline validation and optimistic updates.
- **Recurring** now consumes the real backend response (`GET /api/recurring` returns `{ recurring: [] }`).
- **Auth pages** (`login.js`, `register.js`) rely on the shared `postData` helper with `csrf:false` and immediately run `Auth.syncSession(true)`.
- **Settings** still stores visual preferences in `localStorage`, but the network layer is ready for a future `/api/profile` endpoint.
- **Subscriptions** (`subscriptions.js`) uses the shared API helpers to manage `/api/subscriptions` and keeps the list in sync after every change.
- **Bank sync** (`sync.js`) lists `/api/sync/connections`, can create a connection (`/api/sync/connect`), delete it, and trigger mock transactions through `/api/sync/transactions`.

## Network layer
1. `Auth` registers a `window.fetch` interceptor as soon as it loads (imported by `profile.js` and many pages).
2. The interceptor enforces `credentials:'include'`. For every same-origin request targeting `/api/` (excluding `login/register/refresh`), it fetches a CSRF token via `ensureCsrfToken()` and sets `X-CSRF-Token` unless it already exists.
3. The reusable `request()` helper in `api.js` handles JSON parsing, retries on `CSRF_*` server codes and notifies Auth on 401.

## State management
- **Session** – user info is cached in `sessionStorage` (`Auth.USER_KEY`). `Auth.syncSession()` refreshes it, and `Auth.handleUnauthorized()` clears it + redirects.
- **Profile settings** – `profile.js` + `notifications.js` store UI preferences in `localStorage`.
- **Offline** – `offlineStorage` keeps pending transactions/accounts/categories/budgets ready for future background sync.

## UI guidelines
- Styles are split across `css/tokens.css`, `css/style.css`, `css/design-system.css`, `css/icons.css`, `css/transitions.css`. Reuse the provided utility classes (`stat-card`, `workspace-main`, etc.).
- Always gate heavy DOM mutations behind `DOMContentLoaded` (see `initProfileShell`, `initNavigation`).
- Reuse `renderBarChart` / `renderDonutChart` to keep chart theming consistent.

## PWA details
- `public/sw.js` installs with a static asset list (`STATIC_CACHE_URLS`), cleans previous caches on `activate`, intercepts GET requests, supports manual cache clearing (`CLEAR_CACHE` message) and defines a placeholder `syncTransactions()`.
- `offline.html` provides the fallback page for navigation requests while offline.
- When adding new HTML/JS, update `STATIC_CACHE_URLS` and `public/manifest.json` accordingly.

## Testing & linting
- Frontend-specific unit tests can live next to modules (not enforced yet). Playwright e2e (`tests/`) cover high-level flows.
- Extend `eslint.config.js` to include `frontend/` when stricter linting is required.

## Development checklist
1. Declare the new page in `vite.config.js`.
2. Create the controller in `frontend/pages/` and include `initNavigation()` + `initProfileShell()`.
3. Consume API via `fetchData`/`postData` to benefit from retries/CSRF handling.
4. Keep DOM queries scoped and cache your container elements.
5. Update the service worker + manifest when shipping new public assets.
