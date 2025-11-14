import { defineConfig } from 'vite';
import { resolve } from 'path';

// TODO: После миграции всех страниц в frontend/src/pages/ обновить пути
const inputs = {
  // Старые страницы (frontend/pages/) — постепенно мигрируем
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
  
  // Новые модули (frontend/src/)
  store: 'frontend/src/modules/store.js',
  charts: 'frontend/src/modules/charts.js',
  helpers: 'frontend/src/modules/helpers.js',
  api: 'frontend/src/modules/api.js',
  validation: 'frontend/src/modules/validation.js',
  
  // Компоненты
  cardAccount: 'frontend/src/components/CardAccount.js',
  cardTransaction: 'frontend/src/components/CardTransaction.js',
  tableBase: 'frontend/src/components/TableBase.js',
  modalBase: 'frontend/src/components/ModalBase.js',
  toast: 'frontend/src/components/Toast.js',
  formBase: 'frontend/src/components/FormBase.js',
  skeletonLoader: 'frontend/src/components/SkeletonLoader.js',
  
  // Layout
  sidebar: 'frontend/src/layout/Sidebar.js',
  header: 'frontend/src/layout/Header.js',
  layout: 'frontend/src/layout/Layout.js',
};

export default defineConfig({
  publicDir: false, // Отключаем копирование public/ (файлы уже там)
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend/src'),
      '@modules': resolve(__dirname, 'frontend/src/modules'),
      '@components': resolve(__dirname, 'frontend/src/components'),
      '@layout': resolve(__dirname, 'frontend/src/layout'),
    }
  },
  build: {
    outDir: 'dist/assets', // Временная папка для сборки
    emptyOutDir: true,
    rollupOptions: {
      input: inputs,
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
        
        // Code splitting для оптимизации
        manualChunks: {
          vendor: ['chart.js'], // TODO: добавить после установки Chart.js
          ui: [
            'frontend/src/components/CardAccount.js',
            'frontend/src/components/CardTransaction.js',
            'frontend/src/components/TableBase.js',
            'frontend/src/components/ModalBase.js',
            'frontend/src/components/Toast.js',
            'frontend/src/components/FormBase.js',
            'frontend/src/components/SkeletonLoader.js',
          ],
          core: [
            'frontend/src/modules/store.js',
            'frontend/src/modules/helpers.js',
          ]
        }
      },
    },
    
    // Минификация для production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Удаляем console.log в production
        drop_debugger: true,
      }
    },
    
    // Source maps для development
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  
  // Dev server settings
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});
