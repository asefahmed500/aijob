# Project Technical Overview

**Project:** `aijob` — email-to-evidence-to-cover-letter-to-export workflow
**Audited:** 2026-11-20
**Repository state at audit:** single commit `4dcfa28` ("Initial commit from Create Next App"), no git remote configured.

## 1. What actually existed at the start of this work

The repository was a fresh `create-next-app` scaffold. The complete tracked file list was:

```
.gitignore, AGENTS.md, README.md, app/favicon.ico, app/globals.css,
app/layout.tsx, app/page.tsx, eslint.config.mjs, next.config.ts,
package-lock.json, package.json, public/*.svg, tsconfig.json
```

`prd.md` existed on disk but was **0 bytes**. There was no written product specification.

## 2. Verified technology inventory (audit result)

| Area | Finding | Evidence |
| --- | --- | --- |
| Framework | Next.js **16.4.6**, App Router | `package.json`, `app/layout.tsx` uses `LayoutProps<"/">` |
| UI runtime | React 19.3.0 / React DOM 19.3.0 | `package.json` |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) | `app/globals.css`, `@theme inline` block |
| Language | TypeScript 5 | `tsconfig.json` |
| Lint | ESLint 9 + `eslint-config-next` | `eslint.config.mjs` |
| shadcn/ui | **Not initialized** at audit | `npx shadcn@latest info --json` returned `"config": null`, `"components": []` |
| Frontend pages | One default `create-next-app` landing page | `app/page.tsx` (Next.js logo, "Deploy Now" / "Documentation" links) |
| Backend / API routes | **None** | No `app/api/**` files |
| Database | **None** | No Prisma/Mongoose schema, no models, no migrations |
| Authentication | **None** | No auth library, no session/token handling |
| Authorization / RBAC | **None** | No guards, no middleware |
| Validation | **None** | No Zod/Joi schema |
| Testing | **None** | No test files, no test runner script in `package.json` |
| AI integration | **None** | No AI SDK or HTTP client code |
| Deployment config | Local only | No CI/CD, no Docker, no deployment manifest |

## 3. Environment configuration present (values deliberately omitted)

`.env` (git-ignored via `.gitignore` line 34, `.env*`) contained variable names for: Postgres (`DATABASE_URL`), a Z.ai API key (`NEXT_ZAI_API_kEY`), Better Auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), and Gmail SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).

**Important:** the presence of a dependency or a credential does not mean a feature exists. At audit time none of these services were used by any code. No secret values are reproduced in this document.

## 4. Infrastructure probes performed

- TCP port `5432` on `localhost` responded — a Postgres listener is present.
- Docker binary exists but the Docker daemon was **not running** (`npipe:////./pipe/dockerDesktopLinuxEngine` connection failed), so the listener is not a Docker Desktop container started at that moment.
- `psql` is not installed on PATH.
- `gh` CLI 2.101.0 is authenticated as `asefahmed500` with `repo` scope; no git remote existed in the repository.

These are observed facts, not assumptions about the database credentials working. Credential verification is recorded in the activity journal when performed.

## 5. Architecture after the user's backend decision

The user instructed: **"use nestjs as backend"** and **"during the coding keep documenting all"**.

Resulting target architecture (proposed by the coding agent, under that instruction):

- **Frontend:** existing Next.js 16 App Router app at repository root, with shadcn/ui components.
- **Backend:** a separate NestJS application in `server/`, exposing a REST API.
- **Database:** Prisma ORM against the configured Postgres database, owned by the NestJS service.
- **Authentication:** JWT-based auth implemented in NestJS guards (a deliberate change from the earlier Better Auth idea, because Better Auth is optimized for Next.js route handlers while the backend is now NestJS — recorded in `DATABASE_AND_API_DECISIONS.md`).
- **AI:** Z.ai OpenAI-compatible chat completions called only from the NestJS backend, never from the browser.

This overview is updated when the architecture changes. Sections that were not verifiable are explicitly labelled `NEEDS HUMAN CONFIRMATION` rather than guessed.
