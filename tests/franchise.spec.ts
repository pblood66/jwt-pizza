
import { test, expect } from "playwright-test-coverage";
import { basicInit } from "./testUtils";
import { Role } from '../src/service/pizzaService';

test('create franchise', async({ page }) => {
    await basicInit(page, Role.Admin);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('a');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'Admin' }).click();

    await page.getByRole('button', { name: 'Add Franchise' }).click();
    await expect(page.getByRole('heading')).toContainText('Create franchise');
    await page.getByRole('textbox', { name: 'franchise name' }).click();
    await page.getByRole('textbox', { name: 'franchise name' }).fill('test');
    await page.getByRole('textbox', { name: 'franchise name' }).press('Tab');
    await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('f@jwt.com');
    await page.getByRole('button', { name: 'Create' }).click();
});
