import { test, expect } from '@playwright/test';

// Get the admin password from env (set it as env var or hardcode for testing)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Kannada@19561101';

test.describe('Admin Dashboard', () => {
  test('shows login screen when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.locator('#dashboard')).not.toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/09-admin-login.png', fullPage: true });
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/admin');
    await page.fill('#passwordInput', 'wrongpassword');
    await page.click('#loginBtn');
    await page.waitForSelector('#loginError:not([style*="display: none"])', { timeout: 5000 });
    await expect(page.locator('#loginError')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/10-admin-login-error.png' });
  });

  test('login with correct password shows dashboard', async ({ page }) => {
    await page.goto('/admin');
    await page.fill('#passwordInput', ADMIN_PASSWORD);
    await page.click('#loginBtn');

    await page.waitForSelector('#dashboard:not([style*="display: none"])', { timeout: 10000 });
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#loginScreen')).not.toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/11-admin-dashboard.png', fullPage: true });
  });

  test('admin dashboard shows inbox sidebar', async ({ page }) => {
    await page.goto('/admin');
    await page.fill('#passwordInput', ADMIN_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboard:not([style*="display: none"])', { timeout: 10000 });

    await expect(page.locator('.sidebar')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/12-admin-inbox.png', fullPage: true });
  });

  test('admin light mode toggle', async ({ page }) => {
    await page.goto('/admin');
    await page.fill('#passwordInput', ADMIN_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboard:not([style*="display: none"])', { timeout: 10000 });

    await page.click('#themeToggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({ path: 'tests/screenshots/13-admin-light.png', fullPage: true });
  });

  test('mobile admin layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await page.fill('#passwordInput', ADMIN_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboard:not([style*="display: none"])', { timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/14-admin-mobile.png', fullPage: true });
  });
});
