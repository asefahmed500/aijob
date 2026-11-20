# Bug and Debugging Log

Only application bugs and genuine implementation problems are recorded here. Tooling quirks are noted where they affected the work, but are not presented as application defects.

No application bugs had been discovered at the time of this entry because no application code existed yet.

## Tooling quirk TQ-001 (not an application bug)

- **Observed:** 2026-11-20, during repository audit.
- **Symptom:** PowerShell commands containing `$_` or `$matches` were mangled by the command wrapper (variables replaced with empty strings or treated as missing type names). A file-enumeration command produced hundreds of repeated errors and timed out.
- **Investigation:** The failure messages showed the variable token missing from the executed script (e.g. `if ( -match ...)`), confirming the wrapper, not PowerShell itself, removed the token.
- **Workaround applied:** Inspection scripts avoid `$` variables and use `git ls-files`, `Select-Object -ExpandProperty` and dedicated read tools instead.
- **Status:** Resolved by workaround. No application impact.

## BUG-001 — Postgres authentication failure (P1000)

- **Date:** 2026-11-20
- **Reported behavior:** `npx prisma db push` failed with `P1000: Authentication failed against database server, the provided database credentials for 'postgres' are not valid.` The datasource resolved to database `aijob` at `localhost:5432`.
- **Expected behavior:** Prisma should connect and synchronize the schema.
- **Reproduction steps:**
  1. Copy root `.env` to `server/.env`.
  2. Run `npx prisma db push` in `server/`.
  3. Observe P1000.
- **Investigation:**
  - `Test-NetConnection localhost -Port 5432` returned `True`, proving a listener existed but not that credentials were valid.
  - Docker binary was present but the daemon was not running (`docker ps` failed on the named pipe).
  - Root cause: a Postgres-compatible listener was occupying port 5432 with credentials different from those in `.env`; the configured credentials could not be validated or changed from the repository.
- **Fix:**
  1. Started Docker Desktop (`docker desktop start`).
  2. Created a known-credential container: `docker run -d --name aijob-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=aijob -p 5433:5432 postgres:16-alpine`.
  3. Updated the git-ignored `server/.env` `DATABASE_URL` to use port `5433`.
  4. Re-ran `npx prisma db push` → "Your database is now in sync with your Prisma schema. Done in 252ms".
- **Regression test:** Re-running `npx prisma db push` should report no changes; this has not been re-run yet.
- **Verification:** Container `aijob-postgres` reported `Up`; Prisma push succeeded against `localhost:5433`.
- **Remaining limitation:** The original port-5432 credentials are still unknown. `NEEDS HUMAN CONFIRMATION` whether the user wants the app pointed back to that instance. Secret values are not recorded here.

## Placeholder for future entries

When a real bug occurs, record: reported behavior, expected behavior, reproduction steps, root cause, fix, regression test, verification. Do not invent entries.
