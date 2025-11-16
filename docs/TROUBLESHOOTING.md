# FinTrackr Troubleshooting Guide

This guide helps diagnose and fix common issues, especially those causing infinite loading states.

## Quick Diagnosis

If users report **infinite loading** or **blank pages**, check:

1. Browser console for JavaScript errors
2. Network tab for failed requests (401, 403, 429, 408, 500+)
3. Server logs for errors or timeouts
4. Database lock status

## Common Issues

### 1. Infinite Loading / Blank Page

**Symptoms:**
- Loading spinner never disappears
- Page remains blank after initial load
- No error message displayed

**Possible Causes & Solutions:**

#### A. Frontend Error Not Caught
```
Check browser console → Look for:
- Unhandled promise rejection
- TypeError or ReferenceError
- Network errors (Failed to fetch)
```

**Solution:**
- The global error handler should catch these (implemented in `frontend/modules/errorHandler.js`)
- If error persists, check that the page imports error handler correctly
- Verify browser compatibility (modern ES6+ required)

#### B. API Request Timeout
```
Network tab → Look for:
- Requests taking > 30 seconds
- Request status: (pending) forever
- 408 status code
```

**Solution:**
- Server timeout middleware (30s) should abort long requests
- Check server logs for slow queries
- Verify database is not locked (see Database Lock section)

#### C. CSRF Token Issues
```
Network tab → Look for:
- 403 status with "CSRF_TOKEN_INVALID" error
- Multiple 403s after page load
```

**Solution:**
- In multi-instance deployments: Use Redis for CSRF storage or enable sticky sessions
- Clear browser cookies and refresh
- Verify server is sending `X-CSRF-Token` header

### 2. Database Lock Issues

**Symptoms:**
- All API requests hang
- Server log shows no activity
- Database queries never complete

**Diagnosis:**
```bash
# Check if database files exist
ls -la backend/fintrackr.db*

# Should see:
# fintrackr.db       (main database)
# fintrackr.db-wal   (write-ahead log)
# fintrackr.db-shm   (shared memory)
```

**Causes:**
- Incomplete backup restore (missing WAL/SHM files)
- Multiple processes accessing database
- Crashed process left lock

**Solutions:**

1. **Checkpoint and restart:**
   ```bash
   # Connect to database
   sqlite3 backend/fintrackr.db
   
   # Force checkpoint
   PRAGMA wal_checkpoint(RESTART);
   
   # Exit and restart server
   .exit
   ```

2. **Restore from complete backup:**
   ```bash
   # Stop server first!
   
   # Restore all three files atomically
   cp backup/fintrackr.db backend/
   cp backup/fintrackr.db-wal backend/
   cp backup/fintrackr.db-shm backend/
   
   # Restart server
   npm start
   ```

3. **Delete WAL files (CAUTION: potential data loss):**
   ```bash
   # Stop server first!
   rm backend/fintrackr.db-wal
   rm backend/fintrackr.db-shm
   
   # Database will recreate them on next start
   npm start
   ```

### 3. Authentication Issues

**Symptoms:**
- Users logged out repeatedly
- 401 errors on API requests
- Redirect loop to login page

**Possible Causes:**

#### A. Cookie Configuration Mismatch
```
Check environment variables:
COOKIE_SECURE=true    → Requires HTTPS
COOKIE_SAMESITE=Strict → Blocks cross-domain
```

**Solution:**
- For HTTPS deployments: `COOKIE_SECURE=true`, `COOKIE_SAMESITE=Strict`
- For HTTP development: `COOKIE_SECURE=false`, `COOKIE_SAMESITE=Lax`
- Restart server after changing

#### B. JWT Secret Changed
```
Check if JWT_SECRET was rotated recently
```

**Solution:**
- Users must re-login after secret rotation
- Clear `refresh_tokens` table in database
- Clear browser cookies

#### C. Token Blacklist Full
```
Check token_blacklist table size:
SELECT COUNT(*) FROM token_blacklist;
```

**Solution:**
- Implement cleanup job for old tokens
- Tokens older than JWT expiry (15 min) can be deleted

### 4. Rate Limiting

**Symptoms:**
- 429 "Too many requests" errors
- Normal user suddenly can't access site
- Specific IP blocked

**Diagnosis:**
```
Check server logs for rate limit hits:
grep "Rate limit" logs/combined.log
```

**Solution:**

1. **Temporary fix (restart server):**
   ```bash
   # Clears in-memory rate limit store
   npm restart
   ```

2. **Adjust limits:**
   ```javascript
   // In backend/middleware/security.js
   rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     maxRequests: 200            // Increase from 100
   })
   ```

