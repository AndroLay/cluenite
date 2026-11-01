# Cluenite implementation status

**Last synchronized:** 2 November 2026.

**Source baseline:** release preparation on `main`, originally based on `c320a9b`, preserving the existing backend/frontend work. The private [AndroLay/cluenite repository](https://github.com/AndroLay/cluenite) contains release source `4696a39` with passing [Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41345208201); exact publication, CI, and deployment evidence is maintained in the [backend release record](operations/BACKEND_RELEASE_2026-11-02.md).

**Scope:** source inspection, local PostgreSQL and browser checks, private repository creation, and confirmed Render workspace inventory. No production Cluenite service/database or Twitch application has been created in this release pass; no submission lookup is claimed.

## Current implementation

| Area                   | Implemented in the working tree                                                                                                                               | Remaining boundary                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic gameplay | Authored Q01, M01, C01 rules; state-aware actions, proof guards, sequences, theories, hints, and team-scoped station actions.                                 | Gameplay clarity, timing, difficulty, and balance need real player evidence.                                                                   |
| Backend                | PostgreSQL sessions, migrations, OAuth/session authorization, EventSub adapter, idempotency, outbox, Socket.IO delta/resync, diagnostics, and leader fencing. | Real Twitch authorization, chat delivery, refresh/revocation, and deployed recovery are unverified.                                            |
| Public entry flow      | Landing, case menu, guide, settings, host overview, OBS setup guidance, and co-op information pages.                                                          | Mocked landing/sample smoke checks pass; complete authenticated menu/guide/gameplay acceptance remains open.                                   |
| Quick Case             | Q01 live presentation and host commands; separate public A Missing Manuscript sample.                                                                         | The manuscript sample is local UI state, not Q01 or an engine-validated round.                                                                 |
| Mystery Live           | M01 board, scene, evidence inspection, timeline/theory/challenge controls, hints, and sample snapshot.                                                        | The hint button disappears after the first hint even while the server offers more hints. Full current UI/player acceptance is unverified.      |
| Co-op                  | C01 backend, invitation lifecycle, membership, complementary station proof, and team projections.                                                             | Browser create/invite/accept/rejoin controls are unfinished; two real broadcaster channels have not been verified.                             |
| OBS                    | Read-only transparent Quick Case presentation and scoped/revocable overlay API credentials.                                                                   | Credential issuance is not exposed through the web UI. Actual OBS Studio behavior remains unverified.                                          |
| Art and motion         | Brown Noir styling, generated prototype museum/evidence artwork, Pixi scenes, and GSAP timelines.                                                             | Final art approval, audio mix, performance, and motion acceptance remain open.                                                                 |
| Development            | Node 22/pnpm workspace, direct Tailwind dependency, clean frozen install/build, local tests, and Linux/PostgreSQL CI definition.                              | Linux CI passes for `4696a39`; actual remote deploy results remain unverified.                                                                 |
| Render and submission  | Schema-validated Blueprint defines a Singapore web service, private PostgreSQL 18 database, and HTTP readiness. Workspace is confirmed.                       | Render API access and Twitch app credentials are missing; remote resources, deploy identity, real chat, OBS, and submission remain unverified. |
| Language               | Repository policy requires English for documentation, web copy, comments, tests, authored content, and development instructions.                              | External user names/chat and preserved historical quotations retain their original content.                                                    |

## Frontend visual development target

The official v3 inventory has 18 logical UI entries, S00-S17 (13 P0, four P1, one P2). They include embedded panels and states; page/route counts are not completion criteria. [The reference reconciliation](reference/README.md#screen-inventory-and-browser-routes) maps the v3 route sketch to current links. No fresh per-screen acceptance audit supports a definitive `3 present / 10 partial / 5 missing` total. The implementation table and bounded evidence below remain the current status.

On 2 November, all eight user-provided target PNGs were reviewed and preserved with source filenames and checksums. The [frontend development brief](design/frontend-target/README.md) maps them to existing routes/components and records shared visual rules, implementation gaps, milestone dependencies, responsive states, and acceptance. The user selected shared visuals and public pages first, followed by Q01/host/OBS, M01, then C01. F1 public-page implementation and its bounded visual checks are recorded in [frontend progress](agent-handoff/FRONTEND_PROGRESS.md). Complete visual and authenticated acceptance of the target remains open.

The host panel currently exposes Pause, Resume, and Restart, but not Start or Stop. Since a created session begins in `READY`, completing the Start affordance is part of the next Q01/host slice. The existing API supports these lifecycle actions; this is frontend work rather than a missing backend contract.

## Fresh backend release verification

On 2 November, 70 tests across 17 files pass against isolated local PostgreSQL fixtures and mocked Twitch boundaries. Workspace typecheck, web/server build, and lint with zero errors pass. A separate clean frozen installation with production environment settings and explicit build tools also builds successfully. Fresh Vite CSS delivery passes without a Tailwind alias. Production HTTPS/callback validation and the `/api` JSON-404 regression are covered. See the [release record](operations/BACKEND_RELEASE_2026-11-02.md) for exact scope and remaining gates.

The integrator reviewed the frontend SPA fallback change. An owned random-port server serves the current built CSS and public deep links, reports database readiness, rejects unauthenticated host access, and preserves missing API/health/asset 404 responses. Signed-out Chrome probes on `/guide`, `/settings`, `/setup`, and `/coop` pass at 390 and 1280 px with no horizontal overflow or script errors; every phone header link is at least 44 px tall. The shared process on port `10000` was not changed. Real signed-in browser, image contrast, full focus/visual acceptance, Twitch/OBS, and deployed recovery remain open.

## Earlier documentation/language verification

Checks below were run earlier on 2 November for the documentation/language pass. Later release results above supersede the dependency and lint failures; the table is historical evidence of that earlier scope.

| Check                        | Result                                                                                                                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace typecheck          | Passed: `npm run typecheck`.                                                                                                                                                                                                                                                                  |
| Focused unit tests           | Passed: 31 tests across 10 engine/web/mocked-server files.                                                                                                                                                                                                                                    |
| Production build             | Passed: web and server.                                                                                                                                                                                                                                                                       |
| Mocked browser flow          | Passed: 1 Chrome test covering English Twitch status, HTML language, landing/guide/sample routes, evidence-ID command guidance, local sample interaction, mobile width, and OBS status omission. The sandbox blocked binding the fixture port; the authorized run outside the sandbox passed. |
| Documentation/language audit | Active local links resolve; no remaining Indonesian keyword matches or detected encoding defects. Frozen packs and fixture data remain unchanged.                                                                                                                                             |
| Repository ESLint            | Failed: 10 browser-global errors in unchanged `CoopPage.vue`, `DashboardPage.vue`, and `MainMenu.vue`; 551 warnings. These files match the task baseline byte-for-byte.                                                                                                                       |

The unit/lint commands initially discovered temporary baseline copies inside `.cache`. Those copies were moved outside repository discovery and the commands were rerun; the table records the final runs. No shared service was stopped or replaced.

Full PostgreSQL integration tests were not rerun during that earlier copy/documentation pass; they were rerun during the release pass above. Mocked browser tests do not authorize Twitch, run OBS Studio, deploy to Render, validate all accessibility behavior, or verify a submission.

## Historical integration evidence

The 1 November backend integration log records **60 tests across 16 files**, successful typecheck/build, and ESLint with zero errors and 27 Vue warnings. Its temporary browser harness exercised Q01 creation, rejected input, evidence/link/verdict, idempotent retries, revision recovery, persistence/outbox, and M01 hint progression against an isolated PostgreSQL schema with fake Twitch credentials.

An earlier status snapshot recorded 44 tests and one mocked Chromium scenario. Those totals belong to different code states. Neither historical result is a fresh verification of the current frontend. See [backend history](agent-handoff/BACKEND_PROGRESS.md) and [frontend history](agent-handoff/FRONTEND_PROGRESS.md) for scope and limitations.

## Next integration work

1. Complete authenticated menu/guide/gameplay acceptance beyond signed-out public-page checks. The fresh-install Tailwind dependency issue is resolved.
2. Complete OBS credential controls and remaining host/co-op workflows using the existing API.
3. Recheck M01 hints and client command retry-key integration against current contracts.
4. With separately authorized credentials and services, verify real Twitch → persisted proof → OBS reveal, then two-channel co-op if in scope.
5. Verify the selected Render service/database and deployed version, run player sessions, and prepare truthful demo/submission evidence.

Use the [external verification checklist](agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md). Do not repeat old port/account observations as current facts or infer remote state from this local checkout.
