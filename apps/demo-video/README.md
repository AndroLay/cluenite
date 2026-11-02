# Cluenite demo video (Remotion)

## Source and local media

This optional npm project is separate from the application pnpm workspace.
The repository contains its compositions, scripts, lockfile and licensed fonts.
Recordings, generated audio, review frames and exports remain local and are
ignored by Git. Existing editorial media paths describe the owner's capture
pack; they are not downloadable assets in a fresh checkout. Restore that pack
before rendering, or capture replacement footage using the scripts below.
Run `npm ci` and `npm run typecheck` from this directory to work on the source.
No recording or final submission is published by committing this project.

**Latest owner direction:** [165-second Practice Case film](../../docs/demo/PRACTICE_165S.md)
with a deliberately empty 40-second slot for one complete edited real Twitch
round. Total duration is within the owner's 150–179-second limit. Practice,
mode explanations and real Codex build evidence form the rest of the film.

- Composition: `CluenitePractice165`; source: `src/practice165/entry.tsx`.
- Template output: `out/Cluenite-Practice-Demo-165s-Template-v1.mp4`.
- Render: `node scripts/render-practice165.mjs out/Cluenite-Practice-Demo-165s-Template-v1.mp4`.
- Studio: `node node_modules/@remotion/cli/remotion-cli.js studio src/practice165/entry.tsx`.
- Live relinking: `scripts/set-practice-live.mjs`; five explicit source markers.
- [Current export and review evidence](../../docs/demo/PRACTICE_165S_DELIVERY.md).
- The multi-case 150-second preview below is preserved and superseded.

**Previous scope, 3 November 2026:** the owner requested a complete 150-second
game-trailer template while the frontend is being updated separately. It uses
verified existing gameplay, sharp original gallery artwork, purposeful motion,
English captions, original audio and real development/test evidence. The old
30-second gate and 175-second duration below are superseded, preserved history.

- [Current direction, source truth and issue list](../../docs/demo/TRAILER_150S.md).
- [Fast frontend-media replacement handoff](../../docs/demo/FRONTEND_VIDEO_HANDOFF.md).
- Composition: `ClueniteTrailer150`; source: `src/trailer150/entry.tsx`.
- Full template preview: `out/Cluenite-Trailer-150s-Template-v3.mp4`.
- Rebuild: `node scripts/render-trailer150.mjs out/Cluenite-Trailer-150s-Rebuild-v4.mp4`.
- Studio: `node node_modules/@remotion/cli/remotion-cli.js studio src/trailer150/entry.tsx`.

Remotion, `@remotion/media` and `@remotion/transitions` are pinned at 4.0.540.
The replaceable media conform, story timing, captions, motion and sound are
separate. A replacement pack requires capture provenance, source duration and
valid crops; cached source clips and original masters remain intact.

## Historical owner brief: 2:55 submission demo

The owner rejected the shortened commercial and its decorative 3D opening. The active composition is now **ClueniteSubmission175**, exactly **175 seconds / 5,250 frames at 30 fps**. It restores the original S1–S8 structure, explains what Cluenite is, and includes the actual Codex build story. See the [current narration](../../docs/demo/SUBMISSION_175S.md) and [capture sheet](../../docs/demo/CAPTURE_175S.md).

`ClueniteContentReview` joins the 12-second opening and the 23-second build section for content review only. It is not the complete film. The source/test excerpts and dated OBS stills are real, while the stills are not represented as continuous footage. The current narration guide uses a clearly identified synthetic voice. Required new real-provider clips are tracked in `src/submission/media.json`; `node scripts/render-submission.mjs --check` refuses a master export while mandatory clips are missing.

Prepare source evidence with `node scripts/prepare-submission.mjs`. The rejected 90-second/126-second studies remain archived in source; the active root does not import their 3D scenes. Do not use their duration as the submission target.

## Preserved 90-second commercial and current motion reference

The current film is **90 seconds, 1920×1080, 30 fps**. It follows an actual local A Missing Manuscript playthrough with an original 3D brass magnifier, Cluenite's active Brown Noir palette, EB Garamond/Inter, a false lead, linked proof, reconstruction, and the coat-lining twist. The previous 126-second source below is preserved and superseded.

