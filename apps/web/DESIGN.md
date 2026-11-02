# Cluenite web design system

Direction: **Cinematic Brown Noir**. The investigation scene and evidence workbench lead the page; branding stays in a compact header. Use obsidian, espresso, walnut, aged leather, antique brass, warm gold, parchment, and restrained burgundy. Mystery Live, Quick Case, and co-op share this visual language.

Last synchronized: 3 November 2026. All authored UI, accessibility text, documentation, comments, and development instructions use English. The HTML document declares `lang="en"`.

`PRODUCT.md` is the product context for this interface. Older navy mockups and the blue values in `the archived design specifications` are historical references only. They do not override this active direction.

## Current visual target

The original visual references informed the scene-led composition. Runtime artwork sources are recorded in [attribution](../../docs/attribution.md). Use their illustrated desk headers, brass framing, parchment records, and scene-led hierarchy within the current Brown Noir world. The user subsequently extended the work through practice and authored live gameplay. Current implementation and dated checks are in [frontend progress](../../docs/STATUS.md).

The brief records deliberate adaptations for sample/live labels, authored Q01/M01/C01 content, unsupported statistics/polls/filters, identity-bound co-op invitations, and scoped OBS credentials. Match the composition while preserving those product boundaries. Reuse current tokens and standalone assets; reference PNGs are not runtime UI.

## Routes and presentation

- `/` opens the landing page. It has no live state and links to the case menu.
- `/play` is the case menu: it lists server cases, checks Twitch sign-in, and starts a round into the host panel. `/play#practice` scrolls to the three local practice cards; Express and Lighthouse use dedicated `/practice/express` and `/practice/lighthouse` routes.
- `/guide` is the guide to rounds, chat commands, and troubleshooting. `/settings` holds sound, motion, and text size, saved in the browser.
- `/?view=mystery` opens the clearly labeled Mystery Live sample.
- `/?view=quick` opens A Missing Manuscript (`site/SampleCasePage.vue`), a playable hidden-object sample case separate from authored Q01. Its rules run in the browser (`src/sampleCase/`), its viewer chat is scripted, and nothing it decides is engine-validated.
- `/dashboard`, `/setup`, and `/coop` provide saved-session continuation, explicit scoped OBS controls, and co-op lobby/invitation controls.
- `/preview/gallery`, `/preview/festival`, and `/preview/signal` show public catalog metadata, without private observations or live commands.
- `/?session=<id>` follows the public server snapshot in `LiveCaseExperience.vue` for Q01/M01/C01.
- `/?session=<id>&view=quick` selects the Quick Case presentation for a session.
- `/?session=<id>&view=dashboard` adds the host controls.
- `/?mode=obs&session=<id>` is a read-only Quick Case browser source.

The top bar is intentionally compact. `GameWorkspace.vue` fills `100dvh` with header, main surface, and dock rows; it has no site max-width or outer gutter. Optional panels resize the desktop surface and replace it on phones. Closed panels restore keyboard focus; Escape also works after a lifecycle update disables the focused control. Evidence uses a centered native modal with internal scrolling and reduced-motion support. OBS drops browser chrome and stays read-only. Explicit browser fullscreen requires a user gesture; viewport play works without it.

Manuscript opts into `cinematic`: the scene spans all viewport rows under translucent noir header/dock controls. A single explicit grid column prevents intrinsic toolbar width from expanding the phone header. The dock groups Room/Finds/Chat/Case file and a toggled Command composer; sound/restart live in Case options. Phone navigation uses compact icon/label buttons with at least 44px targets. Desktop Finds and case-file drawers float over the scene instead of shrinking it. Objectives remain anchored to the viewport while the room pans. Internal pan space allows low objects to move clear of the dock. Backdrop filtering is restricted to controls/drawers, and reduced-transparency preference restores solid surfaces.

## Palette

Active values in `src/style.css`:

