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
  systemRole: "USER" | "PLATFORM_ADMIN";
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
  forgotPassword: (email: string) =>
    request<{ ok: boolean; devToken?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  // Platform administration (PLATFORM_ADMIN only)
  adminOverview: () =>
    request<{ totals: Record<string, number> }>("/admin/overview"),
  adminOrganizations: () =>
    request<Array<{ id: string; name: string; slug: string; members: number; jobs: number; candidates: number; roles: string[] }>>(
      "/admin/organizations",
    ),
  adminUsers: () =>
    request<Array<{ id: string; email: string; name: string | null; systemRole: string; organizations: number }>>(
      "/admin/users",
    ),
  adminAudit: () =>
    request<Array<{ id: string; type: string; message: string; organization: string; createdAt: string }>>(
      "/admin/audit",
    ),
  setSystemRole: (userId: string, systemRole: "USER" | "PLATFORM_ADMIN") =>
    request<{ id: string; email: string; systemRole: string }>(`/admin/users/${userId}/system-role`, {
      method: "PATCH",
      body: JSON.stringify({ systemRole }),
    }),
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
  deleteApplication: (id: string) => request<{ ok: boolean }>(`/applications/${id}`, { method: "DELETE" }),
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

  // Organization (SaaS) API
  listOrganizations: () =>
    request<Array<{ organizationId: string; role: string; organization: { id: string; name: string; slug: string } }>>(
      "/organizations",
    ),
  createOrganization: (name: string) =>
    request<{ id: string; name: string }>("/organizations", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  switchOrganization: (organizationId: string) =>
    request<{ ok: boolean }>("/organizations/switch", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    }),
  currentOrganization: () =>
    request<{ id: string; name: string; _count: { jobs: number; candidates: number } }>(
      "/organizations/current",
    ),
  listJobs: () =>
    request<Array<{
      id: string;
      title: string;
      status: string;
      publicToken: string | null;
      formFields: string | null;
      formExpiresAt: string | null;
      autoScreen: boolean;
      createdAt: string;
      _count: { applications: number };
    }>>("/jobs"),
  createJob: (title: string, description: string, requirements: string, source?: string, form?: JobFormInput) =>
    request<{ id: string; title: string; source: string; publicToken: string | null }>("/jobs", {
      method: "POST",
      body: JSON.stringify({ title, description, requirements, source, ...form }),
    }),
  updateJobForm: (id: string, form: JobFormInput) =>
    request<{ id: string; formFields: string | null; formExpiresAt: string | null; autoScreen: boolean }>(
      `/jobs/${id}/form`,
      { method: "PATCH", body: JSON.stringify(form) },
    ),
  generateJobDraft: (brief: string) =>
    request<JobDraft>("/jobs/generate", {
      method: "POST",
      body: JSON.stringify({ brief }),
    }),
  updateJobStatus: (id: string, status: "open" | "closed") =>
    request<{ id: string; status: string }>(`/jobs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getJob: (id: string) => request<JobDetail>(`/jobs/${id}`),
  listCandidates: () =>
    request<Array<{ id: string; name: string; email: string; _count: { applications: number } }>>(
      "/candidates",
    ),
  createCandidate: (name: string, email: string, resumeText: string) =>
    request<{ id: string; name: string }>("/candidates", {
      method: "POST",
      body: JSON.stringify({ name, email, resumeText }),
    }),
  applyCandidate: (candidateId: string, jobId: string) =>
    request<{ id: string }>("/candidates/apply", {
      method: "POST",
      body: JSON.stringify({ candidateId, jobId }),
    }),
  ranking: (jobId: string) => request<RankingEntry[]>(`/candidates/ranking/${jobId}`),
  scoreJob: (jobId: string) =>
    request<Array<{ applicationId: string; score: ScoreDetail }>>(`/scoring/jobs/${jobId}/score-all`, {
      method: "POST",
    }),

  // Hiring pipeline
  decideApplication: (applicationId: string, decision: "offer" | "reject" | "hire", message?: string) =>
    request<DecisionResult>(`/pipeline/applications/${applicationId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, message }),
    }),
  updateStage: (applicationId: string, stage: string, rating?: number) =>
    request<{ id: string; stage: string; rating: number | null }>(
      `/pipeline/applications/${applicationId}/stage`,
      { method: "PATCH", body: JSON.stringify({ stage, rating }) },
    ),
  addNote: (applicationId: string, body: string) =>
    request<{ id: string; body: string }>(`/pipeline/applications/${applicationId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  getNotes: (applicationId: string) =>
    request<Array<{ id: string; body: string; authorId: string; createdAt: string }>>(
      `/pipeline/applications/${applicationId}/notes`,
    ),
  getTimeline: (applicationId: string) =>
    request<Array<{ id: string; type: string; message: string; createdAt: string }>>(
      `/pipeline/applications/${applicationId}/timeline`,
    ),
  bulkStage: (applicationIds: string[], stage: string) =>
    request<Array<{ id: string; stage: string }>>("/pipeline/bulk-stage", {
      method: "POST",
      body: JSON.stringify({ applicationIds, stage }),
    }),
  getCandidate: (id: string) => request<CandidateDetail>(`/candidates/${id}`),
  generateCv: (candidateId: string) =>
    request<CvRecord>(`/candidates/${candidateId}/cv/generate`, { method: "POST" }),
  listDocuments: (candidateId: string) =>
    request<CvDocument[]>(`/candidates/${candidateId}/documents`),
  getDocument: (id: string) => request<CvDocument>(`/documents/${id}`),
  uploadDocument: async (candidateId: string, file: File): Promise<CvDocument> => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_BASE}/candidates/${candidateId}/documents`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!response.ok) {
      let message = `Upload failed (${response.status})`;
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
    return (await response.json()) as CvDocument;
  },
  retryDocument: (id: string) =>
    request<ProcessingJob>(`/documents/${id}/retry`, { method: "POST" }),
  documentDownloadUrl: (id: string) => `${API_BASE}/documents/${id}/download`,

  getNotifications: () =>
    request<Array<{ id: string; status: string; subject: string; recipient: string; createdAt: string }>>(
      "/pipeline/notifications",
    ),

  // Search and analytics
  searchCandidates: (params: { q?: string; stage?: string; jobId?: string; minScore?: number; sort?: string }) =>
    request<CandidateSearchRow[]>(
      `/candidates/search?${new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== "")
          .map(([key, value]) => [key, String(value)]),
      ).toString()}`,
    ),
  getAnalytics: () => request<AnalyticsSummary>("/analytics"),

  // Teams
  getTeam: () => request<{ members: Member[]; invitations: Invitation[] }>("/teams"),
  getMyRole: () => request<{ role: string }>("/teams/my-role"),
  inviteMember: (email: string, role: string) =>
    request<Invitation>("/teams/invite", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  removeMember: (userId: string) => request<{ ok: boolean }>(`/teams/members/${userId}`, { method: "DELETE" }),
  updateMemberRole: (userId: string, role: string) =>
    request<{ id: string; role: string }>(`/teams/members/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  acceptInvite: (token: string) =>
    request<{ organizationId: string; role: string }>("/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  // Public apply
  getPublicJob: (token: string) => request<PublicJob>(`/public/jobs/${token}`),
  publicApply: (
    token: string,
    data: { name: string; email: string; resumeText: string; answers?: Record<string, string> },
  ) =>
    request<{ applicationId: string; jobTitle: string; screening: ScreeningResult | null }>(
      `/public/apply/${token}`,
      { method: "POST", body: JSON.stringify(data) },
    ),
};

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "url";
  required: boolean;
  placeholder: string;
}

export interface JobFormInput {
  formFields?: FormField[];
  formExpiresAt?: string | null;
  autoScreen?: boolean;
}

export interface ScreeningResult {
  id: string;
  score: number;
  source: string;
  summary: string;
}

export interface CandidateDetail {
  id: string;
  name: string;
  email: string;
  resumeText: string;
  source: string;
  cvs: CvRecord[];
  applications: Array<{
    id: string;
    stage: string;
    status: string;
    rating: number | null;
    formAnswers: string | null;
    job: { id: string; title: string; formFields: string | null };
    scores: ScoreDetail[];
  }>;
}

export interface CandidateSearchRow {
  id: string;
  name: string;
  email: string;
  source: string;
  application: {
    id: string;
    stage: string;
    rating: number | null;
    jobTitle: string;
    score: number | null;
    scoreSource: string | null;
  } | null;
}

export interface AnalyticsSummary {
  totals: { jobs: number; candidates: number; applications: number; scoredApplications: number };
  jobsByStatus: Record<string, number>;
  candidatesByStage: Record<string, number>;
  averageScore: number;
  scoreSources: Record<string, number>;
  recentActivity: Array<{ id: string; type: string; message: string; createdAt: string }>;
}

export interface Member {
  id: string;
  role: string;
  user: { id: string; email: string; name: string | null };
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
}

export interface ScoreEvidence {
  id: string;
  requirement: string;
  quote: string;
  charStart: number;
  charEnd: number;
}

export interface ScoreDetail {
  id: string;
  score: number;
  summary: string;
  source: string;
  model: string;
  evidences: ScoreEvidence[];
}

export interface RankingEntry {
  id: string;
  status: string;
  candidate: { id: string; name: string; email: string; resumeText: string };
  score: ScoreDetail | null;
}

export interface JobDetail {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  source: string;
  publicToken: string | null;
  formFields: string | null;
  formExpiresAt: string | null;
  autoScreen: boolean;
  applications: RankingEntry[];
}

export interface JobDraft {
  title: string;
  description: string;
  requirements: string;
  source: string;
}

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  company: string;
  formFields: FormField[];
  formExpiresAt: string | null;
  autoScreen: boolean;
}

export interface DecisionResult {
  id: string;
  stage: string;
  status: string;
  decision: "offer" | "reject" | "hire";
  notificationId: string;
  notificationStatus: string;
}

export interface AgentExecution {
  id: string;
  agentKey: string;
  status: string;
  source: string;
  model: string | null;
  promptVersion: string | null;
  output: unknown;
  error: string | null;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  type: string;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  executions: AgentExecution[];
}

export interface CvDocument {
  id: string;
  candidateId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageProvider: string;
  status: string;
  extractedText: string | null;
  extractionNote: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  jobs: ProcessingJob[];
}

export interface CvRecord {
  id: string;
  candidateId: string;
  headline: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  content: string;
  source: string;
  model: string;
  version: number;
  createdAt: string;
}
