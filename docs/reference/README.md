# Frozen reference packs

These directories preserve supplied design/specification packages. Original files and manifests remain unchanged. They describe requirements, examples, and historical proposals; they do not report the current implementation or a live deployment.

## Precedence

- [Implementation-Ready Pack v3](Cluenite_Implementation_Ready_v3/00_READ_FIRST/README.md): controlling requirements where later user decisions have not superseded them.
- [Blueprint v1](Cluenite_Complete_Blueprint_v1.0/00_START_HERE/README.md): original case/visual examples; validate and adapt them before runtime use.
- The v3 `05_REFERENCE` directory preserves earlier v1 and v2.1 material. Nested reference examples do not override v3.

Current decisions are in [architecture decisions](../architecture/DECISIONS.md), current guides in [the documentation map](../README.md), and implementation evidence in [status](../STATUS.md).

## Implementation differences

| Reference topic               | Current implementation                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earlier blue/navy palette     | Cinematic Brown Noir; active web values are in `apps/web/src/style.css`, with rules in `apps/web/DESIGN.md`.                                                  |
| Language                      | English for documentation, web content, authored cases, comments, tests, and development instructions.                                                        |
| Environment examples          | Use implemented `PUBLIC_ORIGIN`, `SESSION_SIGNING_SECRET`, `DATA_ENCRYPTION_KEY`, and `OVERLAY_TOKEN_SIGNING_KEY`; older alternative names are not aliases.   |
| Case examples and command IDs | Runtime TypeScript definitions in `packages/cases/src` are authoritative. Q01 links released evidence IDs such as `CAM_R07` and `SCHEDULE_R07`, not clue IDs. |
| Public Quick Case preview     | `/?view=quick` is the separate A Missing Manuscript sample: a playable hidden-object case with browser-side rules, not an engine-validated Q01 run.           |
| Local pinboard practice | `/practice/express` and `/practice/lighthouse` add original public browser cases with scripted chat and a scripted co-op partner. Their scores/proof are separate from live Q01/M01/C01 and reset on reload. |
| Viewport gameplay and public previews | The 3 November frontend adds a shared full-viewport workspace, optional panels, animated inspection, and Manuscript search-to-board transition. `/preview/gallery`, `/preview/festival`, and `/preview/signal` expose catalog metadata only; actual Q01/M01/C01 play remains Twitch-based. |
| Sample observe step           | The manuscript sample adds a hidden-object search over a 10×6 grid (`!look C4`). Live rounds keep the engine's `!look <clue-id>` grammar.                     |
| Sample co-op and crew | Practice co-op/crew/polls remain scripted. Live C01 lobby/consent/workstations use server state; this does not implement practice crew/poll features. REQ-FE-006 has backend and browser wiring. |
| Package naming                | The workspace uses `packages/ui`; it has no separate `packages/design` or test-utils package. Current scenes live in `apps/web/src/scene`.                    |
| ORM/persistence               | Drizzle schema declarations coexist with explicit PostgreSQL queries and additive migrations.                                                                 |
| Completed feature lists       | Requirements and acceptance targets remain targets until source and matching verification support them.                                                       |
| Render and submission         | Infrastructure definitions and example URLs are not evidence of live services or a submitted project.                                                         |

## Screen inventory and browser routes

The controlling [v3 UI inventory](Cluenite_Implementation_Ready_v3/02_DESIGN_CONTENT/04_UI_ART_MOTION_AUDIO.md) contains 18 entries, S00-S17: 13 P0, four P1, and one P2. The same rows appear in the master specification. These entries describe UI surfaces and states, including reveal/collapse and interruption states. They do not require 18 separate pages or URLs. The layout specification allows the stage and evidence/timeline drawer to share a presentation. Apply the stated MVP qualifiers (`lean`, `basic`, `short`, `one`) when assessing P0 coverage.

The older v1 inventory has 16 numbered entries. It already includes Twitch Connect, combined A/B co-op stations, a shared board, and interruption states. v3 reorganizes those concepts; assigning new IDs does not make all of them newly introduced features. Recap and host controls remain requirements even when they are not standalone v3 screen rows.

| v3 architecture route | Current browser entry                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/dashboard` | `/dashboard` main menu, account state and saved-session continuation; active host controls use `/?session=<id>&view=dashboard`. |
| `/stage/:id`          | Live presentation uses `/?session=<id>` and the server's case mode. `/stage/:id` is not an implemented alias.                        |
| `/overlay/:token`     | `/?mode=obs&session=<id>#overlay=<token>`; the scoped credential is in the fragment. The reference path is not an implemented alias. |
| `/coop/:id/*` | `/coop` creates/selects C01 lobbies and username invitations. Authorized live workstations/shared proof use `/?session=<id>`; saved sessions offer explicit partner rejoin. Sessionless `/coop/field`, `/coop/records` and `/coop/shared` remain labeled previews. The v3 path pattern is not an alias. |
| `/coop/invite` | Named-invitee accept/decline uses `/coop/invite?invite=<inviteId>#token=<token>`. The validated token is removed from the visible address and retained for up to 20 minutes in same-tab session storage. Consent continuation and Team B entry pass isolated browser/API checks. |
| `/connect` | Twitch connection status (S01). The OAuth result is a presentation hint; `GET /api/me` confirms identity. Current existing-account readback passes; a fresh real-provider UI flow is separate acceptance. |
| `/stage/:id` (gameplay) | Labeled `/sample/reveal`, `/sample/stage`, `/sample/evidence`, `/sample/timeline`, `/sample/theory` and `/sample/verdict` previews remain local. Live Q01/M01/C01 use authorized query-based session presentation, not those preview routes. |

Public `/`, `/play`, `/guide`, `/settings`, and `/setup` routes supplement these entries. `/connect` (S01) shows the Twitch connection state read from `GET /api/me`, and the `/coop/*` sample previews also supplement them. `/library` (S16) lists cases from `GET /api/cases` without tags, difficulty, duration, or solved history, which the API does not provide. `/offline` (S17) is a static interruption page that makes one `GET /health/live` request when the viewer asks for it; it does not report paused or expired rounds. The six `/sample/*` pages are the S05–S10 gameplay previews. Their data is invented and labeled, and their controls run only on the page. The architecture's route sketch is not a one-to-one inventory of S00-S17. Preserve existing links and scoped overlay authorization; any route migration requires separate implementation and compatibility checks. Current verification belongs in [status](../STATUS.md), not in a count inferred from route names or component boundaries.

The [integration handoff](../agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) and [dated local evidence](../evidence/frontend-integration-2026-11-02.md) describe current connected behavior without claiming complete visual, real-provider or deployed acceptance.

Do not edit frozen files to make historical examples look implemented. Update this index and the relevant current guide, preserving provenance and checksums. Copied JSON fixtures under `packages/cases/fixtures/reference-v1.0` are also reference inputs; production uses authored TypeScript cases and sanitized snapshots.
