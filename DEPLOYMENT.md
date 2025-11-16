# 🚀 Инструкции по развертыванию FinTrackr

## Railway

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. Подключите ваш GitHub репозиторий
3. Railway автоматически определит Node.js проект
4. Установите переменные окружения через Railway Dashboard
5. Приложение будет доступно по персональному URL

## Render.com

- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node.js
- Port: 3000 (автоматически)

## Docker (локально)

1. Соберите образ:
   ```bash
   docker build -t fintrackr .
   ```
2. Запустите контейнер:
   ```bash
   docker run -d -p 3000:3000 --env-file .env fintrackr
   ```

## Локальное тестирование

```bash
npm install
NODE_ENV=production npm start
```

## Production Checklist

- [ ] Установить сильный `JWT_SECRET`
- [ ] Включить `COOKIE_SECURE=true`
- [ ] Использовать HTTPS
- [ ] Установить `NODE_ENV=production`
- [ ] Скопировать `.env` на сервер (не хранить в git)
- [ ] Настроить SSL сертификат (Let's Encrypt)
- [ ] Включить HSTS заголовки
- [ ] Настроить резервное копирование БД

## Примеры переменных окружения

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your_secret_key
COOKIE_SECURE=true
COOKIE_SAMESITE=Strict
DATABASE_PATH=./backend/fintrackr.db
LOG_LEVEL=info
```

---

**Вопросы по деплою:** [GitHub Discussions](https://github.com/atpa/fintrackr-project/discussions)
