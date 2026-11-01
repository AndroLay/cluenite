# Motion Design & Animation Production Spec (Timings, Keyframes, States)

## Philosophy

Motion signals **meaning**, not decoration: a discovery feels earned; a contradictory theory visibly changes state; a cross-channel match visibly joins two sources. Avoid expensive hand-drawn walk cycles and never hide essential logic inside an animation that watchers can miss.

## Motion language

- Ease entering: `cubic-bezier(.18,.72,.22,1)`; leaving `cubic-bezier(.4,0,.8,.3)`.
- Noninteractive fades and scale: 120–250ms; evidence connect 500–750ms; short reveal 2.5–4 seconds.
- Respect a 60fps browser target (not guaranteed). CSS/SVG transforms and opacity, no massive box-shadow animation or layout thrashing.
- At 30fps recording, hold each key information frame long enough to read; avoid 1-frame essential clues.
- Reduced-motion variant for everything: immediate state swap or <150ms fade, static proof icon.

## Animation catalog with implementation contracts

### A01 `overlay_enter` — 260ms, P0

0ms scale 0.94, opacity 0, translateY 12px; 180ms opacity 1, scale 1.01, Y 0; 260ms scale 1. **Purpose:** gentle presence, no main-game interference. Reduced-motion: fade 100ms.

### A02 `clue_discover` — 450ms, P0

0ms selected prop outlined in neutral; 80ms gold focus halo at 0.0 opacity; 220ms halo opacity 0.65; 320ms evidence thumbnail floats 8px toward rail; 450ms gold chip snaps into slot. Add small `FOUND` label. Reducer: static gold border + text.

### A03 `inspect_zoom` — 350ms, P0

0ms node bounding box selected; 140ms crop moves to inspection window, 280ms details fade in, 350ms controls become enabled. Use image transform; do not animate raster text.

### A04 `evidence_link` — 620ms, P0

0ms endpoints pulse once in teal; 80–400ms curved connector draws via SVG path dash offset; 420ms `VERIFIED` badge appears; 620ms line and badge settle. Invalid relation: neutral 120ms shake limited to 2px (or no shake for reduced motion) + "Not yet supported" text. Never draw a successful connector for invalid action.

### A05 `theory_refuted` — 720ms, P0

0–160ms theory card highlights; 180–340ms coral underlining appears on the contradicted claim; 340–520ms evidence chip moves into challenge slot; 520–720ms theory status becomes `REFUTED`, small reason label appears. No loud red flash. Reduced motion: status changes with line and icon.

### A06 `timeline_snap` — 260ms, P0

Valid chronological placement glides card to slot, teal tick fades. Wrong order does not destroy player work; show "Try swapping the earlier event" and maintain accessible focus.

### A07 `hint_reveal` — 280ms, P0

H1/2/3 slides down 8px and fades in with amber small bulb icon. Never autoplay H3 final answer.

### A08 `quick_reveal` — 3400ms, P0

0–500ms dim background 15%; 500–1100ms important evidence links brighten; 1100–1900ms a simple 2–3-panel illustrated explanation crosses; 1900–2750ms `CASE SOLVED` badge enters and captions show exact causal explanation; 2750–3400ms contributor credits + return-to-game text. If host hides source, skip/stop and persist state.

### A09 `chapter_transition` — 500ms, P1

Scene dims, notebook tab slides, "Chapter 2" pill appears and disappears; can be skipped by host. No long cutscenes.

### A10 `cross_community_breakthrough` — 900ms, P1

0–180ms A-side (teal) evidence card glows; 180–360ms B-side (lilac) card glows; 360–620ms two connectors converge to center; 620–900ms gold proof card reveals `VERIFIED TOGETHER`. Both station labels remain visible. Reduced-motion: static converged arrows and status.

### A11 `case_reconstruction` — 4 panels × 1.6s minimum, P0 for M01

Panel 1 thermal warning → panel 2 signed work order → panel 3 cart before blackout → panel 4 trophy safe at B4. Host can advance manually, pause or skip. Text subtitles visible for each panel; no narration required.

### A12 `coop_disconnect` — persistent until restore, P1

One small status chip changes to "Crew B reconnecting"; no full-screen failure strobe. Joint gate blocked; independent stations remain active where allowed.

## Animation state diagram

```
IDLE --inspect--> CLUE_DISCOVERY --commit_success--> EVIDENCE_CARD
EVIDENCE_CARD --valid_link--> LINK_ANIMATION --checkpoint--> NEXT_NODE
EVIDENCE_CARD --invalid_link--> SOFT_FEEDBACK --> IDLE
THEORY --valid_challenge--> REFUTATION_ANIMATION --> UPDATED_THEORY
VERDICT --requirements_met--> RECONSTRUCTION --> CASE_SOLVED
```

## Animation content/easing format

CSS custom properties `--motion-fast:180ms`, `--motion-mid:420ms`, `--motion-celebrate:900ms`, `--ease-clue:cubic-bezier(.18,.72,.22,1)`. Use named animation functions and CSS classes, never tie truth resolution to `animationend` (server commits state first; animations are client projection).

## Storyboard delivery

`06_VISUAL_PREVIEWS/animation_link_evidence.gif` and `animation_case_reveal.gif` show **non-production reference motion**, rendered programmatically. Use their beats/timing direction, not as finished game VFX. A final engineering implementation can use CSS/SVG to reproduce it at runtime.

## Motion safety / performance tests

- Turning on reduced motion actually disables movement & scaling beyond fades.
- No essential clue disappears before watcher can read it.
- Overlay animated frames don't spike main-game capture budget (measure real browser source on OBS, not just Chrome).
- Pausing browser source mid-motion reconstructs animation from server state; no inconsistent half-solved scene.
- Countdown and server state never depend on animation frame rate.
