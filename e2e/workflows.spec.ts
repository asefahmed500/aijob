import { expect, test } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:3002";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@aijob.local");
  await page.getByLabel("Password").fill("demo12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("AI job draft fills the form and the job is persisted", async ({ page }) => {
  const marker = `PWRole${Date.now()}`;
  await page.goto("/org/jobs");
  await page.getByLabel("Hiring brief").fill(`${marker}\nTypeScript services; PostgreSQL schema design.`);
  await page.getByRole("button", { name: "Draft with AI" }).click();
  await expect(page.getByLabel("Title")).toHaveValue(new RegExp(marker), { timeout: 15000 });
  await expect(page.getByText(/Draft ready/)).toBeVisible();

  await page.getByRole("button", { name: "Create job" }).click();
  await expect(page.getByText(/Job created/)).toBeVisible();
  await expect(page.getByText(marker).first()).toBeVisible();
});

test("AI CV, decision and notification stay connected", async ({ page }) => {
  const suffix = Date.now();
  const candidate = await page.request.post(`${API}/candidates`, {
    data: {
      name: `PW Candidate ${suffix}`,
      email: `pw-candidate-${suffix}@aijob.local`,
      resumeText:
        "Experience\nBuilt NestJS APIs with PostgreSQL and JWT authentication.\nEducation\nBSc Computer Science, City University\nSkills\nNestJS, PostgreSQL, React",
    },
  });
  expect(candidate.ok()).toBeTruthy();
  const { id } = await candidate.json();

  const jobsResponse = await page.request.get(`${API}/jobs`);
  const jobs = await jobsResponse.json();
  expect(jobs.length).toBeGreaterThan(0);
  const applied = await page.request.post(`${API}/candidates/apply`, {
    data: { candidateId: id, jobId: jobs[0].id },
  });
  expect(applied.ok()).toBeTruthy();

  await page.goto(`/org/candidates/${id}`);
  await page.getByRole("button", { name: "Generate AI CV" }).click();
  await expect(page.getByText(/CV version 1 generated/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("link", { name: "Open printable CV" })).toBeVisible();

  await page.getByRole("button", { name: "Send offer" }).click();
  await expect(page.getByText(/offer recorded/)).toBeVisible();
  await expect(page.getByText("offer_sent", { exact: true }).first()).toBeVisible();

  await page.goto("/org/notifications");
  await expect(page.getByText(/Offer for/).first()).toBeVisible();
});

test("public form with expiry and AI screening works end to end", async ({ page }) => {
  const marker = `Portal${Date.now()}`;
  await page.goto("/org/jobs");
  await page.getByLabel("Title").fill(marker);
  await page.getByLabel("Description").fill("Build backend services with AI integrations.");
  await page.getByLabel("Requirements").fill("Node.js and TypeScript services.\nPostgreSQL schema design and REST APIs.");

  await page.getByRole("button", { name: "Add question" }).first().click();
  await page.getByLabel("Question 1", { exact: true }).fill("Portfolio link");
  await page.getByLabel("Question 1 required").check();
  await page.getByLabel("Link expires at (optional)").fill("2027-01-01T12:00");

  await page.getByRole("button", { name: "Create job and form" }).click();
  await expect(page.getByText(/Job created/)).toBeVisible();

  const link = (await page.getByText(/\/apply\/[0-9a-f-]+/).first().textContent())?.trim();
  expect(link).toBeTruthy();

  const applicant = await page.context().newPage();
  await applicant.goto(link!);
  await expect(applicant.getByText(marker)).toBeVisible();
  await applicant.getByLabel("Full name").fill("Portal E2E Applicant");
  await applicant.getByLabel("Email").fill(`portal-e2e-${Date.now()}@aijob.local`);
  await applicant.getByLabel("Resume text").fill("Built Node.js and TypeScript services with REST APIs.");
  await applicant.getByLabel("Portfolio link", { exact: false }).fill("https://github.com/example");
  await applicant.getByRole("button", { name: "Submit application" }).click();

  await expect(applicant.getByText(/Application submitted/)).toBeVisible({ timeout: 15000 });
  await expect(applicant.getByText(/AI screening:/)).toBeVisible({ timeout: 15000 });
});

test("landing page has no horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: "Hiring, grounded in evidence." })).toBeVisible();
});

test("authenticated shell is usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/org/jobs");
  await expect(page.getByRole("button", { name: "Toggle Sidebar" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
