-- FinTrackr Database Schema
-- SQL Server compatible database schema for production-ready data storage

-- Users table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.users (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_users_created_at DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_users_email' AND object_id = OBJECT_ID(N'[dbo].[users]'))
BEGIN
  CREATE INDEX idx_users_email ON dbo.users(email);
END;
GO

-- Accounts table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[accounts]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.accounts (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    currency NVARCHAR(10) NOT NULL CONSTRAINT DF_accounts_currency DEFAULT ('USD'),
    balance DECIMAL(18,2) NOT NULL CONSTRAINT DF_accounts_balance DEFAULT (0),
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_accounts_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_accounts_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_accounts_user_id' AND object_id = OBJECT_ID(N'[dbo].[accounts]'))
BEGIN
  CREATE INDEX idx_accounts_user_id ON dbo.accounts(user_id);
END;
GO

-- Categories table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[categories]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.categories (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    kind NVARCHAR(20) NOT NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_categories_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_categories_kind CHECK (kind IN (N'income', N'expense')),
    CONSTRAINT FK_categories_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_categories_user_id' AND object_id = OBJECT_ID(N'[dbo].[categories]'))
BEGIN
  CREATE INDEX idx_categories_user_id ON dbo.categories(user_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_categories_kind' AND object_id = OBJECT_ID(N'[dbo].[categories]'))
BEGIN
  CREATE INDEX idx_categories_kind ON dbo.categories(kind);
END;
GO

-- Transactions table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[transactions]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.transactions (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT NULL,
    type NVARCHAR(20) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency NVARCHAR(10) NOT NULL CONSTRAINT DF_transactions_currency DEFAULT ('USD'),
    [date] DATE NOT NULL,
    note NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_transactions_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_transactions_type CHECK (type IN (N'income', N'expense')),
    CONSTRAINT FK_transactions_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT FK_transactions_accounts_account_id FOREIGN KEY (account_id) REFERENCES dbo.accounts(id) ON DELETE CASCADE,
    CONSTRAINT FK_transactions_categories_category_id FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE SET NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_transactions_user_id' AND object_id = OBJECT_ID(N'[dbo].[transactions]'))
BEGIN
  CREATE INDEX idx_transactions_user_id ON dbo.transactions(user_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_transactions_user_date' AND object_id = OBJECT_ID(N'[dbo].[transactions]'))
BEGIN
  CREATE INDEX idx_transactions_user_date ON dbo.transactions(user_id, [date] DESC);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_transactions_account' AND object_id = OBJECT_ID(N'[dbo].[transactions]'))
BEGIN
  CREATE INDEX idx_transactions_account ON dbo.transactions(account_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_transactions_category' AND object_id = OBJECT_ID(N'[dbo].[transactions]'))
BEGIN
  CREATE INDEX idx_transactions_category ON dbo.transactions(category_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_transactions_type' AND object_id = OBJECT_ID(N'[dbo].[transactions]'))
BEGIN
  CREATE INDEX idx_transactions_type ON dbo.transactions(type);
END;
GO

-- Budgets table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[budgets]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.budgets (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    month NVARCHAR(20) NOT NULL,
    limit_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_budgets_limit_amount DEFAULT (0),
    spent DECIMAL(18,2) NOT NULL CONSTRAINT DF_budgets_spent DEFAULT (0),
    type NVARCHAR(20) NOT NULL CONSTRAINT DF_budgets_type DEFAULT (N'fixed'),
    [percent] DECIMAL(5,2) NULL,
    currency NVARCHAR(10) NOT NULL CONSTRAINT DF_budgets_currency DEFAULT ('USD'),
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_budgets_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_budgets_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT FK_budgets_categories_category_id FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE CASCADE,
    CONSTRAINT UQ_budgets_user_category_month UNIQUE (user_id, category_id, month)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_budgets_user_month' AND object_id = OBJECT_ID(N'[dbo].[budgets]'))
BEGIN
  CREATE INDEX idx_budgets_user_month ON dbo.budgets(user_id, month);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_budgets_category' AND object_id = OBJECT_ID(N'[dbo].[budgets]'))
BEGIN
  CREATE INDEX idx_budgets_category ON dbo.budgets(category_id);
END;
GO

-- Goals table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[goals]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.goals (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    target_amount DECIMAL(18,2) NOT NULL,
    current_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_goals_current_amount DEFAULT (0),
    deadline DATE NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_goals_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_goals_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_goals_user_id' AND object_id = OBJECT_ID(N'[dbo].[goals]'))
BEGIN
  CREATE INDEX idx_goals_user_id ON dbo.goals(user_id);
END;
GO

-- Planned operations table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[planned]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.planned (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT NULL,
    type NVARCHAR(20) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency NVARCHAR(10) NOT NULL CONSTRAINT DF_planned_currency DEFAULT ('USD'),
    start_date DATE NOT NULL,
    frequency NVARCHAR(20) NOT NULL,
    note NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_planned_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_planned_type CHECK (type IN (N'income', N'expense')),
    CONSTRAINT CK_planned_frequency CHECK (frequency IN (N'daily', N'weekly', N'monthly', N'yearly')),
    CONSTRAINT FK_planned_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT FK_planned_accounts_account_id FOREIGN KEY (account_id) REFERENCES dbo.accounts(id) ON DELETE CASCADE,
    CONSTRAINT FK_planned_categories_category_id FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE SET NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_planned_user_id' AND object_id = OBJECT_ID(N'[dbo].[planned]'))
BEGIN
  CREATE INDEX idx_planned_user_id ON dbo.planned(user_id);
END;
GO

-- Subscriptions table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[subscriptions]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.subscriptions (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency NVARCHAR(10) NOT NULL CONSTRAINT DF_subscriptions_currency DEFAULT ('USD'),
    frequency NVARCHAR(20) NOT NULL,
    next_date DATE NOT NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_subscriptions_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_subscriptions_frequency CHECK (frequency IN (N'daily', N'weekly', N'monthly', N'yearly')),
    CONSTRAINT FK_subscriptions_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_subscriptions_user_id' AND object_id = OBJECT_ID(N'[dbo].[subscriptions]'))
BEGIN
  CREATE INDEX idx_subscriptions_user_id ON dbo.subscriptions(user_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_subscriptions_next_date' AND object_id = OBJECT_ID(N'[dbo].[subscriptions]'))
BEGIN
  CREATE INDEX idx_subscriptions_next_date ON dbo.subscriptions(next_date);
END;
GO

-- Categorization rules table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rules]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.rules (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    pattern NVARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    confidence DECIMAL(5,2) NOT NULL CONSTRAINT DF_rules_confidence DEFAULT (1.0),
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rules_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_rules_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT FK_rules_categories_category_id FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_rules_user_id' AND object_id = OBJECT_ID(N'[dbo].[rules]'))
BEGIN
  CREATE INDEX idx_rules_user_id ON dbo.rules(user_id);
END;
GO

-- Recurring transactions (detected patterns)
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[recurring]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.recurring (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    frequency NVARCHAR(20) NOT NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_recurring_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_recurring_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_recurring_user_id' AND object_id = OBJECT_ID(N'[dbo].[recurring]'))
BEGIN
  CREATE INDEX idx_recurring_user_id ON dbo.recurring(user_id);
END;
GO

-- Bank connections table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[bank_connections]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.bank_connections (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    bank_id INT NOT NULL,
    account_id INT NULL,
    account_name NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) NOT NULL CONSTRAINT DF_bank_connections_status DEFAULT ('active'),
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_bank_connections_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_bank_connections_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT FK_bank_connections_accounts_account_id FOREIGN KEY (account_id) REFERENCES dbo.accounts(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_bank_connections_user_id' AND object_id = OBJECT_ID(N'[dbo].[bank_connections]'))
BEGIN
  CREATE INDEX idx_bank_connections_user_id ON dbo.bank_connections(user_id);
END;
GO

-- Refresh tokens table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[refresh_tokens]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.refresh_tokens (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    token NVARCHAR(512) NOT NULL UNIQUE,
    expires_at BIGINT NOT NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_refresh_tokens_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_refresh_tokens_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_refresh_tokens_token' AND object_id = OBJECT_ID(N'[dbo].[refresh_tokens]'))
BEGIN
  CREATE INDEX idx_refresh_tokens_token ON dbo.refresh_tokens(token);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_refresh_tokens_user_id' AND object_id = OBJECT_ID(N'[dbo].[refresh_tokens]'))
BEGIN
  CREATE INDEX idx_refresh_tokens_user_id ON dbo.refresh_tokens(user_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_refresh_tokens_expires_at' AND object_id = OBJECT_ID(N'[dbo].[refresh_tokens]'))
BEGIN
  CREATE INDEX idx_refresh_tokens_expires_at ON dbo.refresh_tokens(expires_at);
END;
GO

-- Token blacklist table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[token_blacklist]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.token_blacklist (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    token NVARCHAR(512) NOT NULL UNIQUE,
    blacklisted_at DATETIME2(0) NOT NULL CONSTRAINT DF_token_blacklist_blacklisted_at DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_token_blacklist_token' AND object_id = OBJECT_ID(N'[dbo].[token_blacklist]'))
BEGIN
  CREATE INDEX idx_token_blacklist_token ON dbo.token_blacklist(token);
END;
GO

-- Sessions table for enhanced security (Phase 4)
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sessions]') AND type = N'U')
BEGIN
  CREATE TABLE dbo.sessions (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    refresh_token NVARCHAR(512) NOT NULL,
    device_info NVARCHAR(512) NULL,
    ip_address NVARCHAR(45) NULL,
    last_activity DATETIME2(0) NOT NULL CONSTRAINT DF_sessions_last_activity DEFAULT (SYSUTCDATETIME()),
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_sessions_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_sessions_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_sessions_user_id' AND object_id = OBJECT_ID(N'[dbo].[sessions]'))
BEGIN
  CREATE INDEX idx_sessions_user_id ON dbo.sessions(user_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_sessions_refresh_token' AND object_id = OBJECT_ID(N'[dbo].[sessions]'))
BEGIN
  CREATE INDEX idx_sessions_refresh_token ON dbo.sessions(refresh_token);
END;
GO
