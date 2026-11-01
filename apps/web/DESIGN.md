# Cluenite web — design notes

Direction: **cozy cinematic forensics.** A warm, nocturnal detective room, drawn with simple
illustrated props: a rain-streaked window, a hanging lamp throwing a cone of light, gallery
frames and a wall clock, three evidence chips on a table, a detective silhouette holding a
magnifier, and a second investigator in the lamp light. The clue board sits in front of the scene. Ink night, stage panels, warm paper,
gold for found, teal for verified, lilac for theory, coral for refuted. Source: the
Cluenite blueprint art board (`docs/reference/.../06_VISUAL_PREVIEWS/06_art_style_board.png`),
"Warm nocturnal tones, simple illustrated props, readable evidence and subtle motion."

This replaces the earlier brown-folder direction (leather desk, brown case folder, gold label
tabs, sealed/unlocked/linked slips, copper stamps). Do not bring back its layout, tokens, or
rules. No artwork is copied from the reference; the scene is drawn in code.

Surfaces: the browser page (`/?session=…`, `/?session=…&view=dashboard`, and the preview at
`/` with no parameters) and the OBS browser source (`/?mode=obs&session=…`, transparent page,
board only). Both must work from about 320px up; in OBS, about 560px wide.

Mode: **Experience** for the overlay (the scene and the clue board are the product, the
interface recedes). **Operate** for the host panel.

## Tokens

All web-app tokens live in `src/style.css` under the `--case-*` prefix. The shared
`packages/ui` tokens (`--ink-*`, `--paper-*`, `--clue-gold`, …) are used by no UI here and
must not change without a separate decision.

| Role | Token | Value |
| --- | --- | --- |
| Page background (desk) | `--case-bg` | `#101c2a` |
| Scene and board panel | `--case-panel` | `#192b3a` |
| Raised surface (buttons) | `--case-raised` | `#223748` |
| Hairline rule | `--case-rule` | `#2c4256` |
| Frame and control border | `--case-rule-strong` | `#4e6a82` |
| Gold frame, found, active, CTA | `--case-gold` / `--case-amber` | `#f5be70` (same value, two names) |
| Text | `--case-paper` / `--case-paper-dim` | `#f4f0e6` / `#b7c6d3` |
| Evidence slip / slip ink | `--case-slip` / `--case-slip-ink` | `#f4f0e6` / `#14202e` |
| Teal: verified, link thread, confirm | `--case-thread` / `--case-confirm` | `#75d7bd` (same value, two names) |
| Lilac: theory | `--case-lilac` | `#b8aaf5` |
| Coral: refuted, alert | `--case-alert` | `#f0847e` |
| Verdict stamp | `--case-stamp` | `#1e7060` |

Component-local values (not tokens): `#2a3a4a` body ink on slips, `#1d6656` teal ink on slips
(about 6:1 on paper), `#cdc6b3` slip border. Use them only on `--case-slip`.

Fonts (self-hosted latin subsets in `src/assets/fonts/`):
- `--font-display`: Fraunces (variable, 100–900). Title, question, clue titles, reveal title.
- `--font-body`: IBM Plex Sans 400/600. Body, controls, stage labels, badges.
- `--font-mono`: Cascadia Mono / Consolas. Clock, clue ids, session tags.

Shape and motion: `--radius-slip: 3px`; `--dur-state: 220ms`; `--ease-out-expo`.

## Scene and components

- **Case scene** (`CaseScene.vue` → `src/scene/caseScene.ts`): a PixiJS 8 canvas (`pixi.js ^8.21.0`),
  `aria-hidden`. The module loads through a dynamic import, so the Pixi chunk (about 250 kB, 78 kB
  gzip) only loads when the scene mounts. It draws in a 600×200 design space. Parts: wall, perspective
  floor, window with rain, hanging lamp with a flickering cone, dust motes, three framed pictures, a
  wall clock, three case-file chips on the table, a detective with a magnifier, and a second
  investigator in the lamp light. Both figures are faceless on purpose. Aspect 3:1; in OBS 4:1.
  - Stage pose: the detective's arm and head follow the stage (observe -28°, connect 8°, challenge
    -50°, reveal -14°). In reveal the second investigator's head turns -7°, and the lamp cone reaches
    full strength. Arm and head ease over 0.7 s; the cone over 0.6 s.
  - Clues: each clue drives the chip at the same index. Locked is a dark slip, unlocked is paper with
    two ink rules, and linked is paper with a 2 px teal strip. Non-locked chips lift 3 px over 0.35 s.
  - Thread: once two or more clues are linked, a teal thread arcs through the linked chips.
  - Reveal: one lilac flash (1.8 s, after a 0.3 s delay, once), and the wall clock hands stop. The
    clock only advances outside reveal.
  - Reduced motion (`prefers-reduced-motion: reduce`): the Pixi ticker stops. The scene paints once
    per state change with time pinned at 0, with no flash and no cone flicker. Chips and thread snap
    to their final state.
