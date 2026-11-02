# Cluenite web product context

**Synchronized:** 3 November 2026. All authored web content, status labels, accessibility text, comments, and development instructions use English.

## Product and authority

Cluenite is a streamer-led social detective game. Viewers inspect clues, release and connect evidence, reconstruct events, challenge theories, and submit a supported verdict. The engine/server own accepted progress; the browser presents public snapshots and sends authenticated host commands.

The active visual direction is **Cinematic Brown Noir**: obsidian, espresso, walnut, brass, warm gold, parchment, and restrained burgundy. The [eight-screen frontend target](../../docs/design/frontend-target/README.md) preserves the supplied compositions. The current user-authorized pass extends the shared system through practice and live gameplay, with a viewport workspace, optional panels, and animated evidence inspection. Earlier blue-palette reference assets are historical. See [DESIGN.md](DESIGN.md). The reference images do not establish implemented functionality or replace authored case content.

## Routes

`src/main.ts` mounts `site/SiteRoot.vue`. Pages are selected by path; session/mode/view query parameters select the investigation app, except the dedicated Quick Case sample.

| Route                                     | Behavior                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/`                                       | Public landing page; no live session state.                                                        |
| `/play`                                   | Case metadata and Twitch sign-in check; creates a non-co-op session and opens its host panel.      |
| `/guide`                                  | Roles, commands, samples, and troubleshooting.                                                     |
| `/settings`                               | Browser-local sound, motion, and text-size preferences.                                            |
| `/dashboard`                              | Account overview, saved sessions, explicit continuation, and setup/mode links.                     |
| `/setup?round=<id>`                       | Session selection and explicit create/copy/replace/revoke controls for a private OBS link.         |
| `/coop`                                   | C01 lobby creation/selection and invitations by Twitch username.                                   |
| `/coop/invite?invite=<id>#token=<token>`  | Named partner consent with expiring same-tab continuation through sign-in.                         |
| `/connect`                                | Confirms account state and continues a pending invitation after sign-in.                           |
| `/play#practice`                          | Three local practice cards, separate from the authored live case list.                             |
| `/preview/gallery`, `/preview/festival`, `/preview/signal` | Public catalog previews; no observations, private truth, commands, or session creation. |
| `/practice/express`                       | Pearls on the Night Express: local pinboard, scripted chat votes, deductions, and a scored reveal. |
| `/practice/lighthouse`                    | The Lighthouse Went Dark: local two-station card trading with a scripted partner.                  |
| `/?view=quick`                            | A Missing Manuscript: playable hidden-object sample with local rules; no engine proof, no Twitch.  |
| `/?view=mystery`                          | M01 visual preview snapshot; live command submission is disabled.                                  |
| `/?session=<id>`                          | Authorized session presentation selected by snapshot `caseMode`.                                   |
| `/?session=<id>&view=dashboard`           | Session workspace with optional Host controls, lifecycle actions, and advanced setup.              |
| `/?session=<id>&view=quick`               | Explicit Quick Case presentation for the authorized session.                                       |
| `/?mode=obs&session=<id>#overlay=<token>` | Read-only Quick Case presentation using a scoped overlay credential.                               |

The public manuscript sample is separate from Q01 **The Gallery Shadow**. Non-OBS live Q01/M01/C01 use `LiveCaseExperience.vue`, consuming public snapshots. `QuickCaseOverlay.vue` routes OBS to the transparent, read-only `BroadcastOverlay.vue` and retains the legacy explicit Quick Case surface. M01 is **The Missing Festival Trophy**; C01 is **Signal of the Invisible Ship**. Do not imply a sample validates the authored case. The three live cases remain Twitch sessions; their previews provide no solo bypass.

The Express and Lighthouse boards (`site/BoardCasePage.vue`, `sampleCase/boardCases.ts`, and `sampleCase/boardEngine.ts`) are original browser practice cases. Their answers are public by design, and their progress and reports reset on replay or reload. They reuse the live command vocabulary, without submitting practice actions to Twitch or storing live sessions. Lighthouse's Ines and both chats are explicitly scripted. Early shares are recorded; request and quick hand-off points require a real scripted request, and Station B cannot return a file before finding it. The shell may check `/api/me` for navigation/account state.

The manuscript sample (`site/SampleCasePage.vue`, rules in `src/sampleCase/`) is an original case written for the browser. Its answer ships in the public bundle by design; it is not an authored engine case and holds no private truth. Its chat is scripted and labeled as such, and only its best score is saved, in this browser. Its grid search (`!look C4`) exists only in the sample; live rounds use `!look <clue-id>`. Crew credit for followed calls, chat polls, and the co-op partner (Station B, with `!share <record>`) are scripted sample features; running them live needs server support (REQ-FE-008).

