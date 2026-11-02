# Cluenite — Practice Case film with a reserved live run

Owner direction, 3 November 2026 (WITA): use Practice Case for the main
investigation, explain the other modes and Codex's contribution, and leave one
real Twitch/chat/gameplay section empty until final gameplay is ready. The
owner chose an edited complete round of about 40 seconds, rather than uncut
gameplay, and allowed a total duration of 150–179 seconds.

The current composition is **CluenitePractice165**, exactly **165 seconds**.
It supersedes the multi-case 150-second preview, which remains preserved.
This is intentionally a template preview while the live section is empty;
it must not be submitted as a completed Twitch demonstration.

## Locked edit

| Time | Content | Source and editorial purpose |
| --- | --- | --- |
| 00–08 | Missing manuscript; look closer | High-density native study capture, followed by a real window find. No 3D opening. |
| 08–15 | What Cluenite is | A mystery game for streamers and their Twitch chat; actual Practice Case context. |
| 15–78 | One complete Practice Case arc | Search → false lead → key/clock link → timeline → challenged alibi → accusation → reconstruction → coat-lining reveal. |
| 78–88 | Other ways to play | Actual current mode-selection capture: Quick Case, Mystery Live, Co-op. |
| 88–128 | One complete real Twitch round | **Media intentionally empty.** Five chronological slots for start, command, evidence, connection and verdict. |
| 128–155 | How Codex helped build Cluenite | Actual case rules, deterministic proof guard, EventSub normalization and recorded engine test execution. |
| 155–165 | Cluenite | Clean brand close: “Every clue brings us closer to the truth.” |

The Practice Case reuses frames 420–2309 of the owner's
`Cluenite-Demo-90s-v1.mp4`. This retains the requested evidence motion,
contradiction, timeline and reconstruction treatment. It excludes both 3D lens
sections and the old live-case preview. The source is genuine local application
footage with scripted viewers, not a Twitch recording. Its original source and
editorial manifests remain in `public/commercial/` and `public/motion-ui/`.
Find Assist, source retiming and reading holds remain disclosed there.
A corrupt tiled frame at reference frame 630 is omitted and its duration is
filled by an adjacent genuine frame. The original MP4 remains unchanged.
The verdict shot's decorative header is masked to remove a title collision.

The mode menu was captured through the real public local UI at 1920×1080 with
2× screenshot density and zero page errors. Its manifest is
`out/practice165-context/manifest.json`. The film uses the sharp native image
with focused emphasis, rather than enlarging the lower-resolution video text.

The build section uses `out/trailer150-development/development.webm` and its
dated manifest. Ten actual engine tests across three files passed. This is
source/test activity, **not a recording of a Codex conversation**. Its labels
make that distinction. The Practice Case itself runs in the browser; the
server proof guard shown belongs to the separate live engine.

## Render and replace

Run from `apps/demo-video` using installed local tools:

```powershell
python scripts/prepare-practice165.py
node node_modules/typescript/bin/tsc --noEmit
node scripts/render-practice165.mjs out/Cluenite-Practice-Demo-165s-Template-v1.mp4
```

The renderer preserves existing MP4s. Choose a new version for every revision.
The composition uses Remotion 4.0.540, React/TypeScript, `@remotion/media`,
`@remotion/transitions`, SVG/CSS, bundled fonts and frame-based timing. PNG
screenshots avoid the first-frame JPEG defect found in the earlier preview.
The original music/Foley sources are reused and re-edited to this timeline;
there is no borrowed soundtrack or synthetic narration.
An optional English editorial caption track is maintained at
`src/practice165/editorial.en.srt`; it can accompany the exported MP4.

## Fill only the live section

Record one real run as a clean **1920×1080** OBS composite, with actual Twitch
chat and the game both legible. Preserve genuine send → accepted state → proof
→ result. Do not substitute scripted Practice chat. Retain the original capture
manifest and provider receipts. Nothing in this template sends Twitch messages
or expands the earlier account/message authorization.

Five selections total 40 seconds: **6, 8, 10, 8, 8 seconds**. Choose chronological
non-overlapping in-points from that single round. Example values below are
placeholders for the actual captured action markers:

```powershell
node scripts/set-practice-live.mjs --file out/final/obs-round.mp4 --provenance out/final/manifest.json --in-points 0,12,25,40,60 --check
node scripts/set-practice-live.mjs --file out/final/obs-round.mp4 --provenance out/final/manifest.json --in-points 0,12,25,40,60
node scripts/render-practice165.mjs out/Cluenite-Practice-Demo-165s-Final-v2.mp4
```

The helper validates source size, duration and chronological selections,
normalizes to 30 fps without replacing the original, then updates only
`src/practice165/media.json`. Real captured audio is retained and the music is
ducked in that section. All captions, story timings, motion and other chapters
stay in place. Relinking can be a short manual step once media and markers
exist; capture, normalization, rendering and final review take additional time.
`--check` validates media structure; it does not authenticate Twitch activity or
replace a visual/provenance review of the selected run.

Review the final actual MP4 after inserting the run: every action/result,
chat legibility at 720p, complete playback, audio clarity/sync and final export
meters. A successful template render does not establish final visual approval.

## Issues to retain in the handoff

After live relinking, use the helper's generated
`out/practice165-delivery/editorial-live.en.srt` caption track. It replaces the
template's pending-footage caption without inventing commands or outcomes.

- The 40-second live slot remains empty at the owner's request.
- The main Practice Case uses the preserved reference edit; it is not a capture
  of the separately updated final frontend.
- The actual Codex session UI and full OBS/chat-send recording remain absent
  until supplied or captured genuinely.
- A technical audit, sampled-frame review and listening/playback coverage must
  identify the exact exported file; do not infer them from a prior version.
