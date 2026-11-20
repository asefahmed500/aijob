# aijob — Product Requirements (as built)

## Problem
Job applications are written from memory and generic templates. The result is unverifiable: a cover letter can claim anything. aijob makes the letter traceable to the emails the candidate already has.

## Core workflow (built first)
1. **Email** — paste text or upload `.txt`/`.eml`; parse headers and body; store raw and normalized text.
2. **Evidence** — extract claims from each email. A claim is stored only if its `verbatimQuote` is an exact substring of the source email's normalized body. Otherwise it is rejected. The user approves or rejects each item.
3. **Cover letter** — generate from approved evidence only. Each factual sentence carries an evidence id; invalid references are flagged. Version history is retained.
4. **Export** — Markdown, DOCX, print-to-PDF HTML, clipboard text, SMTP email with DOCX attachment. Every generation and send is logged.

## Non-goals for this milestone
No live IMAP inbox sync, no multi-tenant organisations, no collaborative editing, no public sharing, no production deployment.

## Users and authorization
One user owns many applications. Every endpoint that touches an application or a child record checks ownership against the authenticated user; a foreign id returns 404, never another user's data.

## Technical shape
- Frontend: Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui.
- Backend: NestJS 12 REST API with JWT auth (httpOnly cookie), Prisma 7 ORM.
- Database: SQLite locally for deterministic verification; Prisma schema is provider-swappable.
- AI: Z.ai OpenAI-compatible chat completions, backend-only, with a clearly labelled deterministic fallback when the provider is unavailable. The fallback still obeys the quote-verification rule.

## Acceptance criteria
- Email quote verification holds for every stored evidence item.
- Letter claims reference only approved evidence.
- All four file/text export channels produce non-empty artifacts and SMTP send is logged.
- Automated checks: Jest unit tests plus a scripted end-to-end demo (`server/scripts/verify-demo.ts`).
- README documents local setup and demo credentials.

## Known limitations
The provided Z.ai key returned HTTP 429 "Insufficient balance" during verification, so AI-generated content was not verified; the deterministic fallback was exercised instead. The original Postgres credentials were invalid, so local verification used SQLite. SMTP sending code exists but was not executed against a real recipient.