The landing page's hero and the dashboard banner use a living scene drawn in code (`scene/heroScene.ts`). The landing's "Your chat is the crew" section (`#community`) describes the sample's community features and says they are not live yet.

## Current interaction rules

- `GameWorkspace.vue` fills the viewport with a compact header and dock. Default secondary panels resize the desktop workspace and replace its main surface on phones. Fullscreen remains available on phones and uses the complete browser viewport. New discoveries use a translucent, noninteractive left notification that dismisses after seven seconds; it never captures clicks. Deliberate inspection opens a scrolling native dialog in the current fullscreen target and restores focus on close.
- Manuscript uses the cinematic workspace variant from its opening cover onward: the room extends beneath translucent controls, with a compact dock and floating desktop panels that preserve scene size. Finds/Grid/Assist and chat are optional. Case file opens Notebook/Board/Timeline/Claims/Verdict. Command opens a focused composer (`/` also opens it outside text fields); Escape closes the top panel and restores focus. Case options contains sound and restart. Finishing the search opens deductions; Room returns to the full scene. Internal panning keeps objects reachable around the controls and at narrow/short aspect ratios.
- All six gameplay scenes use PixiJS. Manuscript retains its interactive room and shares the same portrait atlas with the other practice cases. Express/Lighthouse render their vector illustration as animated GPU layers. The main cases build their environments and selectable objects from geometry, generated gradients and lighting rather than photo scenery. Selecting an object opens its public inspection; semantic buttons remain available for keyboard and fallback play. Accepted clue, share, theory and timeline updates drive finite effects. Hidden/offscreen, paused and reduced-motion scenes stop their ticker. Desktop/phone frame-rate and density caps adapt when resizing.
- Express/Lighthouse show the complete animated illustration by default, with a Full illustration/Compact illustration toggle and one keyboard-accessible central scroll area. Cards retain readable heights instead of shrinking into the remaining viewport; the header and tools stay visible. A contextual guide explains inspecting, connecting, challenging and accusing. Connect evidence starts an explicit two-card selection, with Cancel/Escape available. Expandable How to play explains both cases and Station B requests without revealing the solution. Their intro has a separate Cases/Skip control rail, and Command opens an optional focused composer. Collected cards open complete evidence only when selected again; Manuscript collected finds have an Inspect action in Finds. Replay retains original local rules and scoring.
- Theories separate readable statements/status from deliberate challenge actions. Discovery and crew notices hide while an Express/Lighthouse panel or live deduction surface is open; their timers continue. Scene notices use measured header/dock heights to stay clear of wrapped tools. Manuscript retains its final-find notice when opening deductions.
- Use public `availableActions`, phase, pause state, and command results to present valid choices. The server still validates every action.
- Inspect clue IDs; link released evidence IDs. Context-only clues are not evidence.
- Show a persistent objective and explain accepted discoveries and rejected actions.
- Treat local sequence order as pending until a server snapshot marks it verified.
- Keep samples visibly labeled. External Twitch usernames/chat retain user-supplied content.
- OBS cannot mutate gameplay; its credential must not be exposed in page text or logs. The broadcast card shows the actual question, stage, clue progress, latest released finding, elapsed time and accepted reveal. Mode/station labels and chat commands follow the current public projection. Placement and scale URL options remain supported; it starts no scene renderer or ambient audio.
- A newly created Quick Case or Mystery Live session opens its scene with a prominent Start round action. Saved-session dashboard links still open Host controls. Co-op keeps its authenticated lobby, private invitation and partner acceptance before starting.
- Only one hosted open case is allowed by the server. Selecting a different case offers a direct continuation link to the known open session; stopping it remains an explicit Host controls action.
- Live Activity shows actual round updates and command results. It is not a mirror of Twitch chat. C01 scan/verify/share proof remains viewer-driven and team-scoped.

## Remaining product work

Saved sessions, host Start/Pause/Resume/Restart/Stop, scoped OBS controls, co-op consent/workstations, explicit rejoin, and stable command retries are connected. Keep the contracts in the [frontend/backend integration handoff](../../docs/agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) when refining their presentation. M01 keeps its current hint visible and offers another request while `availableActions` permits it; pause disables the action.

Generated artwork remains prototype material awaiting final approval. The practice and mocked browser checks do not establish new real Twitch, OBS Studio, Render, or player acceptance. See [frontend progress](../../docs/agent-handoff/FRONTEND_PROGRESS.md) for scoped frontend evidence, [status](../../docs/STATUS.md) for integration/external evidence, and [local setup](../../docs/development/local-setup.md) for environment limits.
