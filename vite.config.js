import { defineConfig } from 'vite';

const inputs = {
  accounts: 'frontend/pages/accounts.js',
  budgets: 'frontend/pages/budgets.js',
  categories: 'frontend/pages/categories.js',
  converter: 'frontend/pages/converter.js',
  dashboard: 'frontend/pages/dashboard.js',
  education: 'frontend/pages/education.js',
  forecast: 'frontend/pages/forecast.js',
  goals: 'frontend/pages/goals.js',
  landing: 'frontend/pages/landing.js',
  login: 'frontend/pages/login.js',
  planned: 'frontend/pages/planned.js',
  premium: 'frontend/pages/premium.js',
  recurring: 'frontend/pages/recurring.js',
  register: 'frontend/pages/register.js',
  reports: 'frontend/pages/reports.js',
  rules: 'frontend/pages/rules.js',
  settings: 'frontend/pages/settings.js',
  subscriptions: 'frontend/pages/subscriptions.js',
  sync: 'frontend/pages/sync.js',
  transactions: 'frontend/pages/transactions.js',
};

export default defineConfig({
  build: {
    outDir: 'dist/assets',
    emptyOutDir: false,
    rollupOptions: {
      input: inputs,
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
