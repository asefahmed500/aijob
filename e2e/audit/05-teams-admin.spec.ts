import { expect, test } from "@playwright/test";
import { ADMIN, API, apiCall, dbCounts, login, observe, unique } from "./helpers";

test.describe("PHASE 3-8: teams, invitations, roles and platform administration", () => {
  test("invite -> accept -> viewer is read-only in UI and API", async ({ browser, page }) => {
    const log = observe(page);
    const invitedEmail = unique("qa-viewer").toLowerCase() + "@aijob.local";
    const password = "ViewerPass123!";
    await login(page);
    await page.goto("/org/team");
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Email").fill(invitedEmail);
    await page.locator('[data-slot="field"]').filter({ hasText: "Role" }).getByRole("combobox").click();
    await page.getByRole("option", { name: "VIEWER" }).click();
    await page.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText(/Invitation created/)).toBeVisible({ timeout: 15_000 });
    const status = await page.getByText(/Token:/).textContent();
    const token = status?.match(/[a-z0-9]{20,}/)?.[0];
    expect(token, "invitation token was issued").toBeTruthy();

    // Accept the invitation as a brand-new user through the real UI
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(`/invitations/${token}`);
    await viewerPage.getByLabel("Invited email").fill(invitedEmail);
    await viewerPage.getByLabel("Password").fill(password);
    await viewerPage.getByRole("button", { name: "Accept invitation" }).click();
    await expect(viewerPage).toHaveURL(/\/org/, { timeout: 25_000 });
    await expect(viewerPage.getByText(/VIEWER/).first()).toBeVisible({ timeout: 15_000 });

    // Viewer sees no write controls on jobs/candidates
    await viewerPage.goto("/org/jobs");
    await expect(viewerPage.getByRole("button", { name: "Draft with AI" })).toBeDisabled();
    await expect(viewerPage.getByRole("button", { name: "Create job and form" })).toBeDisabled();
    await viewerPage.goto("/org/candidates");
    await expect(viewerPage.getByRole("button", { name: "Add candidate" })).toBeDisabled();

    // Backend must also reject viewer mutations
    expect((await apiCall(viewerPage, "POST", "/jobs", {
      title: "Viewer escalation",
      description: "Should be rejected by RBAC.",
      requirements: "Node.js",
    })).status()).toBe(403);
    expect((await apiCall(viewerPage, "GET", "/jobs")).status()).toBe(200);
    expect((await apiCall(viewerPage, "GET", "/admin/overview")).status()).toBe(403);

    // Owner self-protection
    expect((await apiCall(page, "DELETE", `/teams/members/${(await (await apiCall(page, "GET", "/auth/me")).json() as { id: string }).id}`)).status()).toBe(403);
    await viewerContext.close();
    expect(log.pageErrors).toEqual([]);
  });

  test("invitation cannot be accepted by a different email", async ({ browser, page }) => {
    await login(page);
    await page.goto("/org/team");
    const invitedEmail = unique("qa-mismatch").toLowerCase() + "@aijob.local";
    await page.getByLabel("Email").fill(invitedEmail);
    await page.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText(/Invitation created/)).toBeVisible({ timeout: 15_000 });
    const token = (await page.getByText(/Token:/).textContent())?.match(/[a-z0-9]{20,}/)?.[0];
    expect(token, "invitation token was issued").toBeTruthy();

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage);
    const response = await apiCall(otherPage, "POST", "/invitations/accept", { token });
    expect(response.status()).toBe(403);
    await other.close();
  });

  test("platform admin changes a user's system role through the UI", async ({ page }) => {
    const before = dbCounts();
    const email = unique("qa-role").toLowerCase() + "@aijob.local";
    const registered = await page.request.post(`${API}/auth/register`, {
      data: { email, password: "RolePass123!", name: "QA Role Target" },
    });
    expect(registered.ok()).toBeTruthy();
    const userId = ((await registered.json()) as { user: { id: string } }).user.id;

    await login(page, ADMIN);
    await page.goto("/admin");
    await page.getByRole("tab", { name: "Users & roles" }).click();
    const row = page.getByRole("row").filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "PLATFORM_ADMIN" }).click();
    await expect(row.getByText("Saving…")).toBeHidden({ timeout: 15_000 });
    const me = (await (await apiCall(page, "GET", "/admin/users")).json()) as Array<{ id: string; systemRole: string }>;
    expect(me.find((user) => user.id === userId)?.systemRole).toBe("PLATFORM_ADMIN");

    // Restore the user to USER so the audit leaves no elevated account behind
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "USER" }).click();
    await expect(row.getByText("Saving…")).toBeHidden({ timeout: 15_000 });
    // The target user was registered by this test and remains in the database.
    expect(dbCounts().users).toBe(before.users + 1);
  });
});
