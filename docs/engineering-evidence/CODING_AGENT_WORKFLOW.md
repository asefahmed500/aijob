# Coding Agent Workflow (observed, not idealized)

This document records the workflow actually followed in this session. Nothing is claimed that did not occur.

## A. Requirement Understanding

- The user supplied the core workflow brief and later the evidence-document brief. The agent asked four targeted questions; the user answered: match evidence to the job; paste/upload input plus samples; auth and database in v1; all five export formats; repo name `aijob`.
- `prd.md` was empty, so requirements were written down from the user's messages rather than invented, then committed as `prd.md`.
- Ambiguity handled: the later instruction "use nestjs as backend" superseded the earlier plan that used Next.js route handlers. This is recorded as AD-003.
- Edge cases identified: quoted email replies, paraphrased evidence quotes, malformed AI JSON, invalid AI key balance, cross-user id access.

## B. Codebase Investigation

- Full tracked-file listing, reads of configuration and page files, `npx shadcn@latest info --json`, infrastructure probes.
- Result: established that there was no backend, database, auth or test infrastructure. This prevented falsely attributing features to prior work.
- Library APIs were checked with Context7 (NestJS 12 JWT/passport/Prisma module patterns; Prisma 7 config and driver adapters) rather than guessed from memory.

## C. Implementation Planning

- A plan was presented in conversation before product code was written. The user switched out of planning mode and instructed the agent to proceed with NestJS and continuous documentation.
- Affected areas were identified: frontend pages, backend modules, Prisma schema, JWT auth, Z.ai client, exporters, tests.
- Per-feature git commits were used instead of pull requests because the repo had no remote until the end; this is stated in `CODE_REVIEW_AND_PR_HISTORY.md`.

## D. Backend Implementation

Real files and operations:

- **Schema:** `server/prisma/schema.prisma` — 7 models with cascade deletes and indexes; `server/prisma.config.ts` for Prisma 7 datasource config.
- **ORM operations:** `findUnique`, `findFirst`, `findMany`, `create`, `update`, `delete` in service classes; ownership checks via `findOwned(userId, id)`.
- **API development:** 15 NestJS routes across controllers listed in `DATABASE_AND_API_DECISIONS.md`.
- **Business logic:** quote location with exact `indexOf`; evidence approval; letter claim validation; versioned letters; export logging.
- **Validation:** class-validator DTOs plus global `ValidationPipe` with whitelist and transform.
- **Authentication/authorization:** bcrypt password hashing, JWT in httpOnly cookie, passport-jwt strategy, `JwtAuthGuard`, per-resource ownership checks returning 404 for foreign ids.
- **Data consistency:** cascade deletes on child records; export log written only after successful artifact generation or SMTP send.
- **Error handling:** NestJS exceptions (400/401/404/409), bounded AI retries, clear service-unavailable errors.
- **Integrations:** Z.ai chat completions (backend-only), nodemailer SMTP with DOCX attachment, `docx` generation.

## E. Testing and Verification

- 10 Jest unit tests created and executed; one failed initially and was fixed, then all passed.
- `server/scripts/verify-demo.ts` executed over HTTP and returned `PASS` with the invariants listed in `TESTING_AND_VERIFICATION_LOG.md`.
- Frontend production build executed successfully after excluding `server` from root typecheck; all five routes smoke-tested over HTTP.
- No live SMTP send, no AI-generated content verification, no production deployment.

## F. Review and Completion

- Generated shadcn component files were not individually reviewed before first use; this gap was identified in E-002 and partially closed by reading `button.tsx` and `tabs.tsx` before writing pages.
- Diff review was done through compiler/test feedback rather than a formal PR review: decorator settings, module imports, decorator signature and build output bugs were found by running builds.
- Final test results: 10/10 unit tests passed; end-to-end verify `PASS`; frontend build succeeded; five routes returned 200.
- Deployment status: local only. Unresolved risks: Z.ai balance, real SMTP delivery, original Postgres credentials, no formal PR review, no browser-level interaction test.

## How the agent accelerated work (observed)

- Replaced manual file-by-file discovery with a single tracked-file listing plus targeted reads.
- Detected the "empty PRD / no backend" mismatch immediately, preventing fabricated evidence.
- Installed and configured shadcn components via CLI with verified output instead of hand-writing UI primitives.
- Scaffolded seven NestJS modules, DTOs, services and controllers from the agreed schema in one pass; the agent then fixed the dependency-injection and build-output issues that its own first implementation introduced.
- Produced the unit tests and the HTTP verification script, then used their failures to locate two real defects (validator semantics and module wiring).
- Documented each step in Markdown as it happened, so the evidence record is traceable to commits and commands.

### Final expansion pass

The same A–F cycle was repeated for the six-feature expansion: the user chose the feature set, the agent extended the schema and modules, wrote `verify-expansion.ts`, found and fixed three real defects (Promise serialization, a blocked destructive Prisma push, and a bad import), then verified 18 unit tests, a passing end-to-end script, 17 build routes and HTTP 200 on all new pages.

No time savings or performance metrics are claimed. Only concrete actions are listed.
