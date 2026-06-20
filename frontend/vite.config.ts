import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/admin/api': 'http://localhost:8000',
      '/admin/login': 'http://localhost:8000',
      '/admin/logout': 'http://localhost:8000',
    },
  },
})
