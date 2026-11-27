import { expect, test } from "@playwright/test";
import { API, apiCall, hideDevOverlay, login, observe, unique } from "./helpers";

test.describe("PHASE 8: API security, validation and data integrity", () => {
  test("all sensitive endpoints require authentication", async ({ page }) => {
    const endpoints: Array<[string, "GET" | "POST", unknown?]> = [
      ["/applications", "GET"],
      ["/jobs", "GET"],
      ["/candidates", "GET"],
      ["/candidates/search", "GET"],
      ["/analytics", "GET"],
      ["/teams", "GET"],
      ["/pipeline/notifications", "GET"],
      ["/organizations/current", "GET"],
      ["/admin/overview", "GET"],
      ["/admin/users", "GET"],
      ["/applications", "POST", { company: "No auth", role: "No auth" }],
      ["/jobs", "POST", { title: "No auth", description: "No auth description", requirements: "No auth requirements" }],
    ];
    for (const [endpoint, method, data] of endpoints) {
      const response = await apiCall(page, method, endpoint, data);
      expect(response.status(), `${method} ${endpoint} without session`).toBe(401);
    }
  });

  test("malformed JSON and unknown fields are rejected by the global pipe", async ({ page }) => {
    await login(page);
    const malformed = await page.request.post(`${API}/auth/login`, {
      data: "{not json",
      headers: { "Content-Type": "application/json" },
    });
    expect(malformed.status()).toBe(400);

    const extra = await apiCall(page, "POST", "/applications", {
      company: "Whitelist QA",
      role: "QA",
      injectedField: "should be rejected",
    });
    expect(extra.status()).toBe(400);

    const short = await apiCall(page, "POST", "/jobs", {
      title: "x",
      description: "too short",
      requirements: "also short",
    });
    expect(short.status()).toBe(400);
  });

  test("XSS-like input is stored as inert text and never executes", async ({ page }) => {
    const log = observe(page);
    const payload = '<img src=x onerror="window.__qaXss=1">';
    await login(page);
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill(payload);
    await page.getByLabel("Role").fill("XSS QA Role");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    await expect(page.locator("h1").first()).toContainText(payload, { timeout: 15_000 });
    expect(await page.evaluate(() => (window as unknown as { __qaXss?: number }).__qaXss)).toBeUndefined();
    expect(await page.locator("img[src='x']").count()).toBe(0);
    expect(log.pageErrors).toEqual([]);
  });

  test("search and identifiers resist injection-like strings", async ({ page }) => {
    await login(page);
    const payloads = ["' OR 1=1 --", "<script>alert(1)</script>", "%00", "a".repeat(300)];
    for (const payload of payloads) {
      const response = await apiCall(page, "GET", `/candidates/search?q=${encodeURIComponent(payload)}`);
      expect(response.status(), `search payload ${payload.slice(0, 20)}`).toBe(200);
      expect(Array.isArray(await response.json())).toBeTruthy();
    }
    expect((await apiCall(page, "GET", "/jobs/not-a-real-id")).status()).toBe(404);
  });

  test("API responses do not leak password hashes or credentials", async ({ page }) => {
    await login(page);
    const routes = ["/auth/me", "/applications", "/jobs", "/candidates", "/teams", "/analytics"];
    for (const route of routes) {
      const response = await apiCall(page, "GET", route);
      expect(response.ok(), route).toBeTruthy();
      const body = await response.text();
      expect(body, `${route} must not expose passwordHash`).not.toContain("passwordHash");
      expect(body, `${route} must not expose JWT_SECRET`).not.toContain("JWT_SECRET");
      expect(body, `${route} must not expose API keys`).not.toMatch(/ZAI_API|SMTP_PASS/i);
    }
  });

  test("login sets an HttpOnly, SameSite cookie and logout clears it", async ({ page }) => {
    await page.goto("/login");
    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/auth/login"));
    await page.getByRole("button", { name: "Sign in" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    await expect(page).toHaveURL(/\/dashboard/);
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name === "access_token");
    expect(sessionCookie, "access_token cookie exists").toBeTruthy();
    expect(sessionCookie!.httpOnly).toBe(true);
    expect(sessionCookie!.sameSite.toLowerCase()).toBe("lax");

    const logoutPromise = page.waitForResponse((response) => response.url().endsWith("/auth/logout"));
    await hideDevOverlay(page);
    await page.getByRole("button", { name: /Demo Candidate|demo@aijob/i }).first().click();
    await page.getByText("Sign out", { exact: true }).click();
    const logout = await logoutPromise;
    expect([200, 201]).toContain(logout.status());
    const afterLogout = await page.context().cookies();
    expect(afterLogout.find((cookie) => cookie.name === "access_token")?.value ?? "").toBe("");
  });

  test("cross-user evidence mutation is denied (IDOR)", async ({ browser, page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill("Evidence Owner");
    await page.getByLabel("Role").fill("Evidence Role");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    const appId = new URL(page.url()).pathname.split("/").pop()!;
    await page.getByRole("tab", { name: "1. Emails" }).click();
    await page.locator("textarea").first().fill("Subject: QA\n\nBuilt Node.js and TypeScript services with PostgreSQL REST APIs.");
    await page.getByRole("button", { name: "Add email" }).click();
    await page.getByRole("tab", { name: "2. Evidence" }).click();
    await page.getByRole("button", { name: /Extract from 1 email/ }).click();
    await expect(page.getByText(/accepted, .* rejected/)).toBeVisible({ timeout: 30_000 });
    const evidence = (await (await apiCall(page, "GET", `/applications/${appId}/evidence`)).json()) as Array<{ id: string }>;
    expect(evidence.length).toBeGreaterThan(0);

    const outsiderEmail = unique("qa-evidence-outsider").toLowerCase() + "@aijob.local";
    const registered = await page.request.post(`${API}/auth/register`, {
      data: { email: outsiderEmail, password: "OutsiderPass123!", name: "QA Evidence Outsider" },
    });
    expect(registered.ok()).toBeTruthy();
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, { email: outsiderEmail, password: "OutsiderPass123!" });
    expect((await apiCall(otherPage, "PATCH", `/evidence/${evidence[0].id}`, { approved: true })).status()).toBe(404);
    expect((await apiCall(otherPage, "DELETE", `/evidence/${evidence[0].id}`)).status()).toBe(404);
    await other.close();
  });

  test("oversized email body is rejected with 400", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill("Oversize QA");
    await page.getByLabel("Role").fill("Oversize Role");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    const appId = new URL(page.url()).pathname.split("/").pop()!;
    const response = await apiCall(page, "POST", `/applications/${appId}/emails`, {
      applicationId: appId,
      rawBody: "x".repeat(100_001),
    });
    expect(response.status()).toBe(400);
  });

  test("duplicate team invitation is rejected", async ({ page }) => {
    await login(page);
    await page.goto("/org/team");
    const email = unique("qa-dup-invite").toLowerCase() + "@aijob.local";
    expect((await apiCall(page, "POST", "/teams/invite", { email, role: "VIEWER" })).ok()).toBeTruthy();
    expect((await apiCall(page, "POST", "/teams/invite", { email, role: "VIEWER" })).status()).toBe(400);
  });
});
