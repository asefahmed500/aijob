# ATS Upgrade Audit — Existing System vs Required AI-Powered Platform

**Status:** AUDIT COMPLETE / IMPLEMENTATION BLOCKED ON EXTERNAL CREDENTIALS  
**Date:** 2026-11-28  
**Codebase:** Next.js 16 frontend + NestJS 12 API + Prisma 7 / SQLite + Z.ai client with deterministic fallback

This document is an evidence-based audit of the current application against the requested AI-powered ATS upgrade. It deliberately does **not** claim features that are not implemented. No R2 bucket, LangGraph deployment, LangSmith key, or additional model-provider key was available in this environment, so those integrations are specified but not fabricated.

---

## 1. What actually exists today (verified)

| Area | Implementation | Evidence |
| --- | --- | --- |
| Auth | Email/password registration, login, JWT in HttpOnly SameSite=Lax cookie, logout, `GET /auth/me` | `server/src/auth/*`, `e2e/audit/01-authentication.spec.ts` |
| Authorization | Org-scoped RBAC + ABAC policies (OWNER / RECRUITER / VIEWER, PLATFORM_ADMIN), enforced in UI and API | `server/src/auth/abac/policies.ts`, `server/src/organizations/roles.ts`, `e2e/audit/05-teams-admin.spec.ts` |
| Tenants | Organizations, memberships, invitations, active-org cookie scoping | `server/prisma/schema.prisma`, `e2e/audit/04-candidates-pipeline.spec.ts` |
| Jobs | Create, AI draft, edit form/questions, expiry, auto-screen, close/reopen, ranking | `server/src/jobs/*`, `e2e/audit/03-org-and-portal.spec.ts` |
| Candidates | Create, list, search/filter/sort, apply, bulk stage change, detail, notes, timeline, decision, notifications | `server/src/candidates/*`, `server/src/pipeline/*`, `e2e/audit/04-candidates-pipeline.spec.ts` |
| Scoring | Candidate-to-job scoring with verbatim resume quotes and offsets; deterministic fallback when AI unavailable | `server/src/scoring/*`, `e2e/audit/04-candidates-pipeline.spec.ts` |
| CV | `CandidateCv` generated from `resumeText` (structured sections, versioned, printable) | `server/src/agentic/cv-builder.ts`, `app/org/candidates/[id]/cv/page.tsx` |
| AI | Single Z.ai client with Zod validation and labelled deterministic fallback (`source: zai | deterministic`) | `server/src/ai/*`, `server/src/agentic/*` |
| Exports | Markdown, DOCX, print HTML, clipboard, SMTP send | `server/src/exports/*` |
| Analytics | Real organization-scoped counts and recent activity | `server/src/analytics/*`, `app/org/analytics/page.tsx` |
| Audit | `ActivityEvent` for decisions, applications, auto-screening | `server/prisma/schema.prisma` |
| QA | 54 headed-Chromium Playwright tests, all passing | `e2e/audit/*`, `docs/QA_REPORT.md` |

## 2. Broken / incomplete / missing (verified gaps)

| # | Gap | Current state | Required |
| --- | --- | --- | --- |
| 1 | CV file upload | Only `resumeText` paste; frontend reads `.txt/.eml/.md` into a textarea. No PDF/DOC/DOCX upload, drag-drop, progress, retry, cancel, duplicate detection | Full upload pipeline with validation and storage |
| 2 | Cloudflare R2 | Not integrated. No bucket, object keys, metadata table, presigned URLs, retention or deletion | Private R2 bucket + `CandidateDocument` metadata |
| 3 | Async processing | All AI work runs inline in request handlers. No queue, statuses, retries, timeouts, idempotency, or SSE/WebSocket | Durable background workers + real-time status |
| 4 | Structured CV parsing | `CandidateCv` is generated from already-typed resume text; no extraction from documents into profile entities | Personal/professional/skills/education/project entities with evidence references |
| 5 | Multi-agent AI | One generic Z.ai client, no specialized agents, no `AgentExecution` records, no per-agent schemas/status | 8 agents with validated outputs and execution audit |
| 6 | Transparent weighted scoring | Score = matched-requirement count; no configurable weights, breakdown, or recruiter override | Weighted model with version, breakdown, override |
| 7 | Shortlisting | No shortlist entity, approval, or export | Human-approved shortlists with evidence |
| 8 | Interviews | No interview entity or scheduling | Interview records linked to applications |
| 9 | Candidate tags / merge / duplicates | Not implemented | Tags, duplicate detection, audited merge |
| 10 | Reports | Only per-letter export; no candidate/job/shortlist/pipeline/AI reports | PDF + CSV reports from real DB data |
| 11 | Rate limiting / file scanning | Not implemented | Rate limits, MIME/magic-byte validation, malware hook |
| 12 | Prompt-injection defense for CV text | System prompts are separate, but uploaded text is not sanitized or explicitly treated as untrusted beyond prompts | Explicit untrusted-input boundary and validation |
| 13 | Dashboard processing metrics | No CV-processing/agent statistics | Real DB-driven processing counters |
| 14 | Settings | No admin configuration for scoring weights/retention | Authorized settings surface |

