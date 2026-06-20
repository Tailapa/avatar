import { test, expect } from '@playwright/test';

test.describe('Visitor Chat', () => {
  test('page loads with correct title and dark theme', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Avatar/);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({ path: 'tests/screenshots/01-visitor-chat-initial.png', fullPage: true });
  });

  test('intro section is visible on fresh load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#introSection')).toBeVisible();
    await expect(page.locator('.suggest-row')).toBeVisible();
  });

  test('composer textarea is autofocused', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#composerTextarea');
    await expect(textarea).toBeFocused();
  });

  test('keep chat switch is on by default', async ({ page }) => {
    await page.goto('/');
    const keepChatInput = page.locator('#keepChatInput');
    await expect(keepChatInput).toBeChecked();
  });

  test('theme toggle switches between dark and light', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.click('#themeToggle');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.screenshot({ path: 'tests/screenshots/02-visitor-light-mode.png', fullPage: true });

    await page.click('#themeToggle');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('Qn instant answer works (Q1)', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#composerTextarea');
    await textarea.fill('Q1');
    await textarea.press('Enter');

    // Wait for the instant response (no LLM call)
    await page.waitForSelector('.msg--avatar', { timeout: 10000 });
    await expect(page.locator('.msg--avatar .instant-tag').first()).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/03-qn-instant-answer.png', fullPage: true });
  });

  test('visitor message appears in chat', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#composerTextarea');
    await textarea.fill('Q2');
    await textarea.press('Enter');

    await page.waitForSelector('.msg--visitor', { timeout: 5000 });
    await expect(page.locator('.msg--visitor')).toBeVisible();
  });

  test('intro hides after first message', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#composerTextarea');
    await textarea.fill('Q1');
    await textarea.press('Enter');

    await page.waitForSelector('.msg--visitor', { timeout: 5000 });
    await expect(page.locator('#introSection')).not.toBeVisible();
  });

  test('suggestion chip submits message on click', async ({ page }) => {
    // Clear state so we always see the fresh intro with suggestion chips
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('avatar-keep-chat');
      document.cookie = 'avatar-conv-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    });
    await page.reload();

    // Click "Reset" to ensure fresh conversation, then chips should be visible
    await page.click('#resetBtn');
    const chip = page.locator('.suggest-chip').first();
    await expect(chip).toBeVisible();
    await chip.click();

    await page.waitForSelector('.msg--visitor', { timeout: 10000 });
    await expect(page.locator('.msg--visitor')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/04-chip-click.png', fullPage: true });
  });

  test('name field persists to localStorage', async ({ page }) => {
    await page.goto('/');
    await page.fill('#nameInput', 'Test User');
    await page.reload();
    await expect(page.locator('#nameInput')).toHaveValue('Test User');
  });

  test('reset button clears conversation', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#composerTextarea');
    await textarea.fill('Q1');
    await textarea.press('Enter');
    await page.waitForSelector('.msg--visitor', { timeout: 5000 });

    await page.click('#resetBtn');
    await expect(page.locator('.msg--visitor')).not.toBeVisible();
    await expect(page.locator('#introSection')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/05-after-reset.png', fullPage: true });
  });

  test('LLM chat response streams in (with Q3 faq shortcut)', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#composerTextarea');
    await textarea.fill('Q3');
    await textarea.press('Enter');

    await page.waitForSelector('.msg--avatar .bubble', { timeout: 15000 });
    const bubbleText = await page.locator('.msg--avatar .bubble').first().textContent();
    expect(bubbleText).toBeTruthy();
    expect(bubbleText!.length).toBeGreaterThan(10);
    await page.screenshot({ path: 'tests/screenshots/06-faq-answer.png', fullPage: true });
  });

  test('deep link ?q=2 submits Q2 on load', async ({ page }) => {
    await page.goto('/?q=2');
    await page.waitForSelector('.msg--visitor', { timeout: 5000 });
    await expect(page.locator('.msg--visitor')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/07-deep-link.png', fullPage: true });
  });

  test('mobile layout looks correct', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.screenshot({ path: 'tests/screenshots/08-mobile-visitor.png', fullPage: true });
  });
});
