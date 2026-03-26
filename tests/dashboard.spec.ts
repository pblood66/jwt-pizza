import { test, expect } from "playwright-test-coverage";
import { basicInit } from "./testUtils";
import { Role } from "../src/service/pizzaService";

test("admin dashboard loads", async ({ page }) => {
  await basicInit(page, Role.Admin);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page.getByRole("list")).toContainText("admin-dashboard");
});

test("diner dashboard loads", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "kc" }).click();
  await expect(page.getByRole("list")).toContainText("diner-dashboard");
});

test("franchise dashboard loads", async ({ page }) => {
  await basicInit(page, Role.Franchisee);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await page
    .getByLabel("Global")
    .getByRole("link", { name: "Franchise" })
    .click();
  await expect(page.getByRole("list")).toContainText("franchise-dashboard");
});

test("list users", async ({ page }) => {
  await basicInit(page, Role.Admin);

  // Login as admin user
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("d");
  await page.getByRole("button", { name: "Login" }).click();

  // Navigate to users list page (adjust selector based on your UI)
  await page.getByRole("link", { name: "Admin" }).click();
  // Or wherever the users list is accessed in your app

  // Verify users are displayed
  await expect(page.getByRole("main")).toContainText("Kai Chen");
  await expect(page.getByRole("main")).toContainText("Admin User");

  // Test name filter if your UI has it
  await page.getByRole("textbox", { name: "Filter users" }).click();
  await page.getByRole("textbox", { name: "Filter users" }).fill("Kai");
  await page
    .getByRole("cell", { name: "Kai Submit" })
    .getByRole("button")
    .click();
  await expect(page.getByRole("main")).toContainText("Kai Chen");
  await expect(page.getByRole("main")).not.toContainText("Admin User");
});

test("delete user", async ({ page }) => {
  await basicInit(page, Role.Admin);

  // Login as admin user
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("d");
  await page.getByRole("button", { name: "Login" }).click();

  // Navigate to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  // Verify both users exist before deletion
  await expect(page.getByRole("main")).toContainText("Kai Chen");
  await expect(page.getByRole("main")).toContainText("Admin User");

  // Delete Kai Chen user
  await page
    .getByRole("row", { name: "Kai Chen d@jwt.com admin" })
    .getByRole("button")
    .click();

  await expect(page.getByRole("main")).not.toContainText("Kai Chen");
  await expect(page.getByRole("main")).toContainText("Admin User");
});

test("create store", async ({ page }) => {
  await basicInit(page, Role.Franchisee);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("f@jwt.com");
  await page.getByPlaceholder("Password").fill("f");
  await page.getByRole("button", { name: "Login" }).click();

  await page
    .getByLabel("Global")
    .getByRole("link", { name: "Franchise" })
    .click();
  await expect(page.getByRole("main")).toContainText("Create store");
  await page.getByRole("button", { name: "Create store" }).click();
  await page.getByRole("textbox", { name: "store name" }).click();
  await page.getByRole("textbox", { name: "store name" }).fill("test");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("tbody")).toContainText("test");
  await expect(page.getByRole("main")).toContainText("Create store");
});
