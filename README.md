# aijob

Evidence-grounded cover letters and an AI-assisted hiring workspace. Candidates turn job-related emails into source-traceable evidence, generate a grounded cover letter and export it. Companies create isolated organizations, draft and publish jobs, score applicants against quoted resume evidence, generate structured CVs, and record offer/reject/hire decisions with candidate notifications.

## Architecture

- `app/` — Next.js 16 App Router frontend with shadcn/ui components.
- `server/` — NestJS 12 REST API (auth, applications, emails, evidence, letters, exports).
- `server/prisma/` — Prisma schema, config and seed data.
- `docs/engineering-evidence/` — verified engineering record for interview preparation.

The browser never sees AI or SMTP credentials. All external calls happen in the NestJS backend.

## End-to-end workflows

- **Candidate:** `/dashboard` → `/applications/[id]` → emails → quoted evidence → cover letter → export.
- **Employer:** `/org` (create/switch tenant) → `/org/jobs` (AI draft, create, publish, close/reopen) → public `/apply/[token]` → `/org/jobs/[id]` (score) → `/org/candidates/[id]` (CV, stage, decision) → `/org/candidates/[id]/cv` (print) → `/org/notifications` (message audit).
- **Public form:** while creating a job, add Google-Forms-style questions (short text, long text, URL; required or optional), set a link expiry date/time, and choose automatic AI screening. The generated public link can be copied and sent to candidates. `PATCH /jobs/:id/form` updates the questions, expiry or screening switch later. An expired link shows a clear state and rejects submissions. Required answers are validated server-side. Every answer is stored on the application, shown on the candidate detail page, and included verbatim in the scorer's source text, so evidence quotes remain traceable. Screening runs on submission by default but a failure never blocks the application.
- **Platform admin:** `/admin` → cross-tenant overview, organization list, user platform roles and audit log.
- Every AI record stores `source` (`zai` or `deterministic`). Scores, evidence and CV items must be verbatim substrings of the source text.
- Signed-in pages share an app shell built with shadcn `Sidebar`: grouped workspace/personal/admin navigation, organization switcher, breadcrumb topbar, role badge and user menu. Links and quick actions are limited by the active role; viewers see a read-only shell.
- Buttons come from one shadcn `Button` with `default/primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`, `soft` and icon sizes, consistent min-widths, compact radius, hover/press/focus transitions, inline-end arrow motion and a `loading` prop that renders a spinner, sets `aria-busy` and blocks duplicate submissions.

The gap audit that drove these workflows is recorded in `docs/engineering-evidence/WORKFLOW_GAP_AUDIT.md`.

## Local setup

Prerequisites: Node.js 20+, npm. The backend uses SQLite locally, so no external database is required.

```bash
# frontend
npm install

# backend
cd server
npm install
cp ../.env .env
# set DATABASE_URL="file:./dev.db" in server/.env
npx prisma db push
npx prisma generate
npx ts-node prisma/seed.ts
npm run build
npm run start          # API on http://localhost:3002
```

In a second terminal:

```bash
npm run dev            # frontend on http://localhost:3000 (or next free port)
```

Demo logins (seeded by `prisma/seed.ts`):

- Candidate/recruiter owner: `demo@aijob.local` / `demo12345`
- Platform admin: `admin@aijob.local` / `admin12345`

Platform admins can read across tenants at `/admin`; organization roles are `OWNER`, `RECRUITER` and `VIEWER`. All org-scoped mutating endpoints are guarded by RBAC + ABAC policies; viewers are read-only.

## Verification

```bash
cd server
npm test                       # unit tests for parser, validators and deterministic AI helpers
npx ts-node scripts/verify-demo.ts   # end-to-end HTTP check over seeded data
npx ts-node scripts/verify-all-flows.ts  # full SaaS + agentic flow audit (needs the API running)
npx ts-node scripts/verify-portal.ts     # public form, expiry and auto-screening audit
```

`verify-demo.ts` asserts that every evidence quote exists in its source email, that letter claims reference valid evidence ids, and that all four export channels return non-empty artifacts. `verify-all-flows.ts` also checks AI job drafts, job status changes, public job detail, CV versions, offer/reject/hire decisions, notifications and cross-tenant isolation. `verify-portal.ts` checks custom form validation, user-set link expiry, automatic screening that quotes form answers, stored answers on candidate detail, and disabling the screening switch.

## Configuration

Secrets live in git-ignored `.env` files. Relevant variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `ZAI_API_KEY` (or `NEXT_ZAI_API_kEY`), `ZAI_MODEL`, `ZAI_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`, `NOTIFICATIONS_ENABLED`.

Candidate notifications are always recorded in `NotificationLog`. Set `NOTIFICATIONS_ENABLED=true` together with valid SMTP credentials to actually deliver them.

If the configured Z.ai key is invalid or has no balance, extraction and generation automatically use a deterministic fallback. Each record stores its `source` so AI-generated and fallback content are distinguishable.

## Documentation

Start with `docs/engineering-evidence/PROJECT_TECHNICAL_OVERVIEW.md` and end with `docs/engineering-evidence/BRILLMARK_INTERVIEW_EVIDENCE.md`.
