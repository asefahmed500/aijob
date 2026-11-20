import assert from "node:assert/strict";

const BASE = process.env.API_BASE ?? "http://localhost:3002";
let cookie = "";

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

interface Email {
  id: string;
  normalizedBody: string;
}
interface Evidence {
  id: string;
  emailSourceId: string;
  verbatimQuote: string;
  source: string;
}
interface Claim {
  evidenceId: string | null;
  grounded: boolean;
}
interface Letter {
  id: string;
  content: string;
  claims: Claim[];
  source: string;
}

async function main() {
  await api("/auth/login", "POST", {
    email: "demo@aijob.local",
    password: "demo12345",
  });

  const applications = await api<Array<{ id: string }>>("/applications");
  assert.ok(applications.length > 0, "seed application missing");
  const applicationId = applications[0].id;

  const emails = await api<Email[]>(`/applications/${applicationId}/emails`);
  assert.ok(emails.length >= 3, "expected at least three seeded emails");
  const emailById = new Map(emails.map((email) => [email.id, email]));

  const extraction = await api<{ accepted: number; rejected: number; usedFallback: boolean }>(
    `/applications/${applicationId}/evidence/extract`,
    "POST",
  );
  assert.ok(extraction.accepted > 0, "no evidence was accepted");

  const evidence = await api<Evidence[]>(`/applications/${applicationId}/evidence`);
  for (const item of evidence) {
    const email = emailById.get(item.emailSourceId);
    assert.ok(email, `evidence ${item.id} has no source email`);
    assert.ok(
      email.normalizedBody.includes(item.verbatimQuote),
      `evidence ${item.id} quote is not present in its source email`,
    );
  }

  for (const item of evidence) {
    await api(`/evidence/${item.id}`, "PATCH", { approved: true });
  }

  const letter = await api<Letter>(`/applications/${applicationId}/letter/generate`, "POST");
  assert.ok(letter.content.trim().length > 50, "letter content is too short");
  assert.ok(letter.claims.length > 0, "letter has no claim mappings");
  const validIds = new Set(evidence.map((item) => item.id));
  for (const claim of letter.claims) {
    if (claim.evidenceId) {
      assert.ok(validIds.has(claim.evidenceId), "letter references an unknown evidence id");
    }
  }

  const exports: Record<string, number> = {};
  for (const format of ["markdown", "docx", "print", "clipboard"] as const) {
    const artifact = await api<{ content: string; filename: string }>(
      `/applications/${applicationId}/export`,
      "POST",
      { letterId: letter.id, format },
    );
    assert.ok(artifact.content.length > 0, `${format} export is empty`);
    exports[format] = artifact.content.length;
  }

  const history = await api<Array<{ format: string }>>(
    `/applications/${applicationId}/export/history`,
  );
  assert.ok(history.length >= 4, "export log was not written");

  console.log(
    JSON.stringify(
      {
        applicationId,
        emails: emails.length,
        evidence: evidence.length,
        evidenceSource: evidence[0]?.source,
        usedFallback: extraction.usedFallback,
        letterSource: letter.source,
        claims: letter.claims.length,
        exports,
        exportLogEntries: history.length,
        result: "PASS",
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error("VERIFY FAILED:", error.message);
  process.exitCode = 1;
});
