# Cluenite documentation

Use this page to find the current guide. [The project README](../README.md) introduces the product; [status](STATUS.md) separates implementation from dated verification and remaining acceptance.

**Last synchronized:** 3 November 2026 WITA. Documentation and authored development material use English. The immersive frontend and scoped backend integration are included in the [current release](operations/FRONTEND_RELEASE_2026-11-03.md); the record distinguishes source preparation, CI and actual deployment. Production Twitch acceptance remains pending. See [frontend progress](agent-handoff/FRONTEND_PROGRESS.md) for dated implementation scope.

## Start here

| Your task                            | Read                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run the application                  | [Local setup](development/local-setup.md)                                                                                                                         |
| Make a change                        | [Development guide](development/contributing.md), [collaboration](development/collaboration.md)                                                                   |
| Find a file or understand the layout | [Repository map](repository-map.md)                                                                                                                               |
| Connect a frontend interaction       | [Frontend/backend integration](agent-handoff/FRONTEND_BACKEND_INTEGRATION.md), [API/realtime contracts](agent-handoff/BACKEND_CONTRACTS.md)                       |
| Refine the interface                 | [Frontend target](design/frontend-target/README.md), [web product](../apps/web/PRODUCT.md), [design rules](../apps/web/DESIGN.md)                                 |
| Assess what has been checked         | [Status](STATUS.md), [evidence index](evidence/README.md)                                                                                                         |
| Prepare operations                   | [Integration runbook](operations/integration-runbook.md), [server guide](../apps/server/README.md), [predeploy guide](operations/BACKEND_PREDEPLOY_2026-11-02.md) |
| Prepare a recording                  | [Demo video plan](demo/DEMO_VIDEO_PLAN.md)                                                                                                                        |

## Current handoffs

- [Frontend/backend integration](agent-handoff/FRONTEND_BACKEND_INTEGRATION.md): connected flows, shared components, retry behavior and storage boundaries.
- [Backend contracts](agent-handoff/BACKEND_CONTRACTS.md) and [simpler setup](agent-handoff/BACKEND_SIMPLE_SETUP.md): implemented interfaces and host workflow.
- [Frontend progress](agent-handoff/FRONTEND_PROGRESS.md) and [backend progress](agent-handoff/BACKEND_PROGRESS.md): read the newest reconciliation before historical entries.
- [Frontend contract requests](agent-handoff/FRONTEND_CONTRACT_REQUESTS.md): current follow-up and earlier request dispositions.
- [External verification checklist](agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md): real Twitch, OBS, deployment and player acceptance boundaries.

Port observations, screenshots, test counts and account checks apply to their recorded version and environment. A guide or requirement is not evidence of a passing test.

## Documentation layout

| Location                                    | Contents                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| [development/](development/README.md)       | Setup, contributing and collaboration guides.                                 |
| [architecture/](architecture/DECISIONS.md)  | Current technical decisions and compatibility choices.                        |
| [agent-handoff/](agent-handoff/)            | API contracts and current cross-agent handoffs.                               |
| [operations/](operations/)                  | Integration, resource limits, predeployment and dated backend records.        |
| [evidence/](evidence/README.md)             | Verification index and dated frontend integration results.                    |
| [design/](design/frontend-target/README.md) | Frontend targets and preserved visual references.                             |
| [assets/](assets/screenshots/manifest.json) | Actual application screenshots with capture context.                          |
| [demo/](demo/DEMO_VIDEO_PLAN.md)            | Demo planning and recording guidance.                                         |
| [reference/](reference/README.md)           | Frozen supplied specifications and a mutable implementation-difference index. |
| [history/](history/README.md)               | Earlier architecture, transcripts, superseded prompts and progress snapshots. |
| [superpowers/plans/](superpowers/plans/)    | Dated implementation plans; check their scope against current source.         |

## Source precedence

1. Latest explicit user decisions govern direction, including English, Cinematic Brown Noir, the eight visual references and the initial shared-system/public-page milestone.
2. The frozen v3 implementation-ready pack governs requirements where later decisions do not supersede it. Its 18 screen entries describe surfaces and states, not 18 required URLs.
3. Current source and schemas establish implemented behavior; [architecture decisions](architecture/DECISIONS.md) and handoffs explain compatibility choices.
4. [Status](STATUS.md) and dated [evidence](evidence/README.md) establish what was observed. Historical results do not certify the current running service.
5. v2.1 rationale and v1 examples fill historical context; they do not override v3 or current decisions.

The [reference index](reference/README.md) records differences without editing source packs. Preserve historical quotations and provenance. New work starts from these current guides, not an archived task prompt.

## Keep the map useful

Keep only `README.md` and `AGENTS.md` as root Markdown files. Put current instructions in the relevant guide, dated results in evidence/operations, and superseded material in history. Link to an existing authority rather than copying another status list. Run `npm run docs:check` after moving or linking documents; see [repository conventions](repository-map.md).
