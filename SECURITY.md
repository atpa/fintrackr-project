# SECURITY.md — FinTrackr

## Authentication & sessions
- Access tokens (15 minutes) and refresh tokens (7 days) are signed with `JWT_SECRET`; payload now includes the `sub` claim.
- Tokens are stored in HttpOnly cookies (configurable SameSite + Secure). Logout blacklists the access token and deletes the refresh token record.
- Session data in the browser is limited to user metadata in `sessionStorage`; cookies never leak to JS.

## CSRF
- `middleware/csrf.js` issues 32-byte tokens, stores them in memory for 15 minutes and binds them to `userId`. Every POST/PUT/PATCH/DELETE except `/api/login|register|refresh` must provide `X-CSRF-Token` (or `_csrf` in the body).
- `/api/csrf-token` is now protected by `authenticateRequest`, so tokens are only issued for valid sessions.
- The frontend wraps `window.fetch`, ensures credentials are included and automatically adds CSRF tokens for all unsafe `/api/*` requests.

## Rate limiting & sanitization
- The in-memory limiter (from `middleware/security.js`) secures auth endpoints (default: 5 attempts / 15 minutes / IP).
- `sanitizeInput` strips `<script>` tags, inline handlers and `javascript:` URLs from strings.
- CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy and Referrer-Policy headers are enforced on every response.

## Logging
- Winston logs errors to rotating files; never log raw tokens or secrets. Combined logs include request metadata, error logs store stack traces.
- Morgan + the custom logger produce structured HTTP logs.

## Data storage
- SQLite runs in WAL mode; back up `backend/fintrackr.db` together with `*.db-wal`/`*.db-shm`.
- Passwords are hashed with bcrypt; refresh tokens live in the `refresh_tokens` table.
- The CSRF store is in-memory. For multiple API instances, move tokens into Redis or expose sticky sessions.

## Hardening checklist
1. Set a unique `JWT_SECRET`, `COOKIE_SECURE=true` and `COOKIE_SAMESITE=Strict` (or `None` for cross-site if you already serve TLS).
2. Always terminate TLS before Express so that HttpOnly cookies stay secure (required for service workers as well).
3. Configure log rotation and monitoring (alert on spikes of 401/403/429/5xx).
4. Keep dependencies up to date (`npm audit fix` regularly) and pin Node.js LTS versions.
5. Add automated cleanup for `token_blacklist` and `refresh_tokens` (cron or background worker) if the dataset grows.
6. Close placeholder routes (`/api/subscriptions`, `/api/sync/*`) with proper 501/403 responses until real logic ships.

## Incident response
- **Secret leak** – rotate `JWT_SECRET`, purge `refresh_tokens` and `token_blacklist`, force logout (clear cookies via client or server response).
- **Database compromise** – stop the server, restore from backup, reset refresh tokens, review logs for unusual activity.
- **DoS** – tune rate limit `windowMs/maxRequests` and move the limiter to Redis for distributed environments.
