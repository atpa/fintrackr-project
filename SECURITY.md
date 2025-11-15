# Security Policy

## Поддерживаемые версии

Мы предоставляем security updates для следующих версий FinTrackr:

| Версия | Поддержка          |
| ------ | ------------------ |
| 1.x.x  | :white_check_mark: |
| < 1.0  | :x:                |

## Сообщение об уязвимостях

Безопасность FinTrackr - наш приоритет. Если вы обнаружили уязвимость, пожалуйста, сообщите нам об этом ответственно.

### Как сообщить

**НЕ создавайте публичный issue для security уязвимостей.**

Вместо этого:
1. Отправьте email на **atpagaming@gmail.com** с темой "SECURITY: FinTrackr"
2. Опишите уязвимость подробно
3. Приложите proof-of-concept, если возможно
4. Укажите ваши контактные данные для дальнейшей связи

### Что включить в отчёт

Хороший security report должен содержать:
- Тип уязвимости (XSS, CSRF, SQL Injection и т.д.)
- Местонахождение уязвимого кода (файл, строка)
- Шаги для воспроизведения
- Потенциальное влияние на безопасность
- Предложения по исправлению (опционально)

### Наш процесс

1. **Подтверждение** - Мы ответим в течение 48 часов
2. **Оценка** - Мы оценим серьёзность и приоритет (1-3 дня)
3. **Исправление** - Мы разработаем и протестируем patch (зависит от серьёзности)
4. **Релиз** - Мы выпустим security update
5. **Disclosure** - Мы публично сообщим об уязвимости после patch

### Timeline

- **Critical**: Patch в течение 24-48 часов
- **High**: Patch в течение 7 дней
- **Medium**: Patch в течение 30 дней
- **Low**: Patch в следующем релизе

## Реализованные меры безопасности

### Аутентификация и авторизация
- ✅ JWT токены с HttpOnly cookies
- ✅ bcrypt хеширование паролей (10 rounds)
- ✅ Refresh токены для длительных сессий
- ✅ Token blacklist для logout
- ✅ SameSite=Strict cookies в production для CSRF защиты

### Защита от атак
- ✅ Rate limiting (100 requests per 15 minutes per IP)
- ✅ Input sanitization (XSS фильтрация)
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options: DENY (защита от clickjacking)
- ✅ X-Content-Type-Options: nosniff
- ✅ Secure headers (X-XSS-Protection, Referrer-Policy)

### Безопасность данных
- ✅ Пароли никогда не логируются
- ✅ Sensitive данные не отправляются клиенту
- ✅ HTTPS рекомендуется для production (COOKIE_SECURE=true)
- ✅ Environment variables для secrets

### Мониторинг и аудит
- ✅ Request logging (только в development)
- ✅ Error handling без раскрытия внутренних деталей
- ⏳ Dependency vulnerability scanning (планируется в CI)
- ⏳ Automated security audits (планируется)

## Конфигурация для production

### Обязательные настройки

```bash
# Установите сильный JWT секрет (64+ символов)
JWT_SECRET=<ваш_случайный_секрет>

# Включите Secure cookies при использовании HTTPS
COOKIE_SECURE=true

# Используйте Strict SameSite в production
COOKIE_SAMESITE=Strict
```

### Генерация сильного секрета

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Рекомендации по развертыванию

1. **HTTPS обязателен** - Используйте Let's Encrypt или другой SSL сертификат
2. **Firewall** - Ограничьте доступ только к необходимым портам
3. **Environment variables** - Никогда не коммитьте .env файлы
4. **Regular updates** - Обновляйте зависимости регулярно (`npm audit`)
5. **Backup** - Регулярно делайте backup базы данных
6. **Monitoring** - Настройте мониторинг ошибок и аномалий

## Известные ограничения

### Текущая архитектура (v1.0)

- **JSON file storage** - Не поддерживает concurrent access, нет ACID транзакций
  - Миграция на SQLite запланирована в Phase 2
- **In-memory rate limiting** - Сбрасывается при рестарте сервера
  - Redis rate limiting запланирован для масштабирования
- **No CSRF tokens** - Полагаемся на SameSite cookies
  - CSRF tokens запланированы в Phase 4

### Рекомендации

Для production использования с высокой нагрузкой:
1. Мигрируйте на PostgreSQL или MongoDB
2. Используйте Redis для session storage и rate limiting
3. Добавьте WAF (Web Application Firewall)
4. Настройте SIEM для security event monitoring

## Compliance

### GDPR (для EU пользователей)

- Пользователи могут удалить свой аккаунт (удаление всех данных)
- Пароли хешированы и не восстанавливаемы
- Email используется только для аутентификации (нет marketing)
- Данные хранятся локально (нет 3rd party sharing)

### Лучшие практики

- Следуем OWASP Top 10 рекомендациям
- Используем HTTPS для production
- Регулярные security audits
- Principle of least privilege
- Defense in depth approach

## Ресурсы

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Благодарности

Мы благодарим security researchers, которые ответственно сообщают об уязвимостях. Ваши имена будут упомянуты здесь (с вашего согласия):

- _Пока нет зарегистрированных уязвимостей_

## Контакт

Security вопросы: **atpagaming@gmail.com**  
Общие вопросы: [GitHub Issues](https://github.com/atpa/fintrackr-project/issues)

---

**Последнее обновление:** 15 ноября 2025  
**Версия документа:** 1.0
