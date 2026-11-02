# Architecture Decisions

**Last synchronized:** 3 November 2026. The working tree contains implemented Q01/M01/C01 backend code and a Vue public site/investigation frontend. This log records current decisions; see [status](../STATUS.md) for dated verification and external gaps.

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

- **Viewport gameplay (3 November 2026):** GameWorkspace and EvidenceDialog unify the three local practice cases and non-OBS live presentation. Manuscript retains a stable canvas wrapper through opening/search, fills the viewport, and moves optional Finds/chat away from the room. Completed search opens deductions. Portraits share a generated cast atlas; vector characters use its warm palette. Reduced motion avoids continuous scene/discovery animation.
- **Authored presentation and previews (3 November 2026):** LiveCaseExperience consumes only public RoundSnapshot and existing action grammar. Transport, persistence, private co-op projections, viewer-only station proof, and scoped read-only OBS remain authoritative. `/preview/gallery`, `/preview/festival`, and `/preview/signal` read catalog metadata only. The user explicitly retained Twitch sessions for actual authored play. Session conflicts offer direct continuation rather than silently stopping a hosted case.
- **Product and scope:** prioritize one authenticated Twitch broadcaster, real EventSub chat, one deterministic proof-backed case, PostgreSQL persistence, and a readable OBS reveal. Co-op is a P1 stretch that can be claimed only after two real channels pass end-to-end verification.
- **Language:** English for documentation, web/accessibility copy, authored cases, code comments, tests, and development instructions; preserve identifiers, proper names, external user content, and historical quotations.
- **Web entry and samples:** `SiteRoot.vue` serves the public site at `/`, `/play`, `/guide`, `/settings`, `/dashboard`, `/setup`, and `/coop`. The manuscript Quick Case sample at `/?view=quick` is a playable hidden-object case whose rules run in the browser; M01 has a visual sample. Neither establishes engine proof or Twitch connectivity.
- **Web typography (2 November 2026 closeout):** public, practice, live, and OBS surfaces share EB Garamond and Inter through the root display/body tokens. Both are self-hosted under the SIL Open Font License. Older Fraunces/IBM Plex Sans face registrations remain for compatibility but are not the shared active fonts.
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

The current application retains public site paths and query-based live-session/host links. OBS credentials use the URL fragment. The v3 topology's `/stage/:id`, `/overlay/:token`, and `/coop/:id/*` patterns have not been added as aliases. [The reference index](../reference/README.md#screen-inventory-and-browser-routes) records their current mapping. The 2 November integration connects session discovery, host lifecycle, OBS controls, C01 username invitations, `/coop/invite` consent continuation, authorized workstations and explicit rejoin through existing contracts. This preserves current routes and keeps credentials in fragments. [The integration handoff](../agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) and [dated local evidence](../evidence/frontend-integration-2026-11-02.md) distinguish implementation from real-provider, visual/player and deployed acceptance.

Slice F (2 November 2026) adds public paths `/connect` (S01, reads `GET /api/me`) and `/coop/field`, `/coop/records`, `/coop/shared` (S12–S14). The `/coop/*` paths are labeled sample previews and do not use live session data. These paths follow the existing `/coop` pattern rather than `/coop/:id/*`, which needs a session ID in the path. The browser never imports case data for these previews, because the server filters clues by team and station. Slice F also adds `/offline` (S17), a static interruption page with one server health check, and `/library` (S16), a list built from `GET /api/cases`. The library shows clue and verdict counts only, and it has no tags, difficulty, duration, or solved history, because the API does not provide them. Routes are not aliased to the v3 patterns.

Slice G (2 November 2026) adds `/sample/reveal`, `/sample/stage`, `/sample/evidence`, `/sample/timeline`, `/sample/theory`, and `/sample/verdict` (S05–S10). They are labeled sample previews built from invented data, and they do not read a round, the live overlay, or the live board. Their controls work only on the page, and nothing is saved, timed, or sent. The sample paths do not use the v3 `/stage/:id` pattern, which has no alias in this app. Live presentation stays on `/?session=<id>`. The S05 real overlay widget and the S06 real mystery board stay unbuilt because their components are off-limits in this session. The live S07–S10 boards are also unbuilt.

