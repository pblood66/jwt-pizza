import { expect, test } from 'playwright-test-coverage';
import { basicInit } from './testUtils';

test('static pages load', async ({ page }) => {
  await basicInit(page);

  await page.goto('/about');
  await expect(page.getByRole('main')).toContainText('The secret sauce');
  await page.goto('/docs');
  await page.goto('/history');
  await expect(page.getByRole('heading')).toContainText('Mama Rucci, my my');
});

test('404 page', async ({ page }) => {
  await basicInit(page);
  await page.goto('/somefakepage');

  await expect(page.getByRole('heading')).toContainText('Oops');
});
