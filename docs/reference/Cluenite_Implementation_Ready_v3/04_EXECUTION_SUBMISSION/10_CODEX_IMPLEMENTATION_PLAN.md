# 10 — Codex Execution Plan: Milestones, Dependency Graph, Tests and Cut Lines

## Guiding instruction for Codex

**Implement observable gameplay, not documents alone.** Do not mark any workstream complete without a passing test or real demonstration. All code claimed for hackathon must be eligible new work during official Oct 23–Nov 2 2026 submission window; old reference designs are inputs only. Start by auditing actual repo and available credentials; if none exists, scaffold a minimal monorepo, not a full platform.

## Critical dependency order

```text
Repo audit / locks / scripts
        |
   Pure case engine + Q01 authored data --- Unit tests / case validator
        |
Fastify session actions + PG state + dedup + transaction
        |
Twitch OAuth + EventSub chat (REAL provider)
        |
Socket.IO authorized snapshot/revision + Vite OBS overlay
        |
  SINGLE CHANNEL END-TO-END DEMO   <- FIRST FREEZEABLE MILESTONE
        |
Short M01 Mystery Live extension -> evidence board + timeline + recap
        |
Co-op two broadcaster invite/consent + B17 joint proof (only if core stable)
        |
Visual polish, reliability regression, Render deploy, demo, submission
```

Parallel tasks should only be used for independent deliverables, e.g., art asset production + tests after contracts are agreed. **Do not** parallelize two agents editing the same engine or schema file without a single integrator reviewing conflicts.

## Workstream 00 — repo/project audit

**Inputs:** `README.md`, archived v1 blueprint, v2.1 Render ADR, new v3 pack, actual repo status and credentials **availability (not values)**.

**Tasks:**
- Read every v3 file and open cases. Discover existing code; reuse working framework if migrating would risk deadline.
- Write `docs/STATUS.md` with verified current state, actual commands, environment requirements and honest missing items.
- Pin Node LTS, pnpm, Vitest/Playwright, TS strict; `.gitignore` for `.env`/tokens; `pnpm-lock.yaml`.
- Set scripts `lint`, `typecheck`, `test`, `build`; don't invent scripts in deployment config before they exist.

**Done:** clean install and build from fresh clone; no secrets, missing contracts or misleading status.

## Workstream 01 — domain engine first

- Implement `packages/contracts` Zod `GameAction`, `CaseDefinition`, `ClientSnapshot`, `DomainEvent`, `CommandResult`.
- Implement deterministic pure reducer for `inspect/link/challenge/verdict/pause/resume`, later `order` for M01 and `scan/verify/share` for C01.
- Author and pin Q01; separate public view from private solution; add `validateCase` tool and proof dependency graph verifier.
- Write tests for guessed answer with missing evidence, wrong link, duplicate link, all valid path, negative verdict, invalid content.

**Done:** given same state + action + case definition, deterministic result; no runtime provider/library required. Q01 test suite passes with proof locked until prerequisites. Unique IDs/no dead-end path validated.

## Workstream 02 — server + database

- Fastify boot, Drizzle schema/migrations with PostgreSQL, session create/start/pause/resume/stop, snapshot route, safe role checks.
- Transactional action runner with per-session row lock or CAS, unique `processed_inputs`, session revision, event ledger, contributions, outbox.
- Authenticated host cookie and short session ID with non-guessability/access authorization; scoped overlay token.
- Structured logs, `/health/live`, `/health/ready`, graceful SIGTERM.

**Done:** two simultaneous duplicate actions cause one proof unlock; process restart preserves latest proof and revision; no admin mutations from overlay token. Integration tests pass using test DB.

## Workstream 03 — Twitch integration

- Twitch Developer app configured with user-provided credentials in local/Render env, never committed.
- OAuth auth-code callback with state and token storage, `user:read:chat` where appropriate and valid provider scopes; EventSub `channel.chat.message` subscription from real authorized broadcaster context.
- EventSub WebSocket lifecycle handling and normalized source broadcaster/user IDs; error states on revocation/reconnect.
- Case command grammar with `!look`, `!link`, `!solve`, bounded rate limit and idempotency. Avoid sending bot chat replies initially unless really needed.

**Done:** **real** Twitch test account message appears as normalized input with authentic provider ID, changes DB and event log, duplicate EventSub message cannot repeat state. Simulated developer events explicitly labeled test only.

## Workstream 04 — client + OBS vertical slice