The sample-case pass (2 November 2026) replaces the static `/?view=quick` page with `SampleCasePage.vue`, a playable hidden-object case: search, links, timeline, claims, and an accusation with a scored reveal. `QuickSamplePage.vue` stays on disk, unrouted. The sample's chat is scripted and labeled, and its `!look <cell>` grid grammar does not exist in live rounds. A live hidden-object round needs engine grammar, authored object lists, and snapshot fields; REQ-FE-007 in `FRONTEND_CONTRACT_REQUESTS.md` records the request.

A later pass the same day added the sample's community and co-op layer: crew calls credited to viewers, chat polls, and a scripted partner station (Station B) that trades records through `!share`. All of it is scripted in the browser. Live crew credit and two-station trading are REQ-FE-008. The same pass replaced the landing hero's photo and the dashboard banner's `plates/office_wide.jpg` with `scene/heroScene.ts`, a scene drawn in code. `site/landing/hero-scene.jpg` remains only as the WebGL fallback.

## Package boundaries

### Browser practice decision - 2 November 2026

`/play#practice` lists three original public browser cases: A Missing Manuscript (`/?view=quick`), Pearls on the Night Express (`/practice/express`), and The Lighthouse Went Dark (`/practice/lighthouse`). These extend the practice catalog without changing authored Q01/M01/C01 or the live command contract. Their chat/partner are scripted, and pinboard scores reset on replay or reload. The shared shell may check account state; practice actions do not become live events.

Lighthouse records early shares without inventing request/quick-handoff credit, and responses respect the partner's discovery schedule. Pause freezes the clock and blocks gameplay controls. Full selected evidence text stays readable outside the constrained card layout. Local engine/browser checks cover these rules; player timing/balance and live backend authoring remain separate. See [frontend progress](../agent-handoff/FRONTEND_PROGRESS.md) for dated evidence.

`apps/web` may consume `contracts`, `ui`, and `graphics`. `apps/server` may consume `contracts`, `engine`, and `cases`. The engine remains pure and must not depend on Vue, PixiJS, Fastify, Socket.IO, or PostgreSQL. Private case truth must stay out of the public Vite bundle. Manuscript, Express, and Lighthouse in `apps/web/src/sampleCase` are deliberate exceptions: they are original browser-only practice cases that the engine never serves, so their answers are public.

Current Pixi scene implementations live in `apps/web/src/scene`; `packages/graphics` exports shared timelines. `packages/ui` currently exports SFX/reduced-motion utilities and legacy tokens, not a complete component library. Active web colors are the `--case-*` values in `apps/web/src/style.css`. Persistence uses Drizzle schema declarations alongside explicit PostgreSQL queries and migrations.

## Documentation maintenance

[The documentation map](../README.md) separates current guides from historical logs and frozen source packs. Preserve source-pack bytes and record deviations in [the reference index](../reference/README.md). Runtime contracts and environment names come from current code and [the API handoff](../agent-handoff/BACKEND_CONTRACTS.md).

## Local versus deployed state

### Pixi scene ownership and presentation — 3 November 2026

Use the existing interactive Manuscript renderer and one shared Pixi scene/effects lifecycle for the other five cases. Express/Lighthouse reuse the authored SVG illustration as independently animated textures, with SVG retained as a failure fallback. Their complete composition is the default, with an explicit compact toggle inside the central scroll area. Main cases build their environments and objects from native geometry in `investigationScene.ts`. Only public `RoundSnapshot` data enters object layout/state. Canvas picking opens inspection, while accepted commands and snapshots remain authoritative for proof; equivalent semantic DOM controls preserve keyboard and fallback access. Resource cleanup destroys only scene-owned textures. Manuscript shares the existing cast atlas across room faces and UI portraits without destroying its shared source. Fullscreen inspection teleports into the active fullscreen element.

Discovery feedback is a noninteractive timed notification; collected evidence is the durable reading surface. Optional command composers and case panels preserve scene space. New Q01/M01 session creation opens the ready scene directly; dashboard continuation remains an explicit host-panel route. Twitch authentication, invitations, private projections and engine validation are unchanged.

OBS now uses a dedicated read-only broadcast card through the existing authorized entry and `QuickCaseView` projection. It preserves URL placement/scale and transparent surroundings, shows actual clue/finding/reveal state and starts no room renderer or ambient sound. This changes presentation only; browser fixture checks do not establish OBS Studio or provider delivery acceptance.

Installed dependencies, the local PostgreSQL server, and `render.yaml` belong to this development workspace. Twitch OAuth/EventSub end-to-end operation and Render deployment remain unverified until tested against real authorized accounts and the actual deployed service.
