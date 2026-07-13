import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
 },
  base: '/program/imes_zbs_vue/',
  server: {
    port: 5173,
    proxy: {
      '/imc': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