3. **Production fix:**
   - Move rate limiter to Redis (shared across instances)
   - Implement per-user limits instead of per-IP
   - Add rate limit bypass for authenticated users

### 5. CORS Issues

**Symptoms:**
- Requests from frontend fail silently
- Console shows CORS policy error
- Cookies not sent with requests

**Diagnosis:**
```
Check browser console for:
"Access to fetch at '...' from origin '...' has been blocked by CORS policy"
```

**Solution:**

1. **Update allowed origins:**
   ```javascript
   // In backend/app.js or security middleware
   const allowedOrigins = [
     'http://localhost:3000',
     'https://yourdomain.com'
   ];
   ```

2. **Verify credentials:**
   ```javascript
   // Frontend - ensure credentials are included
   fetch('/api/...', {
     credentials: 'include'  // Must be present
   })
   ```

3. **Production deployment:**
   - Ensure frontend and backend are same origin, OR
   - Configure proper CORS headers for cross-origin
   - Set `COOKIE_SAMESITE=None` with `COOKIE_SECURE=true` for cross-domain

### 6. Performance Issues

**Symptoms:**
- Slow page loads (> 3 seconds)
- API timeouts occasionally
- High CPU usage

**Diagnosis:**
```bash
# Check server response times
grep "duration" logs/combined.log | awk '{print $NF}' | sort -n

# Check database size
du -h backend/fintrackr.db

# Check WAL size
du -h backend/fintrackr.db-wal
```

**Solutions:**

1. **Large WAL file:**
   ```bash
   # Force checkpoint
   sqlite3 backend/fintrackr.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```

2. **Slow queries:**
   - Add indexes to frequently queried columns
   - Limit result sets (pagination)
   - Use prepared statements (already implemented)

3. **bcrypt rounds:**
   ```javascript
   // In authService.js - reduce rounds for development
   const rounds = process.env.NODE_ENV === 'production' ? 12 : 8;
   ```

## Monitoring & Prevention

### Health Check Endpoint

The server performs health checks on startup. Check console output:

```
✅ Database initialized
[Database Health Check]
File check: ✅ Healthy
Connection: ✅ Connected
WAL mode: ✅ Enabled
Foreign keys: ✅ Enabled
Database size: 2.45 MB
```

### Environment Validation

Server validates configuration on startup:

```
⚠️  WARNING: Using default JWT_SECRET in production!
⚠️  WARNING: COOKIE_SECURE is not enabled
⚠️  WARNING: COOKIE_SAMESITE is set to "None"
```

**Action:** Fix these warnings before going to production!

### Log Monitoring

Key log patterns to watch:

```bash
# Request timeouts
grep "Request timeout" logs/combined.log

# CSRF failures
grep "CSRF" logs/combined.log | grep "403"

# Rate limit hits
grep "429" logs/combined.log

# Database errors
grep "Database" logs/error.log
```

### Backup Strategy

**CRITICAL:** Always backup all three files together:

```bash
# Good backup script
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/$timestamp
cp backend/fintrackr.db backups/$timestamp/
cp backend/fintrackr.db-wal backups/$timestamp/
cp backend/fintrackr.db-shm backups/$timestamp/

# BAD - will cause locks on restore!
# cp backend/fintrackr.db backups/  # ❌ Missing WAL/SHM
```

## Getting Help

If issue persists:

1. Check [SECURITY.md](../SECURITY.md) for security-related issues
2. Review [backend logs](../logs/)
3. Check browser console (F12)
4. Review network requests (F12 → Network tab)
5. Open an issue with:
   - Exact error message
   - Browser console logs
   - Server logs (relevant portion)
   - Steps to reproduce

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Infinite loading | F12 console → Check for errors |
| Database lock | `PRAGMA wal_checkpoint(RESTART);` |
| CSRF errors | Clear cookies + refresh |
| 429 Too Many Requests | Restart server (dev) or wait 15min |
| Users logged out | Check cookie settings match deployment |
| Slow queries | Check WAL file size |
| 401 on all requests | Check JWT_SECRET didn't change |

## Production Checklist

Before deploying to production:

- [ ] Set unique `JWT_SECRET`
- [ ] Enable `COOKIE_SECURE=true` (requires HTTPS)
- [ ] Set appropriate `COOKIE_SAMESITE` (Strict or Lax)
- [ ] Configure proper CORS origins
- [ ] Set up database backup script (all 3 files)
- [ ] Implement log rotation
- [ ] Monitor for 401/403/429/500 spikes
- [ ] Set up health check monitoring
- [ ] Consider Redis for CSRF tokens (multi-instance)
- [ ] Consider Redis for rate limiting (multi-instance)
- [ ] Test graceful shutdown (WAL checkpoint)
