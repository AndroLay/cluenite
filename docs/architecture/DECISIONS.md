# Architecture Decisions

**Status:** Local monorepo bootstrap aligned to the controlling Cluenite Implementation-Ready Pack v3.0. This log records local choices; it does not claim that product features or cloud services are running.

## Source precedence

| Priority | Source | Authority in this workspace |
|---|---|---|
| 1 | v3 `00_READ_FIRST` decisions | Product direction, scope gates, and non-goals. |
| 2 | v3 gameplay, contracts, and delivery documents | P0/P1 acceptance, gameplay and delivery requirements. |
| 3 | v2.1 Render architecture, preserved inside the v3 pack | Deeper technical rationale where v3 has no newer decision. |
| 4 | Original v1 blueprint | Case examples, detailed art assets, and earlier design material; adapt and validate before production use. |
| Local | This decision log | Maps the source hierarchy to the existing workspace and records implementation status boundaries. |

## Applied decisions

- **Product and scope:** prioritize one authenticated Twitch broadcaster, real EventSub chat, one deterministic proof-backed case, PostgreSQL persistence, and a readable OBS reveal. Co-op is a P1 stretch that can be claimed only after two real channels pass end-to-end verification.
- **Gameplay truth:** use authored proof requirements and server-side deterministic evaluation. Votes and LLM guesses do not determine whether a case is solved. Keep the `Observe -> Connect -> Challenge -> Reveal` reasoning loop and correct theories through evidence.
- **Runtime and packages:** retain the existing pnpm workspace, strict TypeScript, Vue/Vite, Fastify, Zod, Socket.IO, PostgreSQL/Drizzle, PixiJS, and GSAP setup. The existing `packages/ui` holds the reusable design-system work that older references call `packages/design`; do not add a separate test-utils package until implementation requires it.
- **Persistence and recovery:** PostgreSQL is the canonical state. Session actions need idempotency, serialized or safely retried writes, revisioned snapshots, and an outbox before they are treated as production-ready. Socket.IO delivery is a projection; reconnect reconciles against the authoritative snapshot.
- **Twitch and OBS:** viewers participate through ordinary Twitch chat without a Cluenite login. Twitch credentials remain server-side. OBS uses a scoped, revocable, read-only overlay credential.
- **Render:** target one paid always-on Web Service and paid PostgreSQL in Singapore, as specified by v3. The checked-in `render.yaml` is configuration only; this workspace has not created or deployed Render resources.
- **Local PostgreSQL:** PostgreSQL 18.6 binaries and the `cluenite` database are local development state under ignored `.local/postgresql`; they are not a Render database and do not establish cloud readiness.
- **Historical gameplay experiment:** the Boolean/refutation experiment from the earlier debate is not the primary mechanic. It may be used only as an authored puzzle type if it satisfies the v3 case proof contract.

## Package boundaries

`apps/web` may consume `contracts`, `ui`, and `graphics`. `apps/server` may consume `contracts`, `engine`, and `cases`. The engine remains pure and must not depend on Vue, PixiJS, Fastify, Socket.IO, or PostgreSQL. Private case truth must stay out of the public Vite bundle.

## Local versus deployed state

Installed dependencies, the local PostgreSQL server, and `render.yaml` belong to this development workspace. Twitch OAuth/EventSub end-to-end operation and Render deployment remain unverified until tested against real authorized accounts and the actual deployed service.