| Name              | Hex       | Use                              |
| ----------------- | --------- | -------------------------------- |
| Obsidian          | `#100d0a` | page and desk                    |
| Deep Espresso     | `#211811` | board and dark panels            |
| Dark Walnut       | `#493021` | raised controls                  |
| Aged Leather      | `#65432d` | rules and dividers               |
| Antique Brass     | `#a77a48` | strong borders                   |
| Warm Gold         | `#d9b681` | current state and primary action |
| Parchment         | `#e9decb` | primary text and evidence slips  |
| Parchment, dimmed | `#bfb19a` | secondary text                   |
| Brass thread      | `#c79a62` | linked and confirmed state       |
| Muted burgundy    | `#64352f` | contradiction surface            |
| Alert rose        | `#d99a88` | warning text                     |

Avoid blue, cyan, and purple in the game interface. Status cues pair color with text. The palette is warm but keeps high contrast between text and surfaces.

## Typography and shape

- Public pages, practice, live investigation, and OBS share self-hosted EB Garamond (`--font-display`) and Inter (`--font-body`) through `src/style.css`. `site/site.css` registers the faces globally and points `--site-serif` at the shared display token. Plate body text also uses Inter.
- Fraunces and IBM Plex Sans font-face registrations remain for compatibility; they are no longer the active shared typography. Font licenses are preserved beside the assets.
- IDs and timers: Cascadia Mono, then Consolas (`--font-mono`).
- Slip radius: `3px`; state transitions: `220ms`; ease: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Keyboard focus is a 2px gold outline with a 3px offset.

## Mystery Live

`components/LiveCaseExperience.vue` receives a public `RoundSnapshot` for all three authored cases; accepted state remains server-owned. Earlier board components remain on disk for compatibility.

- The shared `scene/caseStage.ts` lifecycle hosts `investigationScene.ts`: native Pixi geometry, generated gradients, layered lighting and selectable objects, without photo scenery. Gallery has a perspective hall and moving light; Festival adds bunting, glass, a trolley and velvet ropes; Signal has moving sea/clouds, rain and radar, with shelves at the records station. Object hover/found feedback and finite progress effects use public state. Picking an object opens the same inspection as its keyboard-accessible DOM button. These are illustrations, not additional observations; radar adds no invented contacts. Only accepted public snapshots trigger progress feedback.
- The Manuscript benchmark refinement adds wall joinery, runners, furniture, plants, physical object supports, distant harbour and chart-table detail. Lamp motion and cabinet reflection provide scene-specific movement. Generated static patina is deliberately subtle and uses no full-screen filter. The translucent briefing has a quieter phone composition and leaves the existing clue coordinates intact. The user subsequently removed the decorative investigator from all three main environments; these scenes no longer load the portrait atlas.
- The evidence surface displays released evidence records with their ID, label, station/shared state, and inspect/connect controls. Two selected records produce an existing `!link` command; local selection never proves a deduction.
- Evidence inspection opens an enlarged/reduced artwork view with record identity and description.
- Scene hotspots expose public clue labels/teasers. The inspection dialog sends `!look <id>` only when live actions permit it; observations and released records come back from the server.
- The timeline choices are public unordered events from the snapshot. Reordering is local pending input; `!order ...` is sent to the server, and only a later server snapshot marks it verified.
- Theory, challenge, hint, and verdict actions send engine commands. Theory statements/status occupy the left column and a dedicated action panel occupies the right; narrow screens stack both in one scroll area. Sample data cannot submit commands.
- The page labels sample data as a visual preview and shows connection/session state for real sessions.
- Gallery uses the clean museum scene; Festival keeps its proof timeline; Signal uses the coastal observatory and team-specific clues. C01's compact chat command stays in the footer and full station instructions stay in Briefing, clear of clue hit targets. Activity contains actual round updates. Advanced host and overlay controls remain in an optional Host panel. Phone tools use a compact grid; short screens arrange clue targets across the scene.
- Discovery notices are noninteractive and pointer-transparent, with a short observation and optional artwork. They disappear automatically. Full details remain on collected records/finds; native dialogs open only through intentional inspection. Score/time have their own visual hierarchy, and intro Skip sits clear of fullscreen controls.
- Express/Lighthouse keep their SVG artwork as a sharp failure fallback. GPU textures preserve foreground ordering, separate lit/dark states, rolling landscape/wheels/steam or sea/rain/ship layers, and bounded event effects. All renderers use private tickers, pause hidden/offscreen, observe reduced motion, cap density/frame rate, and release owned resources without destroying shared white/empty textures.
- Train panelwork, passenger silhouettes and metal highlights, plus lighthouse masonry, keeper's cottage and coastal contours, enrich the existing illustration. Native window glows, star light and water glimmers share the same lifecycle. Extracted SVG layers retain inherited paint; ship pivots use source texture density so high-density rendering preserves its position by the rocks.

