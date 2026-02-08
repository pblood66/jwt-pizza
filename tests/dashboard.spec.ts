import { test, expect } from "playwright-test-coverage";
import { basicInit } from "./testUtils";

test("diner dashboard loads", async ({ page }) => {
    await basicInit(page);

    await page.getByRole("link", { name: "Login" }).click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole('link', { name: 'kc' }).click();
    await expect(page.getByRole('list')).toContainText('diner-dashboard');
});
