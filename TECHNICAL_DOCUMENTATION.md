# FinTrackr Technical Documentation

> **Version**: 2.0  
> **Last Updated**: November 2025  
> **Status**: Active Development

## 📋 Project Overview

FinTrackr is a **personal finance tracker MVP** for academic capstone project. It's a full-stack application using Node.js backend with vanilla JavaScript frontend, designed as a monolithic service transitioning to modular architecture.

**Stack**:
- Backend: Node.js HTTP server (no Express), JSON file storage
- Frontend: Vanilla ES6 JavaScript, HTML5, CSS3
- Authentication: JWT in HttpOnly cookies
- Database: JSON (`backend/data.json`)

## 🏗️ Architecture

### Backend Structure

**Entry Point**: `backend/server.js` (~2000 lines)
- Monolithic routing handler
- Authentication & authorization
- All business logic inline
- Currently refactoring toward modular services

**Data Persistence**:
- Single source of truth: `backend/data.json`
- 12 collections: users, accounts, categories, transactions, budgets, goals, planned, subscriptions, rules, recurring, refreshTokens, tokenBlacklist, bankConnections
- Test env: Set `FINTRACKR_DISABLE_PERSIST=true` to disable writes

**Authentication Flow**:
- JWT tokens in HttpOnly cookies: `access_token`, `refresh_token`
- Blacklist pattern for logout
- Legacy fallback: `X-User-Id` header (being phased out)
- Helper: `authenticateRequest(req)` returns `{ok, user, token}` or `{ok: false, error}`

**Modular Services** (in progress):
- `backend/services/authService.js` - Authentication logic
- `backend/services/dataService.js` - Data access patterns
- `backend/services/currencyService.js` - Currency conversion
- `backend/utils/` - Shared utilities (validators, formatters)

### Frontend Structure

**Static Files**: `public/*.html` served directly (no build step needed for HTML)

**ES6 Modules**:
- `frontend/pages/*.js` - Page-specific logic
- `frontend/modules/*.js` - Shared utilities

**Build Tool**: Vite
- Bundles `frontend/` into `public/js/`
- Run: `npx vite build`

**Key Modules**:
- `auth.js` - Auth state in localStorage (key: `'user'`), provides `Auth.isLoggedIn()`, `Auth.getUser()`
- `api.js` - HTTP wrapper: `fetchData(endpoint)`
- `navigation.js` - Sidebar injection, logout handling
- `profile.js` - User settings (theme, currency preferences)

**CSS Architecture**:
- `public/css/style.css` - Main stylesheet (~2000 lines)
- CSS custom properties for theming: `--primary-color`, `--bg-color`, etc.
- Theme switching: `data-theme="light|dark"` on `<html>` element

## 🔌 API Conventions

### Endpoints

**Authentication** (no auth required):
```
POST   /api/register      { name, email, password }
POST   /api/login         { email, password }
POST   /api/logout        (invalidates tokens)
GET    /api/session       (checks auth + refreshes if needed)
```

**Protected Resources** (JWT cookie or legacy `X-User-Id` header):
```
GET    /api/{resource}           # List (filtered by user_id)
POST   /api/{resource}           # Create
PUT    /api/{resource}/:id       # Update (full replacement)
PATCH  /api/{resource}/:id       # Update (partial)
DELETE /api/{resource}/:id       # Delete
```

### Request/Response Patterns

- **Content-Type**: Always `application/json; charset=utf-8`
- **Error Format**: `{ error: "message" }` with HTTP status
- **Success Format**: Return entity or `{ success: true }`
- **Validation**: Check required fields first, return 400 with descriptive error

Example:
```javascript
if (!payload.name || !payload.currency) {
  return sendJson(res, { error: "Missing account parameters" }, 400);
}
```

**User Scoping**: All resources filter by `user_id`. Use `filterForUser(collection)` helper.

## 💱 Currency Conversion

**Critical**: Hardcoded rates sync between frontend/backend:

```javascript
const RATE_MAP = {
  USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
  EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
  PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
  RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 }
};
```

**When adding currency**:
1. Update `RATE_MAP` in both `backend/server.js` and relevant frontend page
2. Use `convertAmount(amount, fromCur, toCur)` helper
3. Check `/api/convert` endpoint for dynamic rates (uses exchangerate.host with fallback)

## 🔄 Data Relationships & Side Effects

### Budget Auto-Management

