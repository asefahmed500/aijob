# Coding Agent Workflow (observed, not idealized)

This document records the workflow actually followed with the coding agent. Stages are marked with what really happened; nothing is claimed that did not occur.

## A. Requirement Understanding

- **What happened:** The user gave a detailed brief for the core workflow and, separately, for the evidence documents. The agent asked targeted clarifying questions and the user answered: match evidence to the job; paste/upload input plus samples; auth/DB in v1; all five export formats; repo name `aijob`.
- **Ambiguity handled:** `prd.md` was empty, so requirements were reconstructed from the user's messages rather than invented. The later instruction "use nestjs as backend" superseded the earlier Next.js-route-handler assumption.
- **Edge cases identified:** emails with quoted replies, evidence quotes that do not actually appear in the source, AI returning malformed JSON, SMTP delivery restrictions.

## B. Codebase Investigation

- **What happened:** Full file listing, reads of configuration and page files, `npx shadcn@latest info --json`, infrastructure probes (port 5432, Docker, `psql`, `gh`).
- **Result:** Established that there was no backend, database, auth, or test infrastructure. This prevented falsely attributing existing features to prior work.

## C. Implementation Planning

- **What happened:** A plan was presented in conversation before any product code was written. The user then switched out of planning mode and instructed the agent to proceed with NestJS as backend and continuous documentation.
- **Affected areas identified:** Next.js pages, NestJS modules, Prisma schema and migration, JWT auth, Z.ai client, exporters, tests.

## D. Backend Implementation

- **Status:** Not started at the time of this entry. Will be filled with real file paths, ORM operations, API contracts, validation, auth, error handling, and integrations as code is written.

## E. Testing and Verification

- **Status:** Only CLI/tool verification so far (shadcn init and add output). No application tests existed or were run yet.

## F. Review and Completion

- **Status:** No generated application code to review yet. The shadcn-generated component files were not individually read after creation — this is a known gap to close when frontend work begins.

## How the agent accelerates work (observed so far)

- Replaced manual file-by-file discovery with a single tracked-file listing plus targeted reads.
- Detected the "empty PRD / no backend" mismatch immediately, preventing fabricated evidence.
- Executed shadcn CLI setup and component installation with verified command output.

No time savings or performance metrics are claimed. Only concrete actions are listed.
