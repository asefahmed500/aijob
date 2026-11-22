# aijob — Product Requirements (as built)

## Problem
Job applications are written from memory and generic templates. The result is unverifiable: a cover letter can claim anything. aijob makes the letter traceable to the emails the candidate already has. On the employer side, hiring is fragmented: job posts, CVs, scoring, decisions and candidate messages live in different tools. aijob turns each of those into one tenant-isolated workflow.

## Candidate workflow (built first)
1. **Email** — paste text or upload `.txt`/`.eml`; parse headers and body; store raw and normalized text.
2. **Evidence** — extract claims from each email. A claim is stored only if its `verbatimQuote` is an exact substring of the source email's normalized body. Otherwise it is rejected. The user approves or rejects each item.
3. **Cover letter** — generate from approved evidence only. Each factual sentence carries an evidence id; invalid references are flagged. Version history is retained.
4. **Export** — Markdown, DOCX, print-to-PDF HTML, clipboard text, SMTP email with DOCX attachment. Every generation and send is logged.

## Organization (SaaS) workflows
Any company can register, create an isolated organization, invite teammates and switch tenants from the UI.

1. **Job post** — write manually or draft with AI from a short brief (`POST /jobs/generate`). The employer reviews the draft before creating the job. Every job gets a public apply token; the employer can close or reopen it.
2. **Public apply** — candidates open the public link, read the job (title, company, description, requirements) and submit resume text. Closed jobs reject submissions.
3. **Score** — run AI candidate scoring against the job requirements. Every score stores quoted resume evidence with offsets; invalid quotes are rejected and the deterministic fallback is labelled by `source`.
4. **CV** — generate a structured, versioned CV from the candidate's resume text; view it, regenerate it and print/save it as PDF. AI-produced CV items must be verbatim substrings of the resume.
5. **Decide and notify** — record `offer`, `reject` or `hire`. This writes the application `stage` and `status`, adds an activity event to the timeline, creates a notification log entry with a decision-specific message, and sends email when SMTP is configured. The team can review all messages at `/org/notifications`.

## Trust rules
- Every AI surface stores `source` (`zai` or `deterministic`) so generated content is never confused with fallback content.
- Extracted evidence, scoring quotes and CV items must be exact substrings of their source text.
- All org-scoped endpoints resolve the active tenant from the `active_org` cookie and validate membership; foreign ids return 404.
- All decisions and notifications are auditable through `ActivityEvent` and `NotificationLog`.

## Authorization model
- **Platform role:** `USER` or `PLATFORM_ADMIN`, stored on the user and carried in the JWT. Only platform admins can access `/admin`, and they cannot demote themselves.
- **Organization role:** `OWNER`, `RECRUITER` or `VIEWER`, scoped to the active tenant. Owners manage jobs, candidates, decisions, members and roles; recruiters manage hiring work; viewers are read-only.
- **ABAC:** `RolesGuard` evaluates an `@Policy(resource, action)` decorator using attributes: subject platform/org role, active tenant, resource type/action, and self-reference for member management. Every org-scoped mutating endpoint carries a policy.
- **Visual system:** Geist Sans + Geist Mono only, 400 body / 500 subtitles / 600 headlines, tight headline tracking, antialiased font smoothing, compact radius. shadcn/ui components are used throughout; the brand asset is an icon-only mark.

## Non-goals for this milestone
No live IMAP inbox sync, no collaborative editing, no public sharing of private candidate records, no e-signature or onboarding checklist, no billing.

## Users and authorization
One user owns many applications and can belong to many organizations. Origins and roles (`OWNER`, `RECRUITER`, `VIEWER`) are enforced on every tenant-scoped request.

## Technical shape
- Frontend: Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui.
- Backend: NestJS 12 REST API with JWT auth (httpOnly cookie), Prisma 7 ORM.
- Database: SQLite locally for deterministic verification; Prisma schema is provider-swappable.
- AI: Z.ai OpenAI-compatible chat completions, backend-only, with a clearly labelled deterministic fallback when the provider is unavailable.

## Acceptance criteria
- Email quote verification holds for every stored evidence item.
- Letter claims reference only approved evidence.
- All four file/text export channels produce non-empty artifacts and SMTP send is logged.
- AI job drafts, CVs and decisions are reachable from the UI and verified by `server/scripts/verify-all-flows.ts`.
- Every new private endpoint returns 404 for a user outside the tenant.
- Jest unit tests plus a scripted end-to-end demo (`server/scripts/verify-demo.ts`, `verify-all-flows.ts`).

## Known limitations
The provided Z.ai key has returned HTTP 429 "Insufficient balance", so AI-generated content is exercised through the labelled deterministic fallback. The original Postgres credentials were invalid, so local verification uses SQLite. SMTP sending code exists but is not executed against a real recipient unless `NOTIFICATIONS_ENABLED=true` and SMTP credentials are configured.
