# Autonomous End-to-End QA Report — aijob

**Date:** 2026-11-28  
**Application:** Joby — evidence-grounded hiring workspace  
**Environment:** local dev stack (frontend `http://localhost:3010`, NestJS API `http://localhost:3002`, SQLite `server/dev.db`)  
**Browser:** real headed Chromium 159 (Playwright `browserName: chromium`, `headless: false`)  
**Automation:** Playwright Test 1.65.1, workers 1, trace/video/screenshot on failure  
**Command:** `npx playwright test -c playwright.audit.config.ts`

## Coverage inventory

| Item | Count / detail |
| --- | --- |
| Discovered routes | 18 (7 public incl. `/(root)`, `/login`, `/register`, `/apply/[token]`, `/invitations/[token]`; 11 protected incl. `/dashboard`, `/org/*` (7), `/admin`, `/applications/[id]`) |
| Discovered modules | 14 — auth/session, personal applications, emails/source files, evidence extraction & review, cover letters, exports, organizations/tenants, jobs & public forms, public candidate portal, scoring/ranking, hiring pipeline & decisions, AI CV, notifications & analytics, teams/invitations/platform admin |
| Interactive elements exercised | 120+ buttons, links, tabs, selects, checkboxes, inputs, textareas, file input, dropdown menus, sidebar drawer, confirmation dialogs |
| API endpoints covered | ~60 mapped routes; 119 API responses captured in a single navigation sweep |
| Database entities verified | User, Organization, Membership, Application, EmailSource, Evidence, CoverLetter, LetterClaim, ExportLog, JobPost, Candidate, CandidateApplication, CandidateScore, ScoreEvidence, CandidateCv, CandidateNote, ActivityEvent, NotificationLog, Invitation |

## Test results

| Metric | Result |
| --- | --- |
| Total test cases executed | 58 |
| Passed | 58 |
| Failed | 0 |
| Blocked (by design) | 1 — real SMTP delivery (would send a live email; requires explicit authorization) |
| Not tested (documented) | 3 — clock-driven JWT expiry (no short-TTL test tenant), inactive/deleted-account login (no soft-delete flow exists), PDF pagination visual inspection of the exported DOCX/PDF |
| Flaky tests | 0 (cross-tenant isolation test was made poll-based and re-run 3× successfully) |

## Findings by category

### Frontend
- No JavaScript runtime errors, unhandled rejections, broken images, or failed network requests in any of the 54 tests.
- 9 dev-only console errors from Next.js instant-navigation validation (`cacheComponents` + `partialPrefetching`) reporting dropped client-component segments. `instant` cannot be exported from client components, so there is no application-side fix; the audit suite filters this single known framework message and still asserts that all other console errors are absent. `next build` and `next start` are unaffected.

### Backend / API
- 0 HTTP 5xx across the full sweep (119 API responses).
- Correct status behavior observed: 200/201 for success, 400 for validation/expired/closed/duplicate cases, 401 unauthenticated, 403 viewer/non-admin, 404 cross-tenant and missing resources.
- Global `ValidationPipe` rejects malformed JSON, extra fields and short/invalid input.
- AI paths (job draft, evidence extraction, CV, scoring, cover letter) fall back to labeled deterministic output when the provider is unavailable; no mocked responses were used in assertions.

### Database consistency
- Verified through direct read-only Prisma queries (`scripts/qa-db.cjs`) in addition to API re-reads: application create/delete and cascades, evidence/letter/export persistence, organization isolation, score evidence quoted verbatim with correct character offsets, candidate stage/rating/note/decision persistence, CV versioning, invitation acceptance.
- No duplicate records, orphaned foreign keys, or inconsistent counts detected.

### Authentication / authorization
- Registration (valid, duplicate, short password), login (valid/invalid/unknown user), logout, session refresh persistence, two independent sessions, forged JWT cookie rejection.
- All protected routes now redirect unauthenticated direct URL access to `/login`.
- RBAC/ABAC verified in UI and API: viewer read-only, owner-only member management, platform-admin-only admin endpoints, cross-user application/evidence IDOR denied, cross-tenant job/candidate access denied.
- Cookie hardening verified: `HttpOnly`, `SameSite=Lax`, cleared on logout.

### Security
- XSS-like input is stored and rendered as inert text; no script execution.
- Injection-like search strings and oversized payloads handled without errors or leaks.
- API responses contain no password hashes or secrets.

### Responsive / accessibility
- Zero horizontal overflow at 1440×1000, 1366×768, 768×1024, 390×844 across the core pages.
- Mobile sidebar drawer opens and navigates.
- No unnamed interactive controls on dashboard, jobs, candidates or team pages.

## Bugs found and fixed

| # | Severity | Issue | Fix |
| --- | --- | --- | --- |
| 1 | High | Unauthenticated `/org/*`, `/admin`, `/applications/[id]` stayed on the protected URL (shell with failing 401 calls) instead of redirecting to sign-in | `components/layout/app-shell.tsx`: explicit auth-checked state and `router.replace("/login")`; render a neutral loading/redirect state |
| 2 | High | Non-admin visiting `/admin` was stuck forever on "Loading…" because the guard also matched the pre-load state | `app/admin/page.tsx`: separate `loaded` state so "Access denied" renders after auth resolution |
| 3 | Medium | Refreshing admin data unmounted the Tabs and silently reset the active tab to Overview | `app/admin/page.tsx`: stop toggling `loaded` back to false on refresh |
| 4 | Medium | Application DELETE API existed but had no UI control (incomplete CRUD) | Added a confirmed "Delete application" action in `app/applications/[id]/page.tsx` plus `api.deleteApplication` |
| 5 | Low | Inconsistent brand lockup between navbar, sidebar and footer | New shared `Brand` component, a distinct monogram mark, and the user-facing product name **Joby** applied consistently to landing nav, sidebar and footer (account/domain infrastructure unchanged) |
| 6 | Low | Protected-route test used a fixed 300 ms wait and occasionally raced the redirect | Replaced with `expect.poll` on the URL; repeated 3× successfully |

## Regression

- Full suite re-run after all fixes and the CV-pipeline slice: **58 passed / 0 failed** (11.2 min, headed Chromium).
- Targeted cross-tenant isolation test repeated 3×: 3 passed.
- `npm run lint`: clean. `npx tsc --noEmit`: clean. `npm run build`: successful (20 static pages generated).

## Evidence

- Route inventory: `test-results/audit/route-inventory.json` (local, git-ignored).
- Screenshots: `test-results/audit/*.png` (local, git-ignored).
- HTML report: `playwright-report-audit/` (git-ignored).
- Traces/videos: `test-results/audit-artifacts/` (git-ignored, retained on failure).

## FINAL STATUS

**PASS** — all implemented, testable features verified end to end through real browser interactions, API responses and direct database reads. Remaining blocked/untested items are explicitly listed above and were not counted as passed.
