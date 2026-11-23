import assert from "node:assert/strict";

const BASE = process.env.API_BASE ?? "http://localhost:3002";
const report: Array<{ flow: string; status: "PASS" | "FAIL"; detail: string }> = [];

class Client {
  private jar = new Map<string, string>();

  async call<T>(path: string, method = "GET", body?: unknown): Promise<{ status: number; data: T }> {
    const cookie = [...this.jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const pair = raw.split(";")[0];
      const index = pair.indexOf("=");
      if (index > 0) this.jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const text = await response.text();
    return { status: response.status, data: text ? (JSON.parse(text) as T) : ({} as T) };
  }

  expect<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    return this.call<T>(path, method, body).then((result) => {
      if (result.status >= 400) {
        throw new Error(`${method} ${path} -> ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`);
      }
      return result.data;
    });
  }
}

function record(flow: string, fn: () => Promise<void>) {
  return fn()
    .then(() => report.push({ flow, status: "PASS", detail: "verified" }))
    .catch((error) => report.push({ flow, status: "FAIL", detail: (error as Error).message.slice(0, 200) }));
}

async function main() {
  const owner = new Client();
  const suffix = Date.now();
  let orgId = "";
  let jobId = "";
  let token = "";
  let fieldId = "";
  let secondFieldId = "";

  await record("SETUP: register / create tenant", async () => {
    await owner.expect("/auth/register", "POST", {
      email: `portal-owner-${suffix}@aijob.local`,
      password: "password123",
      name: "Portal Owner",
    });
    const org = await owner.expect<{ id: string }>("/organizations", "POST", {
      name: `Portal Org ${suffix}`,
    });
    orgId = org.id;
    await owner.expect("/organizations/switch", "POST", { organizationId: orgId });
    assert.equal((await owner.expect<{ id: string }>("/organizations/current")).id, orgId);
  });

  await record("PORTAL: job created with custom form, expiry and auto-screen", async () => {
    const job = await owner.expect<{ id: string; publicToken: string; formFields: string }>("/jobs", "POST", {
      title: "Backend Engineer",
      description: "Build backend services with AI integrations.",
      requirements: "Strong Node.js and TypeScript experience.\nPostgreSQL schema design and REST API design.",
      formFields: [
        { label: "GitHub profile", type: "url", required: true, placeholder: "https://github.com/..." },
        { label: "Why this role", type: "textarea", required: true },
      ],
      formExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      autoScreen: true,
    });
    jobId = job.id;
    token = job.publicToken;
    const fields = JSON.parse(job.formFields) as Array<{ id: string; label: string }>;
    assert.equal(fields.length, 2);
    fieldId = fields[0].id;
    secondFieldId = fields[1].id;
  });

  await record("PORTAL: public job detail exposes the form", async () => {
    const detail = await new Client().expect<{
      title: string;
      company: string;
      status: string;
      formFields: Array<{ id: string; label: string; required: boolean }>;
      autoScreen: boolean;
      formExpiresAt: string;
    }>(`/public/jobs/${token}`);
    assert.equal(detail.status, "open");
    assert.equal(detail.formFields.length, 2);
    assert.equal(detail.formFields[0].required, true);
    assert.equal(detail.autoScreen, true);
    assert.ok(detail.formExpiresAt);
  });

  await record("PORTAL: required answers are enforced", async () => {
    const result = await new Client().call(`/public/apply/${token}`, "POST", {
      name: "Portal Applicant",
      email: `required-${suffix}@aijob.local`,
      resumeText: "Built Node.js and TypeScript services with PostgreSQL schemas and REST APIs.",
    });
    assert.equal(result.status, 400);
  });

  await record("PORTAL: submission is auto-screened using form answers", async () => {
    const created = await new Client().expect<{
      applicationId: string;
      screening: { score: number; source: string; summary: string } | null;
    }>(`/public/apply/${token}`, "POST", {
      name: "Portal Applicant",
      email: `applicant-${suffix}@aijob.local`,
      resumeText: "Built Node.js services and REST APIs.",
      answers: {
        [fieldId]: "https://github.com/example",
        [secondFieldId]: "Designed PostgreSQL schema design and REST API design in TypeScript services",
      },
    });
    assert.ok(created.screening, "no automatic screening result");
    assert.ok(created.screening.score > 0, "automatic score was zero");
    const ranking = await owner.expect<Array<{
      id: string;
      candidate: { id: string };
      score: { evidences: Array<{ quote: string }> } | null;
    }>>(`/candidates/ranking/${jobId}`);
    const match = ranking.find((row) => row.id === created.applicationId);
    assert.ok(match?.score, "no persisted score for the application");
    assert.ok(
      match.score.evidences.some((evidence) => evidence.quote.includes("PostgreSQL schema design")),
      "form answer was not quoted as screening evidence",
    );
    const detail = await owner.expect<{ applications: Array<{ formAnswers: string | null }> }>(
      `/candidates/${match!.candidate.id}`,
    );
    assert.ok(detail.applications.some((application) => application.formAnswers?.includes("github.com")));
  });

  await record("PORTAL: user-set expiry blocks new applications", async () => {
    const saved = await owner.expect<{ formExpiresAt: string }>(`/jobs/${jobId}/form`, "PATCH", {
      formExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    assert.ok(saved.formExpiresAt);
    const detail = await new Client().expect<{ status: string }>(`/public/jobs/${token}`);
    assert.equal(detail.status, "expired");
    const result = await new Client().call(`/public/apply/${token}`, "POST", {
      name: "Late Applicant",
      email: `late-${suffix}@aijob.local`,
      resumeText: "Node.js and TypeScript engineer with PostgreSQL schema design experience.",
    });
    assert.equal(result.status, 400);
  });

  await record("PORTAL: expiry can be cleared and auto-screen disabled", async () => {
    await owner.expect(`/jobs/${jobId}/form`, "PATCH", { formExpiresAt: null, autoScreen: false });
    const created = await new Client().expect<{ applicationId: string; screening: unknown }>(
      `/public/apply/${token}`,
      "POST",
      {
        name: "Manual Review Applicant",
        email: `manual-${suffix}@aijob.local`,
        resumeText: "Node.js and TypeScript engineer with PostgreSQL schema design experience.",
        answers: { [fieldId]: "https://github.com/manual", [secondFieldId]: "I want to build backend APIs" },
      },
    );
    assert.equal(created.screening, null);
  });

  console.log(JSON.stringify(report, null, 2));
  const failed = report.filter((item) => item.status === "FAIL").length;
  console.log(`TOTAL: ${report.length} | PASS: ${report.length - failed} | FAIL: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

void main();
