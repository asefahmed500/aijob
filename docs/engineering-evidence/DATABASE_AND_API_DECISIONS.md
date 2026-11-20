# Database and API Decisions

## AD-001 — Two-service split (frontend + NestJS backend)

- **Context:** the repository was a Next.js-only scaffold. The user instructed "use nestjs as backend".
- **Decision:** keep Next.js 16 + shadcn UI at the repository root as the frontend; add a separate NestJS REST API in `server/`.
- **Rationale:** preserves the initialized frontend while making the backend boundary explicit for testing and review.
- **Made by:** coding agent under the user's explicit instruction.

## AD-002 — Prisma ORM, with SQLite as the verified local runtime

- **Context:** `DATABASE_URL` pointed to Postgres on `localhost:5432`; Prisma 7 was chosen because the user selected Postgres in planning.
- **Problem:** `npx prisma db push` failed with P1000 authentication error. A Docker Postgres container on port 5433 worked, but the Docker daemon stopped between commands and caused `ECONNREFUSED`.
- **Decision:** use Prisma 7 with `@prisma/adapter-better-sqlite3` and `file:./dev.db` for local, deterministic verification. The Prisma models are unchanged and could be pointed at Postgres again with a provider swap and a valid connection string.
- **Made by:** coding agent. `NEEDS HUMAN CONFIRMATION` whether the user wants Postgres restored and can supply valid credentials.
- **Schema:** `User`, `Application`, `EmailSource`, `Evidence`, `CoverLetter`, `LetterClaim`, `ExportLog`. Cascade deletes on children; indexes on `userId`, `applicationId`, `emailSourceId`, `letterId`.

## AD-003 — JWT auth in NestJS instead of Better Auth in Next.js

- **Context:** the user originally selected "Include Better Auth + Postgres now", then instructed "use nestjs as backend".
- **Decision:** JWT stored in an httpOnly cookie, validated by `JwtAuthGuard` and a passport-jwt strategy. Better Auth was not installed.
- **Rationale:** a framework-native NestJS guard fits the new backend boundary. This was a real change of plan and is recorded as such.
- **Made by:** coding agent. `NEEDS HUMAN CONFIRMATION` that JWT auth is acceptable in place of Better Auth.

## AD-004 — AI calls are backend-only, with a labelled fallback

- **Decision:** all Z.ai calls happen in `server/src/ai/zai.client.ts`; the browser never receives the key. On provider failure, a deterministic extractor/letter writer is used and the record's `source` field is set to `deterministic`.
- **Rationale:** avoids secret exposure and keeps the workflow demonstrable when the provider key has no balance. The fallback still obeys the exact-quote rule.

## AD-005 — Evidence is quote-grounded

- **Decision:** `locateQuote()` requires an exact substring match in the source email's normalized body. Paraphrases are rejected and counted in the extraction result.
- **Rationale:** this is the core trust property of the product. It is enforced in code, not only in the prompt.

## Verified API surface (routes mapped by NestJS at startup)

| Method | Route | Purpose | Verified |
| --- | --- | --- | --- |
| POST | `/auth/register` | Create account and set JWT cookie | Route mapped; not exercised in verify script |
| POST | `/auth/login` | Authenticate and set JWT cookie | Yes |
| POST | `/auth/logout` | Clear cookie | Route mapped |
| GET | `/auth/me` | Current user | Route mapped, guard active |
| GET | `/applications` | List owned applications | Yes |
| POST | `/applications` | Create application | Route mapped |
| GET | `/applications/:id` | Full application with children | Yes |
| DELETE | `/applications/:id` | Delete owned application | Route mapped |
| GET | `/applications/:id/emails` | List emails | Yes |
| POST | `/applications/:id/emails` | Add pasted email | Route mapped |
| GET | `/applications/:id/evidence` | List evidence | Yes |
| POST | `/applications/:id/evidence/extract` | Extract and verify evidence | Yes |
| PATCH | `/evidence/:evidenceId` | Approve/edit evidence | Yes |
| DELETE | `/evidence/:evidenceId` | Delete evidence | Route mapped |
| GET | `/applications/:id/letter` | List letter versions | Route mapped |
| GET | `/applications/:id/letter/latest` | Latest letter | Route mapped |
| POST | `/applications/:id/letter/generate` | Generate grounded letter | Yes |
| POST | `/applications/:id/export` | Produce markdown/docx/print/clipboard | Yes (all four) |
| POST | `/applications/:id/export/send` | SMTP send with DOCX attachment | Route mapped; NOT executed |
| GET | `/applications/:id/export/history` | Export audit log | Yes |

"Route mapped" means NestJS logged the route at startup but the verify script did not call it. It does not mean the behaviour was tested.

## SaaS additions (AD-006 — tenant isolation)

- **Decision:** every organization-scoped table carries `organizationId`; `OrgGuard` validates the active organization from the `active_org` cookie against the user's memberships, and all service queries filter by that id.
- **Rationale:** strict tenant isolation is the defining requirement of a multi-tenant SaaS. Verified by a scripted cross-organization access attempt that returned 404.

### SaaS models

`Organization`, `Membership` (unique on `userId + organizationId`), `JobPost`, `Candidate`, `CandidateApplication` (unique on `jobId + candidateId`), `CandidateScore`, `ScoreEvidence`.

### Verified SaaS routes

| Method | Route | Verified |
| --- | --- | --- |
| GET | `/organizations` | Yes |
| POST | `/organizations` | Yes (isolation test) |
| POST | `/organizations/switch` | Yes |
| GET | `/organizations/current` | Yes |
| GET | `/organizations/members` | Route mapped |
| GET | `/jobs` | Yes |
| POST | `/jobs` | Route mapped |
| GET | `/jobs/:id` | Yes (and 404 for a foreign org) |
| GET | `/candidates` | Yes |
| POST | `/candidates` | Route mapped |
| POST | `/candidates/apply` | Route mapped |
| GET | `/candidates/ranking/:jobId` | Yes |
| POST | `/scoring/jobs/:id/score-all` | Yes |
| POST | `/scoring/applications/:id/score` | Route mapped |
