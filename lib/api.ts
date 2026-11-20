const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
      }
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface ApplicationSummary {
  id: string;
  company: string;
  role: string;
  status: string;
  createdAt: string;
  _count: { emails: number; evidence: number; letters: number };
}

export interface EmailSource {
  id: string;
  subject: string | null;
  fromAddress: string | null;
  receivedAt: string | null;
  normalizedBody: string;
}

export interface Evidence {
  id: string;
  kind: string;
  claim: string;
  verbatimQuote: string;
  charStart: number;
  charEnd: number;
  confidence: number;
  approved: boolean;
  source: string;
  emailSource: { id: string; subject: string | null } | null;
}

export interface Claim {
  id: string;
  sentence: string;
  evidenceId: string | null;
  grounded: boolean;
  note: string | null;
}

export interface CoverLetter {
  id: string;
  content: string;
  model: string;
  source: string;
  version: number;
  promptVersion: string;
  claims: Claim[];
}

export interface ExportArtifact {
  content: string;
  filename: string;
  contentType: string;
  base64: boolean;
}

export const api = {
  register: (email: string, password: string, name?: string) =>
    request<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
  listApplications: () => request<ApplicationSummary[]>("/applications"),
  createApplication: (company: string, role: string) =>
    request<ApplicationSummary>("/applications", {
      method: "POST",
      body: JSON.stringify({ company, role }),
    }),
  getApplication: (id: string) => request<ApplicationSummary & {
    emails: EmailSource[];
    evidence: Evidence[];
    letters: CoverLetter[];
  }>(`/applications/${id}`),
  addEmail: (id: string, rawBody: string, filename?: string) =>
    request<EmailSource>(`/applications/${id}/emails`, {
      method: "POST",
      body: JSON.stringify({ applicationId: id, rawBody, filename }),
    }),
  extractEvidence: (id: string) =>
    request<{ accepted: number; rejected: number; usedFallback: boolean; items: Evidence[] }>(
      `/applications/${id}/evidence/extract`,
      { method: "POST" },
    ),
  reviewEvidence: (evidenceId: string, approved: boolean) =>
    request<Evidence>(`/evidence/${evidenceId}`, {
      method: "PATCH",
      body: JSON.stringify({ approved }),
    }),
  generateLetter: (id: string) =>
    request<CoverLetter>(`/applications/${id}/letter/generate`, { method: "POST" }),
  produceExport: (id: string, letterId: string, format: "markdown" | "docx" | "print" | "clipboard") =>
    request<ExportArtifact>(`/applications/${id}/export`, {
      method: "POST",
      body: JSON.stringify({ letterId, format }),
    }),
  sendExport: (id: string, letterId: string, recipient: string) =>
    request<{ ok: boolean }>(`/applications/${id}/export/send`, {
      method: "POST",
      body: JSON.stringify({ letterId, recipient }),
    }),
};