## Quick Case and OBS

`QuickCaseOverlay.vue` retains the focused observe/connect/challenge/reveal flow. Inspecting a clue can release evidence; only the released evidence IDs appear as link choices. The browser submits `!link <evidence-id> <evidence-id>`, and server snapshots determine linked state. An unlocked clue is not automatically linkable evidence.

The retained legacy Quick Case room (`CaseScene.vue`, `scene/caseScene.ts`) uses a placeholder painted still (`museum-gallery.jpg`) with code-drawn files, desk and detective. Its linked threads, camera push, rejected-command shake and file hover remain for compatibility. Current live Q01/M01/C01 instead route through the native environments described above; OBS uses the dedicated broadcast card below. The legacy room is also distinct from the public Manuscript sample.

OBS uses the dedicated `BroadcastOverlay.vue` card through the existing `QuickCaseOverlay.vue` entry. The surrounding browser source is transparent. A compact brass-framed card prioritizes the title, time, question and stage; it includes clue progress, the latest actual finding and the accepted reveal. Commands and station labels match the public case projection. Existing corner placement and bounded scale options remain. It exposes no buttons or Twitch connection status and starts no GPU scene or ambient sound. Finding/reveal arrival uses a finite animation with reduced-motion support.

## Sample case: A Missing Manuscript

`site/SampleCasePage.vue` is the public sample. It shows the full loop on one page, and every step has one job:

- **Opening:** a case cover, a typed briefing, and the three suspects, each spotlit in the room.
- **Search (observe):** a hidden-object scene of the Ashgrove House study (`scene/studyScene.ts`). Players find twelve listed objects by clicking or by calling a cell on the 10×6 grid (`!look C4`). Six of the objects are clues that open evidence. Quick finds in a row build a combo. Wrong clicks cost points, and rapid wrong clicks briefly steady the cursor. Assist mode and search hints help, at a cost in points.
- **Board (connect):** link pairs of evidence. The key-and-clock link is required proof; the other links add points.
- **Timeline:** put six events in order once their records are found.
- **Claims (challenge):** answer three chat theories with evidence. Disproving the locked-door theory is required proof.
- **Verdict (reveal):** with the proof complete, accuse a suspect. The room replays the night and reveals the twist, then a case report shows the score, seals, the crew's MVP, and the best score kept in this browser.
- **Crew (community):** scripted viewers call grid cells. Each call shows in the room as a ring with the viewer's name, and following it credits the viewer. Claim and verdict cards show chat polls, and chat energy rises with good play.
- **Co-op (collaboration):** on the cover, the player can pick co-op with Station B, a scripted partner station that holds the hall desk. It shares what it finds and asks for records in return; the key deduction needs records from both stations.

The room is drawn in code with PixiJS: rain, firelight, candles, a walking detective, warm colored characters, particles, and threaded deductions. Faces in the room, suspect cards and scripted partner use the same generated cast atlas as Express/Lighthouse. Atlas crops own their texture frames without destroying the shared source; vector faces remain the loading fallback. The opening and search fill the viewport; Finds/Grid/Assist and chat are optional. Found objects produce a brief noninteractive notice; deliberate inspection from Finds opens a close-up re-rendered from vector room coordinates at 4x resolution. Completing the search opens the deduction board. With reduced motion the scene renders static frames. Keyboard players move a grid cursor and press Enter to search. On narrow screens the full-height room pans horizontally.

## Board practice cases

