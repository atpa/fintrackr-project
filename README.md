# FinTrackr

FinTrackr is a production-ready personal finance tracker (Node.js + Express + SQLite + Vite). The backend exposes a REST API protected by JWT cookies, the frontend is a modular Vanilla JS + Vite bundle with a service worker, and persistence lives in SQLite (with IndexedDB mirrors for offline scenarios).

## Highlights
- **Hardened authentication** – JWT stored in HttpOnly/SameSite cookies, refresh flows, aggressive rate limiting, Joi validation and centralized error handling.
- **CSRF protection** – server-issued tokens (`/api/csrf-token`) are required for any unsafe method; the frontend automatically attaches them to every `fetch` call.
- **Rich data domain** – accounts, categories, transactions, budgets, goals, analytics and planned operations are handled by `backend/routes/*` backed by `services/dataService.new.js` (SQLite WAL, migrations from `data.json`).
- **Analytics & dashboards** – forecasts, anomalies, recurring detection and visual widgets on the dashboard via ApexCharts modules.
- **PWA** – manifest, custom service worker (`public/sw.js`) with cache-first + network-first strategies, offline page, notifications and a Background Sync stub.
- **Modular frontend** – Vite compiles page-level modules (`frontend/pages/*`) and shared building blocks (`frontend/modules/*`, `frontend/components/*`).
- **Smart sync** – recurring subscriptions and mock bank connections can be managed through `/api/subscriptions` and `/api/sync/*`, so the dashboard always reflects current commitments.
- **Tooling** – Jest + Supertest for the API, Playwright e2e, ESLint, database migration utilities and npm scripts.

## Architecture
```
Frontend (Vite + JS)  <---->  Express API (app.js)
pages/, modules/, PWA          routers/, services/
        ^                                |
        |                                v
Service Worker & IndexedDB     SQLite (better-sqlite3)
(offline shell/cache)          schema + WAL + init
```
- **Backend** (`backend/app.js`) wires all middleware (security headers, logging, CSRF), mounts routers, serves `public/` and delegates errors to the global handler.
- **Data layer** (`services/dataService.new.js`) hides CRUD for SQLite (tables for every finance entity, refresh tokens, blacklist and sessions). Initialize the DB via `npm run db:init`.
- **Frontend** – each static HTML shell in `public/` loads its Vite bundle from `public/js/*.js`; sources live in `frontend/pages`. Shared modules (`api.js`, `auth.js`, `profile.js`, `navigation.js`, `charts.js`, `offlineStorage.js`) encapsulate networking and UI utilities.

## Repository layout
```
backend/
  app.js, index.js, routes/, services/, middleware/, database/
frontend/
  pages/, modules/, components/
public/
  *.html, css/, js/, sw.js, manifest.json
scripts/, tests/, dist/, docs/
```

## Quick start
1. **Install dependencies**
   ```bash
   git clone https://github.com/atpa/fintrackr-project.git
   cd fintrackr-project
   npm install
   ```
2. **Configure environment**
   ```bash
   cp .env.example .env
   # update JWT_SECRET, COOKIE_SECURE, COOKIE_SAMESITE for your environment
   ```
3. **Prepare the database**
   ```bash
   npm run db:init   # creates backend/fintrackr.db using database/schema.sql
   ```
4. **Run the API**
   ```bash
   npm start         # Express + SQLite on http://localhost:3000
   ```
5. **Build the frontend bundles**
   ```bash
   npx vite build --config vite.config.js   # outputs to public/js and dist/assets
   ```
6. **PWA** – ensure `public/manifest.json` and `public/sw.js` are reachable in production and keep `app.use(express.static(...))` enabled (see `app.js`).

### Development loop
- `npm run dev` – starts the Express API with SQLite.
- Attach Vite HMR via `npx vite --watch` or spin up `npx vite` pointing at `frontend/` while the API serves `/public` assets.
- Logging: Winston writes to `logs/combined.log` and `logs/error.log`, while Morgan + a Winston helper print concise HTTP traces to stdout.

### Testing
- `npm run test:backend` – Jest + Supertest (sets `FINTRACKR_DISABLE_PERSIST=true`).
- `npm run test:e2e` – Playwright e2e (start the API first).
- `npm run lint` – ESLint for `backend/` (extend to `frontend/` if needed).

## Networking & security
- `frontend/modules/api.js` – single entry point for REST calls. Responsibilities: caching CSRF tokens, automatic retries on `CSRF_*` errors, JSON parsing and bubbling 401 events to the Auth module.
- `frontend/modules/auth.js` – manages sessionStorage, `/api/session` syncing, `/api/logout` and now wraps the global `window.fetch` (forces `credentials:'include'` and injects CSRF headers for every unsafe API call).
- Server-side `middleware/csrf.js` validates tokens before routers execute and `/api/csrf-token` is gated by `authenticateRequest`.

## PWA & offline
- Service worker (`public/sw.js`) pre-caches shell HTML/CSS/JS and uses network-first for API GETs (with runtime cache fallback).
- `frontend/modules/offlineStorage.js` contains IndexedDB stores for pending transactions, cached accounts/categories/budgets and a sync queue stub.
- The manifest (`public/manifest.json`) defines icons, shortcuts and uses `/dashboard.html` as the start URL.

## Deployment notes
1. Build the frontend (`npx vite build`).
2. Set production secrets (`JWT_SECRET`, `COOKIE_SECURE=true`, strict SameSite mode, TLS in front of Express`).
3. Run `npm start` behind a reverse proxy (NGINX/Caddy) with HTTPS so PWA/service worker features function.
4. Rotate logs and back up `backend/fintrackr.db` (WAL files included).

## Common tasks
- **Schema updates** – edit `backend/database/schema.sql`, run `npm run db:init` for fresh installs, or ship SQL migrations for live systems.
- **New API endpoints** – add a router in `backend/routes`, mount it in `app.js`, extend `services/*.js` as needed.
- **New pages** – create `frontend/pages/<page>.js`, add the entry to `vite.config.js`, and include the module via `<script type="module">` in the corresponding `public/*.html` file.

## License
MIT (see `LICENSE`).
