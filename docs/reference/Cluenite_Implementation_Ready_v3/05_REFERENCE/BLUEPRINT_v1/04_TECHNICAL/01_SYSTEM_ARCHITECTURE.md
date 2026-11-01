# Technical Architecture — Buildable MVP, Extensible Product

**Read only after gameplay/art docs.** Architecture follows the experience; don't design an enterprise platform before one Twitch round works.

## Recommended fresh-repo stack

- **Monorepo:** pnpm workspaces; TypeScript strict on every package; Node.js 22+.
- **Frontend:** Vue 3 + Vite + TypeScript + scoped CSS/CSS custom properties. Can use an existing Quasar repo rather than migrate. Keep OBS overlays small bundles.
- **API/game service:** Fastify + TypeScript, Zod for runtime validation, `ws` WebSockets for dashboard/overlay broadcast; single process for hackathon.
- **Database:** PostgreSQL (server host), migrations via Drizzle ORM or SQL; SQLite is acceptable only for local fast development if adapters abstracted. Avoid ephemeral production SQLite on hosts without volumes.
- **Twitch:** server-side OAuth authorization-code grant; EventSub WebSockets consuming `channel.chat.message` subscriptions for connected broadcaster accounts; Helix Send Chat Message optional and separate authorization.
- **Assets:** local static build or object storage, WebP/PNG/SVG, CSS/SVG anims; CDN cache with versioned names.
- **Testing:** Vitest unit/integration + Playwright E2E for viewer behavior and browser overlay; replay fake EventSub payloads in explicit `TEST` adapter.

If an actual repository already exists, **inspect it before applying this stack**. Reuse existing tested libraries unless a migration is justified. Architecture is a recommendation, not a claim of existing code.

## Component diagram

```
Twitch Chat A ------┐
                    ├── Twitch EventSub listener(s) (trusted server-only)
Twitch Chat B ------┘                      │
                                             ▼
Twitch OAuth ---> Auth Module ---> Command Parser ---> Anti-spam + Event Dedup
                                          │
                                          ▼
Streamer Dashboard ---- REST ----------> Session Controller
                                          │
                                          ▼
                                  Deterministic Case Engine
                                  (guards/proofs/state)
                                          │
                                DB transaction + event log
                                          │
                                     Realtime Publisher
                                      /      |                                      OBS A   dashboard  OBS B
```

## Boundaries

- **Frontend** displays publicly authorized projection and host controls, never computes authoritative correct answer.
- **EventSub adapter** authenticates Twitch origin and normalizes message events; does not decide game success.
- **Command processor** maps text into intent, verifies participant/session/channel role, applies cooldown/idempotency.
- **Game engine** consumes deterministic domain actions and case spec, returns state transitions and credit events. Pure/side-effect minimal.
- **Repository/event log** commits revisioned events atomically with session state; no double awarding.
- **Realtime gateway** sends filtered state projections based on channel/host/overlay scope; never full truth payload to public clients.
- **OBS overlay** is read-only, no admin privileged endpoints; token only grants a view scope.

## Deterministic transition shape

```
applyAction(caseVersion, sessionState, normalizedAction, actor) ->
  { accepted:boolean, reasonCode?, events:DomainEvent[], newRevision?, projectionDelta? }
```

Server uses DB transaction and optimistic revision check; rejected duplicate event produces no new revision.

## Deployment topologies

**Hackathon:** one long-lived backend with TLS reverse proxy + PostgreSQL; frontend static served on same origin, WebSocket upgrade supported; out-bound EventSub WebSockets remain connected. Managed host must not sleep on idle or lose persistent connections. Production scale beyond one replica requires distributed locks/queue and Redis or separate EventSub worker, **not necessary for submission**.

## Packages

```
apps/web/               # creator dashboard + stage + OBS overlays
apps/server/            # auth, Twitch adapter, API, game engine, ws
packages/contracts/     # Zod payload schemas and type definitions
packages/cases/         # authored, validated case JSON + tests
packages/design/        # tokens + reused UI components
scripts/                # seed, case validate, smoke, eventsub test
```

## Data/control lifetime

`AUTH → CREATE_SESSION → SELECT_CASE_VERSION → START → EVENTSUB_CHAT_ACTIONS → TRANSACTIONAL_DOMAIN_EVENTS → FILTERED_WS_PROJECTIONS → REVEAL → END/PAUSE → RECAP`.

## Reliability design

- Persist after every valid transition, not only at chapter boundaries.
- Auto-resubscribe EventSub on socket reconnect with correct session ID and token; use Twitch notification IDs and chat message IDs for dedupe.
- Browser overlay reconnects, fetches latest snapshot with revision and applies delta sequence.
- If backend cannot verify chat connection, show disconnected and pause instead of silently simulating players.
- Auth token refresh encrypted at rest and kept server-side only; OAuth logout revokes overlay access when requested.
