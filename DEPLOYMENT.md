# Deployment Instructions

## Хостинг приложения FinTrackr

### Вариант 1: Railway (Рекомендуемый)

1. Зарегистрируйтесь на [Railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Railway автоматически определит Node.js проект
4. Приложение будет доступно по URL вида: `https://fintrackr-production.up.railway.app`

### Вариант 2: Render

1. Зарегистрируйтесь на [Render.com](https://render.com)
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Настройки:
   - **Build Command**: `npm install` (если есть зависимости)
   - **Start Command**: `npm start`
   - **Environment**: Node.js
   - **Port**: 3000

### Вариант 3: Vercel (только фронтенд)

Для статического хостинга фронтенда:

1. Установите Vercel CLI: `npm i -g vercel`
2. В папке проекта: `vercel`
3. Следуйте инструкциям CLI
4. Для бэкенда используйте отдельный сервис

### Локальное тестирование

```bash
# Установка зависимостей (если есть)
npm install

# Запуск сервера
npm start

# Приложение будет доступно на http://localhost:3000
```

### Environment Variables

Для продакшен среды рекомендуется использовать:

```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com
```

### SSL и HTTPS

Большинство современных хостинг-провайдеров (Railway, Render, Vercel) автоматически предоставляют SSL сертификаты.

### Мониторинг

После развертывания проверьте:

- [ ] Главная страница загружается
- [ ] API endpoints отвечают
- [ ] Графики отображаются корректно
- [ ] Мобильная версия работает
- [ ] CORS настроен правильно
