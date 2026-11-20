# Brillmark Technologies Bangladesh — Interview Evidence

Based on verified work in the public repository `github.com/asefahmed500/aijob`. All commands, commits and test results below are recorded in the companion evidence files.

## Question 1 — Most challenging project

The strongest project was the evidence engine in **aijob**, a tool that turns job-related emails into a cover letter. The difficult part was not writing the generator; it was making the output trustworthy. A language model can easily invent a metric or a skill, so I designed the pipeline so that a claim is stored only when its exact quote is found in the source email. I implemented that as a code-level check (`evidence.validator.ts`), not just a prompt instruction, and made every factual sentence in the letter carry an evidence id that is validated before the letter is saved.

The challenge became real during verification: the configured Z.ai key returned HTTP 429 with "insufficient balance", so AI output could not be verified at all. Rather than fabricate a result or leave the workflow broken, I added a clearly labelled deterministic extractor and letter writer that still obeys the quote rule, and stored a `source` field on every record so fallback content is never mistaken for AI content.

My contribution was the requirement that evidence must be source-traceable, the decision to enforce it in code, the fallback design, and the verification. The result: 10 unit tests pass, and an end-to-end script confirms 9 evidence items whose quotes all exist in their source emails, 8 claim mappings that all resolve to approved evidence, and four non-empty export formats. The honest limitation is that AI-generated output itself remains unverified until the key is recharged.

## Question 2 — Working with coding agents

My method is: understand the requirement and acceptance criteria first; investigate the existing code before changing anything; write a short plan with data and API contracts; let the agent implement; then verify with tests and a build before accepting. I use the agent for the mechanical work — scaffolding modules, DTOs, migrations, tests and repetitive fixes — while I keep the decisions: what the trust rule is, which auth model fits, and what counts as done.

On backend work this is much faster because once I define the schema and invariants, the agent produces the handlers, guards and tests in one pass. A real example is the evidence engine above: I specified that a claim must quote its source and that letter claims must reference approved evidence. The agent generated the NestJS services, validators, Prisma models and tests. When a unit test failed, it showed that generic sentences like greetings were being flagged as ungrounded; the agent fixed the validator semantics. When the AI key failed, the agent added the labelled fallback. I reviewed the result through build output, test results and an HTTP verification script rather than claiming a code review I did not perform.

For feature requests I write the acceptance criteria before implementation. For issues and bugs I record reproduction steps, root cause and the fix in a log — for example, the Postgres P1000 failure and the NestJS dependency-injection errors are documented with their exact command output. For pull requests, this repository had no remote at the start, so work was pushed as separate commits to `master` rather than formal PRs; I have documented that explicitly instead of inventing review approvals. Remaining risks — AI balance, live SMTP delivery, original Postgres credentials — are marked as unconfirmed.

## Supporting evidence

- `PROJECT_TECHNICAL_OVERVIEW.md` — verified architecture.
- `BACKEND_IMPLEMENTATION_CASE_STUDIES.md` — CS-01 evidence engine, CS-02 auth, CS-03 environment debugging.
- `BUG_AND_DEBUGGING_LOG.md` — 8 recorded bugs/tooling issues with resolutions.
- `TESTING_AND_VERIFICATION_LOG.md` — exact commands and outputs.
- `CODE_REVIEW_AND_PR_HISTORY.md` — commits, and explicit statement that no PRs occurred.

## Needs human confirmation

- Whether JWT auth is acceptable in place of Better Auth.
- Whether the original Postgres credentials should be restored.
- Whether the Z.ai key will be recharged and SMTP will be tested live.
- The user did not personally write code or run tests in this session; claims are attributed to the agent.

## Likely follow-up questions

- Why enforce quotes in code instead of trusting the model?
- How do you stop one user reading another user's application?
- What happens when the AI provider is down?
- Why SQLite locally and how would you move back to Postgres?
- Which parts were verified by tests versus only smoke-tested?
