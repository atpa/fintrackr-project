# FinTrackr AI Agent Instructions

## Project Overview

FinTrackr is a **personal finance tracker MVP** built as an academic capstone project. The codebase is currently monolithic (`backend/server.js` ~2000 lines) but actively refactoring toward modular services. The app uses **Node.js HTTP server** (no Express), **JSON file storage** (migrating to DB), **vanilla JavaScript** frontend (no frameworks), and JWT cookie-based authentication.

**Key Fact**: This is a transitional architecture. Some services exist (`backend/services/`) but aren't fully integrated. Always check comments in `server.js` before major changes.

## Architecture Patterns

### Backend Structure (Node.js)

- **Monolithic Entry Point**: `backend/server.js` handles routing, authentication, and all business logic inline
- **Target Architecture**: Modular services in `backend/services/` + `backend/utils/` (see `server.refactored.js` for planned structure)
- **Data Persistence**: 
  - `backend/data.json` is the single source of truth
  - Use `FINTRACKR_DISABLE_PERSIST=true` env var to disable writes during tests
  - Data structure has 12 collections: `users`, `accounts`, `categories`, `transactions`, `budgets`, `goals`, `planned`, `subscriptions`, `rules`, `recurring`, `refreshTokens`, `tokenBlacklist`, `bankConnections`
- **Authentication Flow**:
  - JWT tokens stored in **HttpOnly cookies** (`access_token`, `refresh_token`)
  - Blacklist pattern for logout (tokens added to `tokenBlacklist` array)
  - Fallback: Legacy `X-User-Id` header support (being phased out)
  - Helper: `authenticateRequest(req)` returns `{ok, user, token}` or `{ok: false, error}`

### Frontend Structure (Vanilla JS)

- **No Build Step for HTML**: Static files in `public/*.html` served directly
- **ES6 Modules**: Frontend code in `frontend/pages/*.js` and `frontend/modules/*.js`
- **Build Tool**: Vite bundles `frontend/` into `public/js/` (run via `npx vite build`)
- **Key Modules**:
  - `frontend/modules/auth.js`: Auth state in localStorage (key: `'user'`), provides `Auth.isLoggedIn()`, `Auth.getUser()`
  - `frontend/modules/api.js`: Simple `fetchData(endpoint)` wrapper
  - `frontend/modules/navigation.js`: Sidebar injection, logout handling
  - `frontend/modules/profile.js`: User settings (theme, currency preferences)
- **CSS Architecture**:
  - Single stylesheet: `public/css/style.css` (~2000 lines)
  - CSS custom properties for theming (`--primary-color`, `--bg-color`, etc.)
  - Theme switching: `data-theme="light|dark"` on `<html>` element

### Currency Conversion

**Critical**: All components use shared hardcoded rates (sync between frontend/backend):

```javascript
const RATE_MAP = {
  USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
  EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
  PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
  RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 }
};
```

When adding currency features:
1. Update `RATE_MAP` in both `backend/server.js` and relevant frontend page
2. Use `convertAmount(amount, fromCur, toCur)` helper (exists in both contexts)
3. Check `/api/convert` endpoint for dynamic rates (uses exchangerate.host with fallback to `RATE_MAP`)

## Development Workflows

### Running the Application

```powershell
# Start backend (serves API + static files on port 3000)
npm start                    # Default port 3000
npm run start:8080          # Alternative port
$env:PORT=4000; npm start   # Custom port

# IMPORTANT: No separate frontend dev server - Vite only for builds
# Browse to http://localhost:3000 after starting backend
```

### Testing Strategy

```powershell
# Backend unit tests (Jest + Supertest)
npm run test:backend

# E2E tests (Playwright)
npm run test:e2e

# CRITICAL: Always set FINTRACKR_DISABLE_PERSIST=true in test env
# (already configured in package.json scripts and jest.config.js)
```

**Test Isolation**: Tests call `serverModule.setData(cloneData())` to reset state. Never modify `data.json` directly in tests.

### Code Quality

```powershell
# Linting (backend only - frontend excluded in eslint.config.js)
npm run lint

# ESLint config ignores: public/**, docs/**, coverage/**
```

## API Conventions

### Endpoint Patterns

```
Authentication (no auth required):
  POST /api/register    { name, email, password }
  POST /api/login       { email, password }
  POST /api/logout      (invalidates tokens)
  GET  /api/session     (checks auth + refreshes if needed)

Protected Resources (JWT cookie or X-User-Id header):
  GET    /api/{resource}           # List
  POST   /api/{resource}           # Create
  PUT    /api/{resource}/:id       # Update (full)
  PATCH  /api/{resource}/:id       # Update (partial)
  DELETE /api/{resource}/:id       # Delete
```

**User Scoping**: All resources filter by `user_id`. The `currentUserId` is extracted from JWT payload or legacy header. Always use `filterForUser(collection)` helper in handlers.

### Request/Response Patterns

- **Content-Type**: Always `application/json; charset=utf-8`
- **Error Format**: `{ error: "message" }` with appropriate HTTP status
- **Success Format**: Return created/updated entity or `{ success: true }`
- **Validation**: Check required fields first, return 400 with descriptive error

Example from `server.js`:
```javascript
if (!payload.name || !payload.currency) {
  return sendJson(res, { error: "Missing account parameters" }, 400);
}
```

## Data Relationships & Side Effects

### Budget Auto-Management

When creating/deleting `expense` transactions:
1. Find budget by `{user_id, category_id, month}` (month derived from `tx.date`)
2. Auto-create budget if missing (`limit: 0, spent: 0`)
3. Update `budget.spent` using `convertAmount()` to budget's currency
4. Use helpers: `resolveBudgetForExpense(data, tx, userId, createIfMissing)` and `adjustBudgetWithTransaction(budget, tx, direction)`

