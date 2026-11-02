# Final frontend → trailer media handoff

**Current owner cut:** [Practice Case, 165 seconds](PRACTICE_165S.md). Its live
Twitch/chat/gameplay slot is intentionally empty from 88–128 seconds. Follow
that document's five-marker workflow for the current cut. The multi-case
150-second replacement contract below is preserved history.

The complete 150-second edit is prepared independently of the frontend. Keep
the seven chapter boundaries, English story copy, Brown Noir design, transitions
and original sound. Replace source media through a JSON pack rather than changing
the composition. All commands below run from `apps/demo-video`.

## Capture contract

Use a **1920×1080, 30 fps** clean source, or explicitly update a slot's pixel crop
when a source has another size. Record the app at native resolution with readable
evidence; avoid recording a small panel and enlarging it later. Keep case IDs,
observations, evidence IDs and verified outcomes consistent with the backend.
Record at least one second before a meaningful action and the reading hold after
it. Every slot must identify its real capture type and provenance.

| Take key | Replaceable slots | Content to retain |
| --- | --- | --- |
| `q01-host` | Q01, Q03, Q04, Q06, B02; legacy underlay H01/H02 | Gallery context, CAM observation, schedule and linked state. The visible hook uses a separate artwork file. |
| `q01-overlay` | Q02, Q05, B01 | Before/after real CAM, SCHEDULE and LINK, including the released evidence and visible link state. |
| `q01-solve` | B03 | Real ROBOT command response and complete native explanation. |
| `m01` | M01–M11 | Exploration, display warning, access, trolley, signed order, wrong/correct timeline, contradiction and stable B4 verdict. |
| `coop-scan` | C01 | Actual field scan opening SCAN_P4. |
| `coop-A` | C02, C05, E01, E02 | Share physical evidence, shared proof and final beacon solve. |
| `coop-B` | C03, C04, D05 | Verify B17, share the manual, native joint proof. |
| `development` | D01–D04 | Real case/source inspection and actual test execution. A real Codex session can replace context only with accurate provenance. |

If a new frontend capture replays prior verified actions locally, use
`frontend-replay`; the film automatically changes the source label. It does not
inherit a “recorded Twitch” claim. Existing genuine provider clips can remain
as proof inserts alongside the refreshed visuals. An authenticated host UI
capture is `authenticated-host`, not a chat message recording.

## Fast replacement

Create one pack, then apply take-level file/offset updates. The helper fills the
existing shot IDs and crops; an unchanged capture schedule needs one command per
take. If action timings moved independently, adjust only the affected
`inPoint` values in the JSON. Durations remain locked.

```powershell
python scripts/trailer150-pack.py out/frontend-final-pack.json --init
python scripts/trailer150-pack.py out/frontend-final-pack.json --take m01 --file out/frontend-final/m01.mp4 --capture-type authenticated-host --provenance out/frontend-final/manifest.json
python scripts/prepare-trailer150.py --pack out/frontend-final-pack.json --check
node scripts/refresh-trailer150.mjs --pack out/frontend-final-pack.json --out out/Cluenite-Trailer-150s-Final-v2.mp4
```

The pack uses paths relative to its location. `--offset 1.25` shifts the selected
take's source in-points by 1.25 seconds. Use a new pack for a new source version;
do not repeatedly add offsets to an already shifted generated ledger.

Example of a single precise replacement (not a required filename):

```json
{
  "version": 1,
  "shots": {
    "M02": {
      "file": "frontend-final/m01.mp4",
      "inPoint": 10.4,
      "crop": [420, 218, 1080, 608],
      "captureType": "authenticated-host",
      "provenance": "frontend-final/manifest.json"
    }
  }
}
```

Set `crop` to `null` for full-frame footage. Use `whiteKey: false` if a final OBS
recording already contains the intended background. `openingArtwork` may point
to the final in-game gallery artwork; it does not require a story or timing edit.
An unlisted slot continues to use its verified original. Cache keys include the
replacement's content hash, so replacing a file at the same path invalidates it.

The target is **under ten minutes of manual relinking/crop adjustment once
recordings are ready and preserve the agreed sequence**. A materially redesigned
layout or missing actions requires new framing or capture. Encoding and a final
review still take their measured machine/playback time.

## OBS pass after frontend completion

OBS Studio is installed locally. It has not been used to retroactively relabel
browser videos as OBS recordings. For the final capture:

1. Use a 1920×1080 base/output canvas, 30 fps, 48 kHz audio and a high-quality
   local MKV recording; remux the finished take to MP4. Keep the app's actual
   interaction, outcome and any genuine Twitch send window readable.
2. Capture only the intended app/browser source. Crop browser chrome and private
   operator/session information at the capture source, not by enlarging a tiny
   game panel in post. A real OBS overlay URL may contain a credential; do not
   show its properties dialog in the recording.
3. Follow the slot order above. Preserve the actual provider receipts for any
   new Twitch actions. The earlier owner authorization is **19 messages total**;
   13 were already provider-accepted. This template sends none and does not
   authorize a fresh 19-message allowance.
4. Save the capture manifest, source resolution, action markers and capture type
   beside the source files. Copy sources into a new directory; preserve old takes.

Do not expand the scope into new game implementation, frontend changes, deploys
or another 3D sequence. The purpose of this handoff is a bounded media swap.
