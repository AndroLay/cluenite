# Asset Production Manifest — Each Item, Specification, Priority, QA

## Required for MVP (P0)

| Asset ID | Type | Source master | Variants / layers | Purpose | Priority |
|---|---|---|---|---|---|
| `brand_wordmark` | SVG | scalable 1200×400 logical | light/dark | landing, dashboard, overlay | P0 |
| `brand_mark` | SVG | 512×512 logical | 1c,2c | favicon/transition | P0 |
| `ui_evidence_card` | SVG/CSS | reusable | normal/hover/verified/refuted | object display | P0 |
| `ui_progress_rail` | CSS/SVG | reusable | quick/long | game progress | P0 |
| `ui_command_chip` | CSS | reusable | idle/focus/disabled | instruction legibility | P0 |
| `scene_q01_gallery` | WebP | 1200×680 | environment & R07 crop | first quick case | P0 |
| `prop_q01_robot` | transparent PNG | 512×512 | top/side static | Q01 reveal | P0 |
| `prop_q01_camera` | SVG | scalable | normal/zoom | inspect | P0 |
| `prop_q01_sensor` | SVG | scalable | enabled/fired | final proof | P0 |
| `scene_m01_stage` | WebP | 1920×1080 | photo, empty case | long case | P0 |
| `prop_m01_trophy` | PNG | 768×768 | present / crated | focus | P0 |
| `prop_m01_cart` | PNG | 768×768 | flat/angled | camera & reveal | P0 |
| `doc_m01_order` | HTML+SVG frame | 720×960 | signed/zoom | evidence; text in DOM | P0 |
| `doc_m01_access_log` | HTML+SVG frame | 720×960 | locked/unlocked | evidence; text in DOM | P0 |
| `scene_m01_coldroom` | WebP | 1920×1080 | B4 with crate | location reveal | P0 |
| `fx_clue_discover` | CSS/SVG | scalable | enter/reduced | satisfying first find | P0 |
| `fx_link_verified` | SVG path+CSS | scalable | success/idle | viewer agency | P0 |
| `fx_case_reveal` | CSS/SVG | scalable | normal/reduced | solve moment | P0 |
| `sfx_discovery` | original small audio | ≤1s | muted optional | positive feedback | P0 optional if time |

## Valuable co-op additions (P1)

| Asset ID | Specification | Purpose |
|---|---|---|
| `scene_c01_lighthouse` | 1920×1080 illustrated coast, separate beacon and camera layers | A station |
| `scene_c01_archive` | 1920×1080 records desk, separate binder and clock | B station |
| `prop_c01_buoy_b17` | 512×512 PNG/WebP with silhouette/night frame | physical clue |
| `doc_c01_212_reference` | DOM document on paper UI, content accessible | B reference |
| `fx_cross_breakthrough` | both lanes to center convergence, 700ms | joint celebration |
| `sfx_dual_confirm` | original two-part chime, quiet and skippable | co-op result |

## Later assets (P2+)

Additional case illustrated plates (8 quick seeds), animated page flip, rare suspect portraits, alternate room skins, dynamic backgrounds, case thumbnails. No heavy 2D sprite sheet pipeline.

## Art task brief template

```
ASSET ID:
CASE/NODE:
FRAME/SIZE:
ROLE: visual storytelling / optional ambience / essential clue (must duplicate in text)
PALETTE:
COMPOSITION: foreground/midground/background
TEXT: none in raster, UI text overlaid separately
EXPORT: SVG or WebP/PNG; include alpha when needed
ALT TEXT:
ANIMATION HOOK:
OWNERSHIP: original or licensed for redistribution
ACCEPTANCE: readable at 25% scale / exact cue legibility / consistent lighting
```

## Specific scene composition notes

- **Q01 Gallery:** frame with glass doors at left, low-angle rolling cleaner at center-right, motion sensor above; camera timestamp label as HTML. Character not necessary; avoid making R-07 label too hidden (puzzle is observation, not pixel hunting).
- **M01 Stage:** empty framed pedestal, warm spotlight, event banner with no copyrighted festival logos, small service door, optional trolley shadow; main clues appear as separate clickable callouts.
- **M01 B4:** chilled storage room illuminated teal, trophy in labeled safety crate and inventory scanner; B4 sign in UI, not only artwork.
- **C01 Lighthouse:** horizon, beacon, calm water, dock P4, 2-1-2 light pulse; avoid flash frequency that can cause issues; show pulse sequence as accessible text.
- **C01 Archive:** binder pages, calendar, buoy sketch, clean printed symbols; don't include many tiny unreadable paragraphs.

## Acceptance process

For each asset: check source file, target resolution, visible alpha edges, copyright provenance, UI readability, color palette, accessible text counterpart, reduced-motion variant. Track delivered status and hash in the repository asset manifest; do not claim samples are finished asset packs.