### Account Balance Updates

Transaction CRUD directly mutates `account.balance`:
- **Create**: `balance += amount` (income) or `balance -= amount` (expense) - converted to account currency
- **Delete**: Reverse the operation
- **Update**: Rollback old values, apply new ones

**Critical**: Always convert transaction amount to account currency before adjusting balance.

### Category Deletion Cascade

Deleting a category (`DELETE /api/categories/:id`):
1. Remove category from `data.categories`
2. Delete related budgets: `budgets.filter(b => b.category_id !== catId)`
3. Delete related planned operations: `planned.filter(p => p.category_id !== catId)`
4. Nullify `category_id` in transactions: `tx.category_id = null`

## Common Pitfalls & Solutions

### 1. Port Conflicts
**Issue**: Server fails to start on port 3000  
**Solution**: Check running processes with `Get-NetTCPConnection -LocalPort 3000` (PowerShell), kill if needed, or use alternative port

### 2. Data Persistence in Tests
**Issue**: Tests pollute `data.json`  
**Solution**: Always set `FINTRACKR_DISABLE_PERSIST=true` (check `jest.config.js` and test file imports)

### 3. Frontend Changes Not Reflecting
**Issue**: Edited `frontend/pages/` but no effect  
**Solution**: Run `npx vite build` to bundle into `public/js/`. Alternatively, edit `public/js/` directly for quick iteration (but loses source map)

### 4. Authentication Failures
**Issue**: API returns 401 after implementing new endpoint  
**Solution**: 
- Check if endpoint is in `isPublicApiRequest(method, pathname)` whitelist
- Verify JWT cookie extraction: `parseCookies(req)` then check `cookies.access_token`
- Confirm token isn't blacklisted: `isTokenBlacklisted(token)`

### 5. Currency Mismatches
**Issue**: Balances/budgets don't update correctly  
**Solution**: Always use `convertAmount(amount, fromCur, toCur)` before adding to balances. Check that `RATE_MAP` is synchronized between frontend and backend.

## Adding New Features

### New API Endpoint Checklist

1. **Choose HTTP method** (GET/POST/PUT/DELETE)
2. **Add route in `handleApi()`** switch/if block in `server.js`
3. **Implement validation** (required fields, types, permissions)
4. **Handle data mutations** (use `persistData()` after changes)
5. **Consider side effects** (budget updates, balance changes, cascading deletes)
6. **Write tests** in `backend/__tests__/server.test.js` using Supertest
7. **Update frontend module** (e.g., `frontend/pages/transactions.js`) to call new endpoint

### New Frontend Page Checklist

1. **Create HTML** in `public/[pagename].html` (copy structure from existing pages)
2. **Create JS module** in `frontend/pages/[pagename].js`
3. **Import shared modules**: `auth.js`, `api.js`, `navigation.js`, `profile.js`
4. **Initialize navigation**: Call `initNavigation()` in page's `DOMContentLoaded`
5. **Add sidebar link** in `navigation.js` `buildSidebarHTML()` function
6. **Run Vite build**: `npx vite build` to generate bundle
7. **Update `vite.config.js`** if new entry point needed (add to `inputs` object)

## Refactoring Guidelines

**Current Priority**: Migrate logic from monolithic `server.js` to modular services

- **In Progress**: Services in `backend/services/` (authService, dataService, currencyService)
- **Not Yet Integrated**: These services exist but `server.js` doesn't use them fully - phase in gradually
- **Target**: See `server.refactored.js` for intended structure (routers in `backend/api/`, middleware separation)
- **Migration Strategy**: 
  1. Extract logic to service/utility module
  2. Write tests for new module
  3. Replace inline logic in `server.js` with service calls
  4. Ensure backward compatibility (keep legacy headers/endpoints during transition)

**When refactoring, preserve**:
- JWT cookie-based auth flow
- User data scoping (`user_id` filters)
- Budget/balance auto-updates
- Currency conversion consistency

## File Conventions

- **Russian comments in code**: This is intentional (academic requirement) - write new comments in Russian for consistency
- **Naming**: `camelCase` for JS variables/functions, `kebab-case` for HTML/CSS files
- **Line length**: No strict limit, but backend files are 2000+ lines (refactoring welcome)
- **Error messages**: User-facing errors in Russian, debug logs in English

## Resources & Context

- **README.md**: High-level project overview, features, API docs
- **DEPLOYMENT.md**: Hosting instructions (Railway/Render)
- **docs/architecture_overview.md**: Architecture diagrams and flows
- **docs/requirements_compliance_report.md**: Academic project checklist
- **package.json scripts**: 
  - `start` = production server
  - `dev` = same as start (no hot reload)
  - `test` = backend tests with coverage
  - `test:e2e` = Playwright integration tests

## Quick Reference: Key Files

| File | Purpose | Edit Frequency |
|------|---------|----------------|
| `backend/server.js` | Monolithic server (API + static files) | High (refactoring in progress) |
| `backend/data.json` | JSON database (12 collections) | Never (auto-generated) |
| `backend/services/*.js` | Modular services (partially integrated) | Medium (new features) |
| `frontend/pages/*.js` | Page-specific logic (ES6 modules) | High (features) |
| `frontend/modules/*.js` | Shared utilities (auth, API, nav) | Medium (infrastructure) |
| `public/css/style.css` | Global styles (~2000 lines) | Medium (UI updates) |
| `public/js/*.js` | Built frontend code (Vite output) | Never (generated from `frontend/`) |
| `vite.config.js` | Build config for frontend modules | Low (add new pages) |
| `jest.config.js` | Backend test configuration | Low (settings) |
| `playwright.config.js` | E2E test configuration | Low (settings) |

---

**Last Updated**: Generated by AI assistant analyzing codebase structure
