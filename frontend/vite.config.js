import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const { globalHeaders } = JSON.parse(readFileSync(new URL('./public/staticwebapp.config.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: { headers: globalHeaders },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:7071',
    },
  },
})