- Final target: `out/Cluenite-Demo-90s-v1.mp4`.
- Editable source: `src/commercial/Commercial.tsx`, `NoirOpening.tsx`, `BrassLens.tsx`, `Brand.tsx`, `InvestigationScenes.tsx`, and `ResolutionScenes.tsx`.
- [Current production treatment](../../docs/demo/COMMERCIAL_90S.md) and [delivery review](../../docs/demo/DELIVERY_REVIEW.md).
- Actual footage: `public/commercial/`, with raw-source and editorial manifests. High-density native UI records: `public/motion-ui/`.
- Sample viewers are scripted and remain labeled. The Mystery Live insert is a visual preview. No live Twitch/OBS/co-op acceptance is inferred.
- Original instrumental score: `scripts/compose-commercial-score.py`. No synthetic narration, borrowed reference assets, or external music samples.

```powershell
npm run typecheck
npm run commercial:score
npm run commercial:stills
npm run commercial:render
```

Studio composition: `http://localhost:3001/ClueniteCommercial` when the owned local Studio is running. The versioned MP4 is the stable review artifact.

## Superseded film: ClueniteFilm

The current cut is a 2:06 mystery film: 1920x1080, 30 fps, 3780 frames. Follow an actual local playthrough of **A Missing Manuscript** from object finds through a wrong theory, connected evidence, timeline repair, contradiction, accusation, and the coat twist. Fun and audience participation take priority over a feature tour.

- Source: `src/film/`; creative direction: [production treatment](../../docs/demo/PRODUCTION_TREATMENT.md).
- Real UI recordings and source screenshots: `public/film/`. Raw recording and markers: `out/production-capture-v4/`. `clip-manifest.json` records editorial retiming; this is not a latency benchmark.
- The persistent **LOCAL BROWSER SAMPLE · SCRIPTED VIEWERS** label identifies the public local sample. This film does not establish live Twitch, OBS, server proof validation, or co-op acceptance. The M01 insert is labeled **M01 VISUAL PREVIEW**.
- Original instrumental music is authored in `scripts/compose-score.py`. The current cut contains no synthetic narration or external stock footage/music. Bundled font licenses remain in `public/fonts/`.
- Master output: `out/Cluenite-Demo-2026-11-02.mp4`. Export/review evidence is recorded in `docs/demo/DELIVERY_REVIEW.md` after the current render completes.

Run from this directory, using the repository's installed Playwright Chromium, local Remotion dependencies, Python with NumPy, FFmpeg, and ffprobe:

```powershell
npm run typecheck
npm run film:stills
npm run film:render
```

For a fresh capture, run the web app on an unused local port, set `CLUENITE_WEB_URL` to that exact origin, then run `npm run film:capture`. Each capture creates a new timestamped raw directory. To re-encode an existing take, run `npm run film:prepare -- out/production-capture-v4`. Regenerate the original score with `npm run film:score`. `CLUENITE_CHROME` can select an already installed compatible Chromium executable; these commands do not install one.

## Preserved Haiku draft

The following instructions describe the earlier composition and its separate assets. The new film does not replace its footage slots or narration.

Remotion project for the 2:55 Cluenite demo cut. The shot list and claim gates are in
[`docs/demo/DEMO_VIDEO_PLAN.md`](../../docs/demo/DEMO_VIDEO_PLAN.md). This project is a
**draft**: it stays marked `DRAFT` until real recordings replace the placeholder slots.

## Status

- Composition `ClueniteDemo`: 1920x1080, 30 fps, 175 s (5250 frames).
- Segments S1–S8 follow the plan. Timing is in `src/timeline.ts`.
- Footage slots in `src/footage.ts` are placeholders until a recording file is linked.
  While any slot is a placeholder, a `DRAFT · REAL FOOTAGE PENDING` badge stays on screen.
