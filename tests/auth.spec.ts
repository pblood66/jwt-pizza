import { test, expect } from "playwright-test-coverage";
import { basicInit } from "./testUtils";


test("home page", async ({ page }) => {
  await page.goto("/");

  expect(await page.title()).toBe("JWT Pizza");
});

test('login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('user registration', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Register' }).click();

  await page.getByPlaceholder('Full name').fill('New User');
  await page.getByPlaceholder('Email address').fill('new@jwt.com');
  await page.getByPlaceholder('Password').fill('a');

  await page.route('*/**/api/auth', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      json: { user: { name: 'New User' }, token: 'abc' }
    });
  });

  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('link', { name: 'NU', exact: true })).toBeVisible();
});


test('logout works', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Logout' }).click();

  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});