# CLUENITE — Final Technical Architecture v2.1 (Render Edition)

> Historical reference. This document preserves an earlier design/debate phase; its internal instructions, source claims, example commands, environment names, and handoffs are not current startup instructions. Follow [the documentation map](../README.md), [current decisions](../architecture/DECISIONS.md), and [status](../STATUS.md). The v3 pack and later user decisions take precedence.

**Status:** Approved architecture target; Render migration of hosting decision only (not deployed)  
**Product:** Twitch-native cooperative puzzle, mystery and deduction experience  
**Coverage:** Quick Case (OBS companion), Mystery Live (solo channel), Co-op Mystery (two channels)  
**Architecture principle:** Gameplay-first modular monolith, server-authoritative state, deterministic puzzles, versioned cases, lightweight rendering, real Twitch participation.

## 0. Architectural decision

Use a **TypeScript pnpm monorepo**, containing:

- **Web:** Vue 3 + Vite + TypeScript strict + Tailwind CSS + Pinia for UI-only state.
- **Game presentation:** PixiJS 8 (selective WebGL 2D scenes) + GSAP (timelines) + DOM/CSS/SVG (accessible text, controls, evidence cards).
- **Backend:** Node.js supported LTS + Fastify + TypeScript strict + Zod; modular monolith with domain boundaries.
- **Realtime to browser/OBS:** Socket.IO, server-managed rooms, monotonically increasing case revisions, snapshot/replay protocol.
- **Game logic:** pure deterministic reducer/state machine + content-specific proof rules; no model determines authoritative answers.
- **Persistence:** PostgreSQL + Drizzle ORM/migrations; session row locking or revision CAS; idempotent input, durable event log, transactional outbox.
- **Twitch:** backend OAuth 2.0 Authorization Code + PKCE; Twitch Helix APIs; EventSub `channel.chat.message` via WebSocket for the initial single instance. A transport adapter allows a later move to signed Webhooks or Conduits.
- **Hosting for submission:** one **paid, always-on Render Web Service** with HTTPS and WebSocket upgrades, plus **paid Render Postgres** in the same Singapore region; serve built Vue/Vite assets and the API/Socket.IO from one origin. Use the internal PostgreSQL connection string. Add CDN/static hosting only if measured needs justify it.
- **Tests:** Vitest, Fastify inject, Playwright, Twitch payload fixtures, PostgreSQL integration test, and explicit live-Twitch/OBS smoke test.

This is not microservices, does not require Redis, Kafka, Kubernetes, Next.js, SSR, three.js, AI inference at runtime, or a full game engine such as Unity/Godot.

## 1. Why this shape

1. **Stream compatibility:** OBS is already a browser-capable environment; no extra native game install. Quick Case uses a tiny composition and does not steal GPU time unnecessarily.
2. **Two timelines, one engine:** Quick/long/co-op are case configurations on a shared deterministic state machine; do not create separate backends per mode.
3. **One source of truth:** Concurrent Twitch messages cannot be adjudicated by clients or animations. Database commit precedes visual effects.
4. **Reliability without distributed complexity:** With one backend replica PostgreSQL transactions and a local realtime gateway are enough for MVP; future horizontal scale has explicit boundaries.
5. **Polished visuals:** Vue handles high quality readable UI; Pixi handles scene artwork and visual effects; GSAP coordinates transitions. Art quality comes from assets and timing, not framework choice.
6. **Hackathon fit:** actual Twitch integration + testable live gameplay + understandable setup and demo take precedence over speculative infrastructure.

## 2. Core system diagram

```text
  CHANNEL A CHAT      CHANNEL B CHAT
        |                  |
        +---- TWITCH EVENTSUB -----+
                                   |
                          Twitch Transport Adapter
                          (WebSocket initially)
                                   |
                         Normalize + Deduplicate
                                   |
                          Action Router / Limits
                                   |
      TWITCH OAUTH --> Fastify API / Auth / Roles <-- Creator dashboard
                                   |
                          Session Application Layer
                                   |
                  Deterministic Game Domain Engine
                 (proof, puzzle, evidence, state machine)
                                   |
                 PostgreSQL transaction (lock session)
                 State + domain events + outbox record
                                   |
                            Outbox dispatcher
                                   |
                           Socket.IO gateway
                              /         \
                       OBS Overlay    Mystery Stage
                              \         /
                            View-only or host-scoped projections
```

