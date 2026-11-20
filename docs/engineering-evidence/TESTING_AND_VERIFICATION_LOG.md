# Testing and Verification Log

Record only commands that were actually executed and their actual outcomes. Never mark a test as passed without running it.

| Date | Check | Command / method | Actual result |
| --- | --- | --- | --- |
| 2026-11-20 | Repository inventory | `git ls-files` | 15 tracked files; confirmed bare scaffold |
| 2026-11-20 | shadcn project state | `npx shadcn@latest info --json` | `"config": null`, `"components": []` before init |
| 2026-11-20 | shadcn init | `npx shadcn@latest init --defaults --yes` | Success: `components.json`, `lib/utils.ts`, `components/ui/button.tsx` created; `app/globals.css` updated |
| 2026-11-20 | shadcn component install | `npx shadcn@latest add card input textarea label tabs badge table dialog alert select separator skeleton progress alert-dialog dropdown-menu sonner tooltip accordion scroll-area avatar empty` | Success: 21 files created, `button.tsx` skipped as identical |
| 2026-11-20 | Postgres reachability | `Test-NetConnection localhost -Port 5432` | `True` (listener present; credentials not tested) |
| 2026-11-20 | Docker daemon | `docker ps` | Failed: daemon pipe unavailable |
| 2026-11-20 | GitHub CLI auth | `gh auth status` | Authenticated as `asefahmed500`, `repo` scope; no remote in repo |

## Not yet performed

- Application unit tests — none exist.
- Application integration/API tests — none exist.
- Database migration / seed verification — not performed.
- Authorization tests — not performed.
- Production build / lint / typecheck — not performed since shadcn setup.
- GitHub push / PR verification — no remote configured yet.

## Planned verification for the core workflow

1. `npm run build` and `npm run lint` in both frontend and backend.
2. Unit tests for email parsing, evidence-quote validation, and grounded-letter validation.
3. API integration tests with a mocked Z.ai client.
4. A scripted end-to-end demo over seeded fixtures covering all five export formats.
5. Authorization tests proving one user cannot read another user's applications.

Do not mark these as done until the commands are executed and output is recorded here.
