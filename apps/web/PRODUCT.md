# Cluenite web product context

**Synchronized:** 2 November 2026. All authored web content, status labels, accessibility text, comments, and development instructions use English.

## Product and authority

Cluenite is a streamer-led social detective game. Viewers inspect clues, release and connect evidence, reconstruct events, challenge theories, and submit a supported verdict. The engine/server own accepted progress; the browser presents public snapshots and sends authenticated host commands.

The active visual direction is **Cinematic Brown Noir**: obsidian, espresso, walnut, brass, warm gold, parchment, and restrained burgundy. The [eight-screen frontend target](../../docs/design/frontend-target/README.md) maps the latest user-provided compositions to the actual product. Its selected first milestone is the shared visual system and public pages. Earlier blue-palette reference assets are historical. See [DESIGN.md](DESIGN.md). The reference images do not establish implemented functionality or replace authored case content.

## Routes

`src/main.ts` mounts `site/SiteRoot.vue`. Pages are selected by path; session/mode/view query parameters select the investigation app, except the dedicated Quick Case sample.

| Route                                     | Behavior                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/`                                       | Public landing page; no live session state.                                                       |
| `/play`                                   | Case metadata and Twitch sign-in check; creates a non-co-op session and opens its host panel.     |
| `/guide`                                  | Roles, commands, samples, and troubleshooting.                                                    |
| `/settings`                               | Browser-local sound, motion, and text-size preferences.                                           |
| `/dashboard`                              | Host overview and mode links; no persisted recent-session list or active OBS-link generator.      |
| `/setup`                                  | OBS requirements and current credential-issuance limitation.                                      |
| `/coop`                                   | Reads case/account data and explains co-op; no invitation mutation controls.                      |
| `/?view=quick`                            | A Missing Manuscript: local, interactive UI sample. No engine proof, Twitch, or recorded verdict. |
| `/?view=mystery`                          | M01 visual preview snapshot; live command submission is disabled.                                 |
| `/?session=<id>`                          | Authorized session presentation selected by snapshot `caseMode`.                                  |
| `/?session=<id>&view=dashboard`           | Session presentation plus host lifecycle/command controls.                                        |
| `/?session=<id>&view=quick`               | Explicit Quick Case presentation for the authorized session.                                      |
| `/?mode=obs&session=<id>#overlay=<token>` | Read-only Quick Case presentation using a scoped overlay credential.                              |

The public manuscript sample is separate from Q01 **The Gallery Shadow**. Q01's live presentation remains in `QuickCaseOverlay.vue`. M01 is **The Missing Festival Trophy**; C01 is **Signal of the Invisible Ship**. Do not imply a sample validates the authored case.

## Current interaction rules

- Use public `availableActions`, phase, pause state, and command results to present valid choices. The server still validates every action.
- Inspect clue IDs; link released evidence IDs. Context-only clues are not evidence.
- Show a persistent objective and explain accepted discoveries and rejected actions.
- Treat local sequence order as pending until a server snapshot marks it verified.
- Keep samples visibly labeled. External Twitch usernames/chat retain user-supplied content.
- OBS cannot mutate gameplay; its credential must not be exposed in page text or logs.
- A created session still needs Start from the host controls before normal active gameplay.

## Remaining product work

OBS credential issuance and C01 invitations/rejoin exist in the backend but have no complete web flow. M01's hint panel hides the request button after hint 1 even though the engine can offer additional hints; the host command remains available. The round client currently omits optional stable socket retry keys.

Generated artwork is prototype material awaiting final approval. Current code and mock tests do not verify real Twitch, OBS Studio, Render, player comprehension, or a complete current browser workflow. See [status](../../docs/STATUS.md) for dated evidence and [local setup](../../HOW_TO_RUN.md) for environment/dependency limits.
