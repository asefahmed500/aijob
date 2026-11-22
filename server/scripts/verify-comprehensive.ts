import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const BASE = process.env.API_BASE ?? "http://localhost:3002";
const report: Array<{ check: string; status: "PASS" | "FAIL" | "BLOCKED"; evidence: string }> = [];

class Client {
  private jar = new Map<string, string>();

  async call<T>(path: string, method = "GET", body?: unknown, headers?: Record<string, string>) {
    const cookie = [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
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

  expect<T>(path: string, method = "GET", body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.call<T>(path, method, body, headers).then((result) => {
      if (result.status >= 400) {
        throw new Error(`${method} ${path} -> ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`);
      }
      return result.data;
    });
  }
}

function record(check: string, fn: () => Promise<string>) {
  return fn()
    .then((evidence) => report.push({ check, status: "PASS", evidence }))
    .catch((error) => report.push({ check, status: "FAIL", evidence: (error as Error).message.slice(0, 220) }));
}

async function main() {
  const suffix = Date.now();
  const owner = new Client();
  const outsider = new Client();
  const viewer = new Client();
  const admin = new Client();

  const ownerEmail = `audit2-owner-${suffix}@aijob.local`;
  const viewerEmail = `audit2-viewer-${suffix}@aijob.local`;
  const outsiderEmail = `audit2-outsider-${suffix}@aijob.local`;

  await owner.expect("/auth/register", "POST", { email: ownerEmail, password: "password123", name: "QA Owner" });
  const org = await owner.expect<{ id: string }>("/organizations", "POST", { name: `QA Org ${suffix}` });
  await owner.expect("/organizations/switch", "POST", { organizationId: org.id });

  let jobId = "";
  let candidateId = "";
  let applicationId = "";

  await record("AUTH: expired JWT is rejected", async () => {
    const secret = process.env.JWT_SECRET ?? "dev-only-jwt-secret-change-me";
    const expired = jwt.sign({ sub: "nobody", email: "nobody@example.com", systemRole: "USER" }, secret, {
      expiresIn: "-1h",
    });
    const result = await new Client().call("/auth/me", "GET", undefined, {
      Authorization: `Bearer ${expired}`,
    });
    assert.equal(result.status, 401);
    return "expired Bearer token -> 401";
  });

  await record("AUTH: weak password and malformed email are rejected", async () => {
    const weak = await new Client().call("/auth/register", "POST", {
      email: `weak-${suffix}@aijob.local`,
      password: "short",
    });
    assert.equal(weak.status, 400);
    const badEmail = await new Client().call("/auth/register", "POST", {
      email: "not-an-email",
      password: "password123",
    });
    assert.equal(badEmail.status, 400);
    return "weak password -> 400, invalid email -> 400";
  });

  await record("AUTH: wrong password is rejected", async () => {
    const result = await new Client().call("/auth/login", "POST", {
      email: ownerEmail,
      password: "wrong-password",
    });
    assert.equal(result.status, 401);
    return "wrong password -> 401";
  });

  await record("INPUT: validation rejects malformed and unknown fields", async () => {
    const shortTitle = await owner.call("/jobs", "POST", {
      title: "x",
      description: "A sufficiently long description.",
      requirements: "A sufficiently long requirement.",
    });
    assert.equal(shortTitle.status, 400);
    const badCandidate = await owner.call("/candidates", "POST", {
      name: "QA",
      email: "bad-email",
      resumeText: "A sufficiently long resume text for validation checks.",
    });
    assert.equal(badCandidate.status, 400);
    const extraField = await owner.call("/jobs", "POST", {
      title: "Valid title",
      description: "A sufficiently long description.",
      requirements: "A sufficiently long requirement.",
      unexpected: "value",
    });
    assert.equal(extraField.status, 400);
    return "short title, bad email and extra field -> 400";
  });

  await record("AI: job draft is labelled and traceable to the brief", async () => {
    const marker = `QuantumRole${suffix}`;
    const draft = await owner.expect<{ title: string; description: string; requirements: string; source: string }>(
      "/jobs/generate",
      "POST",
      { brief: `${marker}\nTypeScript services; PostgreSQL schema design; REST API authentication.` },
    );
    assert.ok(["zai", "deterministic"].includes(draft.source));
    assert.ok(draft.title.includes(marker) && draft.requirements.length > 10);
    const created = await owner.expect<{ id: string; source: string }>("/jobs", "POST", {
      title: draft.title,
      description: draft.description,
      requirements: draft.requirements,
      source: draft.source,
    });
    jobId = created.id;
    assert.equal(created.source, draft.source);
    return `draft source=${draft.source}, marker preserved, job created`;
  });

  await record("AI: evidence quotes are exact substrings of source emails", async () => {
    const application = await owner.expect<{ id: string }>("/applications", "POST", {
      company: "QA Co",
      role: "Backend Engineer",
    });
    const body = "From: jobs@qa.local\nSubject: Backend Engineer\n\nRequired PostgreSQL and REST API design.\nBuilt a REST API in NestJS with PostgreSQL and improved latency by 30%.";
    await owner.expect(`/applications/${application.id}/emails`, "POST", {
      applicationId: application.id,
      rawBody: body,
    });
    const extraction = await owner.expect<{
      accepted: number;
      items: Array<{ id: string; verbatimQuote: string; emailSource: { id: string } }>;
      usedFallback: boolean;
    }>(`/applications/${application.id}/evidence/extract`, "POST");
    assert.ok(extraction.accepted > 0);
    const emails = await owner.expect<Array<{ id: string; normalizedBody: string }>>(
      `/applications/${application.id}/emails`,
    );
    for (const item of extraction.items) {
      const source = emails.find((email) => email.id === item.emailSource.id);
      assert.ok(source && source.normalizedBody.includes(item.verbatimQuote));
    }
    return `${extraction.accepted} quotes verified, source=${extraction.usedFallback ? "deterministic fallback" : "provider"}`;
  });

  await record("AI: letter claims reference approved evidence only", async () => {
    const application = await owner.expect<{ id: string }>("/applications", "POST", {
      company: "QA Letters",
      role: "Platform Engineer",
    });
    await owner.expect(`/applications/${application.id}/emails`, "POST", {
      applicationId: application.id,
      rawBody: "From: jobs@qa.local\nSubject: Platform Engineer\n\nRequired Kubernetes and Go services.\nBuilt Go services on Kubernetes and reduced deploy time by 25%.",
    });
    const extraction = await owner.expect<{ items: Array<{ id: string; source: string }> }>(
      `/applications/${application.id}/evidence/extract`,
      "POST",
    );
    for (const item of extraction.items) {
      await owner.expect(`/evidence/${item.id}`, "PATCH", { approved: true });
    }
    const letter = await owner.expect<{
      source: string;
      claims: Array<{ grounded: boolean; evidenceId: string | null }>;
    }>(`/applications/${application.id}/letter/generate`, "POST");
    const approvedIds = new Set(extraction.items.map((item) => item.id));
    for (const claim of letter.claims.filter((item) => item.evidenceId !== null)) {
      assert.ok(approvedIds.has(claim.evidenceId!));
    }
    assert.ok(letter.claims.length > 0);
    return `source=${letter.source}, ${letter.claims.length} claims, cited ids all approved`;
  });

  await record("AI: scoring quotes and offsets resolve in the resume", async () => {
    const resume =
      "Built Node.js and TypeScript services with PostgreSQL schemas.\nImplemented REST API and JWT authentication in NestJS.\nLed a team of three engineers on delivery.";
    const candidate = await owner.expect<{ id: string }>("/candidates", "POST", {
      name: "QA Scoring Candidate",
      email: `score-${suffix}@aijob.local`,
      resumeText: resume,
    });
    candidateId = candidate.id;
    const applied = await owner.expect<{ id: string }>("/candidates/apply", "POST", {
      candidateId: candidate.id,
      jobId,
    });
    applicationId = applied.id;
    const scores = await owner.expect<Array<{ score: { score: number; source: string; evidences: Array<{ quote: string; charStart: number; charEnd: number }> } }>>(
      `/scoring/jobs/${jobId}/score-all`,
      "POST",
    );
    assert.ok(scores.length > 0 && scores[0].score.score > 0);
    for (const evidence of scores[0].score.evidences) {
      assert.equal(resume.slice(evidence.charStart, evidence.charEnd), evidence.quote);
    }
    return `score=${scores[0].score.score}, source=${scores[0].score.source}, offsets verified`;
  });

  await record("AI: CV items are verbatim and versions increment", async () => {
    const resume =
      "Experience\nBuilt NestJS APIs with PostgreSQL and JWT authentication.\nLed a team of four engineers.\nEducation\nBSc Computer Science, City University\nSkills\nNestJS, PostgreSQL, React";
    const person = await owner.expect<{ id: string }>("/candidates", "POST", {
      name: "QA CV Candidate",
      email: `cv-${suffix}@aijob.local`,
      resumeText: resume,
    });
    const first = await owner.expect<{ version: number; source: string; content: string; skills: string; experience: string; education: string }>(
      `/candidates/${person.id}/cv/generate`,
      "POST",
    );
    const detail = await owner.expect<{ resumeText: string }>(`/candidates/${person.id}`);
    for (const line of [first.skills, first.experience, first.education].join("\n").split("\n").filter(Boolean)) {
      assert.ok(detail.resumeText.includes(line), `CV line not in resume: ${line}`);
    }
    const second = await owner.expect<{ version: number }>(`/candidates/${person.id}/cv/generate`, "POST");
    assert.equal(second.version, 2);
    return `source=${first.source}, all items verbatim, v1 -> v2`;
  });

  await record("WORKFLOW: ranking, decision and notification are connected", async () => {
    const ranking = await owner.expect<Array<{ id: string; candidate: { id: string } }>>(`/candidates/ranking/${jobId}`);
    assert.ok(ranking.some((entry) => entry.id === applicationId && entry.candidate.id === candidateId));
    const decision = await owner.expect<{ stage: string; status: string; notificationId: string }>(
      `/pipeline/applications/${applicationId}/decision`,
      "POST",
      { decision: "hire", message: "QA hire message." },
    );
    assert.equal(decision.stage, "hired");
    assert.equal(decision.status, "hired");
    const notifications = await owner.expect<Array<{ id: string; subject: string; body: string }>>("/pipeline/notifications");
    assert.ok(notifications.some((item) => item.id === decision.notificationId && item.body.includes("QA hire message")));
    return "application ranked, hired, notification log contains custom message";
  });

  await record("EDGE: duplicate application and closed job are rejected", async () => {
    const duplicate = await owner.call("/candidates/apply", "POST", { candidateId, jobId });
    assert.equal(duplicate.status, 400);
    await owner.expect(`/jobs/${jobId}/status`, "PATCH", { status: "closed" });
    const closed = await new Client().call(`/public/jobs/${(await owner.expect<{ publicToken: string }>(`/jobs/${jobId}`)).publicToken}`);
    assert.equal(closed.status, 200);
    const publicApply = await new Client().call(`/public/apply/${(await owner.expect<{ publicToken: string }>(`/jobs/${jobId}`)).publicToken}`, "POST", {
      name: "QA Applicant",
      email: `apply-${suffix}@aijob.local`,
      resumeText: "Built Node.js and PostgreSQL services with REST API design.",
    });
    assert.equal(publicApply.status, 400);
    await owner.expect(`/jobs/${jobId}/status`, "PATCH", { status: "open" });
    return "duplicate apply -> 400, closed job apply -> 400, reopen ok";
  });

  await record("AUTHZ: viewer cannot mutate any module", async () => {
    const invite = await owner.expect<{ token: string }>("/teams/invite", "POST", { email: viewerEmail, role: "VIEWER" });
    await viewer.expect("/auth/register", "POST", { email: viewerEmail, password: "password123", name: "QA Viewer" });
    await viewer.expect("/invitations/accept", "POST", { token: invite.token });
    await viewer.expect("/organizations/switch", "POST", { organizationId: org.id });
    const attempts: Array<[string, string, unknown]> = [
      ["/jobs", "POST", { title: "Forbidden job", description: "Long enough description.", requirements: "Long enough requirement." }],
      ["/candidates", "POST", { name: "Forbidden", email: `no-${suffix}@aijob.local`, resumeText: "Long enough resume text for validation." }],
      [`/candidates/${candidateId}/cv/generate`, "POST", undefined],
      [`/pipeline/applications/${applicationId}/decision`, "POST", { decision: "hire" }],
      ["/teams/invite", "POST", { email: `x-${suffix}@aijob.local`, role: "RECRUITER" }],
      ["/admin/overview", "GET", undefined],
    ];
    for (const [path, method, body] of attempts) {
      const result = await viewer.call(path, method, body);
      assert.equal(result.status, 403, `${method} ${path} -> ${result.status}`);
    }
    const reads = await viewer.call("/jobs");
    assert.equal(reads.status, 200);
    return `${attempts.length} mutations -> 403, reads -> 200`;
  });

  await record("SECURITY: foreign tenant cannot read or mutate records", async () => {
    await outsider.expect("/auth/register", "POST", { email: outsiderEmail, password: "password123", name: "QA Outsider" });
    const other = await outsider.expect<{ id: string }>("/organizations", "POST", { name: `Other QA Org ${suffix}` });
    await outsider.expect("/organizations/switch", "POST", { organizationId: other.id });
    const attempts: Array<[string, string, unknown]> = [
      [`/jobs/${jobId}`, "GET", undefined],
      [`/candidates/${candidateId}`, "GET", undefined],
      [`/candidates/${candidateId}/cv/generate`, "POST", undefined],
      [`/pipeline/applications/${applicationId}/decision`, "POST", { decision: "hire" }],
      [`/jobs/${jobId}/status`, "PATCH", { status: "closed" }],
    ];
    for (const [path, method, body] of attempts) {
      const result = await outsider.call(path, method, body);
      assert.equal(result.status, 404, `${method} ${path} -> ${result.status}`);
    }
    return `${attempts.length} cross-tenant attempts -> 404`;
  });

  await record("AUTHZ: platform admin role is enforced", async () => {
    await admin.expect("/auth/login", "POST", { email: "admin@aijob.local", password: "admin12345" });
    const ok = await admin.call("/admin/overview");
    assert.equal(ok.status, 200);
    const denied = await owner.call("/admin/users");
    assert.equal(denied.status, 403);
    return "admin -> 200, regular owner -> 403";
  });

  console.log(JSON.stringify(report, null, 2));
  const failed = report.filter((item) => item.status === "FAIL");
  console.log(`\nTOTAL: ${report.length} | PASS: ${report.length - failed.length} | FAIL: ${failed.length}`);
  if (failed.length > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error("AUDIT CRASHED:", (error as Error).message);
  process.exitCode = 1;
});
