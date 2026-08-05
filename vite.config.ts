import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/sanctum': { target: apiTarget, changeOrigin: true },
      '/up': { target: apiTarget, changeOrigin: true },
    },
  },
})