**Non-negotiable:** client/OBS never receives full hidden solutions, cannot award points, and cannot issue a privileged action by merely knowing an overlay URL.

## 3. Monorepo shape

```text
cluenite/
  apps/
    web/                   # creator dashboard, stage, overlay routes
    server/                # Fastify REST + OAuth + EventSub + Socket.IO
  packages/
    contracts/             # shared Zod schemas, public wire types
    engine/                # pure deterministic reducer, proof evaluators
    cases/                 # versioned case JSON, authoring validator, fixtures
    ui/                    # design tokens, accessible DOM components
    graphics/              # Pixi scene controllers, GSAP timelines
    config/                # eslint/typescript/vitest configs
  scripts/                 # migrations, seeds, replay, test-event fixtures
  docs/                    # decisions, integrations, runbook, threat model
  pnpm-workspace.yaml
  package.json
  .env.example
```

Only `contracts`, `engine`, and `cases` are shared with the server in its runtime. `graphics` is client-only and must never be imported by the server. Keep server's case answer keys out of public Vite asset builds: publish a *sanitized public projection* separately.

## 4. Backend modules and ownership

| Module | Owns | Does NOT own |
|---|---|---|
| `identity` | Twitch OAuth, secure sessions, scopes/token refresh | puzzle results |
| `twitch-ingress` | EventSub transport, event authenticity/provenance and normalization | game scoring |
| `chat-actions` | command grammar, throttling, actor/channel resolution | hidden case solutions |
| `sessions` | create, start, pause, resume, end, join/invite/roles | graphics |
| `case-catalog` | immutable versioned case manifests, validation | live transitions |
| `game-engine` | guard checks, evidence/proof rules, domain events | network I/O |
| `coop` | team partition, turn/workstation permissions, joint proofs | Twitch platform chat |
| `persistence` | transactions, state, event log, outbox, idempotency | animation |
| `realtime` | authenticated rooms, projections, revision-aware broadcasts | ground-truth state |
| `operations` | health, tracing, rate-limit metrics, structured logs | user-facing lore |

Each module exposes a narrow service interface; domain engine should ideally be a pure function: `applyAction(caseDef, currentState, action, actor) -> accepted/rejected transition + events`. All validation that depends on current state is re-checked inside the transaction.

## 5. Gameplay domain

### 5.1 Shared case structure

Immutable `CaseDefinition` with `caseId`, `version`, `locale`, `difficulty`, `modeCompatibility`, `chapters`, `scenes`, `evidence`, `interactions`, `puzzles`, `theories`, `requirements`, `solutions`, `hints`, `animationCues` and `creditsPolicy`.

`CaseDefinition` stays server-private if it contains answers. Public `CaseProjection` contains only currently visible evidence, tasks, text, images, permitted actions and animation cues. Each session pins exactly one case version at creation; updating the catalog does not rewrite in-progress cases.

### 5.2 Session FSM

```text
CREATED -> LOBBY -> READY -> ACTIVE -> REVEAL -> COMPLETED -> ARCHIVED
                          |           |
                          +-> PAUSED <-+
                          |             
                          +-> CANCELLED
```

Quick round has compact stage configuration; Mystery Live has chapters; Co-op has workstation assignments and joint checkpoints. Cases may have `UNSOLVED`, `PARTIAL` and `INCORRECT_VERDICT` outcomes without modifying predetermined ground truth.

### 5.3 Domain actions

`InspectEvidence`, `LinkEvidence`, `OrderEvents`, `SubmitCode`, `ProposeTheory`, `ChallengeTheory`, `PerformTest`, `RequestHint`, `SubmitVerdict`, `ChangeChapter`, `PauseSession`, `ResumeSession`, `InviteCoHost`, `AcceptInvitation`.

No generic text LLM extraction in P0; short registered command aliases map to typed actions. A user may submit useful actions independently of streamer selection when rules permit it; host-only actions require authenticated creator role.

### 5.4 Proof model

A proof is a versioned, deterministic predicate over evidence IDs and prior verified facts. For example `Has(E-CAMERA-R07) && Has(E-SCHEDULE-R07) && Linked(E-CAMERA-R07,E-SCHEDULE-R07)`. A correct *observation* must not be incorrectly treated as a solved *culprit verdict*. Every case has authoring-time tests demonstrating soundness, reachability, non-contradiction and proper unlock order.

## 6. Twitch integration

### 6.1 Authentication