- **Case board** (`.qc`): dark ink panel, 1px gold border, inner hairline inset 6px. In OBS the
  panel is 90% dark (`rgba(16, 28, 42, 0.9)`) with no border, so text stays readable over
  gameplay. The page itself stays transparent.
- **Stage label** (`.qc-stage`): sits on the top gold border like a folder tab. In OBS it sits in
  normal flow.
- **Stage track** (`.qc-steps`): four segments with a 15px line icon each. Done is teal, the
  current stage is amber, upcoming is dim.
- **Clue card** (`.qc-clue`): sealed clues are dark cards with a dashed edge and an `Inspect`
  badge. Opened clues are paper slips; they play `clue-open` once (520ms, slides up and flashes
  gold, then settles). Picked-for-link clues get an inner amber ring. Linked clues are paper
  slips pinned to the board with a teal line.
- **Thread**: there are two threads, and they are separate. The overlay's link connector and reveal
  are GSAP timelines (`buildEvidenceLinkTimeline`, `buildRevealTimeline` from `packages/graphics`,
  used in `QuickCaseOverlay.vue`) and use `--case-thread`. The scene's thread is a Pixi drawing
  (`drawThread` in `caseScene.ts`). The scene gets only `stage` and `clues`, so it does not read the
  overlay's timeline.
- **Stamp and badge**: `.qc-badge` (simulation notice) and `.qc-stamp` (verdict) are the only
  rotated elements (-2°).
- **Call to action** (`.qc-action`): solid amber with slip-ink text, weight 700, only when
  enabled. Disabled is 50% opacity.
- **Host panel** (`DashboardPanel.vue`): same tokens. Inputs on `--case-bg`, buttons on
  `--case-raised`, primary button amber, danger button coral.

## Sound

- **Sound cues** (`createSfxPlayer`, `packages/ui`): unchanged. Cues play on inspect, link,
  and reveal.
- **Room tone** (`src/audio/ambience.ts`): brown noise generated in code, a 6-second looped
  buffer with faded seams. Highpass 80 Hz, lowpass 900 Hz, level 0.045 with a slow swell
  (about every 14 s, depth 0.012), fade-in 2.5 s.
- **Rain**: a second loop of white hiss with sparse drops (about 20 a second), band-passed to
  1.2–5 kHz, level 0.02. It fades in with the room tone.
- **Thunder**: a 5-second brown-noise rumble, low-passed from 260 Hz down to 90 Hz, peak 0.07. It is
  struck once at a random 15–40 s after start, then every 25–70 s. It goes through the same mute.
- No audio file ships with the app.
- Start: only on the first `pointerdown` or `keydown` on the page (browsers block audio before a
  gesture). Mute uses the same button as the sound cues and eases through a 0.08 s time constant.
- OBS never creates the room tone, rain, or thunder (`App.vue`, `obsMode ? null : createAmbience()`),
  so the stream audio is unchanged.

## Rules

- Color is never the only signal. Clue state is shown as text: `Inspect`, `Sealed`
  (cannot be opened now), `Unlocked`, `Selected`, `Linked`. Stage is a label plus the icon track.
- Accent palette: gold, teal, lilac, paper, and coral for refuted or alert only. Coral never
  decorates. Warnings use a coral 1px border and coral text. Confirmation uses teal.
- Contrast: body text on `--case-panel` and `--case-bg` is at least 4.5:1. Slip text
  (`--case-slip-ink`, `#2a3a4a`, `#1d6656`) is at least 5:1 on `--case-slip`.
- Interaction states: every control has hover, `:disabled`, and `:focus-visible` (2px amber
  outline, 2–3px offset). Empty, error, and paused states use a bordered notice with text.
- Shapes: no glassmorphism, no gradient text, no side-stripe borders. The only gradients are
  faint radial glows on the page and the scene.
- Browser theme: `color-scheme: dark`, `theme-color #101c2a`, selection in amber with slip-ink
  text. The favicon is a gold magnifier.
- Motion: CSS for state changes (≤220ms) and the scene loops. GSAP for the link connector and
  reveal, which skip to the end under reduced motion (`prefersReducedMotion()`). The global
  reduced-motion rule in `style.css` also drops transitions and animations to 1ms.
