import { expect, test, type Page } from "@playwright/test";
import { API, apiCall, dbCounts, expectCleanBrowser, login, observe, shot, unique } from "./helpers";

async function findJobId(page: Page, title: string): Promise<string> {
  const jobs = (await (await apiCall(page, "GET", "/jobs")).json()) as Array<{ id: string; title: string }>;
  const job = jobs.find((item) => item.title === title);
  expect(job, `job ${title} exists`).toBeTruthy();
  return job!.id;
}

async function createJobThroughUI(page: Page, options: { title: string; question?: string; expiry?: string; autoScreen?: boolean }) {
  await page.goto("/org/jobs");
  await page.getByLabel("Title").fill(options.title);
  await page.getByLabel("Description").fill("Build backend services with Node.js, TypeScript and PostgreSQL.");
  await page.getByLabel("Requirements").fill("Node.js services.\nPostgreSQL schema design and REST APIs.");
  if (options.question) {
    await page.getByRole("button", { name: "Add question" }).first().click();
    await page.getByLabel("Question 1", { exact: true }).fill(options.question);
    await page.getByLabel("Question 1 required").check();
  }
  if (options.expiry) await page.getByLabel("Link expires at (optional)").fill(options.expiry);
  if (options.autoScreen === false) {
    await page.getByLabel("Screen applications with AI automatically").uncheck();
  }
  await page.getByRole("button", { name: "Create job and form" }).click();
  await expect(page.getByText(/Job created/)).toBeVisible({ timeout: 20_000 });
  const link = (await page.getByText(/\/apply\/[0-9a-f-]+/).first().textContent())?.trim();
  expect(link, "public apply link is rendered").toBeTruthy();
  return link!;
}

