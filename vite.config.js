import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public', // Set the root to the public directory
  server: {
    port: 5173,
    open: true, // Automatically open in the browser
  },
  build: {
    outDir: '../dist', // Output directory relative to the root
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
      }
    }
  }
});

