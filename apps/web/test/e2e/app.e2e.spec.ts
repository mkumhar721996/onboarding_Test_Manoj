import { test, expect } from '@playwright/test';

test('redirects unauthenticated visitors to the login page', async ({ page }) => {
  await page.route('**/auth/session', (route) =>
    route.fulfill({ status: 401, json: { reason: 'none' } }),
  );
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
