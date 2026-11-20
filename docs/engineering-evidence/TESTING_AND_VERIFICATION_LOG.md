# Testing and Verification Log

Only commands actually executed and their outcomes are listed.

## 2026-11-20 — Baseline audit

| Command | Actual result |
| --- | --- |
| `git ls-files` | 15 tracked files; bare scaffold |
| `npx shadcn@latest info --json` | `"config": null`, `"components": []` before init |
| `Test-NetConnection localhost -Port 5432` | `True` (listener only, credentials untested) |
| `docker ps` | Failed: daemon pipe unavailable |
| `gh auth status` | Authenticated as `asefahmed500`, `repo` scope, no remote |

## 2026-11-20 — Frontend setup

| Command | Actual result |
| --- | --- |
| `npx shadcn@latest init --defaults --yes` | Success: `components.json`, `lib/utils.ts`, `components/ui/button.tsx`; `app/globals.css` updated |
| `npx shadcn@latest add card input textarea label tabs badge table dialog alert select separator skeleton progress alert-dialog dropdown-menu sonner tooltip accordion scroll-area avatar empty` | 21 files created; `button.tsx` skipped as identical |
| `npx shadcn@latest add field` | 1 file created; `label.tsx` and `separator.tsx` skipped as identical |

## 2026-11-20 — Backend setup and database

| Command | Actual result |
| --- | --- |
| `npx prisma validate` | Valid after moving `url` into `prisma.config.ts` |
| `npx prisma generate` | Generated Prisma Client v7.10.1 into `generated/prisma` |
| `npx prisma db push` (Postgres 5432) | Failed P1000 authentication |
| `docker run ... -p 5433:5432 postgres:16-alpine` | Container `aijob-postgres` started |
| `npx prisma db push` (Postgres 5433) | "Your database is now in sync with your Prisma schema. Done in 252ms" |
| `npx prisma db push` (SQLite) | "SQLite database dev.db created ... in sync ... Done in 75ms" |
| `npx ts-node prisma/seed.ts` | "Seed complete" with demo user, application and 3 emails |

## 2026-11-20 — AI provider probe

| Command | Actual result |
| --- | --- |
| `node -r dotenv/config -e "fetch(...chat/completions...)"` | HTTP `429`, body `{"error":{"code":"1113","message":"Insufficient balance or no resource package. Please recharge."}}` |

## 2026-11-20 — Backend unit tests

`npm test -- --runInBand`

- First run: **3 suites, 10 tests, 1 failed** (`letter.validator.spec.ts` expected 1 ungrounded, got 2).
- After fixing `validateLetterResponse`: **3 suites, 10 tests, all passed**.
  - `test/email-parser.spec.ts` — 3 tests (header parsing, quoted-reply removal, plain paste).
  - `test/evidence.validator.spec.ts` — 4 tests (exact quote offsets, paraphrase rejection, invalid item rejection, confidence clamping).
  - `test/letter.validator.spec.ts` — 3 tests (claim flag semantics, deterministic fallback mapping, empty letter rejection).

## 2026-11-20 — End-to-end verification

`npx ts-node scripts/verify-demo.ts` against the running API on port 3002:

```json
{
  "applicationId": "cmwovn0mw0001skfwobcecxl9",
  "emails": 3,
  "evidence": 9,
  "evidenceSource": "deterministic",
  "usedFallback": true,
  "letterSource": "deterministic",
  "claims": 8,
  "exports": {
    "markdown": 743,
    "docx": 13192,
    "print": 1011,
    "clipboard": 688
  },
  "exportLogEntries": 4,
  "result": "PASS"
}
```

Assertions performed by the script:
- login succeeds and cookie is reused;
- at least three seeded emails exist;
- extraction accepted more than zero items;
- every stored evidence quote is a substring of its source email's normalized body;
- letter content is longer than 50 characters and has claim mappings;
- every non-null claim evidence id exists in the approved evidence set;
- all four export channels return non-empty content;
- export log has at least four entries.

## 2026-11-20 — Frontend build and smoke test

| Command | Actual result |
| --- | --- |
| `npm run build` (root, first attempt) | Failed: root tsconfig type-checked `server/**` with decorator errors |
| `npm run build` (root, after excluding `server`) | Compiled successfully; routes `/`, `/login`, `/register`, `/dashboard`, `/applications/[id]` |
| `node -e "fetch('http://localhost:3000/...')"` | All routes 404 — dev server was actually on port 3003 |
| `node -e "fetch('http://localhost:3003/...')"` | All five routes returned HTTP 200 |

## Not performed

- SMTP send to a real recipient (deliberately avoided).
- AI-generated extraction/generation (key has no balance).
- Live browser interaction test of buttons/forms (pages were smoke-tested over HTTP only).
- Production deployment.
- GitHub pull requests / code review approvals — commits were pushed directly.

## 2026-11-20 — SaaS expansion

| Command / check | Actual result |
| --- | --- |
| `npx prisma db push` (after adding 7 models) | "Your database is now in sync with your Prisma schema. Done in 89ms" |
| `npx prisma generate` | Generated Prisma Client v7.10.1 |
| `npx ts-node prisma/seed.ts` | Seed complete with demo organization, job and 3 candidates |
| `npm test -- --runInBand` (first SaaS run) | 4 suites, 13 tests passed; haste collision warning |
| `npm test -- --runInBand` (after jest config fix) | 4 suites, 13 tests passed, no warning |
| `npx ts-node scripts/verify-saas.ts` | `PASS`: 3 ranked candidates, top score 80, 10 verified quotes, crossOrgIsolation PASS |
| `npm run build` (backend) | Success |
| `npm run build` (frontend, first attempt) | Failed `CLIENT_HOOK_DYNAMIC` on `/org/jobs/[id]` |
| `npm run build` (frontend, after removing `usePathname`) | Success; 10 routes listed |
| HTTP smoke test on port 3003 | `/`, `/org`, `/org/jobs`, `/org/candidates`, `/org/jobs/demo` all returned 200 |

SaaS verification assertions: login, organization switch, seeded job and candidates present, score-all produces scores, ranking sorted descending, every evidence quote is a substring of the candidate resume at the stored offsets, and a second user in a different organization cannot list or read the first organization's job.

## 2026-11-20 — Full feature expansion

| Command / check | Actual result |
| --- | --- |
| `npx prisma db push` (after new models) | "Your database is now in sync with your Prisma schema. Done in 157ms" |
| `npx prisma db push --accept-data-loss` | Blocked for AI agents; not executed. Avoided by schema change instead |
| `npx ts-node prisma/seed.ts` | Seed complete with backfilled public apply token |
| `npm test -- --runInBand` | 5 suites, 18 tests passed |
| `npx ts-node scripts/verify-expansion.ts` | `PASS`: pipeline, 3 notes, 8 timeline events, 2 bulk updates, 1 search result, 2 stage-filtered rows, analytics totals, all three roles enforced, public apply PASS |
| `npm run build` (backend) | Success |
| `npm run build` (frontend, first attempt) | Failed: wrong `Textarea` import |
| `npm run build` (frontend, after fix) | Success; 17 routes listed |
| HTTP smoke test on port 3001 | 10 routes returned 200, including `/apply/demo` and `/invitations/demo` |

Expansion assertions: stage change sets stage and rating; note and timeline events are persisted; notification log is written; bulk stage changes apply to two candidates; text search and stage filter return correct rows; analytics counts and average score are non-zero; RECRUITER can change stage; VIEWER receives 403 on a stage change; public apply creates an application without authentication.