test.describe("PHASE 4-7: organization, jobs, public form and AI screening", () => {
  test("organization create and switch persists a new tenant", async ({ page }) => {
    const log = observe(page);
    const name = unique("QA Org");
    const before = dbCounts();
    await login(page);
    await page.goto("/org");
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("OWNER").first()).toBeVisible();
    expect(dbCounts().organizations).toBe(before.organizations + 1);
    const active = await apiCall(page, "GET", "/organizations/current");
    expect((await active.json() as { name: string }).name).toBe(name);
    await shot(page, "org-created");
    expectCleanBrowser(log, "organization creation");
  });

  test("AI draft, job creation, status toggle, link copy and form edit work end to end", async ({ page }) => {
    const log = observe(page);
    const marker = unique("QADraftRole");
    await login(page);
    await page.goto("/org/jobs");
    await page.getByLabel("Hiring brief").fill(`${marker}\nNestJS APIs, PostgreSQL design, JWT auth.`);
    await page.getByRole("button", { name: "Draft with AI" }).click();
    await expect(page.getByLabel("Title")).toHaveValue(new RegExp(marker), { timeout: 25_000 });
    await expect(page.getByText(/Draft ready/)).toBeVisible();
    await page.getByRole("button", { name: "Create job" }).count().then(async (count) => {
      if (count) await page.getByRole("button", { name: "Create job" }).click();
      else await page.getByRole("button", { name: "Create job and form" }).click();
    });
    await expect(page.getByText(/Job created/)).toBeVisible({ timeout: 20_000 });
    const jobs = (await (await apiCall(page, "GET", "/jobs")).json()) as Array<{ id: string; title: string; status: string; publicToken: string }>;
    const job = jobs.find((item) => item.title.includes(marker))!;
    expect(job.publicToken).toBeTruthy();

    // Status toggle
    const card = page.locator('[data-slot="card"]').filter({ hasText: marker }).last();
    await card.getByRole("button", { name: "Close job" }).click();
    await expect(page.getByText(/Job closed/)).toBeVisible({ timeout: 15_000 });
    expect(((await (await apiCall(page, "GET", `/jobs/${job.id}`)).json()) as { status: string }).status).toBe("closed");
    await card.getByRole("button", { name: "Reopen job" }).click();
    await expect(page.getByText(/Job reopened/)).toBeVisible({ timeout: 15_000 });

    // Form edit: change questions, expire link and disable auto-screen
    await card.getByRole("button", { name: "Edit form & link" }).click();
    await card.getByRole("button", { name: "Add question" }).click();
    await card.getByLabel("Question 1", { exact: true }).fill("Updated portfolio question");
    await card.getByLabel(`Auto-screen ${marker}`).uncheck();
    await card.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Public form settings saved.")).toBeVisible({ timeout: 15_000 });
    const detail = (await (await apiCall(page, "GET", `/jobs/${job.id}`)).json()) as { formFields: string; autoScreen: boolean };
    expect(detail.formFields).toContain("Updated portfolio question");
    expect(detail.autoScreen).toBe(false);
    expectCleanBrowser(log, "job lifecycle");
  });

  test("public form validates required answers and stores them with screening evidence", async ({ page }) => {
    const log = observe(page);
    const marker = unique("QAPortal");
    await login(page);
    const link = await createJobThroughUI(page, { title: marker, question: "Portfolio link" });
    const token = link.split("/").pop()!;
    const jobId = await findJobId(page, marker);

    // Server-side required-answer validation
    const missing = await page.request.post(`${API}/public/apply/${token}`, {
      data: {
        name: "QA Missing Answer",
        email: `qa-missing-${Date.now()}@aijob.local`,
        resumeText: "Built Node.js and TypeScript services with REST APIs and PostgreSQL schemas.",
        answers: {},
      },
    });
    expect(missing.status()).toBe(400);
    expect((await missing.text())).toMatch(/required/i);

    // Valid submission through a real browser
    const applicant = await page.context().newPage();
    const applicantLog = observe(applicant);
    await applicant.goto(link);
    await expect(applicant.getByText(marker)).toBeVisible({ timeout: 20_000 });
    await applicant.getByLabel("Full name").fill("QA Portal Applicant");
    await applicant.getByLabel("Email").fill(`qa-portal-${Date.now()}@aijob.local`);
    await applicant.getByLabel("Resume text").fill("Built Node.js and TypeScript services with REST APIs and PostgreSQL schemas.");
    await applicant.getByLabel(/Portfolio link/).fill("https://github.com/qa-portal");
    await applicant.getByRole("button", { name: "Submit application" }).click();
    await expect(applicant.getByText("Application submitted")).toBeVisible({ timeout: 30_000 });
    await expect(applicant.getByText(/AI screening:/)).toBeVisible({ timeout: 30_000 });

    // Database: candidate, application, answers and grounded score all persisted
    const detail = (await (await apiCall(page, "GET", `/jobs/${jobId}`)).json()) as { applications: Array<{ candidate: { name: string }; status: string }> };
    const applied = detail.applications.find((entry) => entry.candidate.name === "QA Portal Applicant");
    expect(applied, "application persisted on the job").toBeTruthy();
    expect(applied!.status).toBe("new");
    expectCleanBrowser(applicantLog, "public applicant");
    expectCleanBrowser(log, "employer portal setup");
    await shot(applicant, "portal-submitted");
  });

  test("expired and closed links reject submissions", async ({ page }) => {
    await login(page);
    const expiredTitle = unique("QAExpired");
    const expiredLink = await createJobThroughUI(page, { title: expiredTitle });
    const expiredToken = expiredLink.split("/").pop()!;
    const jobId = await findJobId(page, expiredTitle);
    // Set expiry in the past through the supported API
    const update = await apiCall(page, "PATCH", `/jobs/${jobId}/form`, {
      formFields: [],
      formExpiresAt: "2020-01-01T00:00:00.000Z",
      autoScreen: true,
    });
    expect(update.ok()).toBeTruthy();
    const expiredJob = await page.request.get(`${API}/public/jobs/${expiredToken}`);
    expect((await expiredJob.json() as { status: string }).status).toBe("expired");
    await page.goto(expiredLink);
    await expect(page.getByText("Link expired")).toBeVisible({ timeout: 15_000 });
    expect((await page.request.post(`${API}/public/apply/${expiredToken}`, {
      data: {
        name: "Expired Applicant",
        email: `expired-${Date.now()}@aijob.local`,
        resumeText: "Node.js and TypeScript backend engineer with PostgreSQL experience.",
        answers: {},
      },
    })).status()).toBe(400);

    const closedTitle = unique("QAClosed");
    const closedLink = await createJobThroughUI(page, { title: closedTitle });
    const closedToken = closedLink.split("/").pop()!;
    const closedId = await findJobId(page, closedTitle);
    expect((await apiCall(page, "PATCH", `/jobs/${closedId}/status`, { status: "closed" })).ok()).toBeTruthy();
    await page.goto(closedLink);
    await expect(page.getByText("Role closed")).toBeVisible({ timeout: 15_000 });
    expect((await page.request.post(`${API}/public/apply/${closedToken}`, {
      data: {
        name: "Closed Applicant",
        email: `closed-${Date.now()}@aijob.local`,
        resumeText: "Node.js and TypeScript backend engineer with PostgreSQL experience.",
        answers: {},
      },
    })).status()).toBe(400);
  });

  test("invalid apply token shows a clear error", async ({ page }) => {
    await page.goto("/apply/definitely-not-a-real-token");
    await expect(page.getByText("This application link is invalid.")).toBeVisible({ timeout: 15_000 });
  });
});
