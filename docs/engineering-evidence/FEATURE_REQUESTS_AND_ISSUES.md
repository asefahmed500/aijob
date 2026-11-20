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
- **Implementation plan:** Recorded in `docs/engineering-evidence/DATABASE_AND_API_DECISIONS.md` and the activity journal.
- **Files changed:** to be recorded as implementation proceeds.
- **Testing and outcome:** pending.

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
- **Remaining status:** original 5432 instance untouched; `NEEDS HUMAN CONFIRMATION` on whether to use it instead.
