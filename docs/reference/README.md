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
| Public Quick Case preview     | `/?view=quick` is the separate A Missing Manuscript UI sample, not an engine-validated Q01 run.                                                               |
| Package naming                | The workspace uses `packages/ui`; it has no separate `packages/design` or test-utils package. Current scenes live in `apps/web/src/scene`.                    |
| ORM/persistence               | Drizzle schema declarations coexist with explicit PostgreSQL queries and additive migrations.                                                                 |
| Completed feature lists       | Requirements and acceptance targets remain targets until source and matching verification support them.                                                       |
| Render and submission         | Infrastructure definitions and example URLs are not evidence of live services or a submitted project.                                                         |

## Screen inventory and browser routes

The controlling [v3 UI inventory](Cluenite_Implementation_Ready_v3/02_DESIGN_CONTENT/04_UI_ART_MOTION_AUDIO.md) contains 18 entries, S00-S17: 13 P0, four P1, and one P2. The same rows appear in the master specification. These entries describe UI surfaces and states, including reveal/collapse and interruption states. They do not require 18 separate pages or URLs. The layout specification allows the stage and evidence/timeline drawer to share a presentation. Apply the stated MVP qualifiers (`lean`, `basic`, `short`, `one`) when assessing P0 coverage.

The older v1 inventory has 16 numbered entries. It already includes Twitch Connect, combined A/B co-op stations, a shared board, and interruption states. v3 reorganizes those concepts; assigning new IDs does not make all of them newly introduced features. Recap and host controls remain requirements even when they are not standalone v3 screen rows.

| v3 architecture route | Current browser entry                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/dashboard`          | `/dashboard` account overview; active host controls use `/?session=<id>&view=dashboard`.                                             |
| `/stage/:id`          | Live presentation uses `/?session=<id>` and the server's case mode. `/stage/:id` is not an implemented alias.                        |
| `/overlay/:token`     | `/?mode=obs&session=<id>#overlay=<token>`; the scoped credential is in the fragment. The reference path is not an implemented alias. |
| `/coop/:id/*`         | `/coop` is guidance. Dedicated invitation, workstation, and shared-breakthrough browser flows remain unfinished.                     |

Public `/`, `/play`, `/guide`, `/settings`, and `/setup` routes supplement these entries. The architecture's route sketch is not a one-to-one inventory of S00-S17. Preserve existing links and scoped overlay authorization; any route migration requires separate implementation and compatibility checks. Current verification belongs in [status](../STATUS.md), not in a count inferred from route names or component boundaries.

Do not edit frozen files to make historical examples look implemented. Update this index and the relevant current guide, preserving provenance and checksums. Copied JSON fixtures under `packages/cases/fixtures/reference-v1.0` are also reference inputs; production uses authored TypeScript cases and sanitized snapshots.