Creating/deleting `expense` transactions:
1. Find budget by `{user_id, category_id, month}` (derived from `tx.date`)
2. Auto-create budget if missing: `{limit: 0, spent: 0}`
3. Update `budget.spent` using `convertAmount()` to budget's currency
4. Helpers: `resolveBudgetForExpense(data, tx, userId, createIfMissing)` and `adjustBudgetWithTransaction(budget, tx, direction)`

### Account Balance Updates

Transaction CRUD mutates `account.balance`:
- **Create**: `balance += amount` (income) or `balance -= amount` (expense) - converted to account currency
- **Delete**: Reverse the operation
- **Update**: Rollback old values, apply new ones

**Critical**: Always convert transaction amount to account currency before adjusting balance.

### Category Deletion Cascade

Deleting category (`DELETE /api/categories/:id`):
1. Remove from `data.categories`
2. Delete related budgets: `budgets.filter(b => b.category_id !== catId)`
3. Delete related planned: `planned.filter(p => p.category_id !== catId)`
4. Nullify in transactions: `tx.category_id = null`

## 🎯 File Organization

```
fintrackr-project/
├── backend/
│   ├── server.js                    # Main API server
│   ├── data.json                    # JSON database
│   ├── services/                    # Modular services (in progress)
│   │   ├── authService.js
│   │   ├── dataService.js
│   │   └── currencyService.js
│   ├── utils/                       # Shared utilities
│   └── __tests__/
│       └── server.test.js           # Backend tests (Jest + Supertest)
├── frontend/
│   ├── pages/                       # Page-specific logic
│   │   ├── dashboard.js
│   │   ├── transactions.js
│   │   ├── settings.js
│   │   ├── budgets.js
│   │   ├── reports.js
│   │   └── ...
│   └── modules/                     # Shared utilities
│       ├── auth.js
│       ├── api.js
│       ├── navigation.js
│       └── profile.js
├── public/
│   ├── *.html                       # Static HTML pages (no build step)
│   ├── js/                          # Vite build output (generated)
│   ├── css/
│   │   ├── style.css                # Main stylesheet
│   │   └── design-system.css        # Design tokens (to be merged)
│   └── icons/
├── tests/                           # E2E tests (Playwright)
├── docs/                            # Additional documentation
├── vite.config.js                   # Vite config for frontend bundling
├── jest.config.js                   # Jest config for backend tests
├── playwright.config.js             # Playwright config
└── package.json
```

## 🚀 Development Workflows

### Running the Application

```powershell
# Start backend (serves API + static files on port 3000)
npm start                    # Default port 3000
npm run start:8080          # Alternative port 8080
$env:PORT=4000; npm start   # Custom port

# Browse to http://localhost:3000 after starting backend
# Note: No separate frontend dev server - Vite only for builds
```

### Testing

```powershell
# Backend unit tests (Jest + Supertest)
npm run test:backend

# E2E tests (Playwright)
npm run test:e2e

# Both tests set FINTRACKR_DISABLE_PERSIST=true automatically
```

### Code Quality

```powershell
# Linting (backend only)
npm run lint

# ESLint config ignores: public/**, docs/**, coverage/**
```

## ⚙️ Key Utilities & Helpers

### Backend Helpers

- `authenticateRequest(req)` - Extract user from JWT or legacy header
- `sendJson(res, data, status)` - Standardized JSON response
- `parseCookies(req)` - Parse HttpOnly cookies
- `isTokenBlacklisted(token)` - Check logout status
- `filterForUser(collection, userId)` - Scope data to user
- `persistData()` - Write changes to `data.json`
- `convertAmount(amount, fromCur, toCur)` - Currency conversion
- `resolveBudgetForExpense(data, tx, userId, createIfMissing)` - Find/create budget
- `adjustBudgetWithTransaction(budget, tx, direction)` - Update budget spent

### Frontend Helpers

- `Auth.isLoggedIn()` - Check authentication state
- `Auth.getUser()` - Retrieve current user from localStorage
- `fetchData(endpoint)` - HTTP GET wrapper
- `convertAmount(amount, fromCur, toCur)` - Currency conversion (same as backend)

## 🧪 Testing Strategy

**Test Isolation**:
- Tests reset data via `serverModule.setData(cloneData())`
- Never modify `data.json` directly
- Always set `FINTRACKR_DISABLE_PERSIST=true` in test env

**Coverage**:
- Backend: Jest + Supertest in `backend/__tests__/server.test.js`
- E2E: Playwright in `tests/`

## 🐛 Common Pitfalls & Solutions