- OBS: the page background is transparent (`html.obs-mode`). OBS is read-only on stream, so Mute and
  Skip are hidden there (`v-if="!props.obs"`). The reveal stage hides the Link button
  (`v-if="view.stage !== 'reveal'"`) in every mode.
- Copy: host UI in Indonesian, game and overlay text in English. The redesign changed the stage
  hint text (observe: "Inspect a sealed clue to open it as evidence."; connect: "Pick two opened
  clues, then press Link selected."; challenge: "Choose a verdict to close the case."; reveal:
  "Recap below.") and added the `Sealed` and `Selected` labels. The previous copy is still in git
  history (`HEAD`, `apps/web/src/components/QuickCaseOverlay.vue`, `STAGE_HINT`). Nothing was
  restored; restoring it is an open decision for the product owner.

## Layout

- ≥1240px: masthead in the left column (sticky, top 40px), 600px board on the right. Shell max
  width 1240px. The wordmark needs ~434px beside the board, which this width provides.
- ≥1360px (non-OBS): the shell widens to 1400px max and the board column to 680px, so the scene
  grows with it.
- <1240px: single column, masthead first, board below.
- Clue cards: 3 columns; 1 column below 480px.
- Stage track: 4 columns from 480px; 2×2 below 480px.
- OBS (`?mode=obs`): board only, no masthead, no padding, transparent page.

## Verification status

### Latest round: PixiJS case scene (dev server on port 5175)

- Typecheck (`vue-tsc --noEmit`) exit 0; `vite build` exit 0. Sizes: `caseScene` chunk 250.08 kB
  (gzip 77.98 kB), `index` JS 312.73 kB (gzip 116.85 kB), CSS 30.61 kB (gzip 6.79 kB).
- Desktop 1280×900, live flow in the preview: reload, inspect CAM (unlocked, stage connect; CAM is not
  selectable yet), inspect ACCESS, select CAM and ACCESS (Selected 2/2), "Link selected (2/2)" → Linked
  2/2 and "✓ Linked: CAM ↔ ACCESS". Stage challenge with verdicts active; choose "An intruder" → stage
  reveal (Recap, SCHEDULE "Sealed", the chosen verdict, placeholder reveal text). The linked cards and
  the teal thread are visible. Screenshots: `r8-desk-challenge.png`, `r8-desk-reveal.png`.
- Mobile 390×844 at reveal: stage nav 2×2, clues in one column, scene visible (`r8-mob-reveal.png`).
- OBS `?mode=obs` at 1280×720: the page outside the board is transparent, and the 600px board with
  the 4:1 scene looks right (`r8-obs-fixed.png`). Cause: `color-scheme: dark` on `:root` made Chromium
  paint a dark canvas behind the transparent root. `html.obs-mode` now sets `color-scheme: normal`
  (`style.css`).
- Console after the verdict: 0 errors, 0 warnings.
- Impeccable detector (`detect --json apps/web/src`): one finding, `overused-font` on Fraunces
  (`style.css:5`). Kept, because the brief fixes Fraunces as the display face.
- Not verified at runtime: reveal lightning (the keyframes exist in code, but no browser check),
  reduced motion (code path only), the live flow (`?session=`) on 5175 (the API dev server crashes with
  `FST_ERR_DUPLICATED_ROUTE`), OBS in OBS Studio, and the console after the first gesture.
- Vite on port 5174 serves a stale `style.css` even though HMR logs updates. Checks use 5175 until the
  owner stops 5174.

### Earlier results (SVG scene; superseded where they conflict with the latest round)

The entries below were written for the SVG scene and the earlier build. Where they conflict with the
latest round, the latest round is correct.

- Typecheck (`vue-tsc --noEmit`) and production build (`vite build`) pass after the rain, thunder,
  clock, second investigator, and reveal flash were added, and again after the OBS hides (Mute,
  Skip) and the reveal Link hide. Current sizes are in the latest round above.
- Browser (Playwright, dev server, preview data): 1280×900 and 375×812 were viewed by eye in the
  observe stage, and the layout holds at both widths. Console showed 0 errors and 0 warnings on
  desktop, mobile, and OBS.
- Reveal stage (1280×900): the lightning flash runs once and is back at 0 about 0.9 s after the
  verdict. The clock hands are paused and the second investigator's head sits at about -7°. The Link button is
  hidden in this stage (`v-if="view.stage !== 'reveal'"`); a DOM check found no `.qc-action` there.
