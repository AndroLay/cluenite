# Cluenite demo video plan

**Current owner correction, 2 November 2026:** restore the original **2:55 / S1–S8** structure below. The 90-second and 126-second treatments are rejected directions; remove the decorative 3D magnifier from the active film. The current [expanded narration and content brief](SUBMISSION_175S.md) restores what Cluenite is, actual Twitch participation, the case logic, and how it was built with Codex. The [capture sheet](CAPTURE_175S.md) distinguishes required new footage from existing stills and local samples. The old gate table below is dated historical evidence; use `docs/STATUS.md`, actual source and fresh recordings for current claims.
**Prepared:** 2 November 2026. **Revised:** 2 November 2026 (length extended to 2:55).
**Basis:** the frozen [demo storyboard](../reference/Cluenite_Complete_Blueprint_v1.0/05_DELIVERY/02_DEMO_STORYBOARD_AND_SUBMISSION.md), the [implementation status](../STATUS.md), and the authored cases in `packages/cases/src/`.

This plan sets the segment flow, the claim gates, and the recording rules. Each segment's commands follow the engine parser and the case files. A rehearsal must confirm them before any footage is recorded.

## 1. Rules for this video

1. **Real footage only.** Every on-screen feature must come from a live run of the app: real Twitch chat, real OBS capture, and real app screens. No slideshows, simulated chat, or edited-in results.
2. **Length:** 2:55 target, extended from the frozen 2:30 storyboard at the owner's request. The frozen reference pack is unchanged. The official limit is 3 minutes, so the exported file must stay under 3:00.
3. **Hosting:** YouTube. Unlisted is acceptable; private is not (organizer update).
4. **Claims follow gates.** Every spoken or captioned claim must map to a passed gate in Section 2. If a gate fails, use the listed fallback and remove the claim.
5. **Sample pages are not live gameplay.** The `/sample/*` routes use local UI state and are not engine-validated. Never present them as a live round.
6. **No copyrighted audio or footage.** Use the owner's game-like scene or footage the owner has rights to. Background music must be owned or licensed.
7. **Hide secrets and personal data.** Keep off screen: `.env` values, the Twitch client secret, OAuth tokens, overlay credentials, session tokens, and viewer data beyond the test accounts' display names. Crop URL bars that contain session IDs.
8. **English copy.** Captions and voice-over are in English, per repository policy.
9. **Codex session ID** comes from `/status` in the Codex thread where most of the build happened. Never write a placeholder ID into the video or the submission.

## 2. Claim gates

| Gate | Requirement | Evidence as of 2 Nov 2026 | Status |
| --- | --- | --- | --- |
| G1 | A real Twitch chat command reaches the server for the authorized broadcaster. | Real OAuth and one enabled chat subscription are verified. Real chat and proof after token refresh are not verified. | Open. Live rehearsal needed. |
| G2 | Q01 runs end to end from chat command to reveal. | Covered by automated tests with mocked Twitch boundaries. No live Twitch run is recorded. | Open. |
| G3 | The OBS overlay shows live Quick Case state in OBS Studio. | The read-only `?mode=obs&session=<id>` overlay exists. OBS Studio behavior is unverified. The signed-in overlay-credential path is unverified. | Open. |
| G4 | Mystery Live (M01) is playable with real state. | Board, timeline, theory, and challenge controls exist. Full UI acceptance is unverified. The hint button disappears after the first hint (known bug). | Open. |
| G5 | Two-channel co-op works. | Host invitation creation is blocked by REQ-FE-006. Invitee accept/decline has not run against a live server. Rejoin has no frontend entry. | Blocked. Cut unless fixed and tested. |
| G6 | The Codex session ID is obtained. | Not yet obtained. | Open. |
| G7 | The demo runs on a deployed Render instance. | No production service exists. Production deploy is not authorized. | Not required for a local recording. Decision needed (Section 5). |

## 3. Segment flow

Timing totals 175 seconds (2:55). The 25 seconds added to the frozen 2:30 storyboard go to S2 (+5), S3 (+2), S4 (+3), S5 (+3), S6 (+2), S7 (+5), and S8 (+5). Commands are the parser's documented forms; the rehearsal confirms the exact accepted sequence.

| Segment | Time | Length | Topic |
| --- | --- | --- | --- |
| S1 | 00:00–00:12 | 12 s | Hook |
| S2 | 00:12–00:35 | 23 s | First viewer evidence |
| S3 | 00:35–00:52 | 17 s | Link and verdict |
| S4 | 00:52–01:20 | 28 s | Dashboard and Mystery Live |
| S5 | 01:20–01:45 | 25 s | Timeline correction and theory challenge |
| S6 | 01:45–02:17 | 32 s | Co-op, or a verified fallback |
| S7 | 02:17–02:40 | 23 s | Built with Codex |
| S8 | 02:40–02:55 | 15 s | Close |

