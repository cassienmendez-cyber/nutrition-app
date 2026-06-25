import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works at any path — root (home server / Netlify)
  // *and* a project sub-path like GitHub Pages (/nutrition-app/).
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy coach API calls to the backend (npm run server). When the backend
    // isn't running, the frontend falls back to its offline rule engine.
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
