# 11 — Quality Assurance, Acceptance Tests and Gameplay Validation

## Quality gates

**Q0 Source:** clean install, TS strict check, lint, project build, no secrets, license provenance.  
**Q1 Engine:** deterministic Q01 and M01 validation, zero false solve, no dead-end case graph.  
**Q2 Data:** concurrent actions, unique input IDs, versioned sessions, event revisions, Postgres persistence.  
**Q3 Twitch:** real viewer EventSub delivery and registered host authorization; truthful offline/reconnect behavior.  
**Q4 OBS:** compact overlay readable on stream, updates exactly once, safe collapse and static performance.  
**Q5 Real user:** an uncoached player understands actions and sees fair evidence-driven payoff.  
**Q6 Submission:** reproducible repo, truthful video, real Codex usage evidence, all Devpost fields submitted.

## Unit test matrix

| Test ID | Input / condition | Expected invariant |
|---|---|---|
| ENG-001 | `inspect CAM` valid | `CAM_R07` unlocked, one revision, one event |
| ENG-002 | `inspect CAM` again | no duplicate unlock/reveal/credit |
| ENG-003 | `link CAM_R07 SCHEDULE_R07` without inspect | blocked, no revision |
| ENG-004 | `!solve ROBOT` before proof | no win, show missing evidence category |
| ENG-005 | finished evidence/link + valid verdict | exactly one resolve and reconstruction |
| ENG-006 | `!solve THIEF` | rejected/unsupported, case remains playable |
| ENG-007 | `!order` wrong timeline in M01 | no false unlock; fair hint later |
| ENG-008 | contradictory authored facts | `CONTENT_INVALID`, not published |
| ENG-009 | co-op A-only joint proof | fails, no arbitrary confirmation override |
| ENG-010 | co-op A+B facts | exactly one breakthrough |
| ENG-011 | pause→chat action | no state transition or server timer advance |
| ENG-012 | snapshot save/load | same objective/evidence/revision after restart |

## Integration test matrix

| Test ID | Setup | Expected |
|---|---|---|
| INT-001 | real OAuth response | authorized account, valid scopes, encrypted tokens |
| INT-002 | fake/mismatched OAuth state | denied, no creator session |
| INT-003 | two identical provider messages | one logical action only, canonical dedup |
| INT-004 | two concurrent unique valid messages | serializable state, correct revision order |
| INT-005 | Socket.IO delta lost | `resync-required` and correct snapshot |
| INT-006 | socket client reconnect | no stale new-credit animation |
| INT-007 | revoke OBS URL | cannot view session after revocation |
| INT-008 | unauthorized overlay attempts host POST | 401/403, no mutation |
| INT-009 | Twitch EventSub forced disconnect | truthful RECONNECTING and resubscribe |
| INT-010 | Shared Chat duplicate source message | one source contribution, correct team attribution |
| INT-011 | Render restart/deploy | durable session state survives; no false Twitch replay |
| INT-012 | lost co-host connection | joint gate pauses; local work safe; state resumes |

**All provider message IDs used in CI are synthetic test fixtures**, not represented as live participation.

## Live end-to-end proof

With a broadcaster account and separate authentic viewer account:

1. Streamer OAuth and inspect connected state (not only a fake green UI chip).
2. Create Q01; copy OBS URL, preview/readable compact overlay.
3. Viewer sends authentic `!look CAM` in Twitch chat; capture resulting EventSub notification (IDs sanitized), committed DB revision, overlay card animation.
4. Send same command: no duplicate unlock and no second fresh contribution. Send `!look SCHEDULE`; another viewer or same viewer links clues.
5. Attempt wrong/premature final answer and show refusal; then valid proof + verdict and final reveal.
6. Refresh overlay and reconnect; no regression. Pause or dismiss and return to main game without changing game focus.

For co-op (conditional), repeat with **two distinct channels and both consented broadcaster accounts**; prove actual actions from each channel and one joint gate.

## Accessibility/performance checks

- Render full-stage at 1920×1080 and overlay as 600×340, evaluate scaled capture at 720p and approximate mobile viewing.
- Readable one-line objective and command hints; preserve live chat context. Keyboard focus, aria-live status, screen-reader labels to Pixi nodes.
- `prefers-reduced-motion`, manual skip animation, mute volume, no flash/strobe.
- OBS with another game/app active; measure CPU/GPU/headroom and frame pacing, avoid asserting 60 FPS before capture.
- Idle state: no continuous pointless full-stage animation loop; measured memory stable over long test.
- Abusive usernames/text: HTML escaping/sanitization, no overlay injection or defacement.

## Fun-first playtests (small, honest)

### P-A Cold viewer / Quick Case

20 invited novices ideal; can start smaller if needed. No instructions beyond visible overlay. Record: who identifies goal in 10 sec; who uses correct command unaided; who can explain why robot is answer; confusion around command text; willingness to play next round without prompting. Targets are **kill criteria**, not promised analytics: if <50% can act correctly, simplify. If almost nobody wants a second round, revise hook/reveal before content expansion.

### P-B Stream interruption

Give host real 'match found' signal mid-puzzle; measure whether pause/collapse is immediate and gameplay remains unobstructed. Failure if host must navigate four menus, loses progress, or overlay steals input/audio.

### P-C Two streams / unequal audiences

A simulated paper test first and actual Twitch if available: one side has 20 viewers, other 2; both must have unique authored proof; no progress tied to crowd size; test disconnect. Failure if either role does nothing more than confirm the other.

## Telemetry (privacy-aware)

Measure accepted actions, duplicate rate, invalid parser rate, stall time, hint use, time to solve, repeated round starts, checkpoint saves, Twitch connection health, p50/p95 action-to-overlay time, invalid proof attempts, client frame pacing. Store aggregated counts where possible; avoid retaining unrelated chat texts or publicly identifying nonconsenting players. Differentiate user gameplay data from synthetic stress fixtures.

## Release-blocking criteria

**BLOCK RELEASE:** false verdict; random chat text unlocks evidence; no live Twitch integration; leaked tokens/answers; viewer can perform privileged host actions; OBS screen illegible or permanently broken; lost state on restart; critical disconnection misrepresented as live; Devpost video does not show actual Twitch operation.

**CUT FEATURE, CONTINUE:** one extra Quick Case absent; optional sound absent; Pixi fancy filters absent; full 60-min case absent; co-op only conceptual with truthful labeling; extra leaderboard absent.