### S1 · 00:00–00:12 · Hook

- **Goal:** show the problem and the overlay in context.
- **Real footage:** the owner's game-like scene full screen. The compact Quick Case overlay appears from the OBS Studio browser source (`?mode=obs&session=<id>`). Crop the URL.
- **Voice-over:** "One minute of downtime becomes a shared mystery."
- **Caption:** "Cluenite · Twitch-native mystery overlay"
- **Gate:** G3.
- **Fallback:** capture the real overlay in a browser window, captioned "Overlay preview (browser)". Do not claim OBS Studio.
- **Draft status:** the draft project shows an animated illustration of a streamer's view, labeled "ILLUSTRATION · NOT A TWITCH RECORDING · REAL CAPTURE PENDING". It is not proof. It is replaced automatically once a recording is linked to the `S1-stream` slot.

### S2 · 00:12–00:35 · First viewer evidence

- **Goal:** show that chat, not a dashboard, moves the case.
- **Real footage:** the Twitch chat panel. A test viewer account types `!look CAM`. The overlay shows the camera still and unlocks the evidence "Tag R-07 on low object" (`CAM_R07`). Hold on the evidence animation long enough for the audience to read it.
- **Voice-over:** "Chat finds evidence directly in Twitch."
- **Caption:** `!look CAM`
- **Gate:** G1, G2, G3.
- **Fallback if G3 fails:** show the chat panel and the real dashboard round state. Still real Twitch; the OBS claim is removed.

### S3 · 00:35–00:52 · Link and verdict

- **Goal:** show that the evidence changes game state and the verdict is checked.
- **Real footage:** a second test viewer types `!look SCHEDULE` (unlocks "Robot R-07 active window", `SCHEDULE_R07`), then `!link CAM_R07 SCHEDULE_R07`, then `!solve ROBOT`. The overlay shows the reveal text: "Verified: robot R-07 crossed the gallery sensor at 21:10, inside its scheduled cleaning window."
- **Voice-over:** "It's not votes; the evidence changes game state."
- **Caption:** "Verified by the case engine"
- **Gate:** G1, G2.
- **Rehearsal check:** if the engine accepts the verdict only after a different step, change these commands to match the engine. The script follows the engine, not the reverse.

### S4 · 00:52–01:20 · Dashboard and Mystery Live

- **Goal:** show the longer mode on the same engine.
- **Real footage:** the signed-in host dashboard (`/dashboard`), then the M01 board with evidence panels open (case "The Missing Festival Trophy").
- **Round start is a blocker:** the host panel exposes Pause, Resume, and Restart but not Start or Stop, and a new round stays in `READY` (STATUS, line 31). Do not show or claim a Start control until it exists. See Section 5, item 7.
- Avoid showing the hint button.
- **Voice-over:** "Same engine, deeper investigation."
- **Caption:** "Mystery Live · M01"
- **Gate:** G4.
- **Fallback if G4 fails:** shorten the segment to about 20 seconds and fill the rest with dashboard footage. Show the dashboard and the case library (`/library`). Replace the voice-over with "The longer mode is built on the same deterministic engine," which the code supports. Do not show M01 play.

### S5 · 01:20–01:45 · Timeline correction and theory challenge

- **Goal:** show that wrong theories are tested and refuted, not punished.
- **Real footage, in order:**
  1. Unlock the required evidence: `!look CASE` (HEAT_WARNING), `!look ACCESS` (ACCESS_RECORD), `!look TROLLEY` (CART_MARK).
  2. Submit a wrong order: `!order BLACKOUT TROLLEY OPEN ORDER HEAT`. The expected rejection shows.
  3. Submit the correct order: `!order HEAT ORDER OPEN TROLLEY BLACKOUT`. The timeline is reconstructed ("The case opened and the trolley left before the blackout began.").
  4. Test the theory: `!theory BLACKOUT_THEFT`, then `!challenge BLACKOUT_THEFT ACCESS_RECORD`. The overlay shows the contradiction: "the authorized move began before the lights went out."
- **Voice-over:** "Wrong theories are tested, not punished."
- **Caption:** `!challenge BLACKOUT_THEFT ACCESS_RECORD`
- **Gates:** G1, G4.
- **Note:** do not press the hint button in this footage until the known bug is fixed.

### S6 · 01:45–02:17 · Co-op, or a verified fallback

