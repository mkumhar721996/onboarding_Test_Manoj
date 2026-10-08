import { test, expect } from '@playwright/test';

test('loads the HR Management System shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'HR Management System' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});
