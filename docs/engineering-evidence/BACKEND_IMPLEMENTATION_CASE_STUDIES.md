# Backend Implementation Case Studies

All entries describe work performed in this session. The user supplied requirements and decisions; the coding agent generated the implementation. This distinction is explicit.

---

## CS-01 — Quote-grounded evidence extraction with an AI-provider fallback

**Selected as the strongest case study** because it combines backend design, data consistency, external integration, a debugging difficulty and a trust-critical business rule.

1. **What the user requested:** "Make it trustworthy" and match evidence extracted from emails to the job. The user also chose to use the provided Z.ai key for AI features.
2. **Codebase before the work:** bare Next.js scaffold, no backend, no database, no schema.
3. **Investigation required:** Context7 docs for NestJS/Prisma; direct API probe of the Z.ai key; reading the email parser and Prisma generated client to decide where validation belongs.
4. **Implementation plan created:** parse emails → call AI per email → validate each returned quote against the source → persist accepted evidence with offsets → allow approval → generate a letter from approved evidence only.
5. **What the agent implemented:** `evidence.service.ts`, `evidence.validator.ts`, `zai.client.ts`, `prompts.ts`, `deterministic.ts`, `letter.service.ts`, `letter.validator.ts`, plus `Evidence.source` and `CoverLetter.source` schema fields.
6. **Backend files changed:** `server/src/evidence/*`, `server/src/ai/*`, `server/src/letter/*`, `server/prisma/schema.prisma`.
7. **Database/API changes:** added `source`, `verbatimQuote`, `charStart`, `charEnd`, `rawResponse` to `Evidence`; added claim rows linked to letters; added extract/review/generate endpoints.
8. **Problems encountered:** the Z.ai key returned 429/1113 (no balance), so no AI content could be verified. An early unit test also showed that the letter validator treated generic sentences as ungrounded.
9. **Investigation and resolution:** the API error body identified a billing problem, not a code defect. Added a deterministic extractor/letter writer that selects exact lines from the email body so the quote rule still holds, and persisted `source` so fallback output is never mistaken for AI output. Fixed the validator so only invalid evidence references are flagged.
10. **How the user reviewed it:** the user did not review code line-by-line in this session. Review happened through the agent's builds, the unit test failure and the end-to-end verification result, which are recorded here rather than attributed to the user.
11. **Tests executed:** `npm test -- --runInBand` (10 tests passed after fix); `npx ts-node scripts/verify-demo.ts` (`PASS`, 9 evidence items, 8 claims).
12. **What was verified:** every stored quote is a substring of its source email; claim ids resolve to approved evidence; 9 evidence items and 8 claims were produced; four export channels returned non-empty artifacts.

**How agent assistance reduced work:** the agent generated the schema, services, validators, prompts, tests and verification script from one agreed contract, then used the failing test and the API error to locate both defects without a manual bisect. No time-savings figure is claimed.

---

## CS-02 — JWT authentication and per-resource ownership

1. **What the user requested:** auth and database in v1; later, use NestJS as backend.
2. **Codebase before:** no auth, no users table, no guards.
3. **Investigation:** Context7 NestJS passport/JWT and Prisma module patterns; decided on JWT cookies in NestJS instead of Better Auth (AD-003).
4. **Plan:** users with bcrypt hashes; login/register set httpOnly JWT cookie; guard all application routes; check ownership in service methods before returning or mutating data.
5. **Agent implemented:** `auth.module.ts`, `auth.service.ts`, `auth.controller.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`, `current-user.decorator.ts`, `prisma.service.ts` with Prisma 7 driver adapter.
6. **Backend files:** listed above, plus `PrismaModule` imports in all dependent modules.
7. **Database/API:** added `User`, cascade relations from `Application.userId`, and four auth routes.
8. **Problems:** startup crashed twice with `UnknownDependenciesException` (PrismaService in AuthModule, ZaiClient in EvidenceModule).
9. **Resolution:** imported the exporting modules (`PrismaModule`, `AiModule`) into every module that injected their providers; application started and mapped all routes.
10. **Review:** via build/startup output; no user code review in this session.
11. **Tests:** login was exercised by the end-to-end script; guard behaviour was not separately tested.
12. **Verified:** seeded login succeeded and the cookie was reused for subsequent authenticated requests.

**How agent assistance reduced work:** the agent produced the full auth module set and then diagnosed both DI failures directly from NestJS's error messages, which named the missing providers.

---

## CS-03 — Environment failures: database and build output

