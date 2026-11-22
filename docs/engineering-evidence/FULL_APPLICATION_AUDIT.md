# Full application audit — 2026-11-22

Method: real execution against the running API (`localhost:3002`) and a production
Next.js build (`localhost:3010`), using seeded demo accounts plus freshly created
isolated test tenants. Nothing is marked PASS because it merely compiles or renders.

## 1. Module-by-module audit

| Module | Status | Evidence |
|---|---|---|
| Auth: register / login / logout / `/auth/me` | PASS | `verify-all-flows` + Playwright `auth.spec.ts`; 6/6 E2E pass |
| Auth: expired JWT, weak password, invalid email, wrong password | PASS | `verify-comprehensive.ts`: 401/400/400/401 |
| Auth: duplicate email, session cookie, 24h JWT expiry | PASS | `verify-all-flows`; `auth.module.ts` `expiresIn: 24h`, cookie maxAge 24h |
| Auth: password reset / account verification / account status | NOT IMPLEMENTED | No endpoints, DTOs or DB fields exist; see blockers |
| Organizations: create / switch / members / isolation | PASS | `verify-all-flows`, `verify-saas` cross-org isolation |
| Role & ABAC: OWNER / RECRUITER / VIEWER / PLATFORM_ADMIN | PASS | `verify-comprehensive`: 6 viewer mutations → 403; 5 cross-tenant attempts → 404; admin 200 vs owner 403 |
| Jobs: create / read / status / delete / public token | PASS | `verify-all-flows` close→reopen; `verify-comprehensive` closed-job apply → 400 |
| Candidates: create / search / filter / sort / apply / bulk | PASS | `verify-expansion`, `verify-all-flows`, `verify-demo` |
| Pipeline: stage / rating / notes / timeline / bulk | PASS | `verify-expansion` (4 notes, 12 timeline events, 2 bulk updates) |
| Decisions: offer / reject / hire + notification | PASS | `verify-comprehensive`: ranking → hire → status `hired` → log body with custom message |
| Notifications page | PASS | Playwright asserts "Offer for" message on `/org/notifications` |
| Notifications: live SMTP delivery | BLOCKED | `NOTIFICATIONS_ENABLED` unset, no SMTP credentials; log status `queued` |
| Cover-letter workflow: email → evidence → letter → 4 exports | PASS | `verify-demo`: 3 emails, 27 evidence, 8 claims, markdown/DOCX/print/clipboard non-empty |
| AI: job-post drafting | PASS | `verify-comprehensive`: source label, brief marker preserved, created job inherits source |
| AI: evidence extraction | PASS | All stored quotes are exact substrings of normalized source bodies |
| AI: letter generation | PASS | All cited evidence ids are in the approved set; non-factual claims have null id |
| AI: candidate scoring | PASS | `resume.slice(charStart, charEnd) === quote` for every evidence |
| AI: CV generation | PASS | Every item verbatim in resume; versions increment v1→v2; E2E generates CV and opens printable page |
| AI provider Z.ai live responses | BLOCKED | HTTP 429 "insufficient balance"; labelled deterministic fallback verified instead |
| Platform admin: overview / orgs / users / audit / role change | PASS | `verify-all-flows`; browser verified tabs and user table |
| Teams: invite / accept / remove / role change | PASS | `verify-all-flows`, `verify-expansion` |
| Public apply: job detail + submit + closed-job guard | PASS | `verify-all-flows`, `verify-comprehensive` |
| Landing page, app shell sidebar, role-aware nav | PASS | Playwright desktop + 390×844 mobile, no horizontal overflow, sidebar toggle usable |
| Buttons: variants, loading, disabled, focus, micro-interactions | PASS | `npm run lint`, build; browser computed style: min-width 112px, 200ms transition, 6px radius |
| Pagination | NOT IMPLEMENTED | List endpoints return full sets; acceptable at current data size, see blockers |

## 2. Bugs found and fixed

1. **Sidebar dropdowns crashed the page** — `DropdownMenuLabel`/`DropdownMenuItem` were
   outside `DropdownMenuGroup`; Base UI error #31 ("MenuGroupContext is missing") was
   thrown on click, producing "This page couldn't load". All menu items are now grouped;
   E2E registration/logout test passes.
