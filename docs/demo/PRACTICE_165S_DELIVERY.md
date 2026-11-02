# Practice Case / 165-second template delivery

Verified 3 November 2026 (WITA). This is the owner's Practice Case cut with
an intentionally empty real Twitch section. It is a complete template export,
not a submission-ready claim that the missing live recording is present.

- MP4 (local): `apps/demo-video/out/Cluenite-Practice-Demo-165s-Template-v1.mp4`.
- English editorial captions (local): `apps/demo-video/out/Cluenite-Practice-Demo-165s-Template-v1.en.srt`.
- [Direction and live-media handoff](PRACTICE_165S.md)
- Technical audit (local): `apps/demo-video/out/practice165-audit-v1/report.json`.
- Review coverage (local): `apps/demo-video/out/practice165-review-v1/coverage.json`.
- Normal-speed browser playback report (local): `apps/demo-video/out/practice165-playback-v1/report.json`.
- Storyboard pages (local): `apps/demo-video/out/practice165-review-v1/storyboard-{1,2,3}.jpg`.

These generated artifacts remain on the owner's machine and are excluded from
the source repository. Their recorded results below are dated local evidence.

## Export evidence

SHA-256: `33082e06c26ef8a7c6575b4404a42c86cf5184797613df90860c3bca253a1858`.
File size: 31,416,222 bytes. Render completed at 04:15:47 WITA.

| Check | Current result |
| --- | --- |
| Video | Exactly 165.000 seconds, 4,950 frames, 1920 × 1080, 30 fps |
| Encoding | H.264, yuv420p, BT.709, MP4 |
| Audio | AAC stereo, 48 kHz; duration 165.013 seconds |
| Loudness / true peak | −19.06 LUFS / −2.55 dBTP |
| Full decode and export specification | Pass; no failed technical checks |
| Template TypeScript | `tsc --noEmit` passed |
| Documentation links | Passed |
| Live relinking helper | Read-only media validation passed; five slots / 40 seconds; configuration unchanged |
| English sidecar | 25 non-overlapping editorial cues, ending at 165 seconds |
| Browser playback | Pass at 1× speed; 4,950 presented frames, 0 dropped, no media/page error |

## Visual review and source truth

The actual exported digest produced **124 review frames at 720p**, covering
cut neighbors and four-second reading checkpoints. Three storyboard pages and
selected full-size frames were inspected. Selected 10-fps motion sheets cover
the opening, repaired cut, chapter handoff and test-result transition.

An independent Luna review of exported samples confirmed that the first frame
is clean, the old 3 × 3 tiled frame is gone, the suspect title no longer collides
with the native heading, the three modes are distinct, and the empty live slot
is clearly disclosed. The build/test labels remain legible and distinguish
actual development activity from Codex session UI.

Automated browser playback ran through the complete export at 1× speed in
165.117 seconds, presenting all 4,950 frames with zero drops. It used a 1280×720
viewport and retained 13 sampled screenshots. Selected playback screenshots of
the window find, suspect header, modes and test output were inspected at that
size. Playback was muted; this is playback/legibility evidence, not a human
listening review.

The main investigation is the local **A Missing Manuscript Practice Case**.
Its scripted viewers, retiming, source captures and reading holds remain
identified. It does not establish Twitch connectivity. Frames 420–2309 of the
preserved 90-second reference provide the main 63-second investigation, with
one corrupt source frame repaired through an adjacent genuine-frame hold.
The decorative 3D lens and the old unrelated case insert are excluded.

The build montage shows genuine source inspection and an actual recorded
test execution: **10 engine tests across three files passed**. It explains
Codex's role in case rules, deterministic proof checks and Twitch/EventSub.
No Codex conversation or chat messages were reconstructed.

## Intentional gap and acceptance boundary

**01:28–02:08 is empty by owner instruction.** All five live source fields
remain `null`. The placeholder describes the future edited full round:
start → Twitch command → released evidence → connected proof → conclusion.
No old live gameplay or Practice chat was used to disguise that gap.

The film is 2:45, within the owner's 150–179-second limit. Once final gameplay
is ready, the five-marker helper can replace only those 40 seconds while
retaining the rest of the edit. Capture, rendering and final review require
separate time; the handoff does not promise a complete render in ten minutes.

The technical auditor reports `creative_status: not_reviewed` and
`delivery_ready: false` for final submission. Source/still review and automated
playback do not constitute complete human artistic approval or audio listening.
The music has been metered; listening on headphones/speakers remains unverified.
The actual Codex session UI and final OBS/Twitch chat recording remain absent.
Original footage, reference videos and previous masters are preserved.
