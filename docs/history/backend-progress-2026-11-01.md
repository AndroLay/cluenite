> Historical progress record from 1 November 2026. Preserved during the 2 November synchronization. Ports, tests, screenshots, account observations, and uses of “current” apply to the original session. See [current status](../STATUS.md) and the [active handoff](../agent-handoff/BACKEND_PROGRESS.md).

# Backend execution progress

**Owner:** Codex / backend  
**Observed:** 2026-11-01  
**Base commit:** `c320a9b4f876c7e895c98e901678693932dadcce`

## Completed in this execution

- Published [`BACKEND_CONTRACTS.md`](../agent-handoff/BACKEND_CONTRACTS.md) for Claude Code before implementing contract changes. It records existing HTTP routes, auth rules, Socket.IO payloads, snapshots, deployment environment names, and a real Q01 command path.
- Updated `availableActions` in `packages/engine/src/round.ts` so clients receive state-aware action hints. Paused/resolved/invalid rounds return no actions; linking and sequence ordering require visible prerequisite evidence; co-op station/share actions respect team; solve requires complete proof; hints are advertised only while available.
- Added engine coverage in `tests/engine/available-actions.test.ts` for Q01 proof progression, M01 challenge/sequence gating, and C01 team-scoped station/share actions.
- Added an optional, schema-validated `idempotencyKey` to Socket.IO host command/control payloads. `apps/server/src/realtime.ts` passes it through to persisted command/control handling; omitted keys retain legacy behavior using a server-generated UUID.
- Added retry tests in `apps/server/tests/realtime.test.ts` confirming a repeated command/control key returns the same result and does not create another revision.
- Finalized request idempotency across the handler and PostgreSQL repository. A SHA-256 fingerprint covers sorted canonical fields for session, authenticated actor, mutation type, command text/control action, key, and applicable source metadata. Exact retries return the stored result; changed payloads return `IDEMPOTENCY_CONFLICT` / `IDEMPOTENCY_KEY_REUSED` without mutation.
- Scoped command IDs by session, actor, and command/control operation. Authorization and co-op membership checks now precede duplicate lookup, preventing another principal from receiving a cached result. Same-session row locks serialize concurrent retries in the same transaction as state, event, and outbox writes.
- Added additive migration `0005_processed_input_fingerprint` for nullable `processed_inputs.request_fingerprint`; old rows remain readable through actor and legacy action-summary matching.
- Legacy rows whose action summary is 120 characters are rejected as unverifiable because older code truncated the payload. Shorter legacy summaries preserve backward replay using available actor/text fields, but cannot validate metadata the old schema never stored; canonical payload comparison applies to new rows.
- Verified Q01 through the PostgreSQL repository path: premature solve and same-evidence link are rejected; inspecting CAM and SCHEDULE unlocks `CAM_R07` and `SCHEDULE_R07`; linking those evidence IDs and submitting `!solve ROBOT` resolves the case and publishes the reveal; repeating solve does not advance revision.
- Added `apps/server/tests/twitchGameplay.test.ts`: a controlled EventSub fixture passes through the real chat normalizer, `TwitchConnectionManager`, PostgreSQL repository, and Q01 reveal snapshot.
- Added coverage for changed command/control payloads, actor and session isolation, command/control scope separation, concurrent duplicate requests, retry from a new Socket.IO connection, keyless-client compatibility, and fail-closed handling of unverifiable legacy summaries.

## Verification evidence

- Focused engine and realtime tests passed during implementation.
- Full Vitest suite: **59 tests passed across 16 files** with local PostgreSQL running.
- Full TypeScript typecheck passed.
- Production build passed for web and server.
- Targeted ESLint across backend-owned changed TypeScript files passed. Final repository-wide `npm run lint` passed with **0 errors and 27 Vue warnings**. An earlier lint run reported unused imports in the Claude-owned `apps/web/src/scene/caseScene.ts`; the final run no longer reports those errors.
- `prettier --check` on backend changes and handoff docs passed. `git diff --check` passed; Git printed only LF-to-CRLF working-copy notices.
- Backend is running at **`http://127.0.0.1:10001`**. `/health/live`, `/health/ready`, and `/` returned HTTP 200; readiness body was `{"status":"ready"}`. Vite can proxy this port with PowerShell `$env:CLUENITE_API_PORT='10001'; npm --prefix apps/web run dev`.
- Local PostgreSQL 18.6 is running on port `5432` for development and integration tests. This does not establish remote database or Render connectivity.
- Server startup reports auth endpoints disabled until session/encryption keys are configured and `twitchConfigured:false`.

## Unverified or blocked

- Twitch OAuth, token revocation, live EventSub delivery, shared-chat delivery, and real viewer chat were not exercised because usable Twitch app credentials were not configured in the local environment. The local EventSub fixture is not proof of production connectivity; the server reported Twitch as unconfigured and disabled auth endpoints.
- OBS integration and remote Socket.IO clients were not exercised.
- Render configuration was read but not deployed or validated against a live Render service.
- No live Claude Code process was available in this environment. Coordination used the repository handoff document; Claude should report requested changes in `FRONTEND_CONTRACT_REQUESTS.md`.
- The new `IDEMPOTENCY_CONFLICT` `CommandResult` code is additive; Claude should display a generic message asking the host to retry with a new key for a new action.
- Production readiness is not claimed: additional deployment, provider, and operational verification remains outstanding.

