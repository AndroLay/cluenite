# Repository map

Cluenite keeps application code, operational instructions, verification evidence and historical material in separate locations. Paths below are relative to the repository root.

## Root policy

The root contains two Markdown entry points: [README.md](../README.md) for people and [AGENTS.md](../AGENTS.md) for repository-specific agent instructions. Build, package-manager, test, CI and deployment configuration stays where its tooling expects it. Documentation cleanup does not relocate application source or configuration.

```text
cluenite/
├── README.md                 Product, screenshots and quick start
├── AGENTS.md                 Repository instructions
├── apps/
│   ├── server/               Fastify, Twitch, persistence and realtime
│   └── web/                  Vue site, practice and live presentation
├── packages/
│   ├── cases/                Versioned authored content and reference fixtures
│   ├── contracts/            Shared transport schemas
│   ├── engine/               Deterministic game rules and safe projections
│   ├── graphics/             Browser animation utilities
│   └── ui/                   Shared browser/audio utilities
├── tests/                    Shared tests and browser fixtures
├── scripts/                  Deterministic repository maintenance
├── docs/                     Guides, handoffs, evidence and archives
└── .github/                  CI and contribution entry point
```

Application/package READMEs remain next to their source. Use [the documentation home](README.md) for the complete guide map.

## Where to put a document

| Material                                  | Destination                | Convention                                                                                                                        |
| ----------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Current setup or contributor instructions | `docs/development/`        | Describe the current source, with commands run from the root.                                                                     |
| Current architectural choice              | `docs/architecture/`       | Record rationale and compatibility implications.                                                                                  |
| Contract or cross-agent handoff           | `docs/agent-handoff/`      | Keep current reconciliation above historical progress.                                                                            |
| Operational procedure                     | `docs/operations/`         | Distinguish local, tunnel and deployed environments.                                                                              |
| Dated check result                        | `docs/evidence/`           | State date, source, environment, outcome and untested boundary. Existing backend records stay in operations and are indexed here. |
| Screenshot                                | `docs/assets/screenshots/` | Capture the actual app; maintain route, date and sample boundaries in the manifest.                                               |
| Design requirement/reference              | `docs/design/`             | Preserve source context; requirements do not prove implementation.                                                                |
| Superseded prompt or transcript           | `docs/history/`            | Preserve provenance; do not use as the current assignment.                                                                        |
| Supplied specification                    | `docs/reference/`          | Keep frozen packs unchanged; edit only their surrounding index.                                                                   |

Prefer descriptive lowercase filenames for new guides, and include a date for historical prompts or evidence. Established uppercase handoff filenames remain compatible. Avoid adding a second guide for an already documented workflow.

## Root notes relocated on 2 November 2026

| Former root file                             | Canonical location                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `CONTRIBUTING.md`                            | [Development guide](development/contributing.md)                                   |
| `HOW_TO_RUN.md`                              | [Local setup](development/local-setup.md)                                          |
| `TEAM_PROTOCOL.md`                           | [Collaboration](development/collaboration.md)                                      |
| `INTEGRATION_AND_RUNBOOK.md`                 | [Integration runbook](operations/integration-runbook.md)                           |
| `GAMEPLAY_DEBATE.md`                         | [Historical transcript](history/gameplay-debate.md)                                |
| `CLUENITE_FINAL_ARCHITECTURE_v2.1_RENDER.md` | [Historical v2.1 architecture](history/architecture-v2.1-render.md)                |
| `CLAUDE_FRONTEND_GAMEPLAY_PROMPT.md`         | [Archived frontend prompt](history/prompts/2026-11-02-claude-frontend-gameplay.md) |
| `CLAUDE_START_PROMPT.md`                     | [Archived Claude startup prompt](history/prompts/2026-11-02-claude-start.md)       |
| `CODEX_BACKEND_PROMPT.md`                    | [Archived backend prompt](history/prompts/2026-11-02-codex-backend.md)             |
| `CODEX_START_PROMPT.md`                      | [Archived Codex startup prompt](history/prompts/2026-11-02-codex-start.md)         |

Local links were updated rather than leaving duplicate root copies. Earlier debate prompts with similar names in `docs/history/` are distinct records and remain preserved.

## Generated and private state

`node_modules/`, `.cache/`, `.local/`, build output, browser reports and `.env` are local/generated state, not source documentation. Do not move runtime files or another session's working tree during a documentation pass. Keep credentials and account transcripts out of screenshots and evidence reports.

`npm run docs:check` validates root Markdown placement and relative Markdown/HTML links in maintained documents, including local heading anchors. It skips frozen supplied packs as link sources and does not contact external services, validate runtime behavior or rewrite files.
