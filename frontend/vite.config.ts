import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target: 'https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
