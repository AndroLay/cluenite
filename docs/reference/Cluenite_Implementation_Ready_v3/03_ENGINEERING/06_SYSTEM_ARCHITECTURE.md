# 06 — Authoritative System Architecture and Repository Design

## Primary architectural decision

**Single-region Modular Monolith** on Render with a **pure deterministic domain engine**, PostgreSQL transactional state, Twitch inbound adapter, and Socket.IO browser gateway. Vue/DOM/SVG handles information-heavy interface, PixiJS WebGL enhances illustrated scenes selectively, and GSAP orchestrates motion. A one-instance service is correct for hackathon reliability; scale out only after explicitly adding leader/room distribution.

## Logical topology

```text
Twitch broadcaster A/B OAuth ───────┐
Twitch chat via EventSub WebSocket ──┼──> Render paid Web Service (single main app)
                                    │      Fastify HTTP + OAuth + session API
                                    │      TwitchAdapter (normalization/health)
                                    │      ActionRouter + auth + rate limits
                                    │      GameSessionManager (serialize state)
                                    │      Pure Case/Proof Engine
                                    │      Socket.IO Gateway + outbox publisher
                                    │             |            ^
                                    │             v            |
                                    │         Render PostgreSQL
                                    │             |
                                    └── HTTPS client routes (same origin):
                                           /dashboard (creator)
                                           /stage/:id (mystery)
                                           /overlay/:token (OBS read-only)
                                           /coop/:id/* (host workstations)
```

**One application** means one deployable service, **not** all code in one file. Domain engine does not import Fastify, Twitch, Drizzle, Vue, Pixi, GSAP or Socket.IO. External adapters call pure actions with typed actor and case state; apply result in transactional repository.

## Technology stack and explicit reasons

| Component | Pick | Why this, not over-engineering |
|---|---|---|
| Core language | TS strict on Node.js LTS | Domain contracts shared with Vue; protects large event/state surface. Not faster than JavaScript by itself. |
| Monorepo | pnpm Workspaces, optionally Turborepo later | One lockfile and shared contracts; skip turbo until truly needed. |
| Frontend | Vue 3 + Vite + Pinia | Straightforward reactive UI, efficient composition, independent OBS entry; no SSR benefit required. |
| Styling | Tailwind + design tokens | Consistency and fast responsive iteration; generated CSS purge and intentional bundle. |
| Visual | PixiJS 8 selectively | GPU illustrated scenes / layered evidence, not every text card or dashboard. |
| Motion | GSAP | One orchestration layer for DOM and Pixi scene cues; use CSS for trivial hover. |
| Backend | Fastify | Small runtime, plugin-friendly API; existing NestJS repo may be retained rather than migrated. |
| Browser realtime | Socket.IO | Rooms/reconnect/acks, but use snapshot/revisions for durability. |
| Persistent truth | PostgreSQL | ACID per-session state + evidence + unique input IDs, transactional outbox. |
| ORM | Drizzle | Explicit SQLish migration/query control and TS schemas. |
| Validation | Zod | Boundary schema for chat envelope, API payloads, case content. |
| Twitch | OAuth Auth Code + EventSub chat | Real, user-consented channel action source. |
| Hosting | Render paid Web Service + paid Postgres, Singapore | Existing Render credits; official inbound/outbound WebSocket support; same-origin deploy. |
| Unit/E2E | Vitest, Playwright | Proof property tests and browser/OBS-like flows. |

**Do not add** Redis, Kafka, Kubernetes, Three.js, Next.js/SSR, RAG, vector database, paid LLM inference, WebGPU-only renderer, Unity/Godot or independent microservices for P0.

## Monorepo skeleton

