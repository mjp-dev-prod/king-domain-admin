import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // The backend allowlists this origin for CORS and issues invite links
    // pointing at it. strictPort so a silent fallback to another port doesn't
    // break CORS and invite links in a confusing way.
    port: 5180,
    strictPort: true,
  },
})
