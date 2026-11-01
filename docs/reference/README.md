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

Do not edit frozen files to make historical examples look implemented. Update this index and the relevant current guide, preserving provenance and checksums. Copied JSON fixtures under `packages/cases/fixtures/reference-v1.0` are also reference inputs; production uses authored TypeScript cases and sanitized snapshots.
