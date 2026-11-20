# Database and API Decisions

## Architecture decision AD-001 — Two-service split (frontend + NestJS backend)

- **Context:** The repository was a Next.js-only scaffold. The user instructed "use nestjs as backend".
- **Decision:** Keep the Next.js 16 + shadcn UI app at the repository root as the frontend. Add a separate NestJS REST API in `server/`.
- **Rationale:** Preserves the already-initialized frontend and its shadcn components while giving the backend an independent framework, dependency set and runtime. It also makes the backend boundary explicit for testing and review.
- **Made by:** Coding agent, under the user's explicit backend instruction. `NEEDS HUMAN CONFIRMATION` on the exact folder layout (`server/`) if the user prefers a monorepo with `apps/web` and `apps/api`.

## Architecture decision AD-002 — Prisma ORM with Postgres

- **Context:** `DATABASE_URL` in `.env` points to a local Postgres database; port 5432 responded.
- **Decision:** Use Prisma in the NestJS service for schema, migrations and typed queries.
- **Rationale:** Typed models and migrations make data-consistency claims verifiable; the user explicitly chose Postgres in v1.
- **Status:** Planned. Credentials not yet verified — `NEEDS HUMAN CONFIRMATION` that the existing `DATABASE_URL` credentials are valid.

## Architecture decision AD-003 — JWT auth in NestJS instead of Better Auth in Next.js

- **Context:** The user originally selected "Include Better Auth + Postgres now" during planning, then later instructed "use nestjs as backend".
- **Decision:** Implement authentication in NestJS using JWT with guards; do not install Better Auth.
- **Rationale:** Better Auth's first-class integration is with Next.js route handlers (`toNextJsHandler`). With a NestJS backend, framework-native guards/passport strategies fit the architecture better. This is a real change of plan and is recorded as such.
- **Made by:** Coding agent. `NEEDS HUMAN CONFIRMATION` — the user should confirm they accept JWT auth in place of Better Auth.

## Architecture decision AD-004 — AI calls are backend-only

- **Context:** Z.ai API key is present in `.env`.
- **Decision:** All calls to `https://api.z.ai/api/paas/v4/chat/completions` happen inside NestJS. The browser never receives the key.
- **Rationale:** Prevents secret exposure and centralizes prompt/validation logic for testing.

## Planned API surface (not yet implemented)

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Issue JWT cookie |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/me` | Current user |
| GET/POST | `/applications` | List / create applications |
| GET/POST | `/applications/:id/emails` | List / add source emails |
| GET/POST | `/applications/:id/evidence` | List / extract evidence |
| PATCH/DELETE | `/applications/:id/evidence/:evidenceId` | Review evidence |
| GET/POST | `/applications/:id/letter` | Get / generate cover letter |
| POST | `/applications/:id/export` | Produce Markdown / DOCX / print payload / clipboard text |
| POST | `/applications/:id/export/send` | Send letter by SMTP |

This table is a plan, not evidence of existing endpoints. It will be updated to a verification table after implementation.
