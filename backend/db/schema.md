# Database Schema Draft (Migration Preparation)

> Target: MongoDB (primary) / PostgreSQL (alternative)
> Status: Draft for Phase 5 (DB Migration Preparation)

## Collections → Target Tables

1. users
2. accounts
3. categories
4. transactions
5. budgets
6. goals
7. planned
8. subscriptions
9. rules
10. recurring
11. refreshTokens
12. tokenBlacklist
13. bankConnections

---
## users
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK | Sequential in JSON, auto in DB |
| name | STRING | NOT NULL |  |
| email | STRING | UNIQUE, NOT NULL | Lowercased |
| password_hash | STRING | NOT NULL | bcrypt (legacy sha256 upgrade path) |
| settings.default_currency | STRING(3) | NULL | ISO currency code |
| settings.theme | STRING | NULL | 'light'/'dark' |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

Index: email (unique)

## accounts
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL | Ownership |
| name | STRING | NOT NULL | Unique per user (composite index) |
| currency | STRING(3) | NOT NULL | Stored currency |
| balance | DECIMAL(18,2) | NOT NULL DEFAULT 0 | Updated by transactions |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

Composite Index: (user_id, name)

## categories
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL | User-specific categories |
| name | STRING | NOT NULL |  |
| type | ENUM('income','expense') | NOT NULL |  |
| color | STRING(16) | NULL | Hex color |
| icon | STRING | NULL | Icon reference |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

Index: (user_id, type)

## transactions
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| account_id | FK -> accounts.id | NOT NULL |  |
| category_id | FK -> categories.id | NULL | Nullable on category delete |
| type | ENUM('income','expense') | NOT NULL |  |
| amount | DECIMAL(18,2) | NOT NULL | Original amount |
| currency | STRING(3) | NOT NULL | Original currency |
| date | DATE | NOT NULL |  |
| note | TEXT | NULL |  |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

Index: (user_id, date), (account_id), (category_id)

## budgets
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| category_id | FK -> categories.id | NOT NULL |  |
| month | CHAR(7) | NOT NULL | YYYY-MM |
| limit | DECIMAL(18,2) | NOT NULL DEFAULT 0 |  |
| spent | DECIMAL(18,2) | NOT NULL DEFAULT 0 | Updated by transactions |
| currency | STRING(3) | NOT NULL | Budget currency |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

Composite Index: (user_id, category_id, month) UNIQUE

## goals
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| name | STRING | NOT NULL |  |
| target_amount | DECIMAL(18,2) | NOT NULL |  |
| current_amount | DECIMAL(18,2) | NOT NULL DEFAULT 0 |  |
| currency | STRING(3) | NOT NULL |  |
| deadline | DATE | NULL |  |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

## planned
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| category_id | FK -> categories.id | NOT NULL |  |
| amount | DECIMAL(18,2) | NOT NULL |  |
| currency | STRING(3) | NOT NULL |  |
| date | DATE | NOT NULL | Future date |
| note | TEXT | NULL |  |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

## subscriptions
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| name | STRING | NOT NULL |  |
| amount | DECIMAL(18,2) | NOT NULL |  |
| currency | STRING(3) | NOT NULL |  |
| frequency | ENUM('monthly','yearly') | NOT NULL |  |
| next_date | DATE | NOT NULL | Next billing date |
| active | BOOLEAN | NOT NULL DEFAULT true |  |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

## rules
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| pattern | STRING | NOT NULL | Regex/text match |
| category_id | FK -> categories.id | NOT NULL | Applied category |
| note | TEXT | NULL |  |
| active | BOOLEAN | NOT NULL DEFAULT true |  |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

Index: (user_id, active)

## recurring
(Reserved for future recurring transactions engine)
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| source_subscription_id | FK -> subscriptions.id | NULL | Link to subscription |
| generated_transaction_id | FK -> transactions.id | NULL | Link to transaction |
| status | ENUM('pending','generated','failed') | NOT NULL |  |
| run_at | TIMESTAMP | NOT NULL | Scheduled run |
| created_at | TIMESTAMP | DEFAULT now |  |

Index candidates: (user_id, status), (run_at)

## refreshTokens
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| token | STRING | PK | Secure random |
| user_id | FK -> users.id | NOT NULL |  |
| expires_at | TIMESTAMP | NOT NULL |  |
| created_at | TIMESTAMP | DEFAULT now |  |

## tokenBlacklist
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| token | STRING | PK | Blacklisted JWT |
| expires_at | TIMESTAMP | NOT NULL |  |
| created_at | TIMESTAMP | DEFAULT now |  |

Index: (expires_at)

## bankConnections
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INT / ObjectId | PK |  |
| user_id | FK -> users.id | NOT NULL |  |
| bank_id | INT | NOT NULL | Reference to BANKS config |
| external_account_id | STRING | NOT NULL | Provider mapping |
| status | ENUM('active','error','revoked') | NOT NULL |  |
| last_sync_at | TIMESTAMP | NULL |  |
| created_at | TIMESTAMP | DEFAULT now |  |
| updated_at | TIMESTAMP | DEFAULT now on update |  |

Composite Index: (user_id, bank_id, status)

---
## Relationships Overview
- users 1—N accounts, categories, transactions, budgets, goals, planned, subscriptions, rules, bankConnections
- categories 1—N transactions, budgets, planned
- accounts 1—N transactions
- subscriptions 1—N recurring (future)

Cascade / Referential Notes:
- Category deletion: set category_id=NULL in transactions; delete budgets & planned referencing category.
- User deletion (future admin op): logical delete flag instead of physical remove to preserve financial history.
- Account deletion: only allowed if no transactions OR archive flag; balances must reconcile before removal.

---
## Migration Strategy
1. Create schemas (Mongoose or Prisma recommended)
2. Write import script: read `data.json` → batch insert preserving IDs
3. Handle ID collisions: if using ObjectId, store legacyId for traceability
4. Recalculate derived fields (balances, budget.spent) after insert or trust source
5. Add unique indexes and constraints
6. Replace repository implementations to query DB instead of JSON
7. Toggle persistence via ENV flag `USE_DB=true`

Atomicity Plan:
- Use DB transactions (Mongo: session.startTransaction / Postgres: BEGIN) for: create transaction → update account balance → adjust budget spent.
- Rollback if any step fails to keep consistency.

Optimistic Locking (Future):
- accounts: version field to prevent lost update on high concurrency.
- budgets: version field for simultaneous spent adjustments.

Index Strategy Summary:
- users.email (unique)
- accounts (user_id, name)
- transactions (user_id, date), (account_id), (category_id), (user_id, type)
- budgets (user_id, category_id, month)
- planned (user_id, date)
- subscriptions (user_id, next_date, active)
- rules (user_id, active)
- bankConnections (user_id, bank_id, status)

---
## Open Questions
- Use Prisma (multi-DB) vs Mongoose (Mongo-focused)?
- Need soft delete for transactions/categories? (audit trail)
- Implement optimistic locking on accounts/budgets?
- Encryption for sensitive user settings?
- Introduce event sourcing for critical balance changes?
- Partitioning strategy for large transactions volume (by year / month)?

---
## Next Actions
- [ ] Decide primary DB (MongoDB vs PostgreSQL)
- [ ] Add connection module `backend/db/connection.js`
- [ ] Implement Prisma schema OR Mongoose models
- [ ] Prototype repository rewrite for `AccountsRepository`
- [ ] Write data.json → DB migration script
- [ ] Add atomic transaction wrapper utility
- [ ] Implement cascade helpers for category removal

---
Last Updated: 2025-11-14
