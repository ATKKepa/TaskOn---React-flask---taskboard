import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
    port: 5173,
    strictPort: true,
    open: false,
  },
  css: {
    devSourcemap: true,
  },
  build: {
    target: 'es2020',
  },
});
