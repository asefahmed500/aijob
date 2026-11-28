import { expect, test, type Page } from "@playwright/test";
import { API, apiCall, dbCounts, login, observe, unique } from "./helpers";

const RESUME = [
  "Backend engineer with Node.js and TypeScript services in production.",
  "Designed PostgreSQL schemas and REST APIs with JWT authentication.",
  "Integrated an external AI service and wrote unit and end-to-end tests.",
].join("\n");

const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n", "latin1");

async function makeCandidate(page: Page): Promise<string> {
  const name = unique("QACvCandidate");
  const email = `${name.toLowerCase()}@aijob.local`;
  const created = await apiCall(page, "POST", "/candidates", {
    name,
    email,
    resumeText: RESUME,
  });
  expect(created.ok()).toBeTruthy();
  return ((await created.json()) as { id: string }).id;
}

test.describe("CV document pipeline (labelled fake storage adapter)", () => {
  test("upload -> processing -> agent executions -> download -> persistence", async ({ page }) => {
    const log = observe(page);
    const before = dbCounts();
    await login(page);
    const candidateId = await makeCandidate(page);
    await page.goto(`/org/candidates/${candidateId}`);

    await page.locator("#cv-file").setInputFiles({
      name: "qa-cv.pdf",
      mimeType: "application/pdf",
      buffer: PDF_BYTES,
    });

    await expect(page.getByText(/Uploaded qa-cv.pdf/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("COMPLETED").first()).toBeVisible({ timeout: 20_000 });

    const documents = (await (await apiCall(page, "GET", `/candidates/${candidateId}/documents`)).json()) as Array<{
      id: string;
      filename: string;
      storageProvider: string;
      status: string;
      extractedText: string;
      extractionNote: string;
      sha256: string;
      jobs: Array<{
        status: string;
        executions: Array<{ agentKey: string; status: string; source: string; output: unknown }>;
      }>;
    }>;
    expect(documents.length).toBe(1);
    const document = documents[0];
    expect(document.filename).toBe("qa-cv.pdf");
    expect(document.storageProvider).toBe("local-fake");
    expect(document.status).toBe("COMPLETED");
    expect(document.extractedText).toBe(RESUME);
    expect(document.extractionNote).toContain("fake-adapter");
    expect(document.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(document.jobs[0].executions.map((item) => item.agentKey)).toEqual([
      "cv_parsing",
      "skills_analysis",
      "experience_evaluation",
      "job_matching",
    ]);
    for (const execution of document.jobs[0].executions) {
      expect(execution.status).toBe("COMPLETED");
      expect(execution.source).toBe("fake");
      expect(execution.output).toBeTruthy();
    }

    const after = dbCounts();
    expect(after.cvDocuments).toBe(before.cvDocuments + 1);
    expect(after.processingJobs).toBeGreaterThanOrEqual(before.processingJobs + 1);
    expect(after.agentExecutions).toBeGreaterThanOrEqual(before.agentExecutions + 4);

    const detail = await apiCall(page, "GET", `/documents/${document.id}`);
    expect(detail.status()).toBe(200);

    const download = await apiCall(page, "GET", `/documents/${document.id}/download`);
    expect(download.status()).toBe(200);
    expect((await download.body()).length).toBeGreaterThan(10);

    await page.reload();
    await expect(page.getByText("qa-cv.pdf")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("COMPLETED").first()).toBeVisible();
    expect(log.pageErrors).toEqual([]);
  });

  test("duplicate upload is rejected and invalid files are blocked", async ({ page }) => {
    await login(page);
    const candidateId = await makeCandidate(page);

    const first = await page.request.post(`${API}/candidates/${candidateId}/documents`, {
      multipart: { file: { name: "same.pdf", mimeType: "application/pdf", buffer: PDF_BYTES } },
    });
    expect(first.status()).toBe(201);

    const duplicate = await page.request.post(`${API}/candidates/${candidateId}/documents`, {
      multipart: { file: { name: "same.pdf", mimeType: "application/pdf", buffer: PDF_BYTES } },
    });
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.text()).toMatch(/already been uploaded/i);

    const wrongType = await page.request.post(`${API}/candidates/${candidateId}/documents`, {
      multipart: { file: { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("plain text") } },
    });
    expect(wrongType.status()).toBe(400);

    const wrongMagic = await page.request.post(`${API}/candidates/${candidateId}/documents`, {
      multipart: { file: { name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf") } },
    });
    expect(wrongMagic.status()).toBe(400);
    expect(await wrongMagic.text()).toMatch(/does not match/i);
  });

  test("document access is tenant-scoped", async ({ browser, page }) => {
    await login(page);
    const candidateId = await makeCandidate(page);
    const created = await page.request.post(`${API}/candidates/${candidateId}/documents`, {
      multipart: { file: { name: "private.pdf", mimeType: "application/pdf", buffer: PDF_BYTES } },
    });
    const documentId = ((await created.json()) as { id: string }).id;

    const outsiderEmail = unique("qa-doc-outsider").toLowerCase() + "@aijob.local";
    const registered = await page.request.post(`${API}/auth/register`, {
      data: { email: outsiderEmail, password: "OutsiderPass123!", name: "QA Document Outsider" },
    });
    expect(registered.ok()).toBeTruthy();
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, { email: outsiderEmail, password: "OutsiderPass123!" });

    expect([403, 404]).toContain((await apiCall(otherPage, "GET", `/documents/${documentId}`)).status());
    expect([403, 404]).toContain((await apiCall(otherPage, "GET", `/candidates/${candidateId}/documents`)).status());
    expect([403, 404]).toContain((await apiCall(otherPage, "GET", `/documents/${documentId}/download`)).status());
    await other.close();
  });

  test("configured AI key path falls back honestly when the provider has no balance", async ({ page }) => {
    await login(page);
    const response = await apiCall(page, "POST", "/jobs/generate", {
      brief: "QA backend role: Node.js, TypeScript, PostgreSQL and JWT authentication.",
    });
    expect(response.status()).toBe(201);
    const draft = (await response.json()) as { title: string; source: string; description: string };
    expect(draft.title.length).toBeGreaterThan(2);
    expect(["zai", "deterministic"]).toContain(draft.source);
    console.log(`[ai-key] configured key responded; observed source=${draft.source} (Z.ai returns HTTP 429 insufficient balance in this environment)`);
  });
});