- S1 shows an animated **illustration** of a streamer's view. S2–S5 and S7 show labeled schematic
  **illustrations** from `src/illustrations/`. S6 shows real browser captures of the signed-out public
  pages at 390 px and 1280 px (`public/footage/S6-responsive.mp4`, captured 2 Nov 2026 from the local
  dev server). S8 shows only the wordmark. Every illustration is labeled as an illustration and is not
  Twitch proof. Each one is replaced automatically once its slot in `src/footage.ts` has a file.
- Caption timings inside each segment are provisional until real footage exists.
- Audio: one Kokoro narration line per segment, a light background bed, and three sound effects
  (chime, tick, stamp). The narration and bed come from `npm run audio`; the sound effects come
  from `node scripts/sfx.mjs`. All are generated locally. They have not been checked in Studio or
  in a full render.

## Commands

Run from this directory (`apps/demo-video`):

```bash
npm install            # first time only
npm run studio         # opens Remotion Studio for live preview
npm run typecheck      # tsc --noEmit
npm run still          # renders one frame to check layout (not the full video)
npm run audio          # regenerates narration (Kokoro) and the background bed (ffmpeg)
node scripts/sfx.mjs   # regenerates the sound effects (ffmpeg only)
node scripts/capture-responsive.mjs   # re-records S6 (needs npm run dev in the repo root and npx playwright install chromium)
```

`npm run audio` needs `ffmpeg` and `ffprobe` on PATH, and the `hyperframes` CLI with the
`kokoro-onnx` and `soundfile` Python packages (`pip install kokoro-onnx soundfile`). If the CLI
picks a Python that lacks them, set `HYPERFRAMES_PYTHON` to an interpreter that has them, for example
`HYPERFRAMES_PYTHON=<path-to-python> npm run audio`.

Do not render the full MP4 until the owner asks for it. `out/` is git-ignored.

## Adding real footage

1. Record the slot described in `src/footage.ts` (the `brief` field lists the exact steps).
2. Copy the file into `public/footage/`.
3. Set that slot's `file` in `src/footage.ts`, for example `file: 'S2-chat.mp4'`.
4. Check the timing of the captions in the matching scene file under `src/scenes/`.
5. Re-time or remove the sound-effect cues in `src/audio/Sfx.tsx` that follow the illustration.

## Rules for this project

- **No fake proof.** Claims on screen must map to a passed gate in the plan. Do not present
  illustrations, mock chat, or placeholder cards as recordings.
- **Audio is generated locally.** Narration is Kokoro-82M output (voice `bm_george`). The
  background bed is synthesized by ffmpeg in `scripts/audio.mjs`, and the sound effects by ffmpeg in
  `scripts/sfx.mjs`. None uses third-party samples. Do not add music or sound effects from outside
  sources unless the owner licenses them and the plan records it. Recorded footage stays muted.
  On-screen captions still carry the voice-over text.
- **No secrets on screen.** Do not show `.env` values, tokens, overlay credentials, or session IDs.
  Crop URLs and session IDs before recording.
- **English copy.** Captions and code comments are in English, per `AGENTS.md`.

## Structure

```
src/
  index.ts          Remotion entry point
  Root.tsx          Composition registration
  Main.tsx          Segment sequencing, fades, DRAFT badge, audio mounts
  timeline.ts       FPS, size, segment table (mirrors the plan)
  footage.ts        Footage slots and placeholder briefs
  illustrations/    Labeled schematic stand-ins for S2–S7, shown until footage is linked
  fonts.ts          Loads bundled EB Garamond and Inter before rendering
  theme.ts          Palette, font stacks, spring helper
  components/       Background, Caption, FootageSlot
  scenes/           One file per group of segments
  audio/            Narration, bed, and sound-effect components; narration.generated.ts is written by the script
scripts/
  audio.mjs         Generates narration WAVs, the timing module, and bed.mp3
  sfx.mjs           Synthesizes the sound effects with ffmpeg
  capture-responsive.mjs  Records S6 from the local web app (Playwright) and composes the clip
public/fonts/       WOFF2 files and OFL license texts
public/audio/       Generated narration (vo/), bed.mp3, and sound effects (sfx/); regenerate with the scripts above
```

## Fonts

EB Garamond and Inter, both under the SIL Open Font License. The license files are in
`public/fonts/`.
