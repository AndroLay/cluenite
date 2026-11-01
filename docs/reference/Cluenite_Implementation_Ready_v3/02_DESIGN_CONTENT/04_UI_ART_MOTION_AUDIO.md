# 04 — UX, Screen Inventory, Art Bible, Motion and Sound Production Spec

## Art identity

**Stylized Cinematic Cozy Mystery** — illustrated, warm-noir, friendly and clean. Mystery without gore. Large focal object; clear composition; one visible 'what's strange?' cue. Slightly theatrical reveals, controlled glow, pleasant tactile feedback. Not pixel art, photorealistic horror, anime battles, full 2D character skeletal animation, nor generic SaaS dashboard design.

**Typography:** concise bold headings + highly readable neutral sans-serif body. Avoid decorative fonts for evidence text and clue IDs. UI text remains DOM-rendered (accessible, selectable, responsive). Avoid embedding primary clue wording into images; clues must survive mobile and Twitch bitrate compression.

**Color system:** take exact token values from `05_REFERENCE/BLUEPRINT_v1/03_ART_AND_MOTION/design_tokens.json`; use consistent functional tokens for backgrounds, cards, observation highlights, valid proof, unverified theories, contradiction, and co-op station A/B. Never encode truth using color alone (pair icon and text). Do not accidentally invent a new contradictory theme while implementing.

## Screen inventory (complete product vs MVP)

| ID | Screen | User and contents | MVP priority |
|---|---|---|---|
| S00 | Landing/setup | 1-sentence pitch, connect Twitch, how it works, privacy notes | P0 lean |
| S01 | Twitch OAuth callback | clear connected/revoked/error, no tokens in client URL | P0 |
| S02 | Creator Dashboard | channel identity, connected/idle status, launch case, invite co-host, help | P0 lean |
| S03 | OBS Overlay Setup | preview, copy scoped URL, dimensions, opacity/safe-zone, test overlay | P0 |
| S04 | Quick Case Overlay | premise, objective, scene crop, 2–4 IDs, 1–3 contextual commands, timer/status | P0 |
| S05 | Quick Reveal/Collapsed State | short truthful reconstruction, contributions, close/next | P0 |
| S06 | Mystery Stage | illustration, inspectables, chapter title, current goal, on-stage feedback | P0 short |
| S07 | Evidence Board | unlocked evidence cards, verified links, unverified theory labels | P0 lean |
| S08 | Timeline/Code Challenge | 3–5 draggable/orderable cards or simple code UI (chat equivalent) | P0 one |
| S09 | Theory Challenge | 2–3 readable theories, evidence-dependent status, challenge affordance | P0 lean |
| S10 | Verdict & Result | evidence checklist, final choice, reconstruction, contributor credit | P0 |
| S11 | Co-op Lobby/Consent | A→B invite; expiry; permissions; explicit consent; disconnect status | P1 |
| S12 | Field Workstation | A-specific camera/map/scan; verified observations | P1 |
| S13 | Records Workstation | B-specific manual/log/verify; reference evidence | P1 |
| S14 | Shared Breakthrough | evidence merger, source teams, mirrored reveal and recap | P1 |
| S15 | Settings/Accessibility | motion, volume, color/contrast, quick auto-hide, hint mode | P0 basic |
| S16 | Case Library/Profile | case tags, difficulty, duration, solved and recap history | P2 |
| S17 | Offline/Expired/Paused/Error | truthful interruption, reconnect, empty state, no fake chat | P0 |

**Critical OBS distinction:** creator dashboard controls are NOT rendered in OBS. OBS view is stream-safe, read-only for sensitive data and has a separate overlay credential; it never exposes case answer or Twitch OAuth tokens.

## Layout specification

### Compact overlay

Master 600×340 at intended OBS layout size, export larger art plates for crisp scaling. Panel: unobtrusive header (case, state) → illustrated evidence region (one focal object) → one objective → 1–3 contextual action hints → small discovery message/reveal. Safe edge padding ≥16 px at design size. Support a condensed minimal mode for smaller overlays. Anti-obstruction: host can instant collapse/move the source; overlay does not capture keyboard input from the game.

### Full Mystery Live

Master 1920×1080; left/center stage visual 60–70%; right evidence/timeline drawer 25–35%; bottom small progress/recent breakthrough band. Responsive layout supports narrow views and screen capture at 720p; no tiny five-line paragraphs in OBS. Active scene and evidence board may be separate browser scenes chosen by streamer, but do not require many persistent OBS browser sources.

### Co-op

