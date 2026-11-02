# First 30 seconds: owner review

The owner narrowed work to the first 30 seconds on 3 November 2026. Do not extend
this direction into the full 175-second film until the owner approves it.
The review window began at 17:34:19 UTC on 2 November, with a 20-minute budget.
Earlier 30-second v2 and the 35-second content review were rejected as generic.
The intermediate native v3/v4 studies are not delivery candidates.

Current candidate: `apps/demo-video/out/Cluenite-Opening-30s-Review.mp4`.
Editable composition: `apps/demo-video/src/submission/OpeningStudy.tsx`.
Independent entry: `src/submission/opening-study-entry.tsx`.

## Direction

- Open on the native gallery and one concrete question: an alarm at 21:10 while
  the main door stayed locked.
- Carry the same CAM file from the room into an inspection. Define Cluenite
  within the first twelve seconds without a separate logo opening.
- Show the verified `!look CAM` input, the camera record opening, and R-07 evidence.
- End with the unopened schedule and the question of whether R-07 was scheduled
  there. Preserve the later solution for the following segment.
- Use actual native clue/evidence elements at device scale 3, native Brown Noir
  colors, EB Garamond/Inter, and an original short score and editorial Foley.

## Sources and truth

The large slips are an explicitly labeled **native UI replay**. The read-only
harness imports the actual Vue component and derives snapshots with the actual
case engine. It does not call an API or change any saved game or provider state.
Its generated files and page-error result are in `out/native-opening-v3/`.

The separately labeled **recorded browser overlay** is a crop of
`out/live-capture-2026-11-02T15-44-56-890Z/q01-overlay.webm`. This is a Playwright
recording of the actual OBS browser-source page responding to the real Twitch
test; it is not an OBS Studio screen recording or a live broadcast. The original
manifest verifies the actual `!look CAM` EventSub receipt. No chat screenshot,
participant reaction, new Twitch message, or reference footage is fabricated.

## Reference coverage

The complete source list is in [the reference review](REFERENCE_REVIEW_20261103.md).
Baited informs action/result and the unresolved next deduction. Momo informs an
anchored object, room continuity, purposeful scale changes and reading holds.
Momo's private local copy is `.cache/demo-reference-NKIz-Rp-DtA/reference.mp4`;
observed samples cover 0-3 seconds at 6 fps, 3-7 at 4 fps, and 7-27 at 1 fps.
These are frame-sequence observations, not full playback or audio listening.
Lovio and Linear's source pages were revisited; no unobserved film details are
claimed. The Golden Idol link remains a historical narrative reference.

## Reproduce and review

From the repository root, refresh native elements with:

```powershell
node --import ./apps/server/node_modules/tsx/dist/loader.mjs apps/demo-video/scripts/capture-native-opening.mjs
```

From `apps/demo-video`, render with `node scripts/render-opening-study.mjs`.
The review export applies a fixed 11.69 dB gain to the measured original soundtrack
(-33.69 LUFS, -18.27 dBTP), targeting -22 LUFS without dynamic compression.
The raw v5 export is preserved separately.

The current technical report is `out/opening-v5-delivery-review/report.json`, tied
to the final review file's digest. Independent still inspection at frames
30, 210, 480 and 850 found no blocking collision or primary-text readability
failure. The original 540-pixel overlay has softer small text; the adjacent
native replay provides readable detail. Full normal-speed playback, audio
listening, reference parity and artistic approval are not certified by these
checks. Owner direction approval remains pending.
