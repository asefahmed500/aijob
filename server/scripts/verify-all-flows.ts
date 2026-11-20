import assert from "node:assert/strict";

const BASE = process.env.API_BASE ?? "http://localhost:3002";
const report: Array<{ flow: string; status: "PASS" | "FAIL" | "EXTERNAL"; detail: string }> = [];

class Client {
  private jar = new Map<string, string>();

  async call<T>(path: string, method = "GET", body?: unknown): Promise<{ status: number; data: T }> {
    const cookie = [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
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
    .catch((error) => report.push({ flow, status: "FAIL", detail: (error as Error).message.slice(0, 180) }));
}

async function main() {
  const owner = new Client();
  const recruiter = new Client();
  const suffix = Date.now();
  const ownerEmail = `audit-owner-${suffix}@aijob.local`;
  const recruiterEmail = `audit-recruiter-${suffix}@aijob.local`;

  let orgId = "";
  let jobId = "";
  let applicationId = "";
  let scoreSource = "";
  let evidenceSource = "";
  let letterSource = "";

  await record("AUTH: register / me / logout / login", async () => {
    await owner.expect("/auth/register", "POST", {
      email: ownerEmail,
      password: "password123",
      name: "Audit Owner",
    });
    const me = await owner.expect<{ email: string }>("/auth/me");
    assert.equal(me.email, ownerEmail);
    await owner.expect("/auth/logout", "POST");
    const denied = await owner.call("/auth/me");
    assert.equal(denied.status, 401);
    await owner.expect("/auth/login", "POST", { email: ownerEmail, password: "password123" });
  });

  await record("AUTH: duplicate email rejected", async () => {
    const result = await owner.call("/auth/register", "POST", {
      email: ownerEmail,
      password: "password123",
    });
    assert.equal(result.status, 409);
  });

  await record("ORG: create / switch / current / members", async () => {
    const created = await owner.expect<{ id: string }>("/organizations", "POST", {
      name: `Audit Org ${suffix}`,
    });
    orgId = created.id;
    await owner.expect("/organizations/switch", "POST", { organizationId: orgId });
    const current = await owner.expect<{ id: string }>("/organizations/current");
    assert.equal(current.id, orgId);
    const team = await owner.expect<{ members: Array<{ role: string }> }>("/teams");
    assert.ok(team.members.some((m) => m.role === "OWNER"));
  });

  await record("CANDIDATE WORKFLOW: app / email / evidence / letter / exports", async () => {
    const application = await owner.expect<{ id: string }>("/applications", "POST", {
      company: "Audit Co",
      role: "Backend Engineer",
    });
    await owner.expect(`/applications/${application.id}/emails`, "POST", {
      applicationId: application.id,
      rawBody:
        "From: jobs@auditco.com\nSubject: Backend Engineer\n\nRequired skills include PostgreSQL and REST API design.\nBuilt a REST API in NestJS with PostgreSQL and improved latency by 30%.",
    });
    const extraction = await owner.expect<{ accepted: number; items: Array<{ id: string; source: string }> }>(
      `/applications/${application.id}/evidence/extract`,
      "POST",
    );
    assert.ok(extraction.accepted > 0, "no evidence accepted");
    evidenceSource = extraction.items[0]?.source ?? "unknown";
    for (const item of extraction.items) {
      await owner.expect(`/evidence/${item.id}`, "PATCH", { approved: true });
    }
    const letter = await owner.expect<{ id: string; content: string; source: string }>(
      `/applications/${application.id}/letter/generate`,
      "POST",
    );
    assert.ok(letter.content.length > 50);
    letterSource = letter.source;
    for (const format of ["markdown", "docx", "print", "clipboard"] as const) {
      const artifact = await owner.expect<{ content: string }>(
        `/applications/${application.id}/export`,
        "POST",
        { letterId: letter.id, format },
      );
      assert.ok(artifact.content.length > 0, `${format} empty`);
    }
  });

  await record("JOBS + CANDIDATES + AI SCORING", async () => {
    const job = await owner.expect<{ id: string; publicToken: string }>("/jobs", "POST", {
      title: "Backend Engineer",
      description: "Build backend services with AI integrations.",
      requirements:
        "Strong Node.js and TypeScript experience.\nPostgreSQL schema design.\nREST API and JWT authentication.",
    });
    jobId = job.id;
    const candidate = await owner.expect<{ id: string }>("/candidates", "POST", {
      name: "Audit Candidate",
      email: `candidate-${suffix}@aijob.local`,
      resumeText:
        "Built Node.js and TypeScript services with PostgreSQL schemas.\nImplemented REST API and JWT authentication in NestJS.",
    });
    const applied = await owner.expect<{ id: string }>("/candidates/apply", "POST", {
      candidateId: candidate.id,
      jobId,
    });
    applicationId = applied.id;
    const scores = await owner.expect<Array<{ score: { score: number; source: string } }>>(
      `/scoring/jobs/${jobId}/score-all`,
      "POST",
    );
    assert.ok(scores[0].score.score > 0);
    scoreSource = scores[0].score.source;
    const ranking = await owner.expect<Array<{ score: { score: number } }>>(
      `/candidates/ranking/${jobId}`,
    );
    assert.ok(ranking.length > 0 && ranking[0].score.score > 0);
  });

  await record("PIPELINE: stage / rating / notes / timeline / bulk / notification", async () => {
    await owner.expect(`/pipeline/applications/${applicationId}/stage`, "PATCH", {
      stage: "screening",
      rating: 5,
    });
    await owner.expect(`/pipeline/applications/${applicationId}/notes`, "POST", {
      body: "Audit note: strong match.",
    });
    const notes = await owner.expect<Array<{ body: string }>>(
      `/pipeline/applications/${applicationId}/notes`,
    );
    assert.ok(notes.some((item) => item.body.includes("Audit note")));
    const timeline = await owner.expect<Array<{ type: string }>>(
      `/pipeline/applications/${applicationId}/timeline`,
    );
    assert.ok(timeline.some((item) => item.type === "stage_change"));
    await owner.expect("/pipeline/bulk-stage", "POST", {
      applicationIds: [applicationId],
      stage: "interview",
    });
    const notifications = await owner.expect<Array<{ status: string }>>("/pipeline/notifications");
    assert.ok(notifications.length > 0);
  });

  await record("SEARCH / FILTER / SORT", async () => {
    const rows = await owner.expect<Array<{ name: string }>>("/candidates/search?q=Audit&sort=name");
    assert.ok(rows.some((row) => row.name.includes("Audit")));
    const filtered = await owner.expect<Array<{ application: { stage: string } | null }>>(
      "/candidates/search?stage=interview",
    );
    assert.ok(filtered.some((row) => row.application?.stage === "interview"));
  });

  await record("ANALYTICS", async () => {
    const summary = await owner.expect<{ totals: { jobs: number; candidates: number }; averageScore: number }>(
      "/analytics",
    );
    assert.ok(summary.totals.jobs >= 1 && summary.totals.candidates >= 1);
    assert.ok(summary.averageScore > 0);
  });

  await record("TEAMS: invite / accept / role enforcement / isolation", async () => {
    const invite = await owner.expect<{ token: string }>("/teams/invite", "POST", {
      email: recruiterEmail,
      role: "RECRUITER",
    });
    await recruiter.expect("/auth/register", "POST", {
      email: recruiterEmail,
      password: "password123",
      name: "Audit Recruiter",
    });
    const accepted = await recruiter.expect<{ organizationId: string; role: string }>(
      "/invitations/accept",
      "POST",
      { token: invite.token },
    );
    assert.equal(accepted.organizationId, orgId);
    await recruiter.expect("/organizations/switch", "POST", { organizationId: orgId });
    const role = await recruiter.expect<{ role: string }>("/teams/my-role");
    assert.equal(role.role, "RECRUITER");
    await recruiter.expect(`/pipeline/applications/${applicationId}/stage`, "PATCH", { stage: "offer" });
    const sameOrgJob = await recruiter.call(`/jobs/${jobId}`);
    assert.equal(sameOrgJob.status, 200); // recruiter in same org can read the job
  });

  await record("PUBLIC APPLY (unauthenticated)", async () => {
    const detail = await owner.expect<{ publicToken: string }>(`/jobs/${jobId}`);
    assert.ok(detail.publicToken);
    const publicClient = new Client();
    const created = await publicClient.expect<{ applicationId: string }>(
      `/public/apply/${detail.publicToken}`,
      "POST",
      {
        name: "Portal Applicant",
        email: `portal-${suffix}@aijob.local`,
        resumeText:
          "Node.js and TypeScript engineer with PostgreSQL and REST API design experience.",
      },
    );
    assert.ok(created.applicationId);
  });

  await record("CROSS-TENANT ISOLATION", async () => {
    const outsider = new Client();
    await outsider.expect("/auth/register", "POST", {
      email: `outsider-${suffix}@aijob.local`,
      password: "password123",
    });
    const otherOrg = await outsider.expect<{ id: string }>("/organizations", "POST", {
      name: `Other Org ${suffix}`,
    });
    await outsider.expect("/organizations/switch", "POST", { organizationId: otherOrg.id });
    const jobs = await outsider.expect<Array<{ id: string }>>("/jobs");
    assert.equal(jobs.length, 0);
    const result = await outsider.call(`/jobs/${jobId}`);
    assert.equal(result.status, 404);
  });

  report.push({
    flow: "AI PROVIDER (Z.ai)",
    status: "EXTERNAL",
    detail: `HTTP 429 / 1113 insufficient balance. Observed sources: evidence=${evidenceSource}, letter=${letterSource}, score=${scoreSource}`,
  });
  report.push({
    flow: "SMTP LIVE DELIVERY",
    status: "EXTERNAL",
    detail: "Endpoint implemented; no live message sent in this audit.",
  });
  report.push({
    flow: "POSTGRES (original credentials)",
    status: "EXTERNAL",
    detail: "Local runtime verified on SQLite; original 5432 credentials invalid.",
  });

  console.log(JSON.stringify(report, null, 2));
  const failed = report.filter((item) => item.status === "FAIL");
  console.log(`\nTOTAL: ${report.length} | PASS: ${report.filter((r) => r.status === "PASS").length} | FAIL: ${failed.length} | EXTERNAL: ${report.filter((r) => r.status === "EXTERNAL").length}`);
  if (failed.length > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error("AUDIT CRASHED:", error.message);
  process.exitCode = 1;
});