Station A and B must be aesthetically matched but functional roles visually distinguishable through icons, heading, and subtle accent. Each streamer gets their own overlay perspective and consented shared board; no information claimed secret against people watching both streams.

## Asset production order

1. Brand wordmark and simple detective motif (vector), coherent token sheet.
2. Q01: gallery background plate, camera crop, door log, robot-R07 silhouette, reveal panel.
3. Shared cards: document header, photo frame, label badge, linked/unlinked connectors, valid/invalid states.
4. M01: initial trophy photo, display case, cart, maintenance slip, B4 cold storage, 3–4 reconstruction panels.
5. C01 (P1): lighthouse camera/feed, harbor chart, records workstation, service manual B17, joint-proof split reveal.
6. Reusable effects: inspection highlight, pin, connector sweep, clue unlock, theory contradiction, chapter transition, subtle confetti-free solved stamp.

**Preferred formats:** SVG for icons/vectors (sanitize and treat as static assets); WebP/optimized PNG for illustrated plates; transparent PNG for layered objects; spritesheets if PixiJS layering yields measurable advantage; use no arbitrary SVG scripts. Provide layered masters if possible, filenames tied to case IDs and licensed provenance. Asset card thumbnails around 400×240; environment masters 1920×1080, content-aware crop. No copyright-restricted stock/music included without licenses.

## Animation specification (GSAP timeline; Pixi when needed)

All timings are **design starting points**; screen reader, low FPS and `prefers-reduced-motion` must remain functional. State changes happen **before** cinematic playback; skipping animation must leave final visual state correct.

| Cue | Motion intention | Approx. duration | Performance fallback |
|---|---|---|---|
| Inspect focus | camera zoom 1.0→1.07, halo on target, card opens | 300–500 ms | opacity + static highlight |
| Evidence unlocked | card enters with subtle translate/fade, 1 short chime | 450–750 ms | instant card + label |
| Link verified | connector stroke/travel plus convergence pulse | 450–800 ms | static connecting line + check icon |
| Invalid link | small restrained shake and informative label | 180–250 ms | text feedback only |
| Theory challenged | verified evidence highlights; 'unverified' → 'contradicted' card stamp | 650–1100 ms | static contradiction badge |
| Timeline snapped | cards align and one relationship pulses | 350–650 ms | instant reordering |
| Chapter transition | page-turn/dossier slide, small parallax | 500–900 ms | quick crossfade |
| Cross-community breakthrough | A/B evidence approach center; split line converges; joint result illuminates | 1100–1800 ms | single shared proof card |
| Final verdict | evidence chain path lights sequentially, reconstruction panels, solved stamp | 1600–3000 ms | sequential stills with textual result |
| Quick collapse | scale/fade compact panel, main gameplay remains visible | 200–350 ms | instant hide |
| Reconnect | simple status chip, no flash | as needed | static status |

**Never run perpetual full-screen shaders while scene is idle.** Use on-demand Pixi renderer and stop tickers on pause/hidden. Test animations in actual OBS CEF as well as modern browser. Limit filter count, avoid GPU readbacks, prewarm assets, and prefer transforms/opacity for DOM UI.

## Motion/audio implementation mapping

- Vue/CSS: cards, buttons, text, recap, aria-live region and focus.
- PixiJS 8: scene layers, illustrated inspect targets, object focus, simple particle/highlight if justified.
- GSAP: orchestrates independent animations and skip/pause/resume cleanup. Choose **one owner per animated property** to prevent conflicting tweens.
- Sound: a tiny chime for evidence, a soft lower tone for contradiction, a 2–3 second payoff sting for final reveal. Separate SFX group from narration; default conservative volume, mute controls, respect browser autoplay requirements. No music required for MVP.

## Accessibility and streamer safety

- Reduce motion: fully functional no-motion state; no strobes or flashing rapid patterns.
- Color accessibility: icons and 'Verified', 'Contradicted', 'Unknown' labels always accompany color.
- Keyboard and assistive tech: DOM controls for inspectables, focus order and status announcements; mirrored text alternative for Pixi scenes.
- Avoid sensitive/legal real-life crime allegations in authored fiction, personal names or personal data.
- Obscure login tokens, OBS private URLs and nonpublic notes in captured stream.
- Stress 720p and mobile downscale; objectives and command hints must remain legible.

## Art QA / done definition

A design asset is **not done** because an image exists. Require consistency of lighting and perspective, legible object IDs, alpha edge quality, correct casing, crop-safe viewing, accessibility fallback, scene registration and proof truth. A reveal illustration must not depict events contradicted by the actual case data. Assets in `05_REFERENCE` are mockups, not finished game art.
