import { expect, test } from "@playwright/test";
import { ADMIN, API, DEMO, apiCall, expectCleanBrowser, hideDevOverlay, login, observe, shot, unique } from "./helpers";

test.describe("PHASE 3: authentication, sessions and authorization", () => {
  test("registration creates a persisted user and a working session", async ({ page }) => {
    const log = observe(page);
    const email = unique("qa-register").toLowerCase() + "@aijob.local";
    await page.goto("/register");
    await page.getByLabel("Name").fill("QA Registered User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("StrongPass123!");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const me = await apiCall(page, "GET", "/auth/me");
    expect(me.status()).toBe(200);
    const user = (await me.json()) as { email: string; name: string; systemRole: string };
    expect(user.email).toBe(email);
    expect(user.name).toBe("QA Registered User");
    expect(user.systemRole).toBe("USER");
    await shot(page, "auth-registered-dashboard");
    expectCleanBrowser(log, "registration");
  });

  test("duplicate registration is rejected with a visible error", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Duplicate");
    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test("invalid password and unknown email are rejected", async ({ page }) => {
    for (const [email, password] of [
      [DEMO.email, "definitely-wrong"],
      ["nobody@aijob.local", "whatever123"],
    ]) {
      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText(/Invalid email or password/)).toBeVisible({ timeout: 10_000 });
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("empty and short fields are blocked by validation", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/register/);
    await page.getByLabel("Email").fill("short-pass@aijob.local");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/register/);
    const apiResult = await apiCall(page, "POST", "/auth/register", {
      email: "short-pass@aijob.local",
      password: "short",
    });
    expect(apiResult.status()).toBe(400);
  });

  test("session survives refresh and logout invalidates it", async ({ page }) => {
    await login(page);
    await page.reload();
    await hideDevOverlay(page);
    await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
    expect((await apiCall(page, "GET", "/auth/me")).status()).toBe(200);

    await page.getByRole("button", { name: /Demo Candidate|Playwright|demo@aijob/i }).first().click();
    await page.getByText("Sign out", { exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    expect((await apiCall(page, "GET", "/auth/me")).status()).toBe(401);
    expect((await apiCall(page, "GET", "/applications")).status()).toBe(401);
  });

  test("protected routes block direct URL access without a session", async ({ page }) => {
    const routes = ["/dashboard", "/org", "/org/jobs", "/org/candidates", "/admin", "/applications/fake-id"];
    for (const route of routes) {
      await page.goto(route);
      await expect
        .poll(() => new URL(page.url()).pathname, {
          timeout: 15_000,
          message: `${route} must redirect an unauthenticated visitor to /login`,
        })
        .toBe("/login");
    }
  });

  test("non-admin cannot access admin API or UI", async ({ page }) => {
    await login(page);
    await page.goto("/admin");
    await expect(page.getByText("Access denied")).toBeVisible({ timeout: 15_000 });
    expect((await apiCall(page, "GET", "/admin/overview")).status()).toBe(403);
    expect((await apiCall(page, "GET", "/admin/users")).status()).toBe(403);
  });

  test("platform admin can load every admin tab", async ({ page }) => {
    const log = observe(page);
    await login(page, ADMIN);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Platform admin" })).toBeVisible();
    for (const tab of ["Overview", "Organizations", "Users & roles", "Audit log"]) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    }
    expect((await apiCall(page, "GET", "/admin/overview")).status()).toBe(200);
    await shot(page, "auth-admin-audit");
    expectCleanBrowser(log, "admin console");
  });

  test("two independent sessions do not share credentials", async ({ browser }) => {
    const first = await browser.newContext();
    const second = await browser.newContext();
    const pageA = await first.newPage();
    const pageB = await second.newPage();
    await login(pageA, DEMO);
    await pageB.goto("/login");
    expect((await apiCall(pageA, "GET", "/auth/me")).status()).toBe(200);
    expect((await apiCall(pageB, "GET", "/auth/me")).status()).toBe(401);
    await login(pageB, ADMIN);
    expect(((await apiCall(pageB, "GET", "/auth/me")).json()).then((u) => (u as { email: string }).email)).resolves.toBe(ADMIN.email);
    await first.close();
    await second.close();
  });

  test("forged JWT cookie is rejected by the API", async ({ page }) => {
    await page.context().addCookies([
      { name: "access_token", value: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmb3JnZWQifQ.forged", url: API },
    ]);
    expect((await apiCall(page, "GET", "/auth/me")).status()).toBe(401);
    expect((await apiCall(page, "GET", "/jobs")).status()).toBe(401);
  });
});
