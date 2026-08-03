import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()];
  const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080';
  try {
    // @ts-ignore
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {}

  return {
    plugins,
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/sanctum': { target: apiTarget, changeOrigin: true },
        '/up': { target: apiTarget, changeOrigin: true },
      },
    },
  };
})