- Streamer logs in through Twitch OAuth authorization-code flow with PKCE, server-side callback and verified state/nonce as applicable. Keep access/refresh tokens encrypted at rest and only server-side.
- For the initial installed broadcaster integration, request **minimum necessary** `user:read:chat`; add `user:write:chat` only if the product actually needs to send replies. If shifting to an independent cloud bot, follow Twitch's `user:bot` / `channel:bot` authorization pattern and app tokens.
- Use HttpOnly, Secure, SameSite session cookies for web dashboard, CSRF protection where relevant, and role checks on every REST/Socket action.
- Viewers may participate via Twitch chat without a Cluenite account; use verified Twitch user ID from EventSub, never a nickname typed into chat.

### 6.2 EventSub adapter

P0: one active EventSub WebSocket connection per needed authorized identity/connection group, observing Twitch's per-token connection/subscription limits. Handle welcome, keepalive, reconnect, revocation, authorization expiry, and subscribe/re-subscribe carefully. A single instance must own subscription state.

Post-MVP: transport-neutral ingress can move to EventSub Webhooks with raw-body HMAC-SHA256 verification and challenge handling, or Conduits for many channels. Twitch's WebSocket and Webhook transports use different token requirements; the adapter hides these from the game modules.

### 6.3 Normalized chat event

```ts
interface ChatActionEnvelope {
  eventsubMessageId: string;
  twitchMessageId: string;
  sourceMessageId?: string;
  broadcasterId: string;
  originBroadcasterId: string;
  actorTwitchId: string;
  receivedAt: string;
  messageText: string;
}
```

Shared Chat can replicate the same message to multiple connected channels. Preserve both the delivered channel and original channel, deduplicate canonical source message before awarding contributions, and route by `originBroadcasterId` to Team A/B. Shared Chat is useful but not required: each connected stream can have its own subscription and role routing.

### 6.4 Chat commands (examples)

`!look A`, `!link A B`, `!time A C B`, `!theory T1`, `!challenge T1 E4`, `!hint`, `!solve ROBOT`.

Commands are case-specific, discoverable from visible choices and ideally have short aliases. Parse exact grammar/known IDs, cap length and frequency, ignore unrelated messages, combine duplicate intent per round, and throttle bot replies. Do not parse entire chat as unrestricted natural-language commands for P0.

## 7. Transactional action path

1. Normalize Twitch event / authenticated dashboard action.
2. Resolve session and current role; validate command syntax + basic input limits.
3. Begin PostgreSQL transaction; lock session (`SELECT ... FOR UPDATE`) or use compare-and-swap revision with retry.
4. Check idempotency: EventSub message ID AND canonical Twitch message ID, with origin-aware dedup for Shared Chat.
5. Load pinned case definition, current state, current revision.
6. Run domain guards/proof engine and compute accepted transition.
7. Persist new state/revision, domain events, contributions, and outbox entry atomically; record idempotency key.
8. Commit; asynchronously push filtered delta via Socket.IO.
9. If the gateway/publisher crashes, replay undispatched outbox. Clients verify revision and resync on gaps.

Failed actions should not mutate state; limited invalid attempts may be aggregated for UX/anti-spam rather than written as unbounded permanent per-message audit records.

## 8. PostgreSQL schema

| Table | Core columns / constraints |
|---|---|
| `twitch_accounts` | `twitch_user_id` unique, display name, encrypted token reference, scope/version, token expiry |
| `creator_sessions` | internal session id, creator Twitch id, created/updated timestamps |
| `cases` | case id, immutable version, content hash, status, public metadata |
| `game_sessions` | id, case id/version, phase, revision bigint, snapshot jsonb, host id, timestamps |
| `session_channels` | session id + Twitch broadcaster ID unique per live participation, team id, invite acceptance |
| `session_participants` | session id + Twitch user ID + channel affiliation, role, first/last seen |
| `session_events` | id, session id, revision unique per session, event type, payload jsonb, actor, timestamp |
| `processed_inputs` | platform+canonical message id unique, session id, action/result, processed at |
| `contributions` | session id + event id + actor id + kind unique, eligibility rules, optional credit |
| `outbox` | id, event id unique, destination, payload, sent_at, retry count |
| `overlay_credentials` | hashed opaque bearer credential, permitted session/view, expiry/revocation |
| `coop_invites` | token hash, sender/receiver, TTL, accepted/rejected, role assignment |

