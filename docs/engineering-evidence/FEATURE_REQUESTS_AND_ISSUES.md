# Feature Requests and Issues

## Feature requests

### FR-001 — Core workflow: email → evidence → cover letter → export

- **Original request (user, summarized from verbatim):** "Build the complete email-to-evidence-to-cover-letter-to-export workflow first. Make it trustworthy, usable, and demonstrable. Expand the product only after that workflow is reliable."
- **Clarified acceptance criteria (confirmed by user in planning):**
  1. Evidence is matched to the job requirements found in emails.
  2. Email input in v1 is paste/upload of `.eml`/`.txt` plus built-in samples.
  3. Better Auth + Postgres were originally requested in v1; the later instruction "use nestjs as backend" changed the auth implementation location (see DATABASE_AND_API_DECISIONS.md).
  4. All five export channels: Markdown, DOCX, print-to-PDF, clipboard, SMTP email.
  5. Documentation in Markdown at every step; public GitHub repo `aijob`; each feature pushed separately.
- **Technical impact:** New frontend pages, new NestJS backend modules, new database schema, new AI integration, new export services.
- **Implementation plan:** Recorded in `DATABASE_AND_API_DECISIONS.md` and the activity journal.
- **Files changed:** `server/src/**` (auth, applications, emails, evidence, letter, ai, exports modules), `server/prisma/schema.prisma`, `app/**`, `components/ui/**`, `lib/api.ts`.
- **Testing and outcome:** 10 Jest unit tests passed; `server/scripts/verify-demo.ts` returned `PASS` with 3 emails, 9 evidence items, 8 claims and four non-empty export artifacts. SMTP send was not executed. Committed as `c663b64` and `82bff9e`.

### FR-002 — Engineering evidence documentation

- **Original request (user):** Maintain `docs/engineering-evidence/` with 10 named files, record real work only, never fabricate, produce a max-1.5-page final answer to two Brillmark interview questions.
- **Acceptance criteria:** all 10 files present; claims traceable to real files/commands; uncertain details marked `NEEDS HUMAN CONFIRMATION`; no secrets included.
- **Outcome:** in progress — this file and the other evidence documents are the deliverable.

## Issues

### ISSUE-001 — Empty product specification

- **Problem:** `prd.md` was 0 bytes at audit; no written requirements existed.
- **Severity:** Medium (blocks shared understanding, not runtime).
- **Investigation:** file size read directly from disk.
- **Resolution:** Requirements captured in FR-001 from the user's messages and planning answers. `prd.md` rewrite is pending implementation work.

### ISSUE-002 — No backend present despite configured backend credentials

- **Problem:** `.env` contained Postgres, SMTP, auth, and AI credentials, but the codebase had no backend code using them.
- **Severity:** High for the requested workflow (nothing to extend).
- **Resolution:** User instructed "use nestjs as backend". NestJS service creation is the next implementation phase.

### ISSUE-003 — TooltipProvider not yet registered

- **Problem:** shadcn CLI reported that the `tooltip` component requires wrapping the app with `TooltipProvider`; `app/layout.tsx` has not been updated for this yet.
- **Severity:** Low.
- **Resolution:** pending frontend integration work.

### ISSUE-004 — Configured Postgres credentials invalid

- **Problem:** `npx prisma db push` failed with P1000 authentication error against the configured `localhost:5432` instance.
- **Severity:** High (blocked all persistence work).
- **Investigation:** port open but credentials rejected; Docker daemon initially unavailable.
- **Resolution:** Started Docker Desktop, launched `aijob-postgres` (postgres:16-alpine) on host port 5433 with known credentials, pointed git-ignored `server/.env` at it, and successfully ran `prisma db push`. Details in `BUG_AND_DEBUGGING_LOG.md` BUG-001.
- **Remaining status:** original 5432 instance untouched; `NEEDS HUMAN CONFIRMATION` on whether to use it instead. Docker daemon later stopped and caused ECONNREFUSED, so the local runtime moved to SQLite (AD-002).

### ISSUE-005 — Z.ai key has no balance

- **Problem:** HTTP 429, code 1113, "Insufficient balance or no resource package".
- **Severity:** High for AI features; the rest of the workflow remains usable.
- **Resolution:** labelled deterministic fallback added to extraction and generation; persisted `source` distinguishes fallback from AI output. `NEEDS HUMAN CONFIRMATION` whether the key will be recharged.

### ISSUE-006 — No real pull requests

- **Problem:** the repository had no remote at audit; no PR existed.
- **Severity:** Low (documentation accuracy).
- **Resolution:** public GitHub repo created and commits pushed directly to `master`. `CODE_REVIEW_AND_PR_HISTORY.md` states explicitly that these were pushes, not PRs.

### ISSUE-007 — SMTP delivery unverified

- **Problem:** `POST /applications/:id/export/send` is implemented but was deliberately not called against a real recipient.
- **Severity:** Medium for the "five export channels" claim.
- **Resolution:** route mapped and code reviewed; `NEEDS HUMAN CONFIRMATION` for a live send test.

### FR-003 — Multi-tenant SaaS job portal with candidate ranking

- **Original request (user):** "this will be ai job portal every org can use it to sort their candidates ... it will be a saas".
- **Accepted criteria (user answers):** organizations as isolated tenants; AI score with quoted evidence; keep the candidate-facing workflow; build backend and pages.
- **Technical impact:** 7 new Prisma models, 4 new NestJS modules, 15 new routes, 4 new pages, org switcher and tenant guards.
- **Files changed:** `server/prisma/schema.prisma`, `server/src/organizations/**`, `server/src/jobs/**`, `server/src/candidates/**`, `server/src/scoring/**`, `server/scripts/verify-saas.ts`, `app/org/**`, `lib/api.ts`.
- **Testing and outcome:** 13 unit tests passed; `verify-saas.ts` PASS with 3 candidates ranked, top score 80, 10 verified evidence quotes and a cross-org 404 check.
