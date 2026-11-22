# Workflow gap audit — 2026-11-22

Scope: every change in the current SaaS build was checked for an end-to-end workflow,
not just a schema field or an API endpoint. Findings are based on reading the running
source (`server/src/**`, `server/prisma/schema.prisma`, `app/**`, `lib/api.ts`) and the
existing `verify-all-flows.ts` record. No feature is counted as built because a column
exists.

## Verified as real workflows already

- Auth (register/login/logout/me), tenant switching, membership roles.
- Candidate-facing email → quoted evidence → grounded cover letter → 4 exports.
- AI candidate scoring with exact-quote verification and a labelled deterministic fallback.
- Hiring pipeline stage/rating/notes/timeline/bulk stage, team invitations, analytics,
  search, and cross-tenant guards.

## Gaps found (field or endpoint without a usable workflow)

| # | Gap | Evidence | Fix in this pass |
|---|-----|----------|------------------|
| G1 | `JobPost.status` is never changed. Public apply checks it, but no endpoint or UI can close/reopen a job. | `JobsService` has no status update; every seeded/created job stays `open`. | `PATCH /jobs/:id/status` + close/reopen buttons in the Jobs UI. |
| G2 | `CandidateApplication.status` is dead. It defaults to `new` and is shown as a badge, but nothing writes it. | `CandidatesService.ranking` returns `status`; no write path. | Decision workflow writes `status` (`offer_sent`/`rejected`/`hired`) and the UI shows it. |
| G3 | No hire decision and no meaningful notification. Stages stop at `offer`/`rejected`; every stage change sends the same generic "moved to X stage" message. | `PIPELINE_STAGES` ends at `rejected`; `PipelineService.updateStage` builds one generic body. | `POST /pipeline/applications/:id/decision` with offer/reject/hire, tailored message, activity event and `NotificationLog` entry (SMTP when enabled). |
| G4 | `GET /pipeline/notifications` exists in `lib/api.ts` but has no page or nav link. | API client line ~226; no `app/org/notifications`. | Notifications page + nav link. |
| G5 | `publicToken` is generated but the apply page is a blind form: applicants cannot see the job they are applying to. | `PublicApplyController` has only `POST apply/:token`. | `GET /public/jobs/:token` and a public job header on the apply page, including a closed-job state. |
| G6 | No AI job-post authoring. Jobs require a fully written description and requirements. | `CreateJobDto` manual only; `ZaiClient` unused in `JobsModule`. | `POST /jobs/generate` drafts title/description/requirements from a short brief, with deterministic fallback and a visible `source`. |
| G7 | No "nice CV". Raw resume text is rendered in a `<pre>`; there is no structured CV, no generation, no version, no printable view. | `app/org/candidates/[id]/page.tsx` renders `resumeText` directly. | `CandidateCv` records, `POST /candidates/:id/cv/generate`, `GET` via candidate detail, and a printable `/org/candidates/[id]/cv` page. |
| G8 | Candidate detail manages only `applications[0]`, so a candidate applied to several jobs cannot be managed per application. | `record.applications[0]` used for stage, notes and timeline. | Per-application selector on candidate detail. |

## Design rules applied to the fixes

- Reuse existing fields (`status`, `stage`, `rating`, `NotificationLog`, `ActivityEvent`)
  before adding new ones. The only new table is `CandidateCv`, which is required to
  persist generated CV versions and is immediately backed by generate/view/print flows.
- Every AI path keeps a `source` (`zai` or `deterministic`) and falls back safely when the
  provider is unavailable; generated claims stay traceable to the source resume.
- Every new endpoint is org-scoped through `OrgGuard` (or a public token), and the
  verification script asserts cross-tenant 404s for the new private endpoints.

## Post-fix verification

Run from `server/`: `npm test`, `npm run build`, then with the API running
`npx ts-node scripts/verify-all-flows.ts`. Run from the repo root: `npm run lint`,
`npm run build`. Results are recorded in `TESTING_AND_VERIFICATION_LOG.md`.
