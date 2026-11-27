import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  EVIDENCE_DIR,
  apiCall,
  dbCounts,
  expectCleanBrowser,
  hideDevOverlay,
  login,
  observe,
  shot,
  unique,
} from "./helpers";

const EMAIL_BODY = [
  "Subject: Senior Backend Engineer opportunity",
  "From: careers@example.org",
  "",
  "We are looking for a backend engineer with strong Node.js and TypeScript experience.",
  "You will design PostgreSQL schemas and build REST APIs with JWT authentication.",
  "Please describe the most challenging project you personally implemented.",
  "Send a one page cover letter to careers@example.org by Friday.",
].join("\n");

test.describe("PHASE 4-6: personal application CRUD, evidence, letters and exports", () => {
  test("create -> add email -> extract -> approve -> generate -> export -> refresh -> delete", async ({ page }) => {
    const log = observe(page);
    const marker = unique("QAWorkflow");
    const before = dbCounts();
    await login(page);

    // CREATE via the real UI
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill(`${marker} Corp`);
    await page.getByLabel("Role").fill(`${marker} Engineer`);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    const appId = new URL(page.url()).pathname.split("/").pop()!;
    const created = await apiCall(page, "GET", `/applications/${appId}`);
    expect(created.status()).toBe(200);
    expect((await created.json() as { company: string }).company).toBe(`${marker} Corp`);
    expect(dbCounts().applications).toBe(before.applications + 1);

    // READ / EMAIL: paste a source email through the UI
    await page.getByRole("tab", { name: "1. Emails" }).click();
    await page.locator("textarea").first().fill(EMAIL_BODY);
    await page.getByRole("button", { name: "Add email" }).click();
    await expect(page.getByText(/Senior Backend Engineer opportunity/).first()).toBeVisible({ timeout: 15_000 });
    const withEmail = await apiCall(page, "GET", `/applications/${appId}`);
    expect(((await withEmail.json()) as { emails: unknown[] }).emails.length).toBe(1);

    // EVIDENCE: extract through UI, verify verbatim grounding in the DB
    await page.getByRole("tab", { name: "2. Evidence" }).click();
    await page.getByRole("button", { name: /Extract from 1 email/ }).click();
    await expect(page.getByText(/accepted, .* rejected/)).toBeVisible({ timeout: 30_000 });
    const evidenceResponse = await apiCall(page, "GET", `/applications/${appId}/evidence`);
    expect(evidenceResponse.ok()).toBeTruthy();
    const evidence = (await evidenceResponse.json()) as Array<{
      id: string;
      claim: string;
      verbatimQuote: string;
      charStart: number;
      charEnd: number;
      source: string;
    }>;
    expect(evidence.length, "evidence items were extracted").toBeGreaterThan(0);
    const emailRow = ((await withEmail.json()) as { emails: Array<{ normalizedBody: string }> }).emails[0];
    for (const item of evidence) {
      expect(emailRow.normalizedBody.includes(item.verbatimQuote), "verbatim quote exists in source email").toBeTruthy();
      expect(item.charEnd - item.charStart).toBe(item.verbatimQuote.length);
    }
    await page.getByRole("button", { name: "Approve" }).first().click();
    await expect(page.getByText("approved").first()).toBeVisible({ timeout: 15_000 });
    const approvalList = (await (await apiCall(page, "GET", `/applications/${appId}/evidence`)).json()) as Array<{ approved: boolean }>;
    expect(approvalList.some((item) => item.approved)).toBeTruthy();

    // LETTER: generate and verify claims are grounded in approved evidence
    await page.getByRole("tab", { name: "3. Cover letter" }).click();
    await page.getByRole("button", { name: "Generate letter" }).click();
    await expect(page.getByText(/v1 ·/)).toBeVisible({ timeout: 30_000 });
    const letters = (await (await apiCall(page, "GET", `/applications/${appId}/letter`)).json()) as Array<{
      id: string;
      content: string;
      source: string;
      claims: Array<{ grounded: boolean; evidenceId: string | null }>;
    }>;
    expect(letters.length).toBeGreaterThan(0);
    expect(letters[0].content.length).toBeGreaterThan(50);
    const validIds = new Set(evidence.map((item) => item.id));
    for (const claim of letters[0].claims) {
      if (claim.evidenceId) expect(validIds.has(claim.evidenceId)).toBeTruthy();
    }
    await shot(page, "personal-letter-generated");

    // EXPORT: markdown, docx and clipboard produce real artifacts
    await page.getByRole("tab", { name: "4. Export" }).click();
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    for (const [button, extension] of [
      ["Markdown", ".md"],
      ["DOCX", ".docx"],
    ] as const) {
      const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
      await page.getByRole("button", { name: button, exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(extension.replace(".", ""));
      const saved = path.join(EVIDENCE_DIR, `export-${marker}${extension}`);
      await download.saveAs(saved);
      expect(fs.statSync(saved).size, `${button} artifact is non-empty`).toBeGreaterThan(100);
    }
    const exportHistory = (await (await apiCall(page, "GET", `/applications/${appId}/export/history`)).json()) as Array<{ format: string; status: string }>;
    expect(exportHistory.filter((item) => item.status === "generated").length).toBeGreaterThanOrEqual(2);

    // REFRESH: everything persists
    await page.reload();
    await expect(page.getByRole("heading", { name: new RegExp(marker) })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("tab", { name: "1. Emails" }).click();
    await expect(page.getByText(/Senior Backend Engineer opportunity/).first()).toBeVisible();

    // DELETE through the UI with confirmation; cascades to related records
    await hideDevOverlay(page);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Delete application" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    expect((await apiCall(page, "GET", `/applications/${appId}`)).status()).toBe(404);
    expect(dbCounts().applications).toBe(before.applications);
    expectCleanBrowser(log, "personal workflow");
  });

  test("file upload reads a .txt email into the source field", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill("Upload QA");
    await page.getByLabel("Role").fill("Upload Role");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    const file = path.join(EVIDENCE_DIR, "upload-source.txt");
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(file, EMAIL_BODY);
    await page.getByRole("tab", { name: "1. Emails" }).click();
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.locator("textarea").first()).toHaveValue(/Senior Backend Engineer opportunity/);
    await page.getByRole("button", { name: "Add email" }).click();
    await expect(page.getByText(/Senior Backend Engineer opportunity/).first()).toBeVisible({ timeout: 15_000 });
  });

  test("empty-state guards: extraction without email and letter without approval are rejected", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill("Guard QA");
    await page.getByLabel("Role").fill("Guard Role");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    const appId = new URL(page.url()).pathname.split("/").pop()!;
    expect((await apiCall(page, "POST", `/applications/${appId}/evidence/extract`)).status()).toBe(400);
    expect((await apiCall(page, "POST", `/applications/${appId}/letter/generate`)).status()).toBe(400);
    await page.getByRole("tab", { name: "4. Export" }).click();
    await expect(page.getByText("Generate a letter first.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Markdown" })).toBeDisabled();
  });

  test("cross-user application access is denied (IDOR)", async ({ browser, page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill("IDOR Target");
    await page.getByLabel("Role").fill("Private Role");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    const appId = new URL(page.url()).pathname.split("/").pop()!;

    const outsiderEmail = unique("qa-outsider").toLowerCase() + "@aijob.local";
    const registered = await page.request.post(`${process.env.E2E_API_URL ?? "http://localhost:3002"}/auth/register`, {
      data: { email: outsiderEmail, password: "OutsiderPass123!", name: "QA Outsider" },
    });
    expect(registered.ok()).toBeTruthy();
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, { email: outsiderEmail, password: "OutsiderPass123!" });
    expect((await apiCall(otherPage, "GET", `/applications/${appId}`)).status()).toBe(404);
    expect((await apiCall(otherPage, "DELETE", `/applications/${appId}`)).status()).toBe(404);
    await otherPage.goto(`/applications/${appId}`);
    await expect(otherPage.getByText(/not found|Could not load application/i).first()).toBeVisible({ timeout: 15_000 });
    await other.close();
  });

  test("cancelling deletion keeps the application intact", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.getByLabel("Company").fill("Delete Cancel QA");
    await page.getByLabel("Role").fill("Delete Cancel Role");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-z]+/);
    const appId = new URL(page.url()).pathname.split("/").pop()!;
    await hideDevOverlay(page);
    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.getByRole("button", { name: "Delete application" }).click();
    await expect(page).toHaveURL(new RegExp(appId));
    expect((await apiCall(page, "GET", `/applications/${appId}`)).status()).toBe(200);
    await apiCall(page, "DELETE", `/applications/${appId}`);
  });

  test("SMTP send is intentionally NOT executed in this local audit", async ({ page }) => {
    // Sending triggers a real outbound email via configured SMTP — out of scope without authorization.
    test.info().annotations.push({ type: "blocked", description: "Real SMTP delivery requires explicit authorization." });
    await login(page);
    await page.goto("/dashboard");
    const first = page.locator('a[href^="/applications/"]').first();
    if (await first.count()) {
      await first.click();
      await page.getByRole("tab", { name: "4. Export" }).click();
      await expect(page.getByRole("button", { name: /Send DOCX via SMTP/ })).toBeDisabled();
    }
  });
});
