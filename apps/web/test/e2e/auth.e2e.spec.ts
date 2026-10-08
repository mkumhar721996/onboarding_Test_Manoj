import { test, expect } from '@playwright/test';

test('register → verify → log in → account home → log out', async ({ page }) => {
  let loggedIn = false;
  await page.route('**/auth/session', (route) =>
    loggedIn
      ? route.fulfill({ json: { name: 'Jordan Lee', email: 'jordan@example.com', rememberMe: false } })
      : route.fulfill({ status: 401, json: { reason: 'none' } }),
  );
  await page.route('**/auth/register', (route) =>
    route.fulfill({ status: 201, json: { name: 'Jordan Lee', email: 'jordan@example.com' } }),
  );
  await page.route('**/auth/verify-email', (route) =>
    route.fulfill({ json: { message: 'Email verified.' } }),
  );
  await page.route('**/auth/login', (route) => {
    loggedIn = true;
    return route.fulfill({ json: { name: 'Jordan Lee', email: 'jordan@example.com', rememberMe: false } });
  });
  await page.route('**/auth/logout', (route) => {
    loggedIn = false;
    return route.fulfill({ json: { rememberMe: false } });
  });

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Jordan Lee');
  await page.getByLabel('Email address').fill('jordan@example.com');
  await page.getByLabel('Password').fill('Fresh2Start');
  await page.getByLabel('Date of birth').fill('1998-06-15');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Account created')).toBeVisible();

  await page.goto('/confirm-email?token=fake-token');
  await expect(page.getByText('Email verified')).toBeVisible();

  await page.getByRole('link', { name: 'Log in' }).click();
  await page.getByLabel('Email address').fill('jordan@example.com');
  await page.getByLabel('Password').fill('Fresh2Start');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Jordan' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('You’ve been logged out.')).toBeVisible();
});
