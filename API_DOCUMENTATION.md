# FinTrackr API Documentation

Complete API reference for FinTrackr backend services.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require JWT authentication via HttpOnly cookies.

### Headers
```
Cookie: access_token=<jwt_token>
```

### CSRF Protection
State-changing requests (POST/PUT/DELETE) require CSRF token:
```
X-CSRF-Token: <csrf_token>
```

Get CSRF token: `GET /api/csrf-token`

---

## Authentication Endpoints

### Register User
```http
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2025-01-15T10:00:00.000Z"
}
```

### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
Sets `access_token` and `refresh_token` cookies
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Logout
```http
POST /api/logout
```

**Response:**
```json
{
  "success": true
}
```

### Refresh Token
```http
POST /api/refresh
Cookie: refresh_token=<token>
```

**Response:**
Sets new `access_token` cookie

### Check Session
```http
GET /api/session
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## Account Management

### List Accounts
```http
GET /api/accounts
```

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "Checking Account",
    "balance": 5000.00,
    "currency": "USD",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

### Create Account
```http
POST /api/accounts
Content-Type: application/json
X-CSRF-Token: <token>

{
  "name": "Savings Account",
  "balance": 10000,
  "currency": "USD"
}
```

### Update Account
```http
PUT /api/accounts/:id
Content-Type: application/json
X-CSRF-Token: <token>

{
  "name": "Updated Name",
  "balance": 15000
}
```

### Delete Account
```http
DELETE /api/accounts/:id
X-CSRF-Token: <token>
```

---

## Transaction Management

### List Transactions
```http
GET /api/transactions
```

**Query Parameters:**
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset
- `account_id` - Filter by account
- `category_id` - Filter by category
- `type` - Filter by type (income/expense)
- `start_date` - Filter from date (ISO 8601)
- `end_date` - Filter to date (ISO 8601)

### Create Transaction
```http
POST /api/transactions
Content-Type: application/json
X-CSRF-Token: <token>

{
  "account_id": 1,
  "category_id": 2,
  "amount": 50.00,
  "currency": "USD",
  "type": "expense",
  "description": "Grocery shopping",
  "date": "2025-01-15T14:30:00.000Z"
}
```

**Features:**
- Automatically updates account balance
- Auto-creates/updates budgets
- Currency conversion if needed

### Update Transaction
```http
PUT /api/transactions/:id
Content-Type: application/json
X-CSRF-Token: <token>

{
  "amount": 75.00,
  "description": "Updated description"
}
```

### Delete Transaction
```http
DELETE /api/transactions/:id
X-CSRF-Token: <token>
```

**Features:**
- Reverts account balance changes
- Reverts budget changes

---

## Budget Management

### List Budgets
```http
GET /api/budgets
```

**Query Parameters:**
- `month` - Filter by month (YYYY-MM)
- `category_id` - Filter by category

### Create Budget
```http
POST /api/budgets
Content-Type: application/json
X-CSRF-Token: <token>

{
  "category_id": 2,
  "month": "2025-01",
  "limit": 500.00,
  "currency": "USD"
}
```

### Update Budget
```http
PUT /api/budgets/:id
Content-Type: application/json
X-CSRF-Token: <token>

{
  "limit": 600.00
}
```

---

## Goal Management

### List Goals
```http
GET /api/goals
```

### Create Goal
```http
POST /api/goals
Content-Type: application/json
X-CSRF-Token: <token>

{
  "name": "Emergency Fund",
  "target_amount": 10000,
  "current_amount": 2000,
  "currency": "USD",
  "deadline": "2025-12-31"
}
```

### Update Goal Progress
```http
PUT /api/goals/:id
Content-Type: application/json
X-CSRF-Token: <token>

{
  "current_amount": 3000
}
```

---

## ML Analytics Endpoints

### Get Spending Predictions
```http
GET /api/analytics/predictions
```

**Query Parameters:**
- `months` - Number of months to predict (1-12, default: 3)

**Response:**
```json
{
  "predictions": [
    {
      "month": "2025-02",
      "predicted_amount": 1250.50,
      "confidence": "high"
    }
  ],
  "trend": "increasing",
  "confidence": "high"
}
```

### Detect Anomalies
```http
GET /api/analytics/anomalies
```

**Query Parameters:**
- `threshold` - Z-score threshold (default: 2)

**Response:**
```json
{
  "anomalies": [
    {
      "transaction_id": 123,
      "amount": 5000,
      "zscore": 3.5,
      "severity": "high",
      "date": "2025-01-10"
    }
  ],
  "stats": {
    "mean": 150,
    "std_dev": 50
  }
}
```

### Get Budget Recommendations
```http
GET /api/analytics/budget-recommendations
```

**Response:**
```json
{
  "recommendations": [
    {
      "category_id": 2,
      "category_name": "Food",
      "suggested_limit": 550.00,
      "current_average": 500.00,
      "confidence": "high"
    }
  ]
}
```

### Identify Recurring Expenses
```http
GET /api/analytics/recurring
```

**Response:**
```json
{
  "recurring": [
    {
      "description": "Netflix Subscription",
      "amount": 15.99,
      "frequency": "monthly",
      "next_expected": "2025-02-01",
      "transactions": [...]
    }
  ]
}
```

### Get Personalized Insights
```http
GET /api/analytics/insights
```

**Response:**
```json
{
  "insights": [
    {
      "type": "spending_trend",
      "message": "Your spending increased 15% this month",
      "priority": "high",
      "actionable": true
    }
  ]
}
```

---

## Currency Conversion

### Get Exchange Rate
```http
GET /api/rates?base=USD&quote=EUR
```

### Convert Amount
```http
GET /api/convert?amount=100&from=USD&to=EUR
```

**Response:**
```json
{
  "amount": 100,
  "from": "USD",
  "to": "EUR",
  "converted": 94.00,
  "rate": 0.94
}
```

---

## Session Management

### List User Sessions
```http
GET /api/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": 1,
      "device": "Chrome/Windows",
      "ip": "192.168.1.1",
      "location": "US",
      "created_at": "2025-01-15T10:00:00.000Z",
      "last_active": "2025-01-15T14:30:00.000Z"
    }
  ],
  "total": 1,
  "max_allowed": 5
}
```

### Revoke Session
```http
DELETE /api/sessions/:id
X-CSRF-Token: <token>
```

### Logout All Devices
```http
POST /api/sessions/logout-all
X-CSRF-Token: <token>
```

---

## Cache Management

### Get Cache Statistics
```http
GET /api/cache/stats
```

**Response:**
```json
{
  "size": 42,
  "hits": 1250,
  "misses": 150,
  "hit_rate": 0.893
}
```

### Clear Cache
```http
POST /api/cache/clear
X-CSRF-Token: <token>
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error
- `501` - Not Implemented (stub endpoints)

---

## Rate Limiting

- **Default:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 5 requests per 15 minutes per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642252800
```

---

## WebSocket API (Future)

Coming soon: Real-time updates for transactions, budgets, and goals.

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit` - Results per page (default: 50, max: 100)
- `offset` - Pagination offset

**Response Headers:**
```
X-Total-Count: 250
X-Page-Count: 5
```

---

## Versioning

Current API version: **v1**

Version is included in Accept header:
```
Accept: application/json; version=1
```

---

## SDKs & Client Libraries

- **JavaScript/TypeScript:** Built-in fetch wrapper in `frontend/modules/api.js`
- **Python:** Coming soon
- **Go:** Coming soon

---

For questions or issues, please contact: atpagaming@gmail.com
