import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, las llamadas a /api se redirigen a la API de Docker
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
