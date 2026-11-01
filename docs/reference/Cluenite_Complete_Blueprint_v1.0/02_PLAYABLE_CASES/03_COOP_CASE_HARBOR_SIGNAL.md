# CASE C01 — Signal of the Invisible Ship (Co-op Mystery Specification)

**Mode:** two broadcaster co-op; optional solo adaptation explicitly labeled  
**Length:** aspirational 30–45 minutes  
**Question:** What is the blinking light where the radar shows no vessel?

## Ground truth

Harbor maintenance buoy `B-17` was left broadcasting its diagnostic 2-short/1-long/2-short (2-1-2) sequence during the test window. The marine radar did not classify B-17 as a powered vessel, which is normal under the case's fictional instrument assumptions. The light observed from pier P4 is B-17, confirmed by matching signal cadence, physical buoy shape, published maintenance location and a fresh station-to-station diagnostic test. Do **not** claim that no other ship can exist anywhere.

## Stations

| Station | Streamer | Initial data | Tools | Role in joint proof |
|---|---|---|---|---|
| FIELD A | A | low-light coastal camera, angle & distance markers | zoom/replay/sweep, direction scan | report observed cadence + physical source location |
| RECORDS B | B | harbor records, service calendar, reference codebook | lookup, align time, request diagnostic reference | authenticate B-17 test signal and authorized location |

Each crew can make progress independently: A can compare wave reflections, distinguish boat from buoy silhouette; B can investigate archive and deployment history. Joint proof uses these results, not synchronous button-press alone.

## Beat-by-beat

**0–5m: Introduction.** Reporter says "A ship with no radar track?" Both streamers see same central question and different workstations. Viewers can read station-specific command help.

**5–13m: Parallel discoveries.** A viewers `!look LIGHT` → `FLASH_212`; B viewers `!look MANUAL` → `CODE_212`. Streaming overlay marks them as independent observations; neither alone proves source.

**13–21m: Candidate match.** A camera to P4 `!scan P4` → `OBJECT_NEAR_P4`; B `!look DEPLOYMENT` → `B17_AT_P4`. Both can publish with `!share FLASH_212` or streamer share button. Cross-board displays candidate correlation only.

**21–31m: Actual joint verification.** A performs fresh sweep → `SCAN_B17` with stable time and object signature. B invokes maintenance reference test → `REF_B17` and valid service window. Server compares signatures, P4 location and timestamp, marks `JOINT_PROOF_B17`. If only one side confirmed, display "Awaiting complementary observation" rather than awarding solve.

**31–39m: Hypothesis dispute.** A may pin "mystery vessel" theory, B chat submits `!challenge SHIP JOINT_PROOF_B17`. Show B-17 as best-supported source, not a claim that a ship is impossible in all circumstances.

**39–43m: Reveal.** Slow camera pan to tiny flashing buoy; cuts to maintenance note marked "test mode still active"; both communities receive contribution recap.

## Practical co-op commands

- A: `!look LIGHT`, `!scan P4`, `!share FLASH_212`, `!scan B17`
- B: `!look MANUAL`, `!look DEPLOYMENT`, `!verify B17`, `!share CODE_212`
- Either: `!link FLASH_212 CODE_212` after sharing; `!challenge SHIP JOINT_PROOF_B17`.

## Join / disconnect / resilience

- B must authenticate via Twitch and explicitly accept an invite addressed to their channel ID.
- A cannot impersonate B's station via forged URL. Two distinct broadcaster Twitch user IDs required for true co-op.
- Both stations publish their own **verified** observation events; unverified freeform chat hypotheses never create truth.
- B disconnect: freeze joint gate, continue A-side optional investigation, persist pending state. A can `Pause all` or explicitly choose `Convert to Solo` with an authored solo proof path; show role downgrade clearly.
- One viewer chat on B is sufficient. No group voting thresholds.
- Co-host leaves and does not return: save incomplete case as such; no fabricated solved reveal.

## Proof requirements

`CODE_MATCH_212` is `FLASH_212` + `CODE_212`.  
`POSITION_MATCH_P4` is `OBJECT_NEAR_P4` + `B17_AT_P4`.  
`JOINT_PROOF_B17` is `SCAN_B17` + `REF_B17` + `CODE_MATCH_212` + `POSITION_MATCH_P4`.  
Only `JOINT_PROOF_B17` permits final `SOURCE_B17` verdict.

## Happy-path / negative-path tests

- A only: no joint proof.
- B only: no joint proof.
- A and B wrong pattern combination: no joint proof.
- Co-host decline: no real co-op and no accidental spectator auth.
- Replayed EventSub messages: no duplicate rewards or solve.
- Publish/unpublish a clue: verify permission; authored truth cannot be overwritten.
- Host has stream delay: mission has no five-second chat skill gate.
