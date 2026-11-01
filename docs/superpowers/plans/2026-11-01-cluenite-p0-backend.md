# Cluenite P0 Backend Implementation Plan

> Historical implementation plan. Its requirements, checkboxes, authorization, and source precedence belong to the recorded execution. For current work, read [the documentation map](../../README.md), [status](../../STATUS.md), and [current decisions](../../architecture/DECISIONS.md). Do not repeat completed work or carry old permissions into a new task.

> **Executor:** Codex inline with `superpowers:executing-plans`; no parallel workers or commits.

**Goal:** Deliver the single-broadcaster P0 backend with durable sessions, host and read-only overlay authorization, Twitch OAuth/EventSub chat input, and revisioned realtime snapshots.

**Architecture:** Fastify remains the single HTTP and Socket.IO process. PostgreSQL owns sessions, OAuth credentials, user sessions, input deduplication, event history, overlay credentials, and an outbox; the existing pure engine remains the only authority for case transitions. Twitch and database boundaries are injectable so automated tests use local PostgreSQL and deterministic provider fixtures.

**Tech Stack:** Node.js 22, Fastify, PostgreSQL/pg, Drizzle schema, Zod, Socket.IO, built-in Fetch/WebSocket, Vitest.

**Spec:** `docs/reference/Cluenite_Implementation_Ready_v3/00_READ_FIRST/README.md`, `03_ENGINEERING/07_TWITCH_API_AND_PROTOCOL.md`, `03_ENGINEERING/08_DATA_AND_SECURITY.md`, and `04_EXECUTION_SUBMISSION/10_CODEX_IMPLEMENTATION_PLAN.md`.

## Global Constraints

- P0 is one authenticated broadcaster, one real chat source, one proof-backed case, PostgreSQL persistence, and a read-only OBS projection; co-op remains P1.
- OAuth tokens are encrypted at rest and never logged or returned to the browser.
- Every session mutation is checked against the authenticated host; overlay credentials can read only one session projection.
- Chat input is accepted only from the Twitch EventSub adapter, normalized, length-bounded, rate-limited, and idempotent by provider message identity.
- No Render deploy, Twitch app registration, external service mutation, new dependency install, or generated credential is part of this task.
- The local `.env` contains a database URL but no Twitch or encryption credentials; live provider verification must remain explicitly unverified until the owner configures them.

## Threat model

- **Assets:** encrypted Twitch access/refresh tokens, host cookies and CSRF tokens, private case answers, persisted round state, viewer message IDs, and scoped OBS bearer tokens.
- **Actors and boundaries:** anonymous browsers cross into Fastify/Socket.IO; broadcaster identity enters through OAuth; viewer actions enter only through Twitch EventSub; Fastify reads/writes PostgreSQL; OBS receives a restricted projection.
- **Likely attacks:** OAuth login CSRF, session fixation, forged browser chat commands, cross-session reads/writes, replayed EventSub deliveries, leaked overlay URLs, and request/log exposure of OAuth codes or tokens.
- **Required controls:** browser state cookie + origin/CSRF checks, opaque hashed sessions and overlay tokens, AES-GCM token storage, host ownership checks on every mutation, EventSub-only viewer input, row locks + unique dedupe keys, read-only overlay rooms, query/cookie redaction, and bounded command parsing/rate limits.
- **Explicitly outside validation:** real Twitch account authorization and public Render exposure; credentials are absent and no external target will be contacted.

---

### Task 1: Define backend contracts, configuration, and schema

**Files:**

- Modify: `packages/contracts/src/index.ts`
- Create: `apps/server/src/config.ts`
- Create: `apps/server/src/db/schema.ts`
- Create: `apps/server/src/db/migrations/0001_backend.ts`
- Create: `apps/server/src/db/migrate.ts`
- Test: `tests/server/contracts.test.ts`, `tests/server/config.test.ts`, `apps/server/tests/migrations.test.ts`

**Interfaces:**

- Export Zod input schemas for session creation, OAuth identity, EventSub chat envelopes, overlay tokens, and socket joins.
- `parseServerConfig(env): ServerConfig` validates settings and enables OAuth only when its complete credential/key set exists; errors never echo values.
- `migrate(pool): Promise<void>` applies ordered TypeScript-embedded SQL migrations once under a transaction and records migration names.

- [x] Write focused tests for malformed IDs, oversized chat commands, missing optional OAuth configuration, encryption-key length, and migration idempotency.
- [x] Run contract/config tests test-first; migration idempotency is verified in a unique temporary PostgreSQL schema.
- [x] Implement strict schemas, safe config parsing, Drizzle table declarations, and additive SQL tables for Twitch accounts, host sessions, game sessions, processed inputs, session events, contributions, overlays, and outbox.
- [x] Re-run tests against a uniquely named temporary PostgreSQL schema; teardown drops only that schema.

### Task 2: Persist round state transactionally

**Files:**

- Create: `apps/server/src/db/roundRepository.ts`
- Modify: `apps/server/src/rounds.ts`
- Test: `apps/server/tests/roundRepository.test.ts`

**Interfaces:**

- `RoundRepository.create(hostId, caseId, idempotencyKey): Promise<RoundSnapshot>`
- `RoundRepository.snapshotForHost(sessionId, hostId): Promise<RoundSnapshot | null>`
- `RoundRepository.applyInput({sessionId, inputId, actorId, text, source}): Promise<CommandResult>`
- `RoundRepository.control({sessionId, hostId, action, idempotencyKey}): Promise<CommandResult>`
- `RoundRepository.claimOutboxBatch(limit): Promise<OutboxMessage[]>` and `markOutboxPublished(id): Promise<void>`