### Port Conflicts
**Issue**: Server fails to start on port 3000  
**Solution**: 
```powershell
Get-NetTCPConnection -LocalPort 3000
# Kill process if needed, or use alternative port
```

### Data Persistence in Tests
**Issue**: Tests pollute `data.json`  
**Solution**: Verify `FINTRACKR_DISABLE_PERSIST=true` in `jest.config.js`

### Frontend Changes Not Reflecting
**Issue**: Edited `frontend/pages/` but no effect  
**Solution**: Run `npx vite build` to bundle into `public/js/`, or edit `public/js/` directly for quick iteration

### Authentication Failures
**Issue**: API returns 401 after new endpoint  
**Solution**:
- Check endpoint in `isPublicApiRequest(method, pathname)` whitelist
- Verify JWT cookie extraction: `parseCookies(req)` then `cookies.access_token`
- Confirm token not blacklisted: `isTokenBlacklisted(token)`

### Currency Mismatches
**Issue**: Balances/budgets don't update correctly  
**Solution**: Always use `convertAmount()` before adding to balances. Sync `RATE_MAP` between frontend/backend.

## 📦 Adding New Features

### New API Endpoint Checklist

1. Choose HTTP method (GET/POST/PUT/DELETE)
2. Add route in `handleApi()` switch block in `server.js`
3. Implement validation (required fields, types, permissions)
4. Handle data mutations (use `persistData()` after changes)
5. Consider side effects (budget updates, balance changes, cascading deletes)
6. Write tests in `backend/__tests__/server.test.js`
7. Update frontend module to call new endpoint

### New Frontend Page Checklist

1. Create HTML in `public/[pagename].html` (copy existing page structure)
2. Create JS module in `frontend/pages/[pagename].js`
3. Import shared modules: `auth.js`, `api.js`, `navigation.js`, `profile.js`
4. Call `initNavigation()` in page's `DOMContentLoaded`
5. Add sidebar link in `navigation.js` `buildSidebarHTML()` function
6. Run `npx vite build` to generate bundle
7. Update `vite.config.js` if new entry point needed

## 🔧 Refactoring Guidelines

**Current Priority**: Migrate logic from monolithic `server.js` to modular services

**In Progress**: Services in `backend/services/` (not yet fully integrated)

**Target**: See `server.refactored.js` for intended structure

**Migration Strategy**:
1. Extract logic to service/utility module
2. Write tests for new module
3. Replace inline logic in `server.js` with service calls
4. Ensure backward compatibility

**Preserve During Refactoring**:
- JWT cookie-based auth flow
- User data scoping (`user_id` filters)
- Budget/balance auto-updates
- Currency conversion consistency

## 📝 File Conventions

- **Russian Comments**: Intentional for academic requirement - write new comments in Russian
- **Naming**: `camelCase` for JS, `kebab-case` for HTML/CSS files
- **Error Messages**: User-facing in Russian, debug logs in English
- **Line Length**: No strict limit, but refactoring encouraged for files >2000 lines

## 🎨 Frontend Redesign Priorities

### Phase 1: HTML & CSS Foundation
- [ ] Fix HTML structure: sidebar headers, remove duplicates
- [ ] Add `.visually-hidden` class for ARIA logic
- [ ] Create unified theme system (`theme.css` or `design-tokens.css`)
- [ ] Standardize layout across all pages

### Phase 2: Component System
- [ ] Create reusable Button component
- [ ] Implement Card variations (default, stat, info)
- [ ] Build FormField with validation
- [ ] Create Modal, Tooltip, Dropdown

### Phase 3: Design System
- [ ] Define color palette (primary, success, danger, semantic colors)
- [ ] Establish spacing scale (4px grid)
- [ ] Typography scale (modular, responsive)
- [ ] Shadow and radius system

### Phase 4: Accessibility & UX
- [ ] Implement `:focus-visible` styles
- [ ] Add complete ARIA attributes
- [ ] Keyboard navigation support
- [ ] Loading states and skeletons

### Phase 5: Performance & Polish
- [ ] Mobile-first responsive design
- [ ] Tree-shaking CSS optimization
- [ ] Lazy loading images
- [ ] Minification and bundling

## 🌐 Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS 14+, Android 12+

## 📊 Deployment

See `DEPLOYMENT.md` for hosting instructions (Railway/Render).

## 🔒 Security

See `SECURITY.md` for security considerations and implementation details.

---

**Maintained by**: FinTrackr Development Team  
**License**: See LICENSE file
