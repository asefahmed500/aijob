# Bug and Debugging Log

Only application bugs and genuine implementation problems are recorded. Tooling quirks are marked as such.

## TQ-001 — Command shell strips `$` variables (tooling, not application)

- Observed while inspecting the repository. PowerShell scripts using `$_` or `$matches` were mangled, producing errors and a timeout.
- **Workaround:** inspection scripts avoid `$` variables; used `git ls-files`, dedicated read tools and `node -e`.
- **Status:** resolved by workaround. No application impact.

## BUG-001 — Postgres authentication failure (P1000)

- **Symptom:** `npx prisma db push` failed: credentials for `postgres` invalid at `localhost:5432`.
- **Expected:** successful schema sync.
- **Investigation:** port 5432 was open but credentials rejected; Docker daemon initially unavailable.
- **Fix (agent):** started Docker Desktop, ran `aijob-postgres` (postgres:16-alpine) on port 5433 with known credentials, updated git-ignored `server/.env`, re-ran `prisma db push` successfully ("in sync ... Done in 252ms").
- **Later development:** Docker daemon stopped between shell commands, causing `ECONNREFUSED` at login. Decision was made to move local runtime to SQLite (see AD-002).
- **Status:** worked around; original credentials still unknown.

## BUG-002 — Z.ai API insufficient balance

- **Symptom:** direct POST to the chat completions endpoint returned HTTP 429 with `{"code":"1113","message":"Insufficient balance or no resource package. Please recharge."}`.
- **Expected:** a completion response.
- **Investigation:** the key was present and the request shape matched the documented OpenAI-compatible API; the error was account/billing, not code.
- **Fix (agent):** added `ZaiClient` retries for 429/5xx, then a deterministic fallback because the key cannot succeed until recharged. Added `source` field to persisted records.
- **Verification:** end-to-end run reported `usedFallback: true` and both evidence and letter marked `deterministic`.
- **Status:** application works, but AI-generated output was never verified.

## BUG-003 — NestJS dependency injection failures

- **Symptom:** startup crashed with `UnknownDependenciesException` for `PrismaService` in `AuthModule` and `ZaiClient` in `EvidenceModule`.
- **Root cause:** modules injected providers without importing the modules that export them.
- **Fix (agent):** imported `PrismaModule` into auth, applications, emails, evidence, letter and exports modules; imported `AiModule` into evidence and letter modules.
- **Verification:** application started and mapped all 15 routes.

## BUG-004 — Compiled server could not start

- **Symptom 1:** `node dist/main.js` → module not found; Nest emitted `dist/src/main.js` because the tsconfig includes non-`src` folders.
- **Fix 1:** start script changed to `node dist/src/main.js`.
- **Symptom 2:** runtime `Cannot find module '../../generated/prisma'` from `dist/src/prisma/prisma.service.js`.
- **Fix 2:** build script now copies `generated/` into `dist/generated/` after `nest build`.
- **Verification:** `npm run build` followed by `npm run start` succeeded.

## BUG-005 — Unit test failure: generic sentences flagged as ungrounded

- **Reported behavior:** `letter.validator.spec.ts` expected `ungroundedCount === 1` but received `2`.
- **Expected:** only factual sentences with invalid evidence references should be flagged.
- **Root cause:** `validateLetterResponse` marked every claim with `evidenceId: null` as ungrounded, including the greeting and closing allowed by the prompt.
- **Fix (agent):** treat null evidence id as non-factual/generic (grounded, no note); flag only non-null ids that are absent from the approved set.
- **Regression test:** the existing assertion now passes; second run: 10 tests passed in 3 suites.

## BUG-006 — Port 3001 already in use

- **Symptom:** `EADDRINUSE :::3001` when starting a rebuilt API; an older process still held the port.
- **Fix (agent):** moved the API to `PORT=3002` in git-ignored `server/.env` and updated the verify script's default base URL.
- **Status:** resolved. A stale process on 3001 was not forcibly killed because the shell wrapper strips `$` variables needed for PID selection.

## BUG-007 — Frontend build type-checked the NestJS tree

- **Symptom:** `npm run build` at the root reported decorator errors and missing Jest globals for `server/**`.
- **Root cause:** root `tsconfig.json` included `**/*.ts`, so NestJS source was compiled with Next.js compiler options.
- **Fix (agent):** added `server` and `server/**` to root `tsconfig.json` `exclude`.
- **Verification:** `npm run build` compiled successfully and generated all five routes.

## BUG-008 — Dev server port collision

- **Symptom:** `npm run dev` reported port 3000 in use and used 3003 instead; an initial smoke test against 3000 returned 404 for all new routes.
- **Investigation:** read the dev server output, which showed "using available port 3003 instead".
- **Fix (agent):** repeated smoke test against 3003; all five routes returned HTTP 200.
- **Status:** resolved; no application defect.