## Next backend review targets

1. Validate Render service/database configuration with the actual target environment and a real deployment window.
2. Run Twitch OAuth/EventSub end to end with an authorized Twitch application and verify reconnect/revocation recovery.
3. Review durable outbox retry/backoff and session recovery under process restart and concurrent command load.
4. Reconcile contract requests from Claude through `FRONTEND_CONTRACT_REQUESTS.md` before any breaking API or event change.

## Migration and rollout

- Migration 0005 is additive and nullable. The schema remains readable by older binaries, but mixed old/new binaries are not safe for concurrent mutation handling: old code omits fingerprints and uses different request IDs. Drain old mutation handlers before enabling the new binary. New code reads legacy rows and fails closed when their 120-character summary cannot prove an exact payload match. Do not drop the column during rollback.
- Claude should generate an `idempotencyKey` per logical host command/control and reuse it only for retries of the same payload. `CLUENITE_API_PORT` selects the same backend target for both Vite proxies. The active 10001 server currently has auth disabled; 10000 is the Vite default but its exact source version remains unknown.

## End-to-end integration re-check — 2026-11-01

### Live port observations

- **Port 10000:** `/health/ready` returned `200`, `/api/cases` returned `200`, and `/api/me` returned `401 authentication_required`. This is an auth-enabled API surface, but Windows reported no native listener for the port; it is exposed through a forwarded/hidden listener. I could not identify its PID or exact binary/commit, so its code version remains **unknown**. I did not stop it.
- **Port 10001:** `/health/ready` returned `200`, `/api/me` returned `503 authentication_not_configured`, and `/api/cases` returned `404`. The available process/session evidence identifies PID 6932 as this workspace's `npm --prefix apps/server run start` TypeScript/TSX server started at 20:37. It is current source, but has no session/encryption keys and cannot host authenticated gameplay. I did not stop it.
- **Port 5175:** Vite is active and `apps/web/vite.config.ts` defaults its `/api` and `/socket.io` proxy to `127.0.0.1:10000`. Do not point the current frontend at 10001 until that process has the required auth keys and its build/version is confirmed.
- For a coherent deployment, the web app, REST API, and Socket.IO should share one public origin (`PUBLIC_ORIGIN`). In local Vite development set one `CLUENITE_API_PORT` for both `/api` and `/socket.io`. The browser integration run below used Vite at `5176` with a single proxy target at `10002`.
- The test server on `10002` was started and stopped by the integration harness; it is not a persistent shared endpoint. It used an isolated schema in the local `cluenite` database. The physical PostgreSQL database may be shared with the other local processes, but the test data was isolated by `search_path` and the random schema was dropped after each run. The active processes' database URLs could not be inspected, so do not infer their target schemas from these observations.

### Browser → API → PostgreSQL → Socket.IO → frontend

- A real installed Chrome browser loaded the built Cluenite frontend through Vite (`http://127.0.0.1:5176`) and used one same-origin proxy target (`http://127.0.0.1:10002`). The test server was the current source on a separate port, with local PostgreSQL and a randomly named isolated schema; fake Twitch host credentials were seeded only into that schema.
- Q01 `Q01_GALLERY_SHADOW` was created and started through the authenticated REST API. Browser host commands used Socket.IO. The UI rejected premature `!solve ROBOT`; Q01 had no `hint` action and `!hint` returned `NOT_AVAILABLE`; duplicate evidence linking returned `INVALID / SAME_TARGET`; inspecting CAM and SCHEDULE released `CAM_R07` and `SCHEDULE_R07`; the browser selected and linked those records, submitted verdict ROBOT, and received the resolved reveal.
- Reconnect was exercised by taking the browser offline, sending `!look ACCESS` over a separately connected host socket, replaying the same idempotency key after reconnect, and bringing the browser back online. The retry returned the original `ACCEPTED_NEW` result at the same revision; changing the payload with that key returned `IDEMPOTENCY_CONFLICT` without another revision. The browser rejoined at the current snapshot.
- A stale `session:resync` request returned `session:resync-required`; fetching the snapshot restored revision 4. After further Q01 actions, the browser recovered revision 7. PostgreSQL showed `phase=RESOLVED`, `revision=7`, seven session events, nine processed inputs, and zero unpublished outbox rows. The browser reported zero uncaught page errors.
- M01 hint behavior was exercised against the same running backend: the Mystery Live button revealed hint 1, host dashboard commands revealed hints 2 and 3, `hintLevel` advanced 1→3, `availableActions` removed `hint` after the last authored hint, and another `!hint` returned `NOT_AVAILABLE` without changing the level.
- The harness was temporary under ignored `.cache/`; no credentials or user sessions were used. The final run with the Vite proxy passed. It did not exercise Twitch OAuth, real EventSub chat, OBS, or Render.

