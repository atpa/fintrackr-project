# 🔒 FinTrackr Security Policy

Полное руководство по механизмам безопасности, best practices и compliance FinTrackr.

## 📋 Содержание

1. [Поддерживаемые версии](#поддерживаемые-версии)
2. [Сообщение об уязвимостях](#сообщение-об-уязвимостях)
3. [Реализованные механизмы](#реализованные-механизмы)
4. [Защита от атак](#защита-от-атак)
5. [Конфигурация для production](#конфигурация-для-production)
6. [Рекомендации по безопасности](#рекомендации-по-безопасности)
7. [COMPLIANCE](#compliance)
8. [Ресурсы](#ресурсы)

## ✅ Поддерживаемые версии

| Версия | Поддержка | Security Updates |
|--------|-----------|-----------------|
| 1.x.x | ✅ Активная | Да |
| < 1.0 | ❌ EOL | Нет |

## 🚨 Сообщение об уязвимостях

### Процесс ответственного раскрытия

**⚠️ НЕ создавайте публичный issue для security уязвимостей!**

### Как сообщить о проблеме

1. **Отправить email:**
   - Адрес: `atpagaming@gmail.com`
   - Тема: `SECURITY: FinTrackr`

2. **Включить в отчет:**
   - Тип уязвимости (XSS, CSRF, SQL Injection, etc.)
   - Местонахождение (файл, строка кода)
   - Шаги для воспроизведения
   - Потенциальное влияние на безопасность
   - Предложения по исправлению (опционально)

3. **Proof-of-Concept:**
   - Приложите минимальный пример воспроизведения
   - Скриншоты/видео (если применимо)

### Наш процесс

```
┌─────────────────────────────────────────────────────────┐
│ 1. Подтверждение (48 часов)                             │
│    → Подтверждаем получение отчета                      │
│                                                          │
│ 2. Оценка (1-3 дня)                                     │
│    → Определяем серьезность (Critical/High/Medium/Low)  │
│    → Устанавливаем приоритет                            │
│                                                          │
│ 3. Разработка fix (зависит от серьезности)             │
│    → Critical: 24-48 часов                              │
│    → High: 7 дней                                       │
│    → Medium: 30 дней                                    │
│    → Low: следующий релиз                               │
│                                                          │
│ 4. Тестирование (1-2 дня)                              │
│    → Проверяем исправление                              │
│    → Пишем тесты для регрессии                          │
│                                                          │
│ 5. Выпуск patch (1 день)                                │
│    → Выпускаем security update                          │
│    → Уведомляем сообщество                              │
│                                                          │
│ 6. Раскрытие (30 дней после патча)                     │
│    → Публиковаем CVE (если применимо)                   │
│    → Благодарим исследователя (с согласия)             │
└─────────────────────────────────────────────────────────┘
```

## 🛡️ Реализованные механизмы

### 1. Аутентификация и авторизация

#### JWT (JSON Web Tokens)

```javascript
// Токены хранятся в HttpOnly cookies (недоступны JS)
// Access Token: 7 дней
// Refresh Token: 30 дней

const payload = {
  id: userId,
  email: userEmail,
  iat: issuedAt,
  exp: expirationTime
};

const token = jwt.sign(payload, JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '7d'
});

// Установка cookies
res.cookie('access_token', token, {
  httpOnly: true,      // ✅ Защита от XSS
  secure: true,        // ✅ Только HTTPS (production)
  sameSite: 'Strict',  // ✅ CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 дней
});
```

#### Refresh Token Rotation

```javascript
// Каждый refresh генерирует новый refresh token
const newTokens = refreshAccessToken(oldRefreshToken);

// Старый token blacklist'ится
tokenBlacklist.push(oldRefreshToken);

// Frontend обновляет свои cookies
res.cookie('refresh_token', newTokens.refresh, cookieOptions);
res.cookie('access_token', newTokens.access, cookieOptions);
```

#### Password Hashing

```javascript
const bcrypt = require('bcryptjs');

// Регистрация
const password = 'UserPassword123!';
const salt = await bcrypt.genSalt(10);           // 10 rounds = ~100ms
const passwordHash = await bcrypt.hash(password, salt);

// Сохранить только hash в БД
db.query('INSERT INTO users (password_hash) VALUES ?', [passwordHash]);

// Вход
const isMatch = await bcrypt.compare(loginPassword, storedHash);
```

**Параметры bcrypt:**
- Rounds: 10 (оптимальное значение: 8-12)
- Устойчивость к brute-force: ✅ Даже перебор требует ~1000 лет

### 2. CSRF Protection (Cross-Site Request Forgery)

#### Механизм 1: SameSite cookies

```javascript
res.cookie('access_token', token, {
  sameSite: 'Strict'  // ✅ Блокирует cross-site requests
});

// SameSite режимы:
// 'Strict'  - cookies не отправляются в cross-site запросах (максимум защиты)
// 'Lax'     - cookies отправляются только для безопасных методов (GET)
// 'None'    - cookies отправляются всегда (требует Secure flag)
```

#### Механизм 2: CSRF tokens

```javascript
// middleware/csrf.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

// GET запрос - отправить CSRF token
router.get('/api/session', csrfProtection, (req, res) => {
  res.set('X-CSRF-Token', req.csrfToken());
  res.json({ user: req.user });
});

// POST запрос - проверить CSRF token
router.post('/api/accounts', csrfProtection, (req, res) => {
  // CSRF token автоматически проверен middleware
  // Если неверный - вернет 403
});
```

**Frontend отправляет token:**
```javascript
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

fetch('/api/accounts', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### 3. XSS Protection (Cross-Site Scripting)

#### Content Security Policy (CSP)

```javascript
// middleware/security.js
res.set('Content-Security-Policy', 
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https:; " +
  "font-src 'self' data:; " +
  "connect-src 'self'; " +
  "frame-ancestors 'none';"
);

// Значения:
// 'self'  - только с того же домена
// 'unsafe-inline' - разрешить inline скрипты (осторожно!)
// 'none' - запретить вообще
// 'nonce-xyz' - только скрипты с таким nonce атрибутом
```

#### Input Sanitization

```javascript
// utils/validation.js
const sanitizeInput = (input) => {
  // Удалить все HTML теги
  return input
    .replace(/<[^>]*>/g, '')          // Удалить теги
    .replace(/javascript:/gi, '')     // Удалить javascript protocol
    .replace(/on\w+=/gi, '')          // Удалить event handlers
    .trim();
};

// Использование
const cleanInput = sanitizeInput(userInput);

// Для HTML контента использовать библиотеку
const DOMPurify = require('isomorphic-dompurify');
const cleanHtml = DOMPurify.sanitize(userInput);
```

#### X-XSS-Protection header

```javascript
res.set('X-XSS-Protection', '1; mode=block');
// Включить встроенную XSS защиту браузера
// 1 = включить
// mode=block = блокировать страницу вместо очистки
```

### 4. SQL Injection Protection

#### Parameterized Queries (better-sqlite3)

```javascript
// ❌ УЯЗВИМО - SQL Injection!
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.exec(query);

// ✅ БЕЗОПАСНО - Parameterized query
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get(email);

// Параметры:
// ? - для значений
// ?? - для имен таблиц/колонок (если нужно)
```

#### Типы данных

```javascript
// SQLite использует динамическую типизацию, но better-sqlite3 проверяет
const stmt = db.prepare('INSERT INTO users (name, age) VALUES (?, ?)');
stmt.run('Alice', 25);  // ✅ OK
stmt.run('Bob', '30');  // ✅ Будет приведено к числу
stmt.run('Carol', 'invalid');  // ❌ Ошибка типа

// Явное приведение типов
const age = parseInt(userAge, 10) || 0;
```

### 5. Rate Limiting

```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// Общий лимит
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 минут
  max: 100,                  // 100 запросов
  message: 'Too many requests'
});

// Строгий лимит для auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                    // 5 попыток за 15 минут
  skipSuccessfulRequests: true
});

// Использование
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
```

### 6. Security Headers

```javascript
// middleware/security.js - Все security заголовки
res.set({
  // Не позволять браузерам угадывать Content-Type
  'X-Content-Type-Options': 'nosniff',
  
  // Защита от clickjacking
  'X-Frame-Options': 'DENY',
  
  // Встроенная XSS защита браузера
  'X-XSS-Protection': '1; mode=block',
  
  // Контроль Referrer header
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // HSTS (HTTP Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Permissions Policy (бывший Feature-Policy)
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
});
```

### 7. CORS (Cross-Origin Resource Sharing)

```javascript
// middleware/security.js
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,              // ✅ Разрешить cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  maxAge: 86400                   // 24 часа кэширования
};

app.use(cors(corsOptions));
```

## 🎯 Защита от атак

### Таблица типов атак и защиты

| Атака | OWASP | Защита в FinTrackr | Статус |
|-------|-------|-------------------|--------|
| **XSS** | A03 | CSP, Input sanitization, HTTPOnly cookies | ✅ |
| **CSRF** | A01 | SameSite cookies, CSRF tokens | ✅ |
| **SQL Injection** | A01 | Parameterized queries (better-sqlite3) | ✅ |
| **Brute Force** | A07 | Rate limiting, bcrypt (10 rounds) | ✅ |
| **Session Hijacking** | A02 | HttpOnly cookies, Secure flag, SameSite | ✅ |
| **Man-in-the-Middle** | A02 | HTTPS required, HSTS header | ✅ |
| **Broken Authentication** | A01 | JWT, token rotation, refresh tokens | ✅ |
| **Sensitive Data Exposure** | A02 | Encryption, HTTPS, no logging of passwords | ✅ |

### Специфичные защиты

#### 1. Защита от timing attacks

```javascript
// ❌ УЯЗВИМО - Утекает информация о валидности
if (storedHash === inputHash) {
  // Успех
}

// ✅ БЕЗОПАСНО - Constant-time comparison
const crypto = require('crypto');
const isValid = crypto.timingSafeEqual(
  Buffer.from(storedHash),
  Buffer.from(inputHash)
);
```

#### 2. Защита от replay attacks

```javascript
// Использовать уникальные nonce для каждого запроса
const nonce = crypto.randomBytes(16).toString('hex');
req.session.nonce = nonce;

// Проверить nonce перед обработкой
if (req.body.nonce !== req.session.nonce) {
  return res.status(403).json({ error: 'Replay attack detected' });
}

// Удалить использованный nonce
delete req.session.nonce;
```

#### 3. Защита от кэширования чувствительных данных

```javascript
res.set({
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

// Для /api/* автоматически не кэшировать
// Для GET запросов можно кэшировать с правильным Cache-Control
```

## ⚙️ Конфигурация для production

### .env конфигурация

```env
# ═════════════════════════════════════════════════════════
# ОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ БЕЗОПАСНОСТИ
# ═════════════════════════════════════════════════════════

# JWT Секрет (128 символов минимум!)
JWT_SECRET=<сгенерируйте_256_символа_криптографически_надежным_методом>

# Время жизни токенов
JWT_EXPIRE=7d                      # Access token
REFRESH_TOKEN_EXPIRE=30d           # Refresh token

# ═════════════════════════════════════════════════════════
# COOKIES (Production)
# ═════════════════════════════════════════════════════════

COOKIE_SECURE=true                 # ✅ Только HTTPS
COOKIE_SAMESITE=Strict            # ✅ Максимум CSRF защиты
COOKIE_DOMAIN=yourdomain.com      # Укажите свой домен
COOKIE_PATH=/                      # Только корневой путь

# ═════════════════════════════════════════════════════════
# CORS И ДОМЕНЫ
# ═════════════════════════════════════════════════════════

ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
ALLOWED_HOSTS=yourdomain.com,app.yourdomain.com

# ═════════════════════════════════════════════════════════
# ЛОГИРОВАНИЕ И МОНИТОРИНГ
# ═════════════════════════════════════════════════════════

NODE_ENV=production
LOG_LEVEL=error                    # error, warn, info (НЕ debug!)
RATE_LIMIT_WINDOW=15m              # 15 минут
RATE_LIMIT_MAX=100                 # 100 запросов

# ═════════════════════════════════════════════════════════
# DATABASE
# ═════════════════════════════════════════════════════════

DATABASE_PATH=/var/lib/fintrackr/fintrackr.db
BACKUP_ENABLED=true
BACKUP_FREQUENCY=daily             # hourly, daily, weekly

# ═════════════════════════════════════════════════════════
# OPTIONAL: ТРЕТЬИ СТОРОНЫ
# ═════════════════════════════════════════════════════════

SENTRY_DSN=https://xxxxx@sentry.io/xxxxx  # Error tracking
ADMIN_EMAIL=admin@yourdomain.com    # Для критических ошибок
```

### Генерация безопасного JWT_SECRET

```bash
# Linux/macOS
openssl rand -hex 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# PowerShell (Windows)
$bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64)
[System.Convert]::ToHexString($bytes)
```

### Production checklist

```
🔐 Security Pre-deployment Checklist

✅ Configuration
  □ JWT_SECRET установлен (64+ символа)
  □ COOKIE_SECURE=true
  □ COOKIE_SAMESITE=Strict
  □ NODE_ENV=production

✅ HTTPS/TLS
  □ SSL сертификат установлен (Let's Encrypt)
  □ HSTS header включен
  □ Все HTTP запросы редиректят на HTTPS

✅ Database
  □ SQLite резервная копия автоматизирована
  □ Foreign keys включены
  □ Индексы созданы

✅ Dependencies
  □ npm audit не показывает critical уязвимостей
  □ Все пакеты обновлены до latest stable версии

✅ Логирование и мониторинг
  □ Error logging включен
  □ Sensitive data не логируется (пароли, токены)
  □ Sentry/другой мониторинг настроен

✅ API Security
  □ Rate limiting включен
  □ Input validation для всех endpoints
  □ CORS правильно сконфигурирован

✅ Firewall
  □ Только необходимые порты открыты (80, 443)
  □ Внутренние адреса защищены
  □ DDoS protection включен (CloudFlare, etc.)

✅ Backup & Recovery
  □ Автоматическое бэкапирование работает
  □ Процедура восстановления протестирована
  □ Backup хранится в безопасном месте

✅ Documentation
  □ Security policy обновлена
  □ Incident response plan есть
  □ Команда обучена procedures
```

## 📋 Рекомендации по безопасности

### Immediate Actions (Сейчас)

1. **Обновить пакеты**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Проверить коммиты на secrets**
   ```bash
   npm install -g git-secrets
   git secrets --install
   git secrets --register-aws
   git log -p | grep -i password  # Проверить историю
   ```

3. **Настроить .gitignore**
   ```
   .env
   .env.*.local
   *.key
   *.pem
   node_modules/
   ```

4. **Включить GitHub security features**
   - Settings → Security → Dependabot
   - Settings → Code security and analysis

### Short term (1 месяц)

- [ ] Миграция на PostgreSQL (вместо SQLite)
- [ ] Двухфакторная аутентификация (2FA/TOTP)
- [ ] Redis для session storage (вместо in-memory)
- [ ] Web Application Firewall (CloudFlare/AWS WAF)
- [ ] Security audit по OWASP Top 10

### Medium term (3 месяца)

- [ ] Автоматизированные security тесты (SAST/DAST)
- [ ] Penetration testing
- [ ] API rate limiting через Redis
- [ ] Encryption at rest для sensitive данных
- [ ] Compliance: SOC 2, GDPR

### Long term (6+ месяцев)

- [ ] Zero-trust architecture
- [ ] Service mesh (Istio/Linkerd)
- [ ] Hardware security keys support
- [ ] Blockchain for audit trail
- [ ] AI-powered threat detection

## 📋 COMPLIANCE

### GDPR (General Data Protection Regulation)

#### Реализовано в FinTrackr

| Требование | Статус | Деталь |
|-----------|--------|--------|
| Согласие на обработку | ✅ | Terms & Privacy policy при регистрации |
| Право на доступ | ✅ | API для экспорта своих данных |
| Право на удаление | ✅ | Удаление аккаунта удаляет все данные |
| Портабельность данных | ✅ | Экспорт в JSON/CSV |
| Уведомление об инцидентах | ✅ | Email уведомление при security issues |
| Privacy by default | ✅ | Минимальное сбор данных |
| Шифрование | ⏳ | Планируется end-to-end encryption |

#### GDPR Data Processing Agreement

```javascript
// privacy-policy.md должен содержать:
// - Какие данные собираются
// - Как используются
// - Как хранятся
// - Как долго хранятся
// - Кто имеет доступ
// - Где серверы расположены (EU/US/другое)
```

### PCI DSS (если обработка платежей)

⚠️ **FinTrackr НЕ обрабатывает платежи напрямую, но если планируется:**

- Использовать только PCI DSS-compliant payment gateway (Stripe, PayPal)
- Никогда не хранить credit card данные
- Использовать tokenization для платежей

### SOC 2 (if applicable)

- [ ] Access controls
- [ ] Change management
- [ ] Incident management
- [ ] Audit logging
- [ ] Security monitoring

## 📚 Ресурсы

### Оффициальные документы

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

### Security Tools

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP ZAP](https://www.zaproxy.org/)
- [Snyk](https://snyk.io/) - Vulnerability scanning
- [Sonarqube](https://www.sonarqube.org/) - Code quality
- [git-secrets](https://github.com/awslabs/git-secrets) - Prevent secret leaks

### Обучение

- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [Cybrary](https://www.cybrary.it/)
- [SANS Cyber Aces](https://www.cyberaces.org/)

## 👨‍💼 Команда безопасности

| Роль | Контакт | Зона ответственности |
|------|---------|----------------------|
| **Security Lead** | atpagaming@gmail.com | Общая стратегия |
| **DevSecOps** | - | CI/CD security |
| **Incident Response** | - | Security incidents |

## 📊 Security Metrics

| Метрика | Целевое значение | Текущее значение |
|---------|-----------------|------------------|
| MTTR (Mean Time To Respond) | < 1 часа | - |
| MTTR (Mean Time To Resolve) | < 24 часа | - |
| Vulnerabilities (critical) | 0 | 0 |
| Vulnerabilities (high) | 0 | 0 |
| Test coverage | > 80% | 60% |
| Incident response tests | Quarterly | - |

## 📞 Контакты

| Тип обращения | Контакт |
|---------------|---------|
| **Security issues** | atpagaming@gmail.com (тема: SECURITY) |
| **General questions** | [GitHub Issues](https://github.com/atpa/fintrackr-project/issues) |
| **Suggestions** | [GitHub Discussions](https://github.com/atpa/fintrackr-project/discussions) |

---

**Последнее обновление:** Ноябрь 2024  
**Версия документа:** 2.0  
**Reviewed by:** Security Team
