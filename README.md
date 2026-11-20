# aijob

Evidence-grounded cover letters. The application turns job-related emails into source-traceable evidence, generates a cover letter grounded only in that evidence, and exports it.

## Architecture

- `app/` — Next.js 16 App Router frontend with shadcn/ui components.
- `server/` — NestJS 12 REST API (auth, applications, emails, evidence, letters, exports).
- `server/prisma/` — Prisma schema, config and seed data.
- `docs/engineering-evidence/` — verified engineering record for interview preparation.

The browser never sees AI or SMTP credentials. All external calls happen in the NestJS backend.

## Local setup

Prerequisites: Node.js 20+, npm. The backend uses SQLite locally, so no external database is required.

```bash
# frontend
npm install

# backend
cd server
npm install
cp ../.env .env
# set DATABASE_URL="file:./dev.db" in server/.env
npx prisma db push
npx prisma generate
npx ts-node prisma/seed.ts
npm run build
npm run start          # API on http://localhost:3002
```

In a second terminal:

```bash
npm run dev            # frontend on http://localhost:3000 (or next free port)
```

Demo login: `demo@aijob.local` / `demo12345` (seeded by `prisma/seed.ts`).

## Verification

```bash
cd server
npm test                       # unit tests for parser and validators
npx ts-node scripts/verify-demo.ts   # end-to-end HTTP check over seeded data
```

`verify-demo.ts` asserts that every evidence quote exists in its source email, that letter claims reference valid evidence ids, and that all four export channels return non-empty artifacts.

## Configuration

Secrets live in git-ignored `.env` files. Relevant variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `ZAI_API_KEY` (or `NEXT_ZAI_API_kEY`), `ZAI_MODEL`, `ZAI_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`.

If the configured Z.ai key is invalid or has no balance, extraction and generation automatically use a deterministic fallback. Each record stores its `source` so AI-generated and fallback content are distinguishable.

## Documentation

Start with `docs/engineering-evidence/PROJECT_TECHNICAL_OVERVIEW.md` and end with `docs/engineering-evidence/BRILLMARK_INTERVIEW_EVIDENCE.md`.