`site/BoardCasePage.vue` presents Express and Lighthouse with a complete animated train/harbour illustration above a naturally sized pinboard. Full mode preserves the 1200 x 360 composition; the adjacent 44px toggle switches to a compact strip. One focusable central region scrolls the illustration, contextual guide and evidence together; the viewport header and tools stay visible. Cards retain a readable height on phones and short screens. Avoid a second constrained inner board scroller or fitting all rows into the leftover height. Theory cards stack clear speaker/status, statement, belief and challenge rows. Warm cards, object art, coherent portraits and deduction threads preserve the established visual language.

Discovery and crew notices hide while reading Express/Lighthouse panels or live deduction surfaces. Their timers keep running. Manuscript preserves its final-find notification while moving into deductions. Shared workspace header/dock measurements keep scene notifications above wrapped tools, including phone layouts and fullscreen.

The next-step guide explains inspecting cards, connecting evidence, challenging theories and accusing a suspect without giving away the answer. Its Connect evidence button starts a visible two-card mode; Cancel/Escape leaves that mode. Face-down cards cannot be used as connection or challenge evidence. How to play expands inline, and Station B explains request timing beside its files. Commands, scripted chat, theories and suspects remain optional. Discoveries use pointer-transparent notices; selecting a collected card opens full text/art, with a clearly named Connect to another card action once two cards are available. No persistent chat column obstructs the board.

Both boards use the same shell, brass controls, typography, pause behavior, and scored reveal/report. Lighthouse's scripted Station B uses warm copper/burgundy accents and a textual label. Pause stops the game clock and disables gameplay controls. Early sharing does not invent a request bonus or bypass Station B's discovery schedule. Board scores are not persisted.

The Manuscript menu thumbnail (`site/landing/manuscript-study.jpg`) is a 2 November 2026 capture of the actual code-drawn study canvas, saved as a 53.6 kB JPEG. It contains no account/chat content and is not an external photograph or a generated concept image. Train/harbour thumbnails reuse the board's SVG scene strips.

## Site scene

`scene/heroScene.ts` is the site's living scene, drawn in code: a detective at an evidence board, a swinging lamp, rain/lightning, and dust. The landing hero and dashboard crop it to their layout. The landing's scripted sample chat pulses the board and threads. Reduced motion renders a still frame. The hero and study cap canvas density at 2x. The landing fallback and CTA use the large case-board plate; tiny stretched step JPEGs were replaced by scalable GuideArt. Menu covers use full-resolution case art.

## Art and sound status

The new museum, trophy, heat-warning, access-log, and trolley images are generated prototype raster assets under `src/assets/mystery-live/`. Their generation briefs and file inventory are recorded in `src/assets/mystery-live/ASSET_SOURCES.md`. They are integrated into the browser, but are not represented as final commissioned production art.

The original offshore observatory is 1983 x 793 (`src/assets/investigation/`), and the six-character painted atlas is 1536 x 1024 (`src/site/portraits/`). Each directory records provenance in `ASSET_SOURCES.md`. No raster resampling is used to claim added detail. The older museum plate with an embedded magnifier/broken display is not used for the live Gallery scene, because it suggests unsupported evidence.

Existing Quick Case sound cues and browser-generated room ambience remain. The sample case has its own score (`src/audio/sampleScore.ts`): generated jazz that changes mood with the case, rain, fire, room tone, thunder on lightning, and short cues for finds, links, misses, and the reveal. It starts after the first user gesture and follows the site sound setting. OBS does not start ambient audio. Reduced motion is supported by existing motion utilities, global CSS, and the Quick Case scene, which stays static and repaints only on state changes. Otherwise the Quick Case scene animates continuously (rain, lamp flicker, dust, clock, camera, and tweens). The scene is loaded on demand, so the card still renders without WebGL.

## Verification status

This section is updated after implementation checks. Passing local type checks, unit tests, browser screenshots, or a mocked Twitch session does not verify a real Twitch account, OBS Studio, Render deployment, or player playtest.

## Not verified by this design change

- Real Twitch OAuth/EventSub operation against an account.
- OBS Studio browser-source behavior in a desktop setup.
- Remote Render deployment and production database connectivity.
- Gameplay timing, clarity, and balance with players.
- Final commissioned artwork and sound mix.