### Browser integration issue fixed

- The first real browser attempt exposed an origin-check incompatibility: browser Socket.IO polling requests omitted `Origin` but included a same-origin `Referer`, while the backend rejected the handshake before the WebSocket upgrade. The backend now accepts a credential-free exact-origin `Referer` only when `Origin` is absent. A present foreign `Origin`, foreign/malformed `Referer`, or both missing remains rejected.
- Added a PostgreSQL-backed realtime test for same-origin polling with missing `Origin`, plus foreign referer and mismatched-Origin rejection. See `apps/server/tests/realtime.test.ts`.
- Contract details and two Claude-owned frontend findings are in [`BACKEND_CONTRACTS.md`](../agent-handoff/BACKEND_CONTRACTS.md). `TWITCH_EVENTSUB_CHECKLIST.md` records required provider/OBS/Render evidence.

### Render readiness inspection

- `render.yaml` declares one Singapore web service (`0.5c-512mb`) and one Singapore PostgreSQL database (`0.1c-256mb`), private `fromDatabase.connectionString`, `/health/ready`, a single instance, manual deploy (`autoDeployTrigger: off`), and a host start command that reads Render's injected `PORT` and binds `0.0.0.0`.
- Current Render documentation accepts the configured region, secret fields, generated values, and database connection-string references. An empty database IP allowlist blocks public inbound access; Render private-network connections remain available. `sync:false` values are requested during initial Blueprint creation; when syncing an existing service, set/update them manually in the Dashboard.
- Render CLI is not installed. A Render MCP connector is available, but it reports no selected workspace; its read-only workspace list contains one workspace, `Andro's workspace`. I asked the user to confirm before inspecting live services/databases, so no Render resource or deployment state has been queried. Missing local values are `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, exact `TWITCH_REDIRECT_URI`, and canonical base64 `DATA_ENCRYPTION_KEY`; the `.env` does not contain these credentials. Inspect existing Render values for generated session/overlay keys after workspace confirmation. See [`TWITCH_EVENTSUB_CHECKLIST.md`](../agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md).
- **Local build:** `npm run build` passed for the web and server after this integration change. A plain Vite dev startup initially failed to resolve the frontend's `tailwindcss` CSS import; the temporary test Vite config aliased the package already present in the pnpm store. The frontend package does not declare `tailwindcss` directly, so Claude should reconcile this fresh-dev-install issue. Do not treat the successful local production build as proof of a Render build/deploy.

## Current integration status

- Local browser/API/PostgreSQL/Socket.IO Q01 and M01 hint flows: **tested** with an isolated local schema.
- Current backend source and frontend contract: **compatible for the tested Q01 path**; Socket.IO polling origin fallback is documented. M01 has a UI affordance gap after its first hint (the button is hidden while `currentHint` is present); host commands can still request the remaining hints.
- Stable external API endpoint: **not confirmed** because the exact binary at forwarded port 10000 and any Render service URL/commit cannot be identified from this workspace. Use one shared origin in deployment; use one selected backend port for both Vite proxies in development.
- Twitch OAuth/EventSub, OBS, and Render: **unverified**, with missing credentials and access listed in the checklist.

## User-approved frontend handoff — 2026-11-01

The user reported that the tested game lacked a clear objective, guide, and main menu. They approved a first-run flow that explains Cluenite's Twitch mystery premise, presents truthful mode choices, provides a role/command guide, offers a clearly labeled Q01 sample without Twitch login, and keeps a step-by-step objective rail visible during play. Detailed implementation requirements and a wrong `!link CAM SCHEDULE` example are recorded under “User-approved first-run flow request for Claude” in [`BACKEND_CONTRACTS.md`](../agent-handoff/BACKEND_CONTRACTS.md).

No frontend code was changed by Codex. Per `docs/development/collaboration.md`, Claude owns `apps/web/**` and frontend handoff files. The documented request reuses existing API and snapshot contracts; no backend change is required. Claude still needs to implement and verify the fresh-entry browser flow.

### Verification commands after the integration change

- `npm run typecheck` — passed for contracts, engine, cases, UI, graphics, server, and web.
- `npm test` — **60 tests passed across 16 files**, including the new browser-polling origin regression test, with local PostgreSQL available.
- `npm run build` — web and server builds passed. Rollup printed two dependency annotation warnings from Zod; no build errors.
- `npm run lint` — passed with **0 errors and 27 existing Vue formatting warnings**.
- Focused `npx prettier --check` for changed backend/docs and `render.yaml` passed; `git diff --check` passed.
- Final real-browser Vite/API/PostgreSQL/Socket.IO integration harness passed with no uncaught browser errors. Q01 ended at revision 7 in `RESOLVED`; retry, payload conflict, invalid link, premature solve, Q01 hint absence, recovery, persistence/outbox, and M01 hint progression were asserted.
- `render.yaml` YAML formatting is valid and its declared `0.5c-512mb` web plan and `0.1c-256mb` Postgres plan are current Render plan IDs ([Render compute plans](https://render.com/docs/compute-plans)). Render CLI validation and a live deploy remain unverified.
