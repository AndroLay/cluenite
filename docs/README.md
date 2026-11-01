# Documentation map

**Last synchronized:** 2 November 2026 against the local working tree based on `c320a9b`. Project documentation and development use English.

## Current guides

| Document                                                                                               | Use it for                                                                             |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [Project overview](../README.md)                                                                       | Product, runtime cases, stack, and workspace.                                          |
| [Local run guide](../HOW_TO_RUN.md)                                                                    | Database, environment, ports, samples, and real host setup.                            |
| [Development guide](../CONTRIBUTING.md)                                                                | Language policy, boundaries, checks, and documentation maintenance.                    |
| [Implementation status](STATUS.md)                                                                     | What exists, fresh versus historical evidence, and remaining gaps.                     |
| [Architecture decisions](architecture/DECISIONS.md)                                                    | Current technical choices and source precedence.                                       |
| [Web product](../apps/web/PRODUCT.md) and [design](../apps/web/DESIGN.md)                              | Actual routes, samples, visual direction, and interface limits.                        |
| [Server guide](../apps/server/README.md)                                                               | Backend operations and API overview.                                                   |
| [Backend release record](operations/BACKEND_RELEASE_2026-11-02.md)                                     | Release checks, private GitHub source, Render target, and blockers.                    |
| [Backend predeploy guide](operations/BACKEND_PREDEPLOY_2026-11-02.md)                                  | Current OAuth/HTTP behavior, preflight, retention, deletion, and final backend checks. |
| [API/realtime contracts](agent-handoff/BACKEND_CONTRACTS.md)                                           | Implemented HTTP, Socket.IO, snapshot, and command contracts.                          |
| [External verification checklist](agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md)                          | Evidence still needed from real Twitch, OBS, Render, and players.                      |
| [Collaboration protocol](../TEAM_PROTOCOL.md) and [integration runbook](../INTEGRATION_AND_RUNBOOK.md) | Ownership, handoff, integration, and acceptance.                                       |

## Authority and historical material

The [frontend development target](design/frontend-target/README.md) maps all eight user-provided images to routes, source files, milestones, and acceptance. Start with the shared visual system and public pages, as selected by the user. [Preserved image originals](design/frontend-target/references/README.md) are current visual references, outside the frozen historical packs. Their example data and unsupported controls do not override authored cases or API behavior.

1. Latest explicit user decisions, including English language, Cinematic Brown Noir, the eight frontend target images, and shared visuals/public pages first, control project direction.
2. The frozen v3 implementation-ready pack governs requirements and acceptance where no later decision supersedes it.
3. Current code and schemas define implemented behavior; the API handoff describes those sources. A requirement is not evidence that it has been implemented.
4. `STATUS.md` records implementation observations and dated verification. Progress logs provide historical evidence, not live service state.
5. v2.1 technical rationale applies where v3 and current decisions leave a gap; v1 examples and assets are historical references.

[The reference index](reference/README.md) explains frozen-source boundaries and known implementation differences. Older plans in `superpowers/plans/`, the root v2.1 architecture document, and `GAMEPLAY_DEBATE.md` retain their historical scope. Old debate startup guides are preserved under [history](history/README.md).

## Active handoffs

- [Backend progress](agent-handoff/BACKEND_PROGRESS.md)
- [Frontend progress](agent-handoff/FRONTEND_PROGRESS.md)
- [Frontend contract requests](agent-handoff/FRONTEND_CONTRACT_REQUESTS.md)

Read the current reconciliation at the top of each handoff before older entries. Port observations, screenshots, test totals, and account observations apply only to the session that recorded them.
