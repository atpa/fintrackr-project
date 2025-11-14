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
- **ES6 Modules**: Frontend code in TWO locations (transitional):
  - `frontend/pages/*.js` - Legacy page modules (being migrated)
  - `frontend/src/` - New modular architecture (components/, modules/, layout/)
  - `frontend/modules/` - Shared utilities (auth, API, navigation)
- **Build Tool**: Vite bundles `frontend/` into `public/js/` (run via `npm run build`)
  - Config: `vite.config.js` defines entry points for all pages and components
  - Output: `dist/assets/` → manually copy to `public/js/` (or automated in build script)
- **Key Shared Modules**:
  - `frontend/modules/auth.js`: Auth state in localStorage (key: `'user'`), provides `Auth.isLoggedIn()`, `Auth.getUser()`
  - `frontend/modules/navigation.js`: Sidebar injection, logout handling
  - `frontend/modules/profile.js`: User settings (theme, currency preferences)
- **New Architecture Modules** (in `frontend/src/modules/`):
  - `api.js`: **Unified API client** (450 lines) - CRUD for all entities with retry logic, timeout handling
  - `validation.js`: Centralized validation (400 lines) - 14 rules, 7 entity schemas
  - `store.js`: Reactive state management with Proxy-based observers
  - `charts.js`: Chart.js configurations for financial visualizations
  - `helpers.js`: Utility functions (formatCurrency, convertCurrency, etc.)
- **CSS Architecture**:
  - Primary stylesheet: `public/css/style.css` (~2000 lines)
  - Component styles: `public/css/layout-components.css`
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
npm run start:8080          # Alternative port 8080
npm run start:3000          # Explicit port 3000
$env:PORT=4000; npm start   # Custom port

# Build frontend (required after editing frontend/pages/ or frontend/src/)
npm run build               # Bundles frontend/ into public/js/ via Vite

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
**Issue**: Edited `frontend/pages/` or `frontend/src/` but no effect  
**Solution**: Run `npm run build` to bundle into `public/js/` via Vite. Alternatively, edit `public/js/` directly for quick iteration (but loses source map and will be overwritten on next build)

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
2. **Create JS module** in `frontend/pages/[pagename].js` (or `frontend/src/pages/` for new architecture)
3. **Import shared modules**: `auth.js`, `api.js`, `navigation.js`, `profile.js`
4. **Initialize navigation**: Call `initNavigation()` in page's `DOMContentLoaded`
5. **Add sidebar link** in `navigation.js` `buildSidebarHTML()` function
6. **Update `vite.config.js`**: Add new entry point to `inputs` object
7. **Run Vite build**: `npm run build` to generate bundle in `public/js/`

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
  - `start` = production server on port 3000
  - `start:3000`, `start:8080` = specific ports
  - `dev` = same as start (no hot reload)
  - `build` = Vite build frontend to dist/assets/
  - `test` = backend tests with coverage
  - `test:backend` = Jest backend unit tests
  - `test:e2e` = Playwright integration tests
  - `lint` = ESLint backend code

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

## Security Considerations

### JWT Secret Configuration

**CRITICAL**: The `JWT_SECRET` environment variable must be set securely in production:

```powershell
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Set in .env file (NEVER commit to repo)
JWT_SECRET=your_generated_secret_here
COOKIE_SECURE=true  # Required for HTTPS in production
```

The server will **refuse to start** in production mode without a custom JWT_SECRET (fails with exit code 1).

### Cookie Security

- **HttpOnly Cookies**: Tokens stored as HttpOnly cookies to prevent XSS attacks
- **Secure Flag**: Enabled in production via `COOKIE_SECURE=true` environment variable
- **SameSite**: Set to "Lax" by default, configurable per environment
- **Token Blacklist**: Logout invalidates tokens by adding to `tokenBlacklist` array

### Password Handling

- **Hashing**: bcryptjs with salt rounds of 10 (see `backend/services/authService.js`)
- **No Plain Text**: Passwords never stored in plain text or logged
- **Sanitization**: `sanitizeUser()` removes `password_hash` from API responses

---

## Component Library (New Architecture)

### UI Components (frontend/src/components/)

All components use ES6 modules and are bundled via Vite. Import using `@components` alias in new architecture or relative paths in legacy pages.

**ModalBase.js** - Universal modal dialogs
```javascript
import { openModal, confirmModal, alertModal } from '@components/ModalBase.js';

// Confirmation dialog
const confirmed = await confirmModal({ 
  title: 'Delete item?', 
  message: 'This cannot be undone',
  danger: true 
});
```

**Toast.js** - Notification system
```javascript
import { toastSuccess, toastError, toastWarning, toastInfo } from '@components/Toast.js';

toastSuccess('Saved successfully!');
toastError('Failed to save', { duration: 5000 });
```

**FormBase.js** - Form builder with validation
```javascript
import { createForm } from '@components/FormBase.js';

const form = createForm({
  fields: [
    { name: 'email', type: 'email', label: 'Email', validation: { required: true, email: true } },
    { name: 'amount', type: 'number', label: 'Amount', validation: { required: true, min: 0 } }
  ],
  submitLabel: 'Save',
  onSubmit: async (values) => { /* handle submit */ }
});
```

**SkeletonLoader.js** - Loading states
```javascript
import { createChartSkeleton, showSkeleton, hideSkeleton } from '@components/SkeletonLoader.js';

showSkeleton('#container', createChartSkeleton('bar'));
// Load data...
hideSkeleton('#container', realContent);
```

**Chart Integration** - Professional visualizations
```javascript
import { createExpensesByCategoryChart, createCashflowChart, renderChart } from '@modules/charts.js';

const config = createExpensesByCategoryChart(expenses, categories, 'USD');
const chartInstance = renderChart('canvas-id', config);

// Later destroy to free memory
chartInstance.destroy();
```

**Key Pattern**: Always destroy Chart.js instances before re-rendering to prevent memory leaks.

### Component Documentation

Full API reference in `COMPONENTS.md` with:
- All component APIs and parameters
- Usage examples for each component
- Migration guide from legacy patterns
- Best practices for skeleton loaders and Chart.js

---

**Migration Status (Phase 4 Complete)**: All 15 pages now use unified API module (`API.entity.method()`), Toast notifications, and Modal confirmations. Legacy `frontend/modules/api.js` (fetchData) removed. No more direct `fetch()` calls or `alert()`/`confirm()` in pages.

**Last Updated**: 2025-11-14 (Version 1.3 - Completed Phase 4: JS Refactoring)
