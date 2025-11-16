# BACKEND.md — FinTrackr

## Overview
FinTrackr backend runs on Express 5 with SQLite (`better-sqlite3`). This document captures the current architecture after re-enabling CSRF validation and fixing the session layer.

## Boot & configuration
- Entry point: `backend/index.js` (initializes SQLite, starts `app.js`).
- Environment variables (see `.env.example`): `JWT_SECRET`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `PORT`, `FINTRACKR_DISABLE_PERSIST`.
- npm scripts:
  - `npm start` / `npm run dev` – Express API.
  - `npm run db:init` – create `backend/fintrackr.db` from `database/schema.sql` and import `data.json` if present.
  - `npm run start:legacy` – legacy monolithic server (`backend/server.js`).

## Layout
```
backend/
  app.js             # Express config
  index.js           # entry point + DB init
  routes/            # REST endpoints (accounts, categories, transactions, ...)
  services/          # authService, dataService.new, analyticsService, currencyService
  middleware/        # auth, csrf, security, validation, cache, errorHandler
  database/          # schema.sql, init.js (migrate JSON to SQLite)
  utils/             # logger (Winston)
```

### Middleware
- `security.js` – rate limiter, security headers, input sanitization, request logger (dev only).
- `csrf.js` – stores tokens in memory (15‑minute TTL), ties them to `userId`, validates all unsafe methods except `/api/login|register|refresh`, exposes `/api/csrf-token` which now requires `authenticateRequest`.
- `auth.js` – parses JWT from cookies, checks blacklist, fills `req.user = { id, email }`.
- `validation.js` – Joi schemas + `validate()` helper (auth, transactions, etc.).
- `errorHandler.js` – AppError hierarchy, consistent JSON responses, stack traces only in dev.

### Services
- `services/dataService.new.js` – synchronous SQLite wrapper for users, accounts, categories, transactions, budgets, goals, planned operations, recurring entries, refresh tokens, blacklist and sessions.
- `services/authService.js` – issues JWT with the `sub` claim, manages refresh tokens/blacklist, hashes passwords.
- `services/analyticsService.js` + `services/mlAnalyticsService.js` – compute trends, anomalies, savings and recurring hints.
- `services/currencyService.js` – converts amounts using `RATE_MAP` and (optionally) external APIs.

### Routers
| Endpoint | Middleware | Description |
|----------|------------|-------------|
| `/api/register`, `/api/login`, `/api/logout`, `/api/refresh`, `/api/session` | rateLimiter + Joi | Auth flows, logout clears tokens, session returns `{ user }`. |
| `/api/accounts` | `authenticateRequest` | CRUD accounts + balance adjustments. |
| `/api/categories` | Auth | CRUD categories. |
| `/api/transactions` | Auth + validation | CRUD transactions, updates account balances and budgets. |
| `/api/budgets`, `/api/goals`, `/api/planned` | Auth | Budgeting and planning modules. |
| `/api/rules` | Auth | Text classification rules for auto-categorizing transactions. |
| `/api/analytics/*` | Auth | Forecast, trends, categories, anomalies, savings, insights. |
| `/api/recurring` | Auth | Returns `{ recurring: [...] }` directly from SQLite. |
| `/api/rates`, `/api/convert`, `/api/banks` | public GET | Exchange rates and mock bank list (used by the sync UI). |
| `/api/sync/*` | Auth (TODO) | Placeholder routes for future bank connectors. |

### Static assets
`app.js` serves `public/` (landing/dashboard/etc.) and ensures non-API routes fall back to 404/HTML responses while API routes return JSON only.

## Auth flow
1. `/api/login` hashes the password, issues access + refresh tokens, stores refresh token, responds with `{ user }` while setting cookies.
2. Frontend saves the user in sessionStorage and calls `/api/session` to sync.
3. Each unsafe request carries `X-CSRF-Token` (frontend fetch wrapper). The middleware decodes `access_token`, resolves `userId`, compares tokens and rejects invalid/missing ones.
4. `/api/logout` removes the refresh token, blacklists the access token and clears cookies.

## Logging & monitoring
- Winston (see `utils/logger.js`) writes JSON logs to `logs/combined.log` and `logs/error.log`, rotates files by size, prints colorized output in development.
- Morgan handles concise HTTP logs; an extra middleware calls `logger.logRequest` with method/url/status/duration.
- The global `errorHandler` prints the stack trace only when `NODE_ENV !== 'production'`.

## Testing
- Jest + Supertest tests live in `backend/__tests__`; run `npm run test:backend` (sets `FINTRACKR_DISABLE_PERSIST=true`).
- Playwright e2e tests consume the real API – run `npm start` first.

## Security quick facts
- JWT payload includes `{ sub, userId, email }`; set a strong `JWT_SECRET` in production.
- Cookies are HttpOnly + SameSite + optional Secure.
- `token_blacklist` prevents reuse of recently revoked tokens.
- Rate limiting protects auth endpoints.
- Sanitizer scrubs scripts & `javascript:` URIs from `req.body` / `req.query`.
- CSRF tokens are user-bound; consider moving them to Redis if you scale horizontally.

## Outstanding backlog
- Finish the actual business logic for `/api/subscriptions` and `/api/sync/*` (currently returning placeholders).
- Add `/api/profile` + SQLite table for user preferences so the Settings page can stop using `localStorage`.
- Provide SQL migrations (or a tool) for incremental schema changes beyond `db:init`.
- Evaluate splitting CSRF tokens/refresh tokens into dedicated stores for multi-instance deployments.
