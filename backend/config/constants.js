/**
 * Application constants
 * Centralized configuration and constant values
 */

// Environment configuration
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change",
  PORT: process.env.PORT || 3000,
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "Strict" : "Lax"),
  DISABLE_PERSIST: process.env.FINTRACKR_DISABLE_PERSIST === "true",
};

// Token configuration
const TOKEN_CONFIG = {
  ACCESS_TTL_SECONDS: 15 * 60, // 15 minutes
  REFRESH_TTL_SECONDS: 7 * 24 * 60 * 60, // 7 days
};

// MIME types for static file serving
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

// Supported banks (mock data for MVP)
const BANKS = [
  { id: 1, name: "Тинькофф" },
  { id: 2, name: "Сбербанк" },
  { id: 3, name: "Альфа-Банк" },
  { id: 4, name: "ВТБ" },
];

// Currency exchange rates (relative to USD)
const RATE_MAP = {
  USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
  EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
  PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
  RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 },
};

// Mock bank transactions for testing
const MOCK_BANK_TRANSACTIONS = {
  1: [
    {
      external_id: "tnk_grocery_001",
      description: "Перекрёсток, Москва",
      type: "expense",
      amount: 2350.4,
      currency: "RUB",
      date: "2025-03-12",
      category: { name: "Продукты", kind: "expense" },
    },
    {
      external_id: "tnk_taxi_001",
      description: "Яндекс Такси",
      type: "expense",
      amount: 680.3,
      currency: "RUB",
      date: "2025-03-14",
      category: { name: "Транспорт", kind: "expense" },
    },
  ],
  2: [
    {
      external_id: "sber_salary_001",
      description: "Зарплата",
      type: "income",
      amount: 150000,
      currency: "RUB",
      date: "2025-03-01",
      category: { name: "Зарплата", kind: "income" },
    },
  ],
};

module.exports = {
  ENV,
  TOKEN_CONFIG,
  MIME_TYPES,
  BANKS,
  RATE_MAP,
  MOCK_BANK_TRANSACTIONS,
};