Useful indices: `(session_id, revision)` on session events, `(session_id, team_id)` on participants, `outbox(sent_at, created_at)` for pending dispatch. Use expiration/retention policies; do not retain unrelated chat messages indefinitely.

## 9. Browser realtime protocol

- `GET /api/sessions/:id/snapshot` returns `revision`, `phase`, `visibleEvidence`, `objective`, `allowedActions`, `timer`, `team`, `sceneCue` scoped by credential.
- On Socket.IO connect authenticate host cookie or restricted overlay token, join one `session:<id>:role:<view>` room (room authorization is server-enforced).
- `session:delta`: `{sessionId, previousRevision, revision, changes[], cues[]}`.
- `session:resync-required` when a revision is missing; client fetches snapshot, ignores stale deltas, then resumes.
- Viewer input comes through Twitch Chat rather than unsigned client socket. Host controls are privileged REST requests (or authenticated Socket actions) with CSRF/authorization and idempotency keys.
- Socket.IO's ordinary delivery is at-most-once; revisions and snapshots make missing packets recoverable. Neither Socket.IO nor PixiJS is the truth store.

## 10. Frontend rendering and design boundaries

### Vue / DOM layer

Responsible for text-heavy information, navigation, clues, readable labels, forms, accessibility, creator setup, activity feed, responsive layouts, evidence and theory cards. Use Tailwind tokens based on existing Cluenite art guide; rely on native font/layout/browser input controls.

### PixiJS 8 layer

Only for layered investigation scenes, animated magnifying effects, limited particles, parallax, evidence trail graphics and cinematic visual transformations. Production renderer preference `webgl`; one canvas per active stage; no background 60fps scene when idle. Load scenes and textures lazily. Render at controlled device-pixel ratio and size; cap filter passes. Prioritize sprites and atlases over unnecessary realtime shaders.

### GSAP layer

Single motion orchestration layer: start/stop/skip/reverse timeline for evidence linkage, card entrance, contradiction stamp, chapter transitions, reveal and cross-community breakthrough. Use timeline lifecycle cleanup on Vue component unmount. Keep animations state-derived; do not let completion of an animation trigger authoritative proof. Respect reduced-motion settings.

### OBS constraints

Use a separate `/overlay/:token` route and small entry bundle. Transparent background, baseline 1920×1080 scene with responsive scaling, safe zones for camera/game HUD, no mouse-dependent interaction, high-contrast legible text. Quick Case mostly DOM/SVG; only mount Pixi on moments that gain from it. Pause or reduce animation when hidden; auto-hide after completion. Audio cues optional with streamer control and browser autoplay restrictions honored.

## 11. Security and safety

- OAuth secrets/tokens server-only, encrypted and redacted in logs; no keys committed to repository.
- Overlay URL is a revocable, scope-limited, random secret; store only its hash; allow safe rotation. **Not an admin credential.** Because OBS URLs can leak in screenshots/configurations, restrict them to read-only projections.
- No untrusted markup injection, arbitrary asset URLs, unrestricted query execution, or arbitrary viewer-supplied scripts.
- EventSub transport authenticity/authorization is verified in adapter. Chat events are idempotent; dashboard actions require role checks.
- Spam controls per sender/session/action, cooldowns, per-round claim cap, bot-message suppression, rate limiting and moderation-friendly UX.
- Never publish hidden solutions to public clients, even in scene payloads, preloaded assets, or source maps.
- Strict retention of chat-linked identifiers, user opt-outs where relevant, simple privacy policy and data deletion procedure.
- No fabricated Twitch events or viewer counts; demo-only fixtures clearly marked `SIMULATION`.

## 12. Failure behavior

| Failure | Expected behavior |
|---|---|
| Twitch/EventSub disconnect | Preserve case, display degraded connectivity, pause chat-dependent countdown, reconnect/recover subscriptions |
| OBS overlay refresh | Re-authenticate read-only credential, fetch snapshot, resume from revision without awarding duplicate credit |
| Two chat messages race | DB session serialization; deterministic single winner or shared valid credit per documented policy |
| Duplicate webhook/Shared Chat message | Canonical input unique key; ignore duplicate |
| Co-streamer disconnect | Save progress; pause joint-only tasks; other team may continue independent tasks |
| Backend restart | Load persisted sessions, replay outbox, restore ingresses and session readiness |
| Slow render/GPU | Low-effects mode, lower resolution, disable filters, static DOM/SVG fallback for Quick Case |
| Invalid case version | Reject activation in CI/publish pipeline and fail closed, never assign arbitrary verdict |

