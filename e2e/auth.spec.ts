import { expect, test } from "@playwright/test";

test("registration, session and logout work end to end", async ({ page }) => {
  const email = `pw-${Date.now()}@aijob.local`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Playwright QA");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Playwright QA")).toBeVisible();

  await page.getByRole("button", { name: /Playwright QA/ }).click();
  await page.getByText("Sign out", { exact: true }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("invalid login is rejected with a visible error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@aijob.local");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/Invalid email or password/)).toBeVisible();
});
