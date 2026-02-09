import { test, expect } from "playwright-test-coverage";
import { basicInit } from "./testUtils";
import { Role } from '../src/service/pizzaService';

test('admin dashboard loads', async ({ page }) => {
    await basicInit(page, Role.Admin);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('a');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByRole('list')).toContainText('admin-dashboard');
});

test("diner dashboard loads", async ({ page }) => {
    await basicInit(page);

    await page.getByRole("link", { name: "Login" }).click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole('link', { name: 'kc' }).click();
    await expect(page.getByRole('list')).toContainText('diner-dashboard');
});

test("franchise dashboard loads", async ({ page }) => {
    await basicInit(page, Role.Franchisee);

    await page.getByRole("link", { name: "Login" }).click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
    await expect(page.getByRole('list')).toContainText('franchise-dashboard');
});