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

Architecture as implemented and verified:

- **Frontend:** Next.js 16 App Router at the repository root, React 19, Tailwind v4, shadcn/ui components in `components/ui/`. Pages: landing, login, register, dashboard and a four-tab application workspace.
- **Backend:** NestJS 12 REST API in `server/`. Modules: `auth`, `applications`, `emails`, `evidence`, `letter`, `ai`, `exports` and `PrismaModule`.
- **Database:** Prisma 7 with `@prisma/adapter-better-sqlite3` against local `dev.db`. The configured Postgres credentials failed authentication and the Docker daemon was unstable, so SQLite is the verified local runtime. `NEEDS HUMAN CONFIRMATION` whether Postgres should be restored.
- **Authentication:** JWT in an httpOnly cookie, validated by a passport-jwt strategy (`server/src/jwt.strategy.ts`) and `JwtAuthGuard`. Ownership is enforced per resource with `findOwned(userId, id)`. A foreign application id returns 404. There are no RBAC roles yet.
- **AI:** `ZaiClient` calls the OpenAI-compatible Z.ai chat endpoint (`glm-4.6` default) server-side only. The configured key returned HTTP 429/1113 (insufficient balance), so a labelled deterministic fallback (`server/src/ai/deterministic.ts`) is used. `Evidence.source` and `CoverLetter.source` record which path produced each record.
- **Trust boundary:** `evidence.validator.ts` rejects any item whose `verbatimQuote` is not an exact substring of its source email. `letter.validator.ts` flags claim references that do not resolve to approved evidence.
- **Exports:** Markdown, DOCX (`docx`), print HTML, clipboard text and SMTP (`nodemailer`) with a DOCX attachment. Each generation/send writes an `ExportLog` row.
- **Validation:** class-validator DTOs, global whitelist/transform pipe, NestJS 400/401/404/409/500 exceptions, bounded AI retries.
- **Testing:** 10 Jest unit tests in `server/test/` and an HTTP end-to-end script `server/scripts/verify-demo.ts`. Both were executed and passed.
- **Deployment:** no production deployment exists or was verified.
- **Repository:** public GitHub repo `https://github.com/asefahmed500/aijob`, three commits pushed to `master`.

This overview is updated when the architecture changes. Unverified items are labelled `NEEDS HUMAN CONFIRMATION`.