- [x] Add tests for a complete Q01 proof path, duplicate Twitch message delivery, rejected input with no revision increase, two concurrent copies yielding one transition, state surviving repository recreation, and repeated host-control idempotency.
- [x] Run the tests on an isolated PostgreSQL schema.
- [x] Implement row-locked transactions, validated engine-state serialization/hydration, unique input IDs, event ledger, and transactional outbox writes.
- [x] Verify repository tests and typecheck.

### Task 3: Add OAuth, host sessions, and scoped overlay credentials

**Files:**

- Create: `apps/server/src/auth/crypto.ts`
- Create: `apps/server/src/auth/sessionStore.ts`
- Create: `apps/server/src/auth/routes.ts`
- Create: `apps/server/src/auth/authorization.ts`
- Test: `apps/server/tests/auth.test.ts`, `tests/server/authCrypto.test.ts`

**Interfaces:**

- `GET /api/auth/twitch/start` begins Authorization Code OAuth with a random state cookie and only `user:read:chat` scope.
- `GET /api/auth/twitch/callback` validates state, exchanges code, validates the Twitch access token, resolves the broadcaster profile, encrypts tokens, and issues an opaque HttpOnly host cookie.
- `GET /api/me` returns only safe profile/connection fields and a CSRF token.
- `POST /api/auth/logout` revokes the app session and disconnects the EventSub worker.
- `POST /api/sessions`, `GET /api/sessions/:id/snapshot`, `POST /api/sessions/:id/start|pause|resume|stop`, and `POST /api/sessions/:id/overlay-credential` enforce host ownership and idempotency.

- [x] Test OAuth state mismatch, provider denial, malformed token response, CSRF rejection, session expiry, host cross-session access denial, overlay read-only enforcement, token encryption roundtrip, and safe logout.
- [x] Run auth tests with a stubbed Twitch HTTP boundary.
- [x] Implement keyed hashes for opaque cookies, constant-time state/CSRF comparisons, AES-256-GCM token encryption, minimal session responses, origin checks, and bounded provider errors.
- [x] Re-run auth tests and verify logs do not include query/cookie values by server redaction configuration.

### Task 4: Implement Twitch token lifecycle and EventSub chat adapter

**Files:**

- Create: `apps/server/src/twitch/twitchApi.ts`
- Create: `apps/server/src/twitch/chatEnvelope.ts`
- Create: `apps/server/src/twitch/connectionManager.ts`
- Test: `tests/server/twitch.test.ts`, `tests/server/twitchConnection.test.ts`

**Interfaces:**

- `TwitchApi.validateToken`, `refreshToken`, `getCurrentUser`, and `subscribeChat` use injected Fetch and enforce client ID/status checks.
- EventSub subscribes to `channel.chat.message` v1 with `broadcaster_user_id` and the authorized broadcaster `user_id`, using the WebSocket session ID.
- Notifications normalize only Twitch-supplied user/message/channel IDs and command text; non-command chat is discarded before persistence.
- WebSocket welcome/keepalive/notification/reconnect/revocation/close events are handled; planned reconnect migrates before old socket closes; unexpected loss reconnects and resubscribes without pretending lost events were replayed.

- [x] Test subscription payload/scope, malformed notifications, deduplication through the repository, keepalive timeout, planned reconnect handoff, unexpected reconnect/resubscribe, and revocation.
- [x] Run tests against fake Fetch/WebSocket boundaries.
- [x] Implement bounded retries, refresh-token rotation storage, periodic token validation, reconnection status, and redacted structured logs.
- [x] Re-run provider tests; live Twitch verification remains pending because credentials are absent.

### Task 5: Secure Socket.IO and publish committed snapshots

**Files:**

- Modify: `apps/server/src/realtime.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/web/src/net/roundClient.ts`
- Modify: `apps/web/src/App.vue`
- Test: `apps/server/tests/realtime.test.ts`

**Interfaces:**

- Socket handshake authenticates either the host session cookie or an overlay bearer token sent in Socket.IO `auth`; browser origin must match configured `PUBLIC_ORIGIN`.
- Host may join its own host room and issue dashboard controls; an overlay may join only its scoped read-only room and cannot issue commands.
- Mutations write an outbox record in the same transaction; a publisher broadcasts only committed snapshots with monotonic revision and retries duplicate delivery safely.
- Client reconnect always joins again for an authoritative snapshot; overlay token is read from a URL fragment and never sent as an HTTP query parameter.

- [x] Test unauthenticated joins, cross-owner joins, overlay mutation rejection, session room scope, commit-before-broadcast ordering, and authoritative join snapshots.
- [x] Run Socket.IO tests with an in-process server/client.
- [x] Implement origin/principal authorization, role-specific access, outbox polling with graceful shutdown, revocation checks, and fragment-based overlay credentials.
- [x] Re-run realtime tests and build.

### Task 6: Wire lifecycle, docs, and final acceptance

**Files:**

- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/README.md`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/superpowers/plans/2026-11-01-cluenite-p0-backend.md`

- [x] Add migration-before-listen, startup token validation/recovery, readiness state, and graceful worker/pool shutdown.
- [x] Document local OAuth callback setup, secret formats without secret values, startup/migration behavior, simulation limits, and live-test gaps.
- [x] Run server tests, full typecheck, build, migration idempotency checks, and `git diff --check`; no live Twitch or Render calls were made.
- [x] Re-read the v3 acceptance matrix and update `docs/STATUS.md` using current evidence. Real Twitch login/chat, player playtest, and Render deployment remain unverified.