- **Default:** cut the co-op content unless G5 passes. Co-op is not verified live.
- **If G5 passes:** two channels (A and B) each run their station actions. A joint proof (`JOINT_PROOF_B17`) appears only after both teams share their output. Confirm the station commands in rehearsal.
  - **Voice-over:** "Two communities, two workstations, one truth."
  - **Caption:** "Two channels · one joint proof"
- **Fallback if G5 fails (32 seconds of real footage):** responsive checks on the signed-out public pages at 390 px and 1280 px. STATUS records no horizontal overflow on `/guide`, `/settings`, `/setup`, and `/coop`. Pair with a reconnect or reload to show state resync, if recorded live.
  - **Status (2 Nov 2026):** recorded from the local dev server with `apps/demo-video/scripts/capture-responsive.mjs`. Measured horizontal overflow is 0 px on `/guide`, `/settings`, `/setup`, and `/coop` at 390 px and 1280 px (`out/raw/responsive/report.json`). The capture is local and signed out; it is not a deployed Render instance.
  - **Voice-over:** "Layouts hold at phone and desktop widths."
  - **Caption:** "Responsive check · 390 px and 1280 px"
  - **Do not** present the co-op lobby as working.
  - **Do not** claim latency numbers unless they are measured in the recording.

### S7 · 02:17–02:40 · Built with Codex

- **Goal:** show the build process and the verification that backs it.
- **Real footage:** the Codex session record (`/status` shows the real session ID; crop if needed), the proof tests run live in a terminal (use the command documented in `docs/development/contributing.md`), and the EventSub adapter code.
- **Test counts:** do not quote a number from an old record. Use the count from the terminal run on the day of recording, or cite STATUS with its date.
- **Voice-over:** "Built using Codex, deterministic proof tests and EventSub."
- **Caption:** "Codex session · test run · EventSub"
- **Gate:** G6.

### S8 · 02:40–02:55 · Close

- **Real footage:** the Cluenite mark over the real reveal screen from S3. A link card for the repository and the Twitch demo channel.
- **Voice-over:** "Every clue brings us together."
- **Caption:** the one-sentence value prop: "Turn downtime into a mystery. Turn chat into investigators."
- **Gate:** repository visibility decision (Section 5). Do not show a repository link the audience cannot open.

## 4. Pre-recording checklist

- Use only owner-controlled test accounts and a test channel. Do not show real viewers.
- Confirm no secrets are visible in terminal output, OBS scene properties, or browser URLs.
- Turn off notifications and close unrelated windows.
- Record each segment as raw clips with timestamps. Keep the raw clips and any gate logs: they are the evidence that backs each claim in the final cut.
- Run the rehearsal once end to end before the final take. Update the command lines in this file if the engine behaves differently.

## 5. Decisions needed from the owner

1. **Co-op:** keep S6 as co-op (requires G5 to pass) or use the responsive-check fallback. Default: fallback.
2. **Recording target:** local run or deployed Render instance. Default: local run. Production deploy is not verified or authorized.
3. **Test accounts and channel:** which owner-controlled Twitch accounts to use for the viewers and the broadcaster.
4. **Narration:** the owner's voice or synthetic voice-over. Captions are required in either case. *Working choice (2026-11-02):* synthetic voice-over, Kokoro-82M voice `bm_george`, generated locally by `npm run audio` in `apps/demo-video`. Confirm the model's license on its model card before publishing the video. The owner's own recording can replace it.
5. **Background audio:** owned or licensed track, or no music. *Working choice (2026-11-02):* a light bed synthesized locally with ffmpeg (quiet tones and filtered noise, no third-party samples), mixed at low level and eased down under narration. Rule 6 is met by origin, since the project generated the audio. Replace it with a licensed track if the owner prefers.
6. **Repository visibility:** public, or private and properly shared with the organizer. The submission requires one of these.
7. **Round start path:** the dashboard has no Start control, so a new round stays in `READY`. Decide whether to complete the Start affordance first (frontend work, noted in STATUS) or start the recorded round through a path confirmed in rehearsal. Rehearsal must confirm whether chat commands are accepted while a round is `READY`. `packages/engine/src/round.ts` shows no READY/RUNNING check; the server lifecycle was not checked for this plan.

## 6. Build order (after approval)

1. Rehearsal: run the Q01 and M01 command sequences live. Update Section 3 to match the engine. Record gate results with dates.
2. Capture raw clips for each segment, following the checklist.
3. Assemble the cut with captions and voice-over timed to Section 3. The final cut must be 2:55 or less and under the 3-minute official limit.
4. Export and upload to YouTube as unlisted. Upload only after the owner confirms, because it is outward-facing. Record the link in the handoff documents.