1. **What the user requested:** a demonstrable workflow.
2. **Problems:** Postgres P1000, Docker daemon stopping, `dist/main.js` missing, generated Prisma client missing at runtime, port 3001 conflict, root build type-checking the backend tree.
3. **Resolution:** Docker Postgres on 5433 as an interim fix; then SQLite driver adapter for deterministic local runs; start script changed to `dist/src/main.js`; build script copies `generated/` into `dist/generated/`; API moved to port 3002; `server` excluded from root tsconfig.
4. **Verified:** `prisma db push` and seed succeeded; API started; frontend build succeeded; all five routes returned 200.
5. **Remaining:** original Postgres credentials and real SMTP delivery remain unverified.

**How agent assistance reduced work:** each failure was diagnosed from an exact command output and fixed with a targeted change, and every fix was recorded in `BUG_AND_DEBUGGING_LOG.md` with the reproduction steps.

---

## CS-04 — Multi-tenant candidate ranking (SaaS expansion)

1. **What the user requested:** an AI job portal that organizations can use to sort candidates, with strict tenant isolation, while keeping the existing candidate-facing workflow.
2. **Codebase before:** single-user workflow with `Application` as the only domain aggregate; no organizations, jobs or candidates.
3. **Investigation:** reviewed the existing Prisma schema and auth guard to decide where tenant context belongs; chose a cookie-backed active organization validated on each request.
4. **Plan:** add organization and membership models; scope jobs and candidates by organization; add scoring that matches requirements to exact resume sentences; verify cross-tenant access is denied.
5. **Agent implemented:** `OrgGuard`, organizations/jobs/candidates/scoring modules, `scoreDeterministic`, Z.ai-first scoring with labelled source, four org pages and an org switcher.
6. **Backend files:** `server/src/organizations/*`, `server/src/jobs/*`, `server/src/candidates/*`, `server/src/scoring/*`, `server/prisma/schema.prisma`.
7. **Database/API:** 7 new models with indexes and unique constraints; 15 new routes.
8. **Problems:** a Jest haste collision from the copied generated client; a Next.js Cache Components prerender failure caused by `usePathname()` in a client layout.
9. **Resolution:** ignored `dist/` in Jest; removed the unnecessary hook.
10. **Review:** via compiler/build/test feedback; no user line-by-line review or PR.
11. **Tests:** 13 unit tests (including `test/scoring.spec.ts`); `verify-saas.ts` PASS.
12. **Verified:** top candidate scored 80%, 10 quotes verified against resumes at exact offsets, and a foreign-org request returned 404.

**Agent acceleration:** the agent produced the schema, guards, four modules and four pages from the agreed tenancy rule, then verified isolation automatically rather than requiring manual cross-user checks.

## CS-05 — Six full-stack SaaS features in one expansion

1. **What the user requested:** more use cases and features in depth, with all remaining gaps fixed; full stack with tests.
2. **Codebase before:** org-scoped jobs/candidates/ranking existed, but no pipeline, roles, search, analytics, public apply or notifications.
3. **Investigation:** reviewed the existing Prisma schema and org guard; chose to extend them rather than create a second authorization system.
4. **Plan:** four new backend modules, two new guards/decorators, five new pages, one verification script covering all six features.
5. **Agent implemented:** pipeline with notes/timeline/notification queue, RolesGuard with invitations, candidate search, analytics, public apply form flow, and the corresponding shadcn pages.
6. **Backend files:** `server/src/pipeline/*`, `server/src/teams/*`, `server/src/analytics/*`, `server/src/public-apply/*`, `server/src/organizations/roles.ts`, schema changes.
7. **Database/API:** 4 new models and 4 fields; 15 new routes.
8. **Problems:** Prisma refused a destructive push and blocked the agent from forcing it; two methods returned unresolved Promises; a page imported `Textarea` from the wrong module.
9. **Resolution:** changed the schema to avoid data loss instead of resetting; awaited the promises; corrected the import.
10. **Review:** build/test/HTTP verification feedback; no user line-by-line review or PR.
11. **Tests:** 18 unit tests; `verify-expansion.ts` PASS.
12. **Verified:** stages, notes, timeline, queued notifications, bulk moves, search/filter, analytics, 403 denial for VIEWER, and public application creation.

**Agent acceleration:** the agent generated the modules, DTOs, guards, pages and verification script from one agreed feature list, then used the script to prove each feature rather than relying on manual clicking.

## Project selection reasoning

CS-01 was selected over the larger auth or frontend work because it contains the product's defining constraint (no invented evidence), an external integration that actually failed, a labelled fallback, and automated verification of both properties. The frontend has more files but no comparable trust-critical logic.
