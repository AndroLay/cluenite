# Architecture

Cluenite is a TypeScript workspace that separates the browser experience, live service, game rules, and public contracts.

## Runtime components

| Component                             | Responsibility                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                            | Vue and Vite public site, browser practice, host interface, case presentation, and OBS display.                           |
| `apps/server`                         | Fastify HTTP service, Twitch OAuth and EventSub, host authorization, Socket.IO updates, and static production web assets. |
| `packages/contracts`                  | Runtime-validated request, response, command, and snapshot shapes shared across the browser and server.                   |
| `packages/engine`                     | Deterministic session transitions and proof validation without browser, provider, database, or rendering dependencies.    |
| `packages/cases`                      | Authored case definitions used by the server to evaluate live rounds.                                                     |
| `packages/ui` and `packages/graphics` | Shared interface utilities and presentation timelines.                                                                    |

The root package manager is pnpm 12.16.1. The supported Node line is 22 (`>=22.12.0 <23`); PostgreSQL 18 stores live application state.

## Live data flow

1. A broadcaster authorizes Cluenite with Twitch OAuth. Server-side credentials are encrypted before persistence.
2. Twitch chat events arrive through EventSub. The server validates and deduplicates input before the deterministic engine evaluates an action.
3. PostgreSQL stores the authoritative session changes and corresponding events. Socket.IO publishes authorized updates; reconnecting clients can request a fresh snapshot.
4. The browser renders viewer-safe snapshots. Host actions require an authenticated session, while viewer contributions are received from Twitch chat.
5. OBS receives a scoped read-only session projection. Its credential can be replaced or revoked independently.

Browser practice samples are intentionally separate: their scripted interactions run locally and do not create engine-validated live proof. Live case truth and proof rules remain server-side.

## Boundaries

- Keep the engine independent from Vue, PixiJS, Fastify, Socket.IO, and PostgreSQL.
- Keep private authored solutions and provider credentials out of the public web bundle.
- Treat PostgreSQL as the source of persisted session state. Realtime delivery is a client projection, not the authoritative record.
- Keep OBS read-only and scoped to its session; do not use its credential for host controls.
- Local mocks and simulation help development but do not establish production Twitch, OBS Studio, or player acceptance.

For the available routes, request shapes, and authentication behavior, see the [API guide](api.md). For production hosting and the CI-to-Render release boundary, see [deployment](deployment.md).