## 3. Data-flow audit result

For every currently implemented feature, the chain `UI → API → guard → service → Prisma → response → UI state` was verified by browser tests. No fake rows, hardcoded metrics, or local-only mutations were found in the audited flows. The gaps above are **absent features**, not broken implementations.

The only illustrative content is on the public landing page, explicitly labelled “Illustrative preview — not live data.”

## 4. Database changes required (migration plan)

Add, without removing existing working tables:

- `CandidateDocument` (candidateId, objectKey, bucket, mimeType, sizeBytes, sha256, status, timestamps)
- `ProcessingJob` (documentId, type, status, attempts, nextRunAt, idempotencyKey, error, timestamps)
- `AgentExecution` (processingJobId, agentKey, model, promptVersion, status, inputRef, validatedOutput, error)
- `CandidateProfile`, `CandidateSkill`, `EmploymentHistory`, `Education`, `Certification`, `Project`
- `JobRequirement` (jobId, text, kind, weight) and `ScoringConfig` (version, weights, updatedBy)
- `JobMatch` (applicationId, jobId, score, breakdown JSON, methodologyVersion)
- `CandidateEvaluation` (applicationId, agentExecutionId, report JSON)
- `Shortlist` + `ShortlistEntry` (approvedBy, approvedAt)
- `Interview` (applicationId, scheduledAt, stage, notes)
- `RecruiterTag`, `CandidateActivity`, `AuditLog` extension

Constraints: one candidate → many documents/versions; one application → many matches/evaluations/interviews; unique `(status, idempotencyKey)` on processing jobs; foreign keys with cascade where appropriate; indexes on tenant, candidate, job, status and timestamps.

## 5. Exact external configuration needed (names only — no secrets)

| Purpose | Variables |
| --- | --- |
| Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` |
| Queue (BullMQ/Redis) | `REDIS_URL` |
| LangGraph / LangSmith | `LANGSMITH_API_KEY`, `LANGCHAIN_PROJECT`, `LANGGRAPH_DEPLOYMENT_URL` (if using deployed graphs) |
| Model providers | `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`; existing `ZAI_API_KEY`, `ZAI_MODEL`, `ZAI_BASE_URL` |
| Database | Existing `DATABASE_URL` (SQLite locally; migrate to Postgres if R2 + workers run remotely) |
| Notifications | Existing `SMTP_*`, `NOTIFICATIONS_ENABLED` |

**Blockers:** no R2 credentials, no Redis URL, no LangSmith/model key beyond the existing Z.ai key were provided. Implementing R2 storage or LangGraph orchestration now would require inventing successful results, which this audit explicitly refuses to do.

## 6. Framework fit for the requested skills

- `@langchain-fundamentals` / `@langchain-rag` / `@langgraph-cli`: designed for LangChain/LangGraph agents. This repo is NestJS + Next.js. Adoption requires either a new TypeScript worker service (graph definitions + `langgraph.json`) or calling deployed graphs over HTTP from NestJS. Not installable into the current app without choosing a model provider and deployment target.
- `@agents-sdk`: Cloudflare Agents SDK requires a Workers/Durable Objects project with `wrangler.jsonc`, not the current NestJS server.
- `@shadcn`: already used throughout the app (`components/ui/*`). The landing page was rebuilt with existing shadcn primitives.

## 7. Phased implementation plan (blocked items marked)

| Phase | Work | Status |
| --- | --- | --- |
| 1 | Audit (this document) + green regression suite (54/54) | DONE |
| 2 | Prisma entities, indexes, safe local migration | READY — no external credentials |
| 3 | CV upload API (PDF/DOC/DOCX), validation, metadata table | READY locally; R2 storage BLOCKED on R2 vars |
| 4 | Async processing workers + statuses + SSE | BLOCKED on Redis URL (or use SQLite queue after decision) |
| 5 | 8 LangGraph agents + validated outputs | BLOCKED on model key / LangGraph deployment choice |
| 6 | Weighted scoring + overrides + job requirements | READY — logic can use existing Z.ai fallback |
| 7 | Shortlisting, interviews, pipeline upgrades | READY |
| 8 | Dashboard processing stats + reports (PDF/CSV) | READY |
| 9 | Security hardening, rate limits, prompt-injection boundary | READY |
| 10 | Browser E2E for all new scenarios | READY after implementation |

## 8. Decision required

To continue with phases 3–5 as real integrations, provide either:

1. The R2/Redis/LangSmith/model variables above (values kept only in `.env`, never committed), **or**
2. Explicit approval to implement phases 2, 6–10 first using the existing deterministic engine, with R2/agent phases deferred and documented as blocked.

No phase will be marked complete without working code, real persistence, and passing browser tests.
