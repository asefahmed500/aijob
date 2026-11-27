import { expect, test } from "@playwright/test";
import { API, apiCall, browserApi, dbCounts, expectCleanBrowser, login, observe, shot, unique } from "./helpers";

const RESUME = [
  "Backend engineer with Node.js and TypeScript services in production.",
  "Designed PostgreSQL schemas and REST APIs with JWT authentication.",
  "Integrated an external AI service and wrote unit and end-to-end tests.",
].join("\n");

test.describe("PHASE 4-8: candidates, scoring, pipeline, CV and analytics", () => {
  test("candidate CRUD, search, apply, scoring and readable ranking", async ({ page }) => {
    const log = observe(page);
    const name = unique("QACandidate");
    const email = `${name.toLowerCase()}@aijob.local`;
    const before = dbCounts();
    await login(page);

    // CREATE
    await page.goto("/org/candidates");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Resume text").fill(RESUME);
    await page.getByRole("button", { name: "Add candidate" }).click();
    await expect(page.getByText("Candidate added")).toBeVisible({ timeout: 15_000 });
    expect(dbCounts().candidates).toBe(before.candidates + 1);

    // READ / SEARCH / FILTER / SORT
    await page.getByLabel("Name or email").fill(name);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Name or email").fill("");
    await page.locator('[data-slot="field"]').filter({ hasText: "Sort" }).getByRole("combobox").click();
    await page.getByRole("option", { name: "Name" }).click();
    await expect(page.getByText(name).first()).toBeVisible();

    // APPLY to a job from this candidate's own row
    const candidateCard = page.locator('[data-slot="card"]').filter({ hasText: name }).last();
    await candidateCard.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Candidate applied to job")).toBeVisible({ timeout: 15_000 });

    // SCORE and verify quotes are verbatim substrings of the resume
    const jobs = (await (await apiCall(page, "GET", "/jobs")).json()) as Array<{ id: string; title: string; publicToken: string }>;
    const candidates = (await (await apiCall(page, "GET", "/candidates")).json()) as Array<{ id: string; name: string }>;
    const candidateId = candidates.find((candidate) => candidate.name === name)!.id;
    await page.getByLabel("Name or email").fill(name);
    await page.getByRole("link", { name: "Open" }).first().click();
    const jobResponse = await apiCall(page, "GET", `/jobs/${jobs[0].id}`);
    expect(jobResponse.ok()).toBeTruthy();
    const detail = (await jobResponse.json()) as { id: string; title: string };
    await page.goto(`/org/jobs/${detail.id}`);
    const scoreResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/scoring/jobs/${detail.id}/score-all`) && response.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Score all candidates" }).click();
    const scoreResponse = await scoreResponsePromise;
    expect(scoreResponse.ok(), "score-all API succeeded").toBeTruthy();
    await expect(page.getByRole("button", { name: "Score all candidates" })).toBeEnabled({ timeout: 15_000 });
    const ranking = (await (await apiCall(page, "GET", `/candidates/ranking/${detail.id}`)).json()) as Array<{
      id: string;
      candidate: { id: string; name: string; resumeText: string };
      score: { id: string; score: number; source: string; evidences: Array<{ requirement: string; quote: string; charStart: number; charEnd: number }> } | null;
    }>;
    const mine = ranking.find((entry) => entry.candidate.id === candidateId);
    expect(mine?.score, "candidate was scored").toBeTruthy();
    for (const evidence of mine!.score!.evidences) {
      expect(mine!.candidate.resumeText.includes(evidence.quote), `quote "${evidence.quote}" is verbatim`).toBeTruthy();
      expect(evidence.charEnd - evidence.charStart).toBe(evidence.quote.length);
      expect(mine!.candidate.resumeText.slice(evidence.charStart, evidence.charEnd)).toBe(evidence.quote);
    }
    await shot(page, "candidate-ranking");

    // UPDATE: stage, rating, note
    await page.goto(`/org/candidates/${candidateId}`);
    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-slot="field"]').filter({ hasText: "Stage" }).getByRole("combobox").click();
    await page.getByRole("option", { name: "interview" }).click();
    await page.getByLabel("Rating").fill("4");
    await page.getByRole("button", { name: "Update stage" }).click();
    await expect(page.getByText(/Stage updated/)).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder("Add a note…").fill("QA pipeline note created in the browser.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("QA pipeline note created in the browser.")).toBeVisible({ timeout: 15_000 });
    const timelineResponse = await apiCall(page, "GET", `/pipeline/applications/${mine!.id}/timeline`);
    expect(timelineResponse.status()).toBe(200);
    expect(Array.isArray(await timelineResponse.json())).toBeTruthy();

    // AI CV: generate, version, print view
    await page.getByRole("button", { name: "Generate AI CV" }).click();
    await expect(page.getByText(/CV version 1 generated/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Open printable CV" })).toBeVisible();
    await page.getByRole("link", { name: "Open printable CV" }).click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Regenerate CV" }).count().then(async (count) => {
      if (count) await page.getByRole("button", { name: "Regenerate CV" }).click();
    });
    const cvRow = (await (await apiCall(page, "GET", `/candidates/${candidateId}`)).json()) as { cvs: Array<{ version: number; source: string; content: string }> };
    expect(cvRow.cvs.length).toBeGreaterThan(0);
    expect(cvRow.cvs[0].content.length).toBeGreaterThan(20);
    expectCleanBrowser(log, "candidate pipeline");
  });

  test("offer decision creates a notification visible in the audit pages", async ({ page }) => {
    const log = observe(page);
    await login(page);
    const candidates = (await (await apiCall(page, "GET", "/candidates")).json()) as Array<{ id: string; name: string; _count: { applications: number } }>;
    const target = candidates.find((candidate) => candidate._count.applications > 0) ?? candidates[0];
    await page.goto(`/org/candidates/${target.id}`);
    await expect(page.getByRole("heading", { name: target.name })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByText(/offer recorded/)).toBeVisible({ timeout: 20_000 });
    await page.goto("/org/notifications");
    await expect(page.getByText(/Offer for/).first()).toBeVisible({ timeout: 15_000 });
    await page.goto("/org/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Recent activity")).toBeVisible();
    expectCleanBrowser(log, "decision and notifications");
  });

  test("bulk stage change and cross-tenant isolation", async ({ browser, page }) => {
    await login(page);
    await page.goto("/org/candidates");
    const rows = page.getByRole("checkbox", { name: /^Select / });
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const count = Math.min(await rows.count(), 2);
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) await rows.nth(index).check();
    await page.getByRole("button", { name: "Move selected" }).click();
    await expect(page.getByText(/candidates moved to/)).toBeVisible({ timeout: 15_000 });

    // Create an isolated org and switch to it, then try to read a job/candidate from the first org
    const jobsBefore = (await (await apiCall(page, "GET", "/jobs")).json()) as Array<{ id: string }>;
    const candidatesBefore = (await (await apiCall(page, "GET", "/candidates")).json()) as Array<{ id: string }>;
    await page.goto("/org");
    await page.getByLabel("Name").fill(unique("QA Isolated Org"));
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText(/QA Isolated Org/).first()).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () => (await browserApi<{ name: string }>(page, "GET", "/organizations/current")).body.name,
        { timeout: 20_000 },
      )
      .toMatch(/QA Isolated Org/);
    expect((await browserApi(page, "GET", `/jobs/${jobsBefore[0].id}`)).status).toBe(404);
    expect((await browserApi(page, "GET", `/candidates/${candidatesBefore[0].id}`)).status).toBe(404);
    expect((await apiCall(page, "POST", `/pipeline/applications/${"fake"}/decision`, { decision: "offer" })).status()).toBeGreaterThanOrEqual(400);

    const outsiderEmail = unique("qa-tenant-outsider").toLowerCase() + "@aijob.local";
    const registered = await page.request.post(`${API}/auth/register`, {
      data: { email: outsiderEmail, password: "OutsiderPass123!", name: "QA Tenant Outsider" },
    });
    expect(registered.ok()).toBeTruthy();
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, { email: outsiderEmail, password: "OutsiderPass123!" });
    expect((await apiCall(otherPage, "GET", "/organizations")).status()).toBe(200);
    expect([403, 404], "outsider cannot read another tenant's job").toContain(
      (await apiCall(otherPage, "GET", `/jobs/${jobsBefore[0].id}`)).status(),
    );
    await other.close();
  });
});