2. **CORS rejected the alternate E2E origin** — default allowed origins only covered
   3000/3001, so browser requests from 3010 failed. Added 3010 to the default allowlist
   in `server/src/main.ts`.
3. **E2E CV test had no application** — a newly created candidate had no application, so
   the decision controls were correctly hidden. Test now applies the candidate to a job
   first; this is a test fix, not a product change.
4. **Over-strict audit assertion** — greeting/closing claims are intentionally grounded
   with `evidenceId: null`; the check now validates only claims that cite evidence.
5. `next build` run while `next dev` was serving shared `.next` killed the dev process;
   E2E now runs against a production build on a dedicated port.

## 3. Auth / authorization test results

PASS: register, login, wrong password, duplicate email, logout, protected route redirect,
expired token, weak password/email validation, viewer read-only, cross-tenant 404,
platform-admin-only endpoints, self-demotion guard.
NOT IMPLEMENTED: password reset, email verification, account status/suspension.

## 4. API and database verification

PASS: every documented endpoint exercised with valid and invalid input; `forbidNonWhitelisted`
rejects unknown fields; Prisma relations enforce cascades; unique `[jobId, candidateId]`
prevents duplicate applications; score offsets and quote text verified against source;
all org-scoped records filtered by `organizationId`; CV versions persisted.
BLOCKED: PostgreSQL (original credentials invalid; SQLite used locally).
NOT TESTED: database-level concurrency under load, migration history (schema uses `db push`).

## 5. AI feature testing

PASS: job draft, evidence extraction, letter generation, scoring, CV generation — all
produced real persisted records with `source` labels and quote verification. Failure path
exercised: provider unavailable → deterministic fallback with traceable content.
BLOCKED: live Z.ai model connectivity (429 insufficient balance).
NOT TESTED: streaming, RAG, embeddings, conversation history — the product has no such
features; they were not fabricated for this audit.

## 6. End-to-end workflow testing

PASS: candidate email→cover letter→exports; employer job→public apply→score→CV→decision→
notification; persistence after navigation and re-login (Playwright); cross-module data
flow (job appears in ranking, decision appears in notification log).
BLOCKED: email delivery (no SMTP transport).

## 7. Security and performance findings

- PASS: JWT expiry, httpOnly cookie, CORS allowlist, class-validator whitelist,
  Prisma parameterized queries (no raw SQL), React escaping (XSS), tenant guards (IDOR),
  role/ABAC guards (privilege escalation), no secrets in client bundle.
- FINDING: no rate limiting on auth or AI endpoints (`express-rate-limit` not present).
- FINDING: `GET /candidates/search` materializes all candidates and filters in memory;
  no pagination on list endpoints. Fine for demo data, needs indexes/pagination at scale.
- FINDING: `sameSite: lax` cookie plus strict CORS mitigates CSRF, but no CSRF token.
- No SQL injection, hardcoded success states, mock API responses or placeholder features
  were found in the audited flows.

## 8. Remaining blockers / unresolved

| Item | Status | Reason |
|---|---|---|
| Z.ai live AI | BLOCKED | External account has no balance; fallback verified |
| Live SMTP | BLOCKED | No credentials / opt-in flag |
| PostgreSQL | BLOCKED | Provided credentials invalid; SQLite used |
| Password reset / email verification | NOT IMPLEMENTED | Requires a working mail transport |
| Rate limiting, CSRF token, pagination | OPEN | Security/scale hardening, not present |

## 9. Production-readiness assessment

The implemented feature set is functionally complete and verified: 23 Jest tests, 6
Playwright E2E tests and five shell suites all pass (18/18, 14/14, plus demo/saas/expansion
PASS). Authorization, tenant isolation, AI traceability and persistence are demonstrated
with real data. It is **not** yet production-ready in the full operational sense: live AI
and email depend on external credentials, password recovery is absent, and rate limiting/
pagination/CSRF hardening remain open. These are external dependencies or hardening
items, not hidden functional bugs in the implemented workflows.
