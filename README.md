# Cluenite

Cluenite is a Twitch-native social detective game. Viewers inspect clues, connect evidence, challenge theories, and help the streamer reach a proof-backed reveal. Authored rules and server-side evidence determine progress.

**Current state:** the Q01, M01, and C01 backend is implemented. Previous local integration runs used PostgreSQL and mocked Twitch. The web app includes a landing page, case menu, guide, settings, investigation boards, host controls, and an OBS presentation. OBS credential issuance and co-op invitations are not yet exposed in the web UI. Real Twitch, OBS Studio, Render, and player acceptance remain unverified. See [current status and verification](docs/STATUS.md).

## Start here

- [Run locally](HOW_TO_RUN.md)
- [Documentation map and source precedence](docs/README.md)
- [Development and English language policy](CONTRIBUTING.md)
- [Frontend target: eight reference screens and implementation sequence](docs/design/frontend-target/README.md)
- [Architecture decisions](docs/architecture/DECISIONS.md)
- [Backend API and realtime contracts](docs/agent-handoff/BACKEND_CONTRACTS.md)
- [Collaboration and ownership](TEAM_PROTOCOL.md)

Documentation, web copy, authored content, comments, tests, and development instructions use English. Preserve established identifiers, proper names, and external user content.

## Experiences

| Experience    | Runtime case                       | Purpose                                                                                                             |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Quick Case    | Q01 — The Gallery Shadow           | A focused evidence-and-verdict round; 30–90 seconds is a design target, not a measured result.                      |
| Mystery Live  | M01 — The Missing Festival Trophy  | A longer investigation with evidence, event ordering, theory challenges, and hints.                                 |
| Co-op Mystery | C01 — Signal of the Invisible Ship | Complementary station actions from two consenting broadcaster accounts; browser invitation controls are unfinished. |

The public Quick Case sample at `/?view=quick` is **A Missing Manuscript**, a local interface demonstration. It is separate from the authored Q01 case and does not validate proof or contact Twitch. The Mystery Live sample is at `/?view=mystery`.

## Workspace and toolchain

Node.js 22.12+ in the Node 22 line; pnpm 12.16.1. The stack is TypeScript, Vue 3/Vite/Pinia, Tailwind CSS, PixiJS 8, GSAP, Fastify, Zod, Socket.IO, and PostgreSQL with Drizzle schema declarations and SQL migrations/queries.

| Path                 | Responsibility                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `apps/web`           | Public site, samples, live investigation presentation, host controls, and read-only OBS presentation. |
| `apps/server`        | HTTP API, OAuth, EventSub ingestion, Socket.IO, persistence, and orchestration.                       |
| `packages/contracts` | Shared Zod schemas and transport types.                                                               |
| `packages/engine`    | Pure deterministic transitions, proof checks, and public snapshots.                                   |
| `packages/cases`     | Versioned authored Q01/M01/C01 definitions; private truth stays server-side.                          |
| `packages/ui`        | Shared audio utilities and legacy token exports.                                                      |
| `packages/graphics`  | Shared browser animation timelines; current scenes live in `apps/web/src/scene`.                      |
| `packages/config`    | Shared TypeScript, ESLint, and Vitest defaults.                                                       |

The active visual direction is **Cinematic Brown Noir**, documented in [web design](apps/web/DESIGN.md). The [eight user-provided target screens](docs/design/frontend-target/README.md) define the visual development target, with shared visuals and public pages first. Frozen blue-palette reference assets do not override it. F1 public pages are implemented; [frontend progress](docs/agent-handoff/FRONTEND_PROGRESS.md) records their verification limits and the remaining live-flow milestones.

## Local setup

Provision a local PostgreSQL database, then follow [HOW_TO_RUN.md](HOW_TO_RUN.md) for environment setup and startup. Never overwrite an existing `.env` or commit secrets. Local tools/data may exist under ignored `.local/` and `.cache/`; these directories are not part of a fresh checkout.

```powershell
npx --yes pnpm@12.16.1 install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Set DATABASE_URL and the required local settings in .env before starting.
npm run dev
```

## Deployment boundary

The user authorized deployment to Andro's Render workspace and creation of the private [AndroLay/cluenite repository](https://github.com/AndroLay/cluenite). `render.yaml` defines one paid always-on web service and a paid PostgreSQL 18 database in Singapore, with private database ingress, manual deploys, and `/health/ready`. The [backend release record](docs/operations/BACKEND_RELEASE_2026-11-02.md) separates local checks, source publication, and actual deployment evidence. Real Twitch credentials and supported Render configuration access are still required; a Blueprint is not proof of a live deployment. See the [external verification checklist](docs/agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md).
