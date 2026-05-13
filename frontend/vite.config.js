import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api/* → backend so the browser never makes cross-origin requests
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // 512x512 height maps can run for several minutes in dev.
        proxyTimeout: 15 * 60 * 1000,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