## 13. Testing, observability and performance

**Contract/unit:** Zod schemas, command parser, deterministic proof rules, role rules, state machine and replay of stored events.

**Integration:** PostgreSQL transactions, simultaneous actions, unique constraints, OAuth callback state, EventSub WebSocket sample payloads, token refresh, shared chat dedup, outbox redelivery, Socket.IO snapshot/resync.

**E2E:** streamer login + room creation + overlay install + real Twitch message + action validation + case completion + two-streamer invite/accept + disconnect/rejoin, with an explicit local simulated mode used for CI.

**Case authoring:** fixture tests enumerate valid and invalid solutions, required evidence, unlock ordering, duplicate submissions, hint fallback, false accusation and alternate branch outcomes.

**Metrics:** p50/p95 inbound-message-to-committed-state latency; p95 commit-to-visual-delta; invalid command ratio; dropped/resync delta rate; EventSub reconnect and subscription health; OBS frame pacing; client heap/VRAM when available; Quick Case solve/abandon and replay metrics. Set budgets after measuring on target device. Aim for visually smooth 60 FPS while moving, near-zero animation overhead while static, and an understandable first action without tutorial.

## 14. Deployment on Render (replaces Railway)

### 14.1 Submission topology — ONE live application

```text
Twitch OAuth + outbound EventSub WebSocket
                    |
                    v
        Render PAID Web Service — cluenite-app (Singapore)
        Fastify + Socket.IO + Twitch listener + game engine
           |                   |                   |
           |                   |                   +-- GET /overlay/... (OBS)
           |                   +-- Dashboard / Stage (built Vue/Vite static assets)
           +-- Internal DATABASE_URL (same-region private network)
                                  |
                                  v
                    Render PAID Postgres — cluenite-db
                    Persistent state, actions, event log, outbox
```

**Rationale for Render:** The user already has Render credits, so use the existing balance when it applies to these services. Render supports public inbound WebSockets for Socket.IO and outbound WebSockets for Twitch EventSub; it supplies HTTPS URLs, Git-backed deploys, health checks, and a managed PostgreSQL offering. No change is needed to Vue, PixiJS, GSAP, Fastify, PostgreSQL schemas, or the game engine.

### 14.2 Mandatory hosting choices

1. **Render Web Service: paid, non-sleeping, single instance.** Do not use Free for an EventSub-dependent live submission: a Free service spins down after 15 minutes without inbound HTTP or inbound WebSocket activity. Twitch's outbound EventSub WebSocket connection must not be treated as a guarantee against spindown. Even an active long-lived websocket does not guarantee a Free service stays awake through all idle situations.
2. **Render Postgres: paid** for durable game sessions and backup/recovery. Free Render Postgres expires after 30 days, has 1 GB storage, lacks managed backups and pooling. Choose the smallest paid database tier that meets measured capacity and backup requirements; revisit memory and connections after load testing.
3. **Region: Singapore for the initial deployment**, with database and web service in the *same* region to use the private network. This is a latency-informed default for initial operations from Indonesia, not a claim that it is optimal for all global Twitch viewers.
4. **Single public origin** initially: HTTPS frontend, OAuth callback, REST, Socket.IO, and read-only OBS overlay. This avoids premature CORS and cross-origin cookie issues. Keep secrets server side.
5. **Single Render application replica** until leader election, socket fan-out, and worker scaling have passed explicit tests. Zero-downtime deploy may temporarily overlap old and new containers: implement a PostgreSQL-backed *EventSub ingestion leader lease / advisory lock* with fencing or equivalent singleton coordination, so two instances cannot independently accept the same stream of actions. Retain idempotency constraints in any case.
6. **Host/port:** Fastify listens on `0.0.0.0` and `Number(process.env.PORT)`; Socket.IO shares the same HTTP server/port. Render expects a public listener (its default port is 10000 when not otherwise configured); do not hardcode a second public websocket port.
7. **No local persistence:** the service filesystem is ephemeral across deploy/restart. Store case state and durable events in PostgreSQL; versioned static art belongs in the immutable web build or external object storage if it grows.

### 14.3 Deployment commands and infrastructure-as-code

