# Implementation Roadmap — Vision vs Hackathon Deliverables

## Hard constraint

Official deadline: **Nov 2, 2026, 14:00 PST** = **Nov 3, 2026, 06:00 WITA**. Submission code/video must reflect a newly built project in the official Oct 23–Nov 2 submission window. Do not treat the following durations as firm schedules; they depend on current time, existing repo, credentials and team capacity.

## Build path ordered by player-facing risk

### Stage 0 — Audit (blocking, 30–60 min target)

- Inspect existing code/repo and available Twitch credentials, domain/hosting, OBS setup.
- Confirm story Q01 and M01 content JSON; run case validity check.
- Decide if single-channel live chat can be demonstrated. Set up Git, no secrets.

### Stage 1 — One Twitch round end to end (P0)

**Deliverable:** streamer signs in; real viewer sends `!look CAM`; game records evidence; OBS updates; `!solve` after proof triggers reveal.  
Tasks: OAuth → EventSub socket → command parser → deterministic engine Q01 → DB events → WebSocket → compact overlay.  
**Exit condition:** documented real chat capture with actual Twitch EventSub and no fake accounts.

### Stage 2 — Multi-step mystery (P0)

**Deliverable:** M01 playable intro → two investigation nodes → timeline → final evidence verdict → reconstruction.  
Tasks: stage overlay, evidence state, hint ladder, pause/checkpoint/reload, recap.  
**Exit condition:** full case can be solved with chat or host fallback, wrong theory remains non-terminal.

### Stage 3 — Polish & regression (P0)

Animation A01/A02/A04/A08, art readability, reduced-motion, clean empty/error states, duplicate event tests, security/performance, fresh-clone README.  
**Exit condition:** demo uninterrupted with OBS preview; no broken 404s, no hidden answer exposure.

### Stage 4 — Co-op signature (P1, only if P0 solid)

Second authenticated broadcaster → invite/consent → two chat subscriptions → different stations → one `JOINT_PROOF_B17` event → cross-community animation + recap.  
**Exit condition:** independent live chats each performed meaningful proof action. If B not available, demonstrate co-op only as labeled simulation and don't present it as completed Twitch multi-channel feature.

### Stage 5 — Submission (mandatory)

Produce ≤3-minute demo on Twitch, show Codex development evidence, publish YouTube video (public or permitted unlisted as organizer clarification), include code repo, instructions, description, valid Codex session ID, English translations where necessary. Verify Devpost status **Submitted** not Draft. Freeze submission artifacts after deadline according to organizer notice.

## Scope reduction ladder (if behind)

1. Stop creating extra quick cases.
2. Keep Q01 only and reduce M01 to 3 meaningful nodes with one coherent final proof.
3. Remove co-op from submitted claims until proven.
4. Replace optional SFX and complex art with polished clear UI.
5. **Do not cut real Twitch chat, deterministic proof, or visible OBS result.**

## Milestones / tracking format

`[ ] task` with acceptance criterion and output artifact. Codex should not mark complete based on code existence alone; run tests and provide observed screenshots/logs. Track manual Devpost submission separately from coding.
