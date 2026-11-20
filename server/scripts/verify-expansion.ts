import assert from "node:assert/strict";

const BASE = process.env.API_BASE ?? "http://localhost:3002";
const jar = new Map<string, string>();

function cookieHeader(): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(jar.size ? { Cookie: cookieHeader() } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const pair = raw.split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

interface RankingEntry {
  id: string;
  status: string;
  candidate: { id: string; name: string; email: string };
  score: { score: number; source: string } | null;
}
interface Job {
  id: string;
  title: string;
  publicToken: string | null;
}
interface Summary {
  totals: { jobs: number; candidates: number; applications: number; scoredApplications: number };
  candidatesByStage: Record<string, number>;
  averageScore: number;
}

async function main() {
  await api("/auth/login", "POST", { email: "demo@aijob.local", password: "demo12345" });
  const memberships = await api<Array<{ organizationId: string }>>("/organizations");
  const organizationId = memberships[0].organizationId;
  await api("/organizations/switch", "POST", { organizationId });

  const jobs = await api<Job[]>("/jobs");
  const job = jobs.find((item) => item.title === "Backend Engineer");
  assert.ok(job, "seeded job missing");
  const detail = await api<{ id: string; publicToken: string }>(`/jobs/${job.id}`);
  assert.ok(detail.publicToken, "job has no public apply token");

  // 1. Hiring pipeline, notes, timeline, notifications
  const ranking = await api<RankingEntry[]>(`/candidates/ranking/${job.id}`);
  assert.ok(ranking.length >= 3, "seeded candidates missing");
  const applicationId = ranking[0].id;
  const updated = await api<{ stage: string; rating: number | null }>(
    `/pipeline/applications/${applicationId}/stage`,
    "PATCH",
    { stage: "screening", rating: 4 },
  );
  assert.equal(updated.stage, "screening");
  assert.equal(updated.rating, 4);
  await api(`/pipeline/applications/${applicationId}/notes`, "POST", {
    body: "Strong PostgreSQL and NestJS evidence in resume.",
  });
  const notes = await api<Array<{ body: string }>>(`/pipeline/applications/${applicationId}/notes`);
  assert.ok(notes.some((note) => note.body.includes("PostgreSQL")), "note was not stored");
  const timeline = await api<Array<{ type: string }>>(`/pipeline/applications/${applicationId}/timeline`);
  assert.ok(timeline.some((event) => event.type === "stage_change"), "stage change not logged");
  assert.ok(timeline.some((event) => event.type === "note_added"), "note not logged");
  const notifications = await api<Array<{ status: string }>>("/pipeline/notifications");
  assert.ok(notifications.length > 0, "notification was not queued");

  // 2. Bulk stage change
  const all = await api<RankingEntry[]>(`/candidates/ranking/${job.id}`);
  const ids = all.slice(0, 2).map((entry) => entry.id);
  const bulked = await api<Array<{ stage: string }>>("/pipeline/bulk-stage", "POST", {
    applicationIds: ids,
    stage: "interview",
  });
  assert.equal(bulked.length, 2);
  assert.ok(bulked.every((item) => item.stage === "interview"));

  // 3. Search, filter and sort
  const searched = await api<Array<{ name: string; application: { stage: string } | null }>>(
    "/candidates/search?q=Alex&sort=name",
  );
  assert.ok(searched.length >= 1 && searched[0].name.includes("Alex"), "text search failed");
  const filtered = await api<Array<{ application: { stage: string } | null }>>(
    "/candidates/search?stage=interview",
  );
  assert.ok(filtered.length >= 2, "stage filter failed");
  assert.ok(filtered.every((row) => row.application?.stage === "interview"), "filter returned wrong stage");

  // 4. Analytics
  const summary = await api<Summary>("/analytics");
  assert.ok(summary.totals.candidates >= 3, "analytics candidate count wrong");
  assert.ok(summary.totals.applications >= 3, "analytics application count wrong");
  assert.ok(summary.averageScore > 0, "analytics average score is zero");
  assert.ok((summary.candidatesByStage.interview ?? 0) >= 2, "analytics stage counts wrong");

  // 5. Team roles and invitations
  const inviteEmail = `recruiter-${Date.now()}@aijob.local`;
  const invite = await api<{ token: string; role: string }>("/teams/invite", "POST", {
    email: inviteEmail,
    role: "RECRUITER",
  });
  assert.ok(invite.token, "invite token missing");
  jar.clear();
  await api("/auth/register", "POST", {
    email: inviteEmail,
    password: "password123",
    name: "Invited Recruiter",
  });
  const accepted = await api<{ organizationId: string; role: string }>("/invitations/accept", "POST", {
    token: invite.token,
  });
  assert.equal(accepted.organizationId, organizationId);
  assert.equal(accepted.role, "RECRUITER");
  const role = await api<{ role: string }>("/teams/my-role");
  assert.equal(role.role, "RECRUITER");
  await api("/organizations/switch", "POST", { organizationId });
  await api(`/pipeline/applications/${applicationId}/stage`, "PATCH", { stage: "offer" });

  // VIEWER must not be allowed to change stage
  const viewerEmail = `viewer-${Date.now()}@aijob.local`;
  jar.clear();
  await api("/auth/login", "POST", { email: "demo@aijob.local", password: "demo12345" });
  await api("/organizations/switch", "POST", { organizationId });
  const viewerInvite = await api<{ token: string }>("/teams/invite", "POST", {
    email: viewerEmail,
    role: "VIEWER",
  });
  jar.clear();
  await api("/auth/register", "POST", {
    email: viewerEmail,
    password: "password123",
    name: "Invited Viewer",
  });
  await api("/invitations/accept", "POST", { token: viewerInvite.token });
  await api("/organizations/switch", "POST", { organizationId });
  let denied = false;
  try {
    await api(`/pipeline/applications/${applicationId}/stage`, "PATCH", { stage: "rejected" });
  } catch (error) {
    denied = (error as Error).message.includes("403");
  }
  assert.ok(denied, "VIEWER was allowed to change a pipeline stage");

  // 6. Public apply portal
  jar.clear();
  const portalEmail = `portal-${Date.now()}@aijob.local`;
  const application = await api<{ applicationId: string; jobTitle: string }>(
    `/public/apply/${detail.publicToken}`,
    "POST",
    {
      name: "Public Applicant",
      email: portalEmail,
      resumeText:
        "Built Node.js and TypeScript services with PostgreSQL and REST API design. Used NestJS in production.",
    },
  );
  assert.ok(application.applicationId, "public application was not created");

  console.log(
    JSON.stringify(
      {
        pipeline: "PASS",
        notes: notes.length,
        timelineEvents: timeline.length,
        bulkUpdated: bulked.length,
        searchResults: searched.length,
        filteredByStage: filtered.length,
        analytics: summary.totals,
        roles: "OWNER/RECRUITER/VIEWER enforced",
        publicApply: "PASS",
        result: "PASS",
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error("EXPANSION VERIFY FAILED:", error.message);
  process.exitCode = 1;
});