- Vue app dashboard connects Twitch, chooses Q01, creates session, displays connected state, generates scoped OBS URL.
- Dedicated minimal transparent Quick overlay renders stage, objective, contextual command legend, evidence card, verified link and reveal. Mainly HTML/CSS/SVG. No Pixi dependency in initial entry unless necessary.
- Socket.IO authenticated rooms and versioned delta, snapshot resync on reconnect; appearance consistent with Cluenite tokens; collapsed/paused/offline states.
- GSAP only for 1 evidence unlock and 1 final reveal at first; normal state must remain readable without animations.

**Done:** actual Twitch `!look CAM` followed by `!link ...` results in correct overlay reveal, streamer's primary game scene remains visible, refresh restores snapshot, read-only overlay cannot cheat.

### Hard checkpoint: P0-FUNCTIONAL

After Workstream 04, **freeze a runnable submission candidate**. If anything else endangers deadline, polish and submit this, not a larger broken app. One solid chat-to-evidence demo is more valuable than fake multi-stream prototype.

## Workstream 05 — authored mystery case

- Build short M01 variant with one opening/photo inspect, one timeline/order challenge, one supported theory contradiction and final proof/reconstruction.
- Stage + evidence board layout and hint ladder. Add progress checkpoint and skip/hint without lying about solve.
- Ensure content clearly differs from simple trivia, shows 'false theft during blackout' inference challenged by earlier transfer evidence.

**Done:** a novice can start, discover, attempt an incorrect theory, receive a fair clue and reach the supported verdict; replay/refreshed stage never loses factual evidence. Record actual playthrough.

## Workstream 06 — P1 co-op signature (conditional)

**Entry:** core Twitch chat + OBS proof stable, second broadcaster account accessible, sufficient time for testing.

- B authenticates and explicitly accepts invite. Two EventSub `channel.chat.message` subscriptions, per-team origin routing, optional Shared Chat dedup.
- Separate A Field and B Records projections; `!scan P4` and `!verify B17` create different factual evidence.
- Authored cross-station proof requires both outputs; two channel overlays receive one joint event and same revision.
- Disconnect B, prove local work remains possible and joint gate pauses; reconnect restores snapshot.

**Done:** actual independent live chats have each produced at least one distinct proof artifact; no scripted second streamer. If untested or fake, **do not claim co-op implemented**.

## Workstream 07 — art/polish/performance

- Original Q01/short M01 illustrated plates and proof cues with clean typography. Align with art bible and legacy design tokens, not generic random AI art.
- Optional PixiJS enhanced scene and GSAP timeline only where measurable impact; maintain transparent OBS compact mode with mostly DOM content.
- Implement skip/reduced-motion and scene cleanup; test OBS while game is running.

**Done:** 720p readability and smaller compact size pass manual QA, no strobe/audio jumps, no continuously wasteful GPU tickers. UI reveals cannot visually contradict case truth.

## Workstream 08 — Render live release and official submission

- Provision one paid Render Web Service and paid Postgres in Singapore, check credits and billing, exact OAuth callback, env secrets, migration and health.
- E2E real stream demonstration on deployed HTTPS URL, OBS browser source, creator dashboard, no invented participants.
- Codex session ID copied from **actual thread used to build project**, never invented; README install/eval instructions; devpost description + case screenshots + demo video under 3 minutes on YouTube.
- Submit and verify submission status before official deadline; keep judge-accessible project available through judging period.

**Done:** video is actually published, demo footage authentic, repository reproducible and no secrets, Devpost shows submitted entry rather than draft.

## Task status board template

```md
| ID | Owner | Priority | Dependency | Acceptance evidence | Status |
|----|-------|----------|------------|--------------------|--------|
| G01 | Codex | P0 | Audit | Vitest proof tests passing | TODO |
| T01 | Codex | P0 | G01 | Real EventSub message received | TODO |
| O01 | Codex | P0 | T01 | OBS video shows accepted proof | TODO |
| M01 | Codex | P0 | O01 | Recorded end-to-end mystery | TODO |
| C01 | Codex | P1 | M01 + B account | Two live chats complete joint proof | BLOCKED |
```

Review status from concrete tool output/screenshots/logs, not a model's confidence statement.

## Cut ladder (critical)

1. Drop extra Quick Case designs/assets.
2. Reduce long case to three good proof events, not a 45-minute scripted game.
3. Drop P1 co-op if it cannot be live tested, while retaining truthful concept description as future feature.
4. Replace fancy Pixi filters/SFX with a clear GSAP/CSS reveal.
5. **Never drop real Twitch chat, objective verified evidence, clear OBS output, credential safety, or submission documents.**

## A disciplined Codex workflow

Each workstream: `inspect files → plan targeted changes → implement smallest coherent slice → run tests/build → inspect visual/OBS → update STATUS and decision log → commit working code`. Separate implementation from peer-review/audit where possible. No large parallel refactoring during live demo stabilization. Do not claim to have deployed unless Render endpoint and logs confirm.
