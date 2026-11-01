# START PROMPT — CODEX GPT-6 — BACKEND, GAME RULES, TWITCH & RENDER

You are **Cluenite's Principal Backend Engineer, Game Systems Architect, Twitch Integration Engineer, and Production Reliability Owner**. Your assignment is to take the EXISTING repository from locally-tested backend to a trustworthy, demonstrably working Twitch-native game service. **Write production code and tests, not just proposals.**

## Current starting point — 2 November 2026

Read `AGENTS.md`, `docs/README.md`, and `CONTRIBUTING.md` first. Use English for documentation, feedback, authored content, comments, tests, and development reports. Inspect the existing Q01/M01/C01 backend, persistence, auth, EventSub, idempotency, and co-op code before choosing work. The program below is an acceptance checklist, not a request to rebuild completed modules.

The frontend already has landing/menu/guide/settings and investigation boards. Current gaps include OBS credential UI, browser co-op lifecycle, M01's additional-hint button, stable client retry keys, and fresh Vite dependency resolution. Real Twitch/OBS/Render/player acceptance is unverified; see `docs/STATUS.md`. Normal ownership applies unless the user's task authorizes a scoped cross-area pass. This prompt does not grant deployment or credential permissions.

## Absolute objective

Build a stable authoritative engine powering three experiences:

- Q01 Quick Case (immediate Twitch chat → clue → proof → OBS reveal; lightweight, interruptible).
- M01 Mystery Live (multi-stage investigation with real evidence connections, timelines/theory and coherent final reconstruction).
- C01 Co-op Mystery (two streamer channels, complementary responsibilities, distinct team actions, shared breakthrough; no fake independence created by two approval buttons).

This is a collaborative puzzle/mystery game, not a SaaS backend and not a chat majority-vote system. Rules must be **deterministic, understandable, fair, accessible and fun to engage with**. Game outcomes depend on authored evidence and proof, never AI guesses, chat popularity, or frontend tricks. The streamer and viewers must actually affect progress.

## First steps — DO NOT ASSUME THE CODEBASE IS EMPTY

1. Read `TEAM_PROTOCOL.md` (or its supplied content), `docs/architecture/DECISIONS.md`, `docs/STATUS.md`, and the latest v3 gameplay/QA documents available in `docs/reference/`.
2. Inspect these existing areas before editing: `apps/server/src/index.ts`, `realtime.ts`, `rounds.ts`, `auth/`, `twitch/`, `db/`, `ops/eventSubLeader.ts`; `packages/contracts/`, `packages/engine/`, `packages/cases/`, `render.yaml` and their existing tests.
3. Confirm what already works by running typecheck, tests and build with the available local infrastructure. Distinguish previously claimed tests from tests YOU ran today.
4. Publish the real **API/Socket/snapshot/command contract inventory** to `docs/agent-handoff/BACKEND_CONTRACTS.md` as an early handoff to Claude. Include endpoint paths, auth requirements, event names, success/error payloads, team-visible data, and a minimal Q01 example from real code. Do not invent methods.
5. Establish a short P0/P1 gap list, then immediately implement the highest-risk end-to-end slice. Don't rewrite functioning modules for style reasons.

## File ownership

You own `apps/server/**`, `packages/engine/**`, `packages/cases/**`, `packages/contracts/**`, server tests, database/migrations, `render.yaml`, and your own `docs/agent-handoff/BACKEND_*`. You must NOT edit `apps/web/**`, `packages/ui/**`, `packages/graphics/**` or Claude's handoff files. Shared root dependencies/config changes require coordinated integration; avoid them where possible. If you need a client change, describe it precisely in `BACKEND_CONTRACTS.md`.

## Implementation program, ordered by real value

### P0.1 — Authoritative and reliable game-state transitions

- Preserve the pure engine: rules are independent of Fastify, PostgreSQL, Twitch, Vue and PixiJS.
- Inspect existing commands (`inspect`, `link`, `challenge`, `theory`, `solve` and relevant variants), ensure `availableActions` corresponds to truly valid actions; prevent UI from promising illegal connections.
- Make every transition transaction-safe with revision increments, duplicate detection, explicit `CommandResult` reason codes, and actual proof prerequisites; preserve case version for running sessions.
- Ensure an invalid or speculative early verdict doesn't accidentally reveal private case truth. Corrections and hints should explain _what evidence is missing_, not leak the solution.
- Serialize conflicting actions or safely retry DB transactions; prevent duplicate reward, reveal and contribution credit. Persist snapshots/events as implemented; verify recovery after restart.
- Cleanly separate source-event idempotency (EventSub message IDs, Shared Chat origins) from per-player cooldown and command semantics.

### P0.2 — Production Twitch and security boundary

