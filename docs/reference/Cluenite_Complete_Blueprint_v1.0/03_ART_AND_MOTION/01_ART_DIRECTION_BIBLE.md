# Visual Art Bible — Cluenite "Cozy Cinematic Forensics"

## Art direction in one paragraph

**Cluenite** should look like an inviting illustrated mystery desk placed inside a polished streaming tool: warm indigo midnight background, readable cream paper evidence, restrained teal verification, warm gold discoveries, and coral-red contradiction marks. Semi-flat **2D editorial illustration** with softly beveled props, subtle paper grain and controlled lighting. More *detective notebook in a cozy adventure* than gritty police procedural. Character faces are optional static portraits; expressive props, stamp motion and evidence-string effects provide liveliness without a character animation pipeline.

## Three emotional gears

1. **Queue puzzle / Quick:** high contrast, minimal layers, one illustrated prop or photo + one visible prompt. Bright and friendly, instant comprehension.
2. **Mystery stage:** moody but warm studio desk, soft shadows on cards, rich illustrated scene 60%, evidence panel 25%, status 15%.
3. **Co-op:** each workstation has a clear accent: field `A = teal`, records `B = lilac`; both share neutral evidence board and gold breakthroughs. Avoid "red team vs blue team" implied competition.

## Art reference grammar (do not copy others)

- Shapes: card corners radius 16–22px, clean isometric-like object silhouettes, selectively imperfect paper edges, 1.5px line and soft 4–12px shadows.
- Textures: subtle layered 2–4% grain opacity; no photography needed for every prop; repeated detailed gritty grunge is prohibited.
- Composition: foreground object, midground evidence desk, background environmental hint. Keep 1 focal light and a max of 3 dominant attention zones.
- Illustration: flat silhouettes with 2 shadow planes, small specular highlight, clean cutout. For photos / records, use *illustrated surveillance stills* with accessible text labels; do not use blurred text as sole evidence.
- Camera: UI straight-on; case illustration can use gentle 3/4 perspective but no constant shaking or simulated 3D movement.
- UI frame: translucent dark navy panels + opaque cream/blue-gray cards. Contradiction shown by crossed proof line, not flashing red screens.

## Palette (editable single source in `design_tokens.json`)

| Token | Hex | Purpose |
|---|---|---|
| `ink900` | `#101C2A` | Deep dark background |
| `ink800` | `#192B3A` | Stage surface / panel |
| `ink700` | `#294154` | Interactive elevated card |
| `paper100` | `#F4F0E6` | Main readable text/card |
| `paper300` | `#C5D3DC` | Secondary type |
| `clueGold` | `#F5BE70` | Newly discovered clue |
| `proofTeal` | `#75D7BD` | Verified link / progress |
| `theoryLilac` | `#B8AAF5` | Speculation / records station |
| `warningCoral` | `#F0847E` | Contradiction / gentle warning |
| `neutralBlue` | `#8FAABE` | Metadata, quiet controls |

Use `#F4F0E6` on dark surfaces rather than white at 100% throughout. Text contrast must be verified in layouts, not assumed based solely on palette.

## Typography

- On-product wordmark: custom letter spacing of **CLUENITE**; no purchased font assumed.
- UI: **Inter** or system `ui-sans-serif`; ensure proper licensing if bundling any font — ZIP contains **no font files**.
- Title: 36–56px stage at 1920x1080; quick prompt 26–34px at 600x340 base concept; metadata 16–22px stage, compact min equivalent 15px if scaled down in stream.
- Evidence codes: monospace (system ui-monospace), used sparingly.
- Never encode a necessary word in raster illustration alone: matching DOM/text label should be visible.

## Assets to create (direction)

### Shared

Logo wordmark + magnifying clue/gold-line spark mark; 8 essential icons: inspect, link, challenge, timeline, hint, pause, solved, coop. Evidence card backgrounds; stamp motifs; thin connectors; objective header.

### Quick

One scene image per case, 1–3 detail crops; special focus halo; summary illustration; a small 2–3-frame reveal.

### Long

Opening panoramic plate 16:9, 3 stage scene variants, evidence thumbnails, 4 timeline cards, 3 static suspect/staff portraits if required, 4 reveal reconstruction panels, optional background parallax layer.

### Co-op

A lighthouse field desk (camera feed, horizon), B record/archive desk (ledger/manual), shared cross-board connector, paired signal-comparison card, one unified reveal panel.

## Asset technical format guidelines

- UI vectors: **SVG** for icons and shapes; no external script, no embedded untrusted HTML.
- Main environmental plates: optimized WebP or PNG with lossless evidence crops, 1920×1080 master; layered scene elements may be exported as independent transparent PNGs.
- Illustrations for overlay: 1200×680 master export for 600×340 use; prefer crisp vectors where possible.
- Cards: 400×240 thumbnail masters for evidence, avoid large text baked into art.
- Master concept frames: 1920×1080 stage, 600×340 compact, 1920×1080 co-op workstation.
- Naming: `scene_m01_stage_v01.webp`, `prop_m01_trophy_v01.png`, `fx_link_verified_v01.svg`; consistent IDs must map to content schema.
- QA: export alpha edges, check transparent background, validate crop/safe zones, screen-readable labels, preload expected transition assets.

## Rejected aesthetics

- Horror gore, crime scene blood, jump scares, high-contrast strobe effects.
- Giant 3D city or fully animated 2D heroes; no RPG elements.
- Excessive faux-film grain that makes clue labels illegible.
- Thin spider-web lines connecting 40 clues in one busy board.
- Retro pixel art unless the product is deliberately rebranded in a future version.

## Art quality review checklist

At 25% preview scale, can the streamer understand the object and action? Does the stage have one focal point? Can text survive Twitch compression? Are clues distinct without relying on color? Does each animation have a reduced-motion fallback? Do visuals support the evidence graph truth?
