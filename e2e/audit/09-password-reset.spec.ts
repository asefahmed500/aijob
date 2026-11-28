import { expect, test } from "@playwright/test";
import { API, apiCall, observe, unique } from "./helpers";

test.describe("Password reset flow and public auth UX", () => {
  test("forgot -> reset -> sign in with the new password, token is single-use", async ({ page }) => {
    const log = observe(page);
    const email = unique("qa-reset").toLowerCase() + "@aijob.local";
    const registered = await page.request.post(`${API}/auth/register`, {
      data: { email, password: "OldPassword123!", name: "QA Reset User" },
    });
    expect(registered.ok()).toBeTruthy();

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: /Send reset link/ }).click();
    await expect(page.getByText("Reset link ready")).toBeVisible({ timeout: 15_000 });

    const resetLink = page.getByRole("link", { name: "Open password reset" });
    await expect(resetLink).toBeVisible();
    const href = await resetLink.getAttribute("href");
    expect(href, "a usable local reset link was issued").toMatch(/\/reset-password\?token=/);

    await page.goto(href!);
    await page.getByLabel("New password").fill("NewPassword456!");
    await page.getByLabel("Confirm password").fill("NewPassword456!");
    await page.getByRole("button", { name: /Reset password/ }).click();
    await expect(page.getByText("Password updated")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: /Sign in/ }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("NewPassword456!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const reused = await apiCall(page, "POST", "/auth/reset-password", {
      token: new URL(href!, "http://localhost").searchParams.get("token"),
      password: "AnotherPass789!",
    });
    expect(reused.status()).toBe(400);
    expect(log.pageErrors).toEqual([]);
  });

  test("unknown email gets a generic response and no reset token", async ({ page }) => {
    const response = await apiCall(page, "POST", "/auth/forgot-password", {
      email: unique("qa-unknown").toLowerCase() + "@aijob.local",
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { ok: boolean; devToken?: string };
    expect(body.ok).toBe(true);
    expect(body.devToken).toBeUndefined();
  });

  test("mismatched and short passwords are rejected by the UI", async ({ page }) => {
    const email = unique("qa-reset-validation").toLowerCase() + "@aijob.local";
    await page.request.post(`${API}/auth/register`, {
      data: { email, password: "InitialPass123!" },
    });
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: /Send reset link/ }).click();
    const href = await page.getByRole("link", { name: "Open password reset" }).getAttribute("href");
    await page.goto(href!);

    await page.getByLabel("New password").fill("GoodPass123!");
    await page.getByLabel("Confirm password").fill("Different123!");
    await page.getByRole("button", { name: /Reset password/ }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("public auth pages are clean and responsive", async ({ page }) => {
    for (const route of ["/login", "/register", "/forgot-password", "/reset-password"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} overflow on mobile`).toBeLessThanOrEqual(1);
      await expect(page.getByRole("img", { name: "Joby" })).toBeVisible();
    }
  });
});