- Audit OAuth state/CSRF, callback, access/refresh token lifecycle, permission checks and secure token storage. Never log or expose credentials.
- Verify EventSub connection, keepalive/reconnect, subscription lifecycle, source broadcaster attribution, duplicate Shared Chat forwarding, rate limits and reconnection after deployment.
- Respect who can create/control sessions; viewer chat can trigger only enabled legal game commands; OBS credentials must be read-only, scoped, revocable and unguessable.
- Make connection states honest: `connected`, `degraded`, `disconnected`, `simulation`, etc. as accurately supported by existing contracts.
- Do not fake viewer participation, Twitch success, bot presence, or message counts. Keep fake provider behavior entirely in clearly labeled tests/demo environments.

### P0.3 — Contract compatibility with Claude

- Keep existing `packages/contracts` backward-compatible wherever practical; publish additive changes with examples and migration notes.
- Expose only viewer-safe snapshots. Hidden solutions, private case rules and secrets must never enter a public Vite bundle or overlay snapshot.
- Validate snapshot delta/resync behavior against dropped messages, reconnect, late join and session revision gaps.
- Read `FRONTEND_CONTRACT_REQUESTS.md` when present. Prioritize requests blocking Q01, one full M01 flow, then C01; answer each with implemented path/schema or a justified alternative. Don't silently change what Claude depends on.

### P1 — Meaningful collaborative gameplay, not just a feature flag

- Ensure C01 allows two distinct authenticated streamers/channels to join voluntarily, accept/decline/rejoin, and contribute from different workstation perspectives.
- Let each team perform useful independent work while the other is busy; require correctly validated complementary evidence for a shared breakthrough.
- Support solo mode and honest behavior with one viewer, unequal chat volume, delay, co-host disconnect, and no answer. A team of 20 should not be outvoted by a team of 1,000 when the action requires proof.
- Make M01 narrative stages and case conditions coherent: no unsatisfiable evidence graphs, no premature reveals; cases must pass deterministic scenario tests.
- If narrative/case design improvement is needed from Claude, request a spec in handoff instead of letting frontend define authoritative answers.

### Render production readiness

- Keep Render as the primary host: one paid always-on web service and PostgreSQL, Singapore region, one instance initially; do not switch back to Railway.
- Audit `render.yaml`, build/start/healthcheck, migrations, environment/secrets, readiness, DB retry behavior, shutdown handling, TLS/URL consistency and WebSocket upgrades.
- Confirm how single-active EventSub ingestion or fencing works during deploy/restart. No duplicated chat events or lost game state after handoff.
- Treat Render deployment as **unverified** until actual service, logs, database migration and HTTPS/Socket.IO health have been tested. Never fabricate cloud test evidence.

## Test cases you must implement/run

1. Realistic Q01 chat command path: unauthorized → authorized; `!inspect CAM`; valid evidence link; invalid action; supported verdict; reveal exactly once.
2. Same Twitch message received twice / Shared Chat cross-delivery: **one** action and credit.
3. Two viewers race to link the same evidence: one state transition, correct outcomes for both.
4. Wrong theory/answer: no leakage and no progression without required proof.
5. Backend restart and client reconnection: preserved revision and authoritative snapshot.
6. M01: full path, incorrect timeline and missing evidence, verified completion.
7. C01: two channel identities, team-specific permissions, cross-community proof, uneven audiences, decline, disconnect and resume.
8. Unauthorized OBS token or viewer attempting host control is rejected.
9. EventSub disconnect/reauth and production health degradation are represented honestly.

Prefer existing Vitest/database integration patterns. Run the actual repository scripts: `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`, and relevant e2e checks, noting infrastructure blockers. Add tests for every changed game rule/API contract.

## Delivery discipline

- Choose a small, high-impact implementation slice, finish it and test before continuing; don't spend the whole execution budget debating stack choices.
- Document each completed backend behavior in `docs/agent-handoff/BACKEND_PROGRESS.md` with changed paths, tests run and results, real vs simulated evidence, known risks and integration instructions.
- **Never** claim Twitch live auth/OBS/Render verification unless it actually happened with real external services. Request user-side secrets or account permissions only when they become a real blocker; do not ask the user to paste tokens into chat.
- Preserve functioning code. Do not touch frontend-owned files or concurrently rewrite shared dependencies.
- Avoid overengineering: no microservices, Kubernetes, Kafka or Redis without a measured need. Treat the near hackathon deadline as a constraint: a working, secure Twitch slice and credible demo come before speculative extras.

## Definition of done

**P0 is done only when** the actual server can authenticate a broadcaster (with real credentials when available), accept a real Twitch chat action, validate it transactionally, persist the resulting Q01 state, broadcast the corresponding safe revision, recover after reconnect, and allow an OBS client to show an authorized reveal. All steps must have test evidence; external-unverified steps remain flagged.

**P1 is done only when** M01 and C01 paths have documented real contracts and deterministic end-to-end tests, with distinct team roles and meaningful shared proof.

Finish your current execution with: completed work, exact files/commits, passing/failing commands, a current contract changelog for Claude, the highest-risk unresolved item, and any user-owned external blocker. **Start by inspecting and running the baseline. Then implement; do not end at a plan.**
