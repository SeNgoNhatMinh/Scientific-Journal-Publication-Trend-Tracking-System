import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

const RAILWAY_URL = 'https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app';
const LOCAL_BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:5001';

// Dev mặc định dùng backend local. Set VITE_USE_LOCAL_BACKEND=false nếu muốn proxy Railway.
const USE_LOCAL = process.env.VITE_USE_LOCAL_BACKEND !== 'false';
const BACKEND_TARGET = USE_LOCAL ? LOCAL_BACKEND : RAILWAY_URL;

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
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: !USE_LOCAL,
      },
      '/uploads': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: !USE_LOCAL,
      },
      '/health': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: !USE_LOCAL,
      },
    },
  },
})
