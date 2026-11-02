# Cluenite — 150-second trailer template

Superseded by the owner's [Practice Case / 165-second direction](PRACTICE_165S.md),
which reserves an empty 40-second live-playthrough section. This multi-case
version and its sources remain preserved.

Updated 3 November 2026 (WITA). This is the current owner-directed edit. The
175-second submission and first-30-second studies remain preserved history.

The owner is updating the frontend separately. The deliverable at this stage is
a complete, rendered **150-second template using verified existing footage**,
plus media slots that can accept the completed frontend without rewriting the
story, typography, animation, audio or chapter durations. It is not a claim that
the new frontend has already been captured or visually approved.

## Direction and edit

**Cinematic Brown Noir — A Mystery Solved Together.** The promise is: “Your
viewers are no longer just watching. They're solving the mystery with you.”
The actual game provides the action and outcome. Text directs attention to
specific observations; it does not replace the game with invented UI.

| Film time | Story and visible proof | Edit and transition |
| --- | --- | --- |
| 00–08 | Who triggered the alarm? Locked gallery door, 21:10. | Sharp original gallery artwork at 1,320 px from a 1,344 px source; restrained focus move. Clearly labeled as in-game artwork. Replaces the rejected enlarged 900 px recording crop. |
| 08–35 | Real `!look CAM` and `!look SCHEDULE`; recorded overlay releases CAM_R07 and SCHEDULE_R07. | Overview → actual response → close evidence. Command annotations are backed by durable EventSub receipts. |
| 35–49 | Actual link, `!solve ROBOT`, then the recorded robot conclusion. | Thin editorial connector only after the native linked state. Result caption waits for the actual reveal. A 22-frame scene handoff enters the next investigation. |
| 49–90 | Missing trophy, overheating, access record, trolley and work order; wrong and corrected timelines; theft contradiction; verified safety relocation to B4. | Real authenticated host actions. Evidence close-ups lead to the native reconstruction; the verdict has a five-second reading hold. No extra Twitch input is claimed. |
| 90–115 | Team A scans and shares; Team B verifies and shares the manual; native joint proof. | Actual two-account test intercuts. A cropped-document split was removed rather than present an unreadable document as proof. |
| 115–139 | Specific Codex contribution, case rule → proof guard → EventSub normalization → actual engine test execution → game result. | Real development activity, not a reconstructed Codex conversation. Text explains why the code matters to gameplay. |
| 139–150 | Real `!solve B17` and verified beacon reveal, then Cluenite and the final line. | Resolved state → restrained brand close. A documented last-frame hold supports the ending; the original recording is untouched. |

Colors: obsidian `#100D0A`, espresso `#211811`, walnut `#493021`, antique brass
`#A77A48`, warm gold `#D9B681`, parchment `#E9DECB`. Bundled EB Garamond and Inter
remain licensed locally. No borrowed reference footage, music or character art
is included. There is no new 3D opening or synthetic narration.

## Reference decisions

The owner-selected local `Cluenite-Demo-90s-v1.mp4` is the current motion
reference. Its best techniques are continuity of one focus, native detail
holds, same-position contradiction, and connection after both facts exist.
The older film's fictional manuscript case and magnifier are not repurposed as
live Q01/M01 evidence. The local film was inspected through actual sampled
motion sequences and its Remotion source; audio parity has not been claimed.