- Maintain `render.yaml` (Blueprint) once package names and scripts are implemented. Put it in the monorepo root so workspace dependencies are visible during build; avoid setting `rootDir: apps/server` if the build needs `/packages/*` from above.
- The build must install the pinned pnpm workspace dependencies and produce both the Vite client bundle and compiled Fastify server. The **exact commands depend on the repository's real package names and scripts**; do not pretend that a sample `render.yaml` is deployable before those exist.
- Set `NODE_ENV=production`, `DATABASE_URL` from Render Postgres's `fromDatabase` reference, and all Twitch OAuth encryption/session secrets in Render environment variables. Never commit credentials or callback secrets.
- Confirm `TWITCH_REDIRECT_URI` exactly matches the Render HTTPS callback URL registered in the Twitch developer console. After changing origin, update the registration and test the whole OAuth flow.
- Apply Drizzle migrations in a controlled pre-deploy step *only after* migration scripts exist and have been tested. Prefer forward/backward compatible migrations. Do not run arbitrary seed scripts in production startup.
- Provide `/health/live` (process) and `/health/ready` (HTTP readiness); check database connectivity carefully without making transient Twitch outages trigger endless instance restarts. Configure Render's `healthCheckPath` to an appropriate readiness endpoint.
- Explicitly handle `SIGTERM`: stop accepting new actions, drain durable outbox safely, release EventSub leader ownership, stop Twitch subscriber, and close Socket.IO/HTTP gracefully.
- Disable auto-deploy during the critical live demo window unless the new release is thoroughly tested. Render deploys can close active WebSocket sessions when old containers terminate, even when incoming HTTP requests are zero-downtime. Reconnect the OBS clients and reload the authoritative snapshot.

### 14.4 OAuth, EventSub, Socket.IO and persistence readiness

- **Twitch EventSub WebSocket** is outbound from Render to Twitch. On a connection loss, resubscribe all relevant events; Twitch does **not replay notifications lost during reconnect**. Show an accurate `Twitch chat reconnecting` indicator and do not fabricate missed actions.
- **Socket.IO** connections from OBS/dashboard are inbound to Render; on reconnect, fetch an authoritative snapshot and reconcile the game `revision` counter before resuming animation.
- **Render rollout overlap:** a replacement instance may run in parallel before the previous instance receives SIGTERM. The leader lock prevents duplicate EventSub ingestion; database idempotency prevents repeated actions. Ensure session state is in PostgreSQL rather than instance memory.
- **Database internal URL:** prefer private service-to-database URL in the same region; avoid public Postgres URLs for runtime connections.

### 14.5 Performance, credit, and spend guardrails

- Recommended starting point: **one paid Web Service** plus **one paid PostgreSQL instance**; no separate worker, Redis, or separate frontend static service unless profiling demands it.
- For the demo, use a paid web compute size with adequate Node memory and WebSocket headroom. Consider `0.5c-512mb` only after smoke testing and a larger `1c-2g` tier if memory/realtime throughput requires it. These are choices to benchmark, not guaranteed capacities.
- Measure server heap, CPU, DB connections, Socket.IO clients, Twitch reconnect frequency, and action-to-overlay latency. Render outbound WebSocket traffic may contribute to outbound bandwidth usage.
- **Render credits are a cost advantage, not an absolute spending cap.** Inspect Render Billing to confirm remaining balance, expiration/eligibility, usage and any overage exposure before enabling paid instances. Disable unnecessary preview environments/services and unnecessary auto-deploys to preserve credits.

### 14.6 Scale path (after hackathon)

If demand justifies scale, separate EventSub ingress into a leader-managed process or use authenticated/signed Webhook or Conduits. Introduce Redis/Render Key Value for Socket.IO cross-replica broadcasting and coordination only when scaling beyond one app instance. Use proper session ownership or transaction locking and idempotency across all replicas. Host large game artwork on object storage/CDN once measured benefits justify it.

### 14.7 Live acceptance checks

- Paid app stays responsive through 30+ minutes with no viewer chat, then accepts a fresh Twitch message without cold-start delay.
- End-to-end Twitch OAuth works on the deployed HTTPS callback.
- Chat `!inspect`, `!link`, and `!challenge` update both dashboard and OBS exactly once.
- Render deploy/restart and forced EventSub reconnect recover subscriptions and correctly display connectivity; missed Twitch messages are not forged.
- OBS reconnect loads latest PostgreSQL snapshot and does not replay stale animation as a fresh award.
- Two channels can join one shared case without double-counting messages.
- Metrics and logs contain no Twitch tokens, private secrets, or hidden answer keys.

