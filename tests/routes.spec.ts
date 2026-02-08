import { test } from 'playwright-test-coverage';
import { basicInit } from './testUtils';

test('static pages load', async ({ page }) => {
  await basicInit(page);

  await page.goto('/about');
  await page.goto('/docs');
  await page.goto('/history');
});

test('404 page', async ({ page }) => {
  await basicInit(page);
  await page.goto('/somefakepage');
});
