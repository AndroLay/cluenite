# Architecture Decisions

**Last synchronized:** 2 November 2026. The working tree contains implemented Q01/M01/C01 backend code and a Vue public site/investigation frontend. This log records current decisions; see [status](../STATUS.md) for dated verification and external gaps.

## Source precedence

| Priority | Source                                                 | Authority in this workspace                                                                                  |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Latest   | Explicit user decisions                                | English language, Cinematic Brown Noir, Render hosting, and authorized task scope override earlier examples. |
| 1        | v3 `00_READ_FIRST` decisions                           | Product direction, scope gates, and non-goals.                                                               |
| 2        | v3 gameplay, contracts, and delivery documents         | P0/P1 acceptance, gameplay and delivery requirements.                                                        |
| 3        | v2.1 Render architecture, preserved inside the v3 pack | Deeper technical rationale where v3 has no newer decision.                                                   |
| 4        | Original v1 blueprint                                  | Case examples, detailed art assets, and earlier design material; adapt and validate before production use.   |
| Local    | This decision log                                      | Maps the source hierarchy to the existing workspace and records implementation status boundaries.            |

## Applied decisions

- **Product and scope:** prioritize one authenticated Twitch broadcaster, real EventSub chat, one deterministic proof-backed case, PostgreSQL persistence, and a readable OBS reveal. Co-op is a P1 stretch that can be claimed only after two real channels pass end-to-end verification.
- **Language:** English for documentation, web/accessibility copy, authored cases, code comments, tests, and development instructions; preserve identifiers, proper names, external user content, and historical quotations.
- **Web entry and samples:** `SiteRoot.vue` serves the public site at `/`, `/play`, `/guide`, `/settings`, `/dashboard`, `/setup`, and `/coop`. The manuscript Quick Case sample is local interface state; M01 has a visual sample. Neither establishes engine proof or Twitch connectivity.
- **Gameplay truth:** use authored proof requirements and server-side deterministic evaluation. Votes and LLM guesses do not determine whether a case is solved. Keep the `Observe -> Connect -> Challenge -> Reveal` reasoning loop and correct theories through evidence.
- **Runtime and packages:** retain the existing pnpm workspace, strict TypeScript, Vue/Vite, Fastify, Zod, Socket.IO, PostgreSQL/Drizzle, PixiJS, and GSAP setup. The existing `packages/ui` holds the reusable design-system work that older references call `packages/design`; do not add a separate test-utils package until implementation requires it.
- **Persistence and recovery:** PostgreSQL is the canonical state. Session actions need idempotency, serialized or safely retried writes, revisioned snapshots, and an outbox before they are treated as production-ready. Socket.IO delivery is a projection; reconnect reconciles against the authoritative snapshot.
- **Twitch and OBS:** viewers participate through ordinary Twitch chat without a Cluenite login. Twitch credentials remain server-side. OBS uses a scoped, revocable, read-only overlay credential.
- **Render:** the user confirmed Andro's workspace. Target one paid always-on Web Service and paid PostgreSQL 18 with 1 GB storage in Singapore, as specified by v3. Keep database ingress private, use `/health/ready`, and deploy manually. `render.yaml` has passed structural validation against Render's current schema. No Cluenite service/database existed at the release inventory check; current provisioning and deployment evidence belongs in the [release record](../operations/BACKEND_RELEASE_2026-11-02.md).
- **Production configuration:** require HTTPS `PUBLIC_ORIGIN` and a Twitch callback at the same origin's `/api/auth/twitch/callback`. Local development may use separate Vite/API origins. Pin Node 22 and pnpm 12.16.1, declare the direct Tailwind dependency, and build before running the full HTTP/PostgreSQL CI suite.
- **Local PostgreSQL:** PostgreSQL 18.6 binaries and the `cluenite` database are local development state under ignored `.local/postgresql`; they are not a Render database and do not establish cloud readiness.
- **Historical gameplay experiment:** the Boolean/refutation experiment from the earlier debate is not the primary mechanic. It may be used only as an authored puzzle type if it satisfies the v3 case proof contract.

## UI inventory and route compatibility

The [v3 screen inventory](../reference/Cluenite_Implementation_Ready_v3/02_DESIGN_CONTENT/04_UI_ART_MOTION_AUDIO.md) defines 18 logical UI entries (13 P0, four P1, one P2), including panels and states. A screen does not need an independent URL to satisfy its content and interaction requirements. P0 acceptance follows the row's `lean`, `basic`, `short`, or `one` scope and the actual user journey. Source presence, browser verification, and real-account acceptance are separate evidence.

The current application retains public site paths and query-based live-session/host links. OBS credentials use the URL fragment. The v3 topology's `/stage/:id`, `/overlay/:token`, and `/coop/:id/*` patterns have not been added as aliases. [The reference index](../reference/README.md#screen-inventory-and-browser-routes) records their current mapping. This reconciliation does not rename routes, move credentials into the path, or implement unfinished co-op UI.

## Package boundaries

`apps/web` may consume `contracts`, `ui`, and `graphics`. `apps/server` may consume `contracts`, `engine`, and `cases`. The engine remains pure and must not depend on Vue, PixiJS, Fastify, Socket.IO, or PostgreSQL. Private case truth must stay out of the public Vite bundle.

Current Pixi scene implementations live in `apps/web/src/scene`; `packages/graphics` exports shared timelines. `packages/ui` currently exports SFX/reduced-motion utilities and legacy tokens, not a complete component library. Active web colors are the `--case-*` values in `apps/web/src/style.css`. Persistence uses Drizzle schema declarations alongside explicit PostgreSQL queries and migrations.

## Documentation maintenance

[The documentation map](../README.md) separates current guides from historical logs and frozen source packs. Preserve source-pack bytes and record deviations in [the reference index](../reference/README.md). Runtime contracts and environment names come from current code and [the API handoff](../agent-handoff/BACKEND_CONTRACTS.md).

## Local versus deployed state

Installed dependencies, the local PostgreSQL server, and `render.yaml` belong to this development workspace. Twitch OAuth/EventSub end-to-end operation and Render deployment remain unverified until tested against real authorized accounts and the actual deployed service.