The earlier external reference ledger remains in
[REFERENCE_REVIEW_20261103.md](REFERENCE_REVIEW_20261103.md):
[Baited](https://www.youtube.com/watch?v=ARXYBKwodKI),
[Momo](https://www.youtube.com/watch?v=NKIz-Rp-DtA),
[Lovio](https://zelios.agency/customer-stories/lovio/),
[Linear Mobile](https://linear.app/mobile), and
[Golden Idol](https://www.youtube.com/watch?v=7yhUGJevw18).

## Implementation and source truth

Run commands from `apps/demo-video`.

- `src/trailer150/Trailer150.tsx`: seven independently authored chapter rows in
  `TransitionSeries`, English copy, semantic overlays and final branding.
- `src/trailer150/Motion.tsx`: actual-source handoff, evidence connection,
  timeline emphasis and contradiction strike.
- `scripts/prepare-trailer150.py`: frame-accurate source trims/crops, local
  neutral-background compositing, per-shot cache and exact frame validation.
- `src/trailer150/edit.generated.json`: source/time/provenance ledger. This is
  generated, not the place to hand-edit replacement media.
- `scripts/compose-trailer150.py`: original 150-second chamber cue and tactile
  Foley, 48 kHz stereo, two-pass loudness normalization. Raw captures are silent.
- `scripts/render-trailer150.mjs`: bounded rendering with installed Chromium,
  two workers, H.264, yuv420p and BT.709.

Remotion, `@remotion/media` and `@remotion/transitions` are pinned together at
**4.0.540**. React/TypeScript, SVG/CSS and frame-driven interpolation provide the
motion system. Current API references were checked against
[Video](https://www.remotion.dev/docs/media/video),
[Audio](https://www.remotion.dev/docs/media/audio), and
[TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries).
No browser-time animation engine is used. Existing fonts avoid a new network
font dependency. FFmpeg handles conforming, metering and encoding. Playwright
captures development activity and rendered review frames. Luna provided a
bounded independent still/source review; Codex implemented this template.

Four original `out/live-capture-2026-11-02T*/manifest.json` files support the
gameplay. The last successful capture is `16-40-29-628Z`; there were 13 cumulative
provider-accepted test messages, 10 durable EventSub receipts. No new Twitch
messages were sent to build this template. Owner-controlled test accounts are
not presented as a public audience, and no viewer count is fabricated.

The files are browser recordings of real app/overlay responses, not continuous
OBS Studio recordings. No original Twitch chat-window send video or authentic
Codex conversation video is available. Command captions are editorial receipts;
the build montage shows actual local source/test execution instead. The new
development recording at `out/trailer150-development/` ran **10 engine tests in
three files, all passed**, recorded 3 November WITA. This is engine-unit evidence,
not a test of the complete frontend or OBS.

## Frontend replacement workflow

See [FRONTEND_VIDEO_HANDOFF.md](FRONTEND_VIDEO_HANDOFF.md) for the capture contract
and the target of under ten minutes of **manual media adjustment after the
replacement recordings exist**. Capture, encoding and full visual review are
separate elapsed work; their duration is not guaranteed by the slot API.

```powershell
python scripts/prepare-trailer150.py
python scripts/compose-trailer150.py
node node_modules/typescript/bin/tsc --noEmit
node scripts/render-trailer150.mjs out/Cluenite-Trailer-150s-Rebuild-v4.mp4
```

The renderer refuses to overwrite an existing MP4. For revisions use a new
version name. Original captures, old masters and source packs remain intact.

## Explicit issue list

| Priority | Issue | State |
| --- | --- | --- |
| P0 | Blurry opening from a 900×340 / 760×287 crop enlarged to 1080p | Replaced by original gallery art at near-native display size; new rendered frame inspected. |
| P0 | The full JPEG render tiled its first frame, despite correct following frames | Isolated to frame 0 through a 30-frame motion sheet. PNG render smoke test fixes the first frame; renderer now uses PNG. The v3 conform replaces frame 0 with that verified native render. |
| P0 | E02 source ended after 2.033 seconds, shortening the picture to 146.033 seconds | Fixed with an explicit genuine-state hold; every clip and final picture now enforce the exact frame contract. |
| P0 | C02 split cut the records document mid-word | Removed that split. The real share is followed by the full recorded records station. |
| P0 | Result captions appeared before the solve/test result | Delayed verified language to the recorded result; use action copy before it. |
| P1 | Provenance/command overlays covered native M01/C01 headers | Moved source labels to the footer; large command rows limited to Q01; co-op input stays in a small footer. |
| P1 | Repeated timeline/contradiction text | Suppress the generic caption while the specific annotation is present. |
| P1 | Existing 540 px browser overlay is softer than the authored vector layer | Visible old-footage limitation. Replace the Q01 overlay slots with high-resolution final frontend capture; do not claim sharpening creates missing detail. |
| P1 | Current co-op records-station artwork reuses the gallery maintenance document | Retain source truth in this template; final frontend capture should show a B17-specific record. Native MANUAL_B17_212 and JOINT_PROOF_B17 cards remain the actual proof. |
| P1 | OBS Studio/chat-send/Codex-session video gaps | Explicitly disclosed; record the final OBS workflow after frontend settles. Do not relabel browser capture as OBS footage. |
| P1 | D03's long source excerpt reaches the lower edge | Final caption masks the collision; the EventSub fields/validation remain visible. A shorter native source view is preferred for the final recording. |
| P1 | Final frontend footage and final artistic approval | Pending the separately owned frontend update and owner review. |
| P1 | Full human playback/listening | Not claimed from rendered stills or meter results. Review coverage must be recorded for the actual exported digest. |

Technical export evidence and exact review coverage belong to the delivery
report beside the actual MP4. A successful render is not visual approval.