```text
cluenite/
  apps/
    web/
      src/app, pages, components, stores, router
      src/overlay/quick, stage, coop
      src/graphics/pixiScenes, motion, assets
    server/
      src/main.ts
      src/modules/auth, twitch, sessions, commands, coop, realtime
      src/db/schema, migrations, repositories
      src/infra/outbox, observability, health
  packages/
    contracts/   # Zod schemas + TS types: events, actions, views
    engine/      # pure case state machines, proof guards and reducers
    cases/       # server-private case defs + validated public metadata
    design/      # tokens, reusable visual system
    test-utils/  # deterministic fake event adapters (labeled TEST ONLY)
  assets/         # original/licensed source + optimized runtime assets
  docs/           # design, authoring, security, demo and development evidence
  render.yaml     # only after actual scripts are in place
  pnpm-workspace.yaml
  .env.example
  README.md
```

### Domain module boundaries

- **Auth:** Twitch accounts, OAuth callback, session cookies, refresh, consent, overlay-credential creation.
- **Twitch:** EventSub WebSocket lifecycle, chat event normalize/dedup, connectivity.
- **Session:** create/start/pause/resume/stop, choose/lock case version, checkpoints.
- **Commands:** parse bounded grammar, rate limits, authorization, idempotency.
- **Engine:** pure `(state, action, case) -> transition/result` returning events and proof/explanation; no IO.
- **Co-op:** invitations, team assignments, scope, shared proof gates, reconnect rules.
- **Realtime:** role-scoped projections, rooms, delivery, resync, outbox publish.
- **Content:** schema validation and authoring report; precompiled private truth.

## Transactional action pipeline

1. Twitch adapter receives legitimate chat event or Fastify gets authenticated host request.
2. Validate envelope, case-local grammar, role and cooldown; derive **canonical idempotency key**.
3. Begin PostgreSQL transaction; `SELECT ... FOR UPDATE` target session row or optimistic CAS with safe retry.
4. Enforce `processed_inputs` uniqueness, resolve pinned case version and current revision.
5. Execute pure domain engine action and determine `ACCEPTED_NEW` / no-op / rejection.
6. Persist snapshot/revision, action event, factual contributions and outbox entry **atomically**.
7. Commit; outbox publisher emits filtered `session:delta` to correct authorized rooms.
8. OBS/dashboard clients apply only contiguous revision; missing delta triggers fresh snapshot.

**Order and consistency:** a valid new transition must increment session revision exactly once. Retried Twitch event must not create duplicate credits or reveal. Outbox may send twice, so client de-duplicates by event/revision.

## State machine

`DRAFT → READY → ACTIVE ↔ PAUSED → RESOLVED | PARTIAL | CANCELLED`. `COOP_WAITING` substate is allowed before ACTIVE. External connection health (`TWITCH_CONNECTED`, `RECONNECTING`, `REVOKED`) is **separate** from logical case phase; one Twitch outage should not erase the case. Server timers freeze while paused. Domain actions during PAUSED return no change.

## Rendering and client ownership

- Pinia owns ephemeral UI preferences, focus, animation progress and a **projection** of server state. It does not decide proof truth.
- DOM/SVG owns readable text, evidence cards, timelines, keyboard-accessible interactions.
- PixiJS only mounts one active scene canvas where needed, using WebGL production default and lazy loaded atlas/scene assets. Stop scene ticker when idle or hidden, cap DPR and expensive filters.
- GSAP is the single motion orchestrator for reveal, contradiction, camera movement and UI transitions; cleanup on unmount, reduced-motion fallback.
- OBS overlay is a **scoped, read-only view** with no admin controls and no Twitch tokens.

## Scalability path

Single-instance startup is simpler, but Render deployments can overlap old/new container lifetimes. Use a **fenced PostgreSQL leader lease / advisory lock** for the EventSub connection owner, plus input idempotency, to avoid double processing. For many instances later: split ingest worker, reliable transport, Redis for cross-replica Socket.IO if necessary, or Twitch Webhooks/Conduits following provider requirements. Keep engine independent so transport changes do not alter game rules.

## Deferred architecture questions to test empirically

Exact instance memory, event-to-overlay p95, max usable viewers, browser GPU cost, amount of animation and case authoring throughput. Set benchmarks on real OBS+game host before claims of 'best FPS' or '1,000 viewers'. Do not claim a measured capacity without a load test.