- Reduced motion (`prefers-reduced-motion: reduce`): flash, rain, lamp cone, and clock hands have
  no animation, and the arm has no transition.
- 320px: the observe stage was viewed by eye and holds, with the stage track in 2×2. Horizontal
  scroll width is 320 on both the preview page and the host dashboard. Reveal at 320 and 375 has
  no document overflow; one scene path runs past the viewport but sits inside the scene's
  `overflow: hidden`, so it is clipped.
- Hover and focus: a sealed clue's border lightens and the card lifts 2px. `:focus-visible` on the
  Mute button draws a 2px amber outline with a 3px offset. The disabled link button is at 50%.
- Contrast: the lowest computed text-to-background ratio across the preview's 40 text nodes is
  8.3:1 (computed in the browser, not by a colour meter).
- OBS 560×700: the page is transparent and the board panel is 90% dark. The masthead is hidden in
  code (`App.vue`, `v-if="!obsMode"`). Mute and Skip are hidden in OBS (`v-if="!props.obs"`), so
  the DOM has no Mute or Skip button there. The "Simulation · no Twitch chat" label shows for any
  round whose source is `simulation`, including the `dev` session.
- OBS read-only check (`?mode=obs&session=dev`, live round at the reveal stage, accessibility snapshot):
  no Mute, Skip, or dashboard; no Link button (hidden at reveal); the three clue buttons and both
  verdict buttons are present and `disabled`; the stamp reads "✓ Linked: CAM ↔ SCHEDULE". The chosen
  verdict is not marked in OBS, because only the host page holds it.
- Live round (`?session=dev`, host dashboard `&view=dashboard`, commands sent through the dashboard):
  connected ("Terhubung"). Inspect CAM, ACCESS, and SCHEDULE; Link CAM and SCHEDULE (`ACCEPTED_NEW`,
  stage challenge); verdict "The cleaning robot R-07" (`ACCEPTED_NEW`, "Verified. The round is solved.",
  stage reveal). Final counts: Inspected 3/3, Linked 2/2.
- `?session=default` shows "Waiting for the round…". The server seeds only `dev`; `default` answers
  `NOT_AVAILABLE` ("Unknown session."). That is a wrong session id, not a transport fault.
- Impeccable detector: on `CaseScene.vue`, no findings. On `QuickCaseOverlay.vue` after the three
  `v-if` edits, `detect --json` returned `[]` (exit 0). Earlier, on the changed UI files, one
  finding remained: `overused-font` on Fraunces, kept as a deliberate choice for the display face.
- Chosen verdict (fixed; checked in the browser at 1280×900 on the live `dev` round): the accepted
  verdict button has `is-chosen` (solid amber, disabled). Its text contrast is about 9.8:1, computed by
  hand from the two colours, not measured. The other verdict is disabled with the not-allowed cursor.
  The stamp reads "◇ Simulated verdict: The cleaning robot R-07". The chosen id is kept in the host
  page only (`App.vue`, `chosenVerdictId`). By code reading, a page reload clears the mark, and OBS
  never shows it.
- Readiness: `apps/server/src/index.ts` now loads the root `.env` by its file path, not by the working
  directory; the old `dotenv/config` import missed it under `npm --prefix`. `/health/ready` returns 200
  `{"status":"ready"}` from the backend process started at 12:32:25, the same second `index.ts` was last
  written, so that process runs the fix. A failure logs only the error code (`database readiness check
  failed`). A second dev start could not bind port 10000 (`EADDRINUSE`), because an older dev stack
  (`tsx watch`, started 09:31) already holds it. That stack was not stopped.
- Build and typecheck (after the chosen-verdict and readiness changes): `vue-tsc --noEmit` exit 0,
  `tsc --noEmit` (server) exit 0, `vite build` exit 0. Build (superseded; SVG era): JS 315.29 kB
  (gzip 117.39 kB), CSS 33.35 kB (gzip 7.27 kB).
- Not verified: rain and thunder heard in a browser with real audio output (not checked), the browser
  console after the first gesture, and OBS as a real browser source in OBS Studio.
- Open decision (product owner): whether OBS keeps the verdict buttons visible but `disabled`, as now,
  or hides them. The Link button is already hidden at reveal. Until the owner decides, OBS stays
  read-only and the buttons stay visible.
- Open decision (product owner): the reveal stamp shows the verdict's name only on the host page. A
  viewer-facing OBS view would need the chosen verdict in the snapshot, which means a change to
  `packages/contracts`. That package is out of scope for this change.