**Official docs:**
- https://render.com/docs/websocket
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/postgresql-creating-connecting
- https://render.com/docs/regions
- https://render.com/docs/deploys
- https://render.com/docs/health-checks
- https://dev.twitch.tv/docs/eventsub/handling-websocket-events/

## 15. Milestones and scope

| Priority | Definition of done |
|---|---|
| P0-A | A Twitch streamer can log in, create a Quick Case, copy a working OBS URL, and a real chat message resolves a valid clue with visible feedback. |
| P0-B | One polished short case with invalid-answer handling, hint, deterministic reveal and stored contribution. |
| P0-C | One multi-stage solo Mystery Live case using the same engine and clear proof-gated final verdict. |
| P1 | Two consenting Twitch streamers connect different channels/workstations into one session, each contributing a non-trivial proof to shared resolution. |
| P2 | More case families, autonomous BRB, advanced content generator, relay, creator analytics and horizontal scale. |

**Submission rule checkpoint:** Build must comply with the Oct 23–Nov 2, 2026 creation window, show genuine Twitch interaction and Codex work, provide accessible repository/setup, Codex session ID, and a public/accessible YouTube demonstration under three minutes. Check current Devpost rules before submission.

## 16. Design decisions and alternatives declined

| Decision | Why | Alternative declined now |
|---|---|---|
| Vue 3 + Vite | Fast iteration, existing experience, great UI/document scene fit | React/Next.js: not inherently visually superior, SSR unnecessary |
| TypeScript strict | One language, shared contracts, safer state machines | Split Rust/Go + TS: extra integration overhead for no demonstrated need |
| PixiJS selectively | GPU-accelerated 2D rendering where beneficial | Full Pixi UI: hurts native typography/accessibility/perf; Godot/Unity: OBS integration friction |
| GSAP | One coherent cinematic timeline system | Multiple motion engines and overlapping lifecycles |
| Fastify modular monolith | Lean HTTP backend and explicit modules | Microservices and NestJS rewrite if existing app already works |
| Socket.IO | Rooms and reconnect ergonomics | Raw `ws`: lighter but more custom room/reconnect work; still valid if already implemented |
| PostgreSQL + Drizzle | ACID, robust concurrency, schema migration, TS experience | In-memory/SQLite on ephemeral hosting as production source |
| EventSub WebSocket first | Easy small-scale Twitch chat ingress without webhook signature setup | Webhook from day one: scalable but more OAuth/bot/HMAC setup |
| Single paid always-on Render Web Service + paid Render Postgres | Uses existing credits, supports HTTPS/Socket.IO/Twitch EventSub, managed persistence; simple single-origin deployment | Free sleeping compute, Kubernetes or multiple services for MVP |
| No Redis initially | Single live instance and PG transactions are enough | Redis as an unnecessary P0 dependency |
| No AI verdict | Fair, testable, reproducible puzzle outcomes | LLM judges inventing or contradicting solutions |

## 17. Verification sources

- Hackathon requirements and judging: https://twitchcon-codex.devpost.com/rules
- Twitch EventSub `channel.chat.message` and Shared Chat source metadata: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
- Twitch EventSub WebSocket transport requirements/limits: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- Twitch signed webhook option: https://dev.twitch.tv/docs/eventsub/handling-webhook-events/
- Twitch cloud/installed bot permission models: https://dev.twitch.tv/docs/chat/authenticating/
- OAuth: https://dev.twitch.tv/docs/authentication/
- PixiJS v8 application/renderer: https://pixijs.com/8.x/guides/components/application
- OBS Browser Source implementation: https://github.com/obsproject/obs-browser
- Socket.IO delivery: https://socket.io/docs/v4/delivery-guarantees/
- Render WebSockets and web service hosting: https://render.com/docs/websocket ; https://render.com/docs/web-services
- Render paid vs free limitations: https://render.com/docs/free
- Render managed PostgreSQL and private URL: https://render.com/docs/postgresql-creating-connecting
- Render Blueprints and deploy lifecycles: https://render.com/docs/blueprint-spec ; https://render.com/docs/deploys

**Final invariant:** One case engine, one authoritative transactional state, one verifiable Twitch identity/source per action, one revisioned projection path, and visual effects that never decide truth.
