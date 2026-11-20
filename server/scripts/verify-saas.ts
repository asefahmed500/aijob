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

interface Job {
  id: string;
  title: string;
}
interface Candidate {
  id: string;
  name: string;
  resumeText: string;
}
interface RankingEntry {
  candidate: Candidate;
  score: {
    id: string;
    score: number;
    summary: string;
    source: string;
    evidences: Array<{ requirement: string; quote: string; charStart: number; charEnd: number }>;
  } | null;
}

async function main() {
  await api("/auth/login", "POST", { email: "demo@aijob.local", password: "demo12345" });

  const memberships = await api<Array<{ organizationId: string; role: string }>>("/organizations");
  assert.ok(memberships.length > 0, "seeded organization missing");
  const organizationId = memberships[0].organizationId;
  await api("/organizations/switch", "POST", { organizationId });

  const current = await api<{ id: string; name: string; _count: { jobs: number; candidates: number } }>(
    "/organizations/current",
  );
  assert.equal(current.id, organizationId);
  assert.ok(current._count.jobs > 0, "seeded job missing");
  assert.ok(current._count.candidates >= 3, "seeded candidates missing");

  const jobs = await api<Job[]>("/jobs");
  const job = jobs.find((item) => item.title === "Backend Engineer");
  assert.ok(job, "Backend Engineer job missing");

  await api(`/scoring/jobs/${job.id}/score-all`, "POST");
  const ranking = await api<RankingEntry[]>(`/candidates/ranking/${job.id}`);
  assert.ok(ranking.length >= 3, "expected ranked candidates");
  assert.ok(ranking[0].score, "top candidate has no score");
  assert.ok(ranking[0].score.score > 0, "top candidate score is zero");

  for (let i = 1; i < ranking.length; i += 1) {
    assert.ok(
      (ranking[i - 1].score?.score ?? -1) >= (ranking[i].score?.score ?? -1),
      "ranking is not sorted by score",
    );
  }

  let evidenceCount = 0;
  for (const entry of ranking) {
    for (const evidence of entry.score?.evidences ?? []) {
      evidenceCount += 1;
      assert.ok(
        entry.candidate.resumeText.includes(evidence.quote),
        "score evidence quote is not present in the candidate resume",
      );
      assert.equal(
        entry.candidate.resumeText.slice(evidence.charStart, evidence.charEnd),
        evidence.quote,
        "score evidence offsets do not match the quote",
      );
    }
  }
  assert.ok(evidenceCount > 0, "no score evidence was produced");

  // Isolation check: a second user with a different org cannot read this org's job.
  const otherEmail = `other-${Date.now()}@aijob.local`;
  await api("/auth/logout", "POST");
  jar.clear();
  await api("/auth/register", "POST", {
    email: otherEmail,
    password: "password123",
    name: "Other User",
  });
  const otherOrg = await api<{ id: string }>("/organizations", "POST", { name: "Other Org" });
  await api("/organizations/switch", "POST", { organizationId: otherOrg.id });
  const foreignJobs = await api<Job[]>("/jobs");
  assert.equal(foreignJobs.length, 0, "cross-organization data leak");

  let forbidden = false;
  try {
    await api(`/jobs/${job.id}`, "GET");
  } catch (error) {
    forbidden = (error as Error).message.includes("404");
  }
  assert.ok(forbidden, "foreign job id was not rejected with 404");

  console.log(
    JSON.stringify(
      {
        organizationId,
        jobId: job.id,
        candidatesRanked: ranking.length,
        topCandidate: {
          name: ranking[0].candidate.name,
          score: ranking[0].score?.score,
          source: ranking[0].score?.source,
        },
        evidenceCount,
        crossOrgIsolation: "PASS",
        result: "PASS",
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error("SAAS VERIFY FAILED:", error.message);
  process.exitCode = 1;
});
