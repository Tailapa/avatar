import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8000',
    screenshot: 'on',  // always take screenshots
    video: 'off',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
