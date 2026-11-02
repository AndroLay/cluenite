# Documentation synchronization and English language plan

**Date:** 2 November 2026  
**Owner:** Codex, acting as documentation integrator for this user-requested pass.  
**Baseline:** `main` at `c320a9b`, including the existing uncommitted backend and frontend work.  
**Workflow:** execute inline using the scoped planning adapter; no commit, deployment, dependency installation, or branch change is required.

## Goal and boundaries

Synchronize current documentation with the checked-out implementation and use English for project documentation, web copy, comments, tests, and development instructions. Preserve identifiers, proper names, user changes, historical evidence, and frozen source packs. This pass documents unfinished features rather than implementing them.

The user's current request authorizes documentation and language changes across the normal frontend/backend ownership boundary. Runtime contracts and gameplay behavior remain unchanged.

## Milestones

- [x] Inspect the implementation, documentation, language, Git state, and existing verification evidence.
  - The public entry point is `SiteRoot.vue`; `/` is the landing page, not Mystery Live.
  - `/?view=quick` is the local manuscript sample; Q01 is the server-authored gallery case.
  - OBS credential issuance and co-op invitations exist in the API but are not available through the web UI.
  - Six Twitch status labels and the document's `lang` attribute still use Indonesian.
  - Older run instructions and prompts describe a completed design debate; handoff files contain superseded observations.
- [x] Establish the current documentation index, English language policy, source precedence, status, and run instructions.
  - Files: `AGENTS.md`, `README.md`, `docs/development/local-setup.md`, `docs/development/contributing.md`, `docs/README.md`, `docs/STATUS.md`, `docs/reference/README.md`, `docs/architecture/DECISIONS.md`.
- [x] Reconcile package/application guides, agent prompts, handoffs, and historical document boundaries.
  - Preserve old progress as dated evidence and link each superseded record to the current status.
  - Keep frozen source content byte-for-byte unchanged and explain implementation differences in the reference index.
- [x] Translate web labels, set `lang="en"`, correct developer-facing command examples, and update affected browser assertions to the current entry routes.
- [x] Verify links, English copy, frozen-reference checksums, formatting, typecheck, focused unit tests, and the affected browser flow where available.
  - Do not start shared services, read secrets, or report historical integration results as fresh evidence.
  - Record any unavailable browser/runtime checks precisely.
- [x] Review the final changes against the saved task baseline and publish concise completion evidence.

## Acceptance

Current guides agree on routes, case names, source authority, local setup, the frontend's current limits, and external verification gaps. Historical documents are labeled as historical. New development follows the English language policy. Local checks must report their actual outcomes; mock tests never count as real Twitch, OBS Studio, Render, or player acceptance.

## Verification record

Completed on 2 November 2026. Workspace typecheck, web/server production build, 31 unit tests in 10 files, and the updated mocked Chrome test passed. The browser fixture required an authorized run outside the sandbox to bind its local port. Current documentation links, language/encoding, frozen-source checksums, formatting, and the task baseline were reviewed.

Repository lint remains a documented pre-existing gap: 10 browser-global errors in three unchanged page files and 551 warnings. Full PostgreSQL, real Twitch, OBS Studio, Render, and player/submission acceptance were not rerun. Temporary baseline source copies were moved outside repository discovery after they were initially picked up by tests/lint.

Current results and remaining integration work are in `docs/STATUS.md`. No gameplay rules, wire contracts, dependencies, credentials, deployment, or Git history were changed.
