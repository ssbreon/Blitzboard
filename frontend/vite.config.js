/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vite'

const { globalHeaders } = JSON.parse(readFileSync(new URL('./public/staticwebapp.config.json', import.meta.url), 'utf8'))
const viteCacheDir = process.env.VITE_CACHE_DIR || join(tmpdir(), 'blitzboard-vite-cache')

// https://vite.dev/config/
export default defineConfig({
  cacheDir: viteCacheDir,
  plugins: [react()],
  preview: { headers: globalHeaders },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:7071',
    },
  },
})
