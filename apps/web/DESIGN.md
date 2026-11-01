# Cluenite web design system

Direction: **Cinematic Brown Noir**. The investigation scene and evidence workbench lead the page; branding stays in a compact header. Use obsidian, espresso, walnut, aged leather, antique brass, warm gold, parchment, and restrained burgundy. Mystery Live, Quick Case, and co-op share this visual language.

Last synchronized: 2 November 2026. All authored UI, accessibility text, documentation, comments, and development instructions use English. The HTML document declares `lang="en"`.

`PRODUCT.md` is the product context for this interface. Older navy mockups and the blue values in `docs/reference/**/design_tokens.json` are historical references only. They do not override this active direction.

## Current visual target

The [frontend development brief](../../docs/design/frontend-target/README.md) is the screen-level target for the next implementation. It preserves the eight user-provided PNGs and maps landing, dashboard, menu, setup, Quick Case, Mystery Live, active host control, and co-op to existing source files. Use their illustrated desk headers, brass framing, parchment records, and scene-led hierarchy within the current Brown Noir world. **Shared visual system and public pages first** is the user-selected milestone; the redesign remains planned work.

The brief records deliberate adaptations for sample/live labels, authored Q01/M01/C01 content, unsupported statistics/polls/filters, identity-bound co-op invitations, and scoped OBS credentials. Match the composition while preserving those product boundaries. Reuse current tokens and standalone assets; reference PNGs are not runtime UI.

## Routes and presentation

- `/` opens the landing page. It has no live state and links to the case menu.
- `/play` is the case menu: it lists server cases, checks Twitch sign-in, and starts a round into the host panel.
- `/guide` is the guide to rounds, chat commands, and troubleshooting. `/settings` holds sound, motion, and text size, saved in the browser.
- `/?view=mystery` opens the clearly labeled Mystery Live sample.
- `/?view=quick` opens A Missing Manuscript, a local interface sample separate from authored Q01. Its verdict selections are not engine-validated.
- `/dashboard`, `/setup`, and `/coop` provide host overview and setup/co-op guidance; OBS credential issuance and invitation controls are unfinished.
- `/?session=<id>` follows the server snapshot and presents Mystery Live/co-op or Quick Case by `caseMode`.
- `/?session=<id>&view=quick` selects the Quick Case presentation for a session.
- `/?session=<id>&view=dashboard` adds the host controls.
- `/?mode=obs&session=<id>` is a read-only Quick Case browser source.

The top bar is intentionally compact. The game surface uses the page width (up to 1720px); at small widths, navigation wraps and investigation panels stack. OBS drops the browser chrome and stays read-only.

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

- Display: self-hosted Fraunces variable font (`--font-display`).
- Body: IBM Plex Sans (`--font-body`).
- IDs and timers: Cascadia Mono, then Consolas (`--font-mono`).
- Slip radius: `3px`; state transitions: `220ms`; ease: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Keyboard focus is a 2px gold outline with a 3px offset.

## Mystery Live

`MysteryLiveBoard.vue` receives a public `RoundSnapshot`; accepted state remains server-owned.

- The PixiJS scene displays the generated museum environment raster. PixiJS handles display, scaling, and focus frames; it does not draw the museum from primitive geometry.
- The evidence rail displays released evidence records with their ID, label, station/shared state, and associated artwork.
- Evidence inspection opens an enlarged/reduced artwork view with record identity and description.
- The clue register exposes source records separately from released evidence. Inspecting a clue sends `!inspect <id>` only in a connected live session.
- The timeline choices are public unordered events from the snapshot. Reordering is local pending input; `!order ...` is sent to the server, and only a later server snapshot marks it verified.
- Theory, challenge, hint, and verdict actions send engine commands. Sample data cannot submit commands.
- The page labels sample data as a visual preview and shows connection/session state for real sessions.

## Quick Case and OBS

`QuickCaseOverlay.vue` retains the focused observe/connect/challenge/reveal flow. Inspecting a clue can release evidence; only the released evidence IDs appear as link choices. The browser submits `!link <evidence-id> <evidence-id>`, and server snapshots determine linked state. An unlocked clue is not automatically linkable evidence.

The Q01 Quick Case room (`CaseScene.vue`, `scene/caseScene.ts`) is a PixiJS scene over a placeholder painted still (`museum-gallery.jpg`, not final art). Case files, desk, and the detective are drawn in code. Clue statuses set the files: locked stays dark, unlocked turns to paper, and linked adds a brass strip plus a brass thread that arcs between the linked files and is drawn out over time. The first time a file opens, the camera pushes in toward it and eases back. A warn notice (rejected command) shakes the room once. Inspectable files pulse amber and hold at full strength on hover or tap; the same tap routes to `!look`. This is distinct from the public manuscript sample.

OBS uses the same Quick Case surface as a transparent, read-only browser source. It does not render Twitch connection status or expose host actions.

## Art and sound status

The new museum, trophy, heat-warning, access-log, and trolley images are generated prototype raster assets under `src/assets/mystery-live/`. Their generation briefs and file inventory are recorded in `src/assets/mystery-live/ASSET_SOURCES.md`. They are integrated into the browser, but are not represented as final commissioned production art.

Existing Quick Case sound cues and browser-generated room ambience remain. OBS does not start ambient audio. Reduced motion is supported by existing motion utilities, global CSS, and the Quick Case scene, which stays static and repaints only on state changes. Otherwise the Quick Case scene animates continuously (rain, lamp flicker, dust, clock, camera, and tweens). The scene is loaded on demand, so the card still renders without WebGL.

## Verification status

This section is updated after implementation checks. Passing local type checks, unit tests, browser screenshots, or a mocked Twitch session does not verify a real Twitch account, OBS Studio, Render deployment, or player playtest.

## Not verified by this design change

- Real Twitch OAuth/EventSub operation against an account.
- OBS Studio browser-source behavior in a desktop setup.
- Remote Render deployment and production database connectivity.
- Gameplay timing, clarity, and balance with players.
- Final commissioned artwork and sound mix.
