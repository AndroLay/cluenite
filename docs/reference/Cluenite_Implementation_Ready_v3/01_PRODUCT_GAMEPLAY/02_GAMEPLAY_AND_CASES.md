# 02 — Gameplay Rulebook, Three Playable Modes, Concrete Cases

## Unifying game vocabulary

**Case:** versioned authored story with a single logically coherent resolution. **Scene:** one illustrated contextual environment. **Node:** inspectable clue/puzzle/theory. **Evidence:** unlocked server-verified observation (a fact). **Theory:** plausible but not yet proven proposition. **Proof:** rule connecting facts to conclusion. **Contradiction:** a verified evidence→theory conflict. **Verdict:** final justified claim. **Breakthrough:** verified proof combining evidence/actions from distinct stations.

## Shared mechanics

| Mechanic | Player action | Valid outcome | Fun design |
|---|---|---|---|
| Inspect | `!look A`, host taps object | Opens authored observation and possibly follow-up | Close-up animation and one understandable detail |
| Connect | `!link A B` | Opens authored valid relationship | Animated connector, succinct explanation of relevance |
| Sequence | `!order A C B` | Verifies authored event order | Cards snap into place, discrepancy becomes apparent |
| Decode | `!code 241` | Opens lock/document | Simple pattern, visible reasoning; no brute-force punishment |
| Propose | `!theory T1` | Shows distinct hypothesis as unverified | A conversation starter rather than instant victory |
| Challenge | `!challenge T1 E3` | Marks contradiction when proof supports it | Dramatic but fair re-evaluation, not shaming |
| Hint | Host click or rate-limited chat request | Reveals next authored hint H1–H3 | Nudges attention, then relation, only then more direct guidance |
| Verdict | Host submits conclusion | Resolves only if required proof facts are present | Earned cinematic reveal / recap |
| Share | Co-op station submits already verified clue | Unlocks shared evidence for both communities | Cross-channel 'aha!' moment |

The engine must distinguish `ACCEPTED_NEW`, `ACCEPTED_ALREADY_KNOWN`, `INVALID`, `NOT_AVAILABLE`, `RATE_LIMITED`, `NOT_AUTHORIZED`, `PAUSED`, `CONTENT_ERROR`; only `ACCEPTED_NEW` makes a new game transition. Duplicate commands do not generate repeated reveals. No AI semantic guess decides objective correctness.

## Quick Case detailed design

**Duration hypothesis:** 30–90 sec; some cases may be 15–30 sec. Flow: one-sentence question → 2–4 choices → inspect 1 clue → connect/challenge/solve → delightful compact reveal → auto-collapse. Timer is informative or adjustable, not punitive. Avoid huge code syntax on overlay; use short command legend for current case only. Host can pause/collapse at any moment; if Twitch unavailable display clear disconnected banner and do not silently act as live chat.

### Quick Case Q01: The Gallery Shadow (complete proof example)

**Premise:** A gallery alarm triggered at 21:10; access log says the main door remained locked. A moving low shadow is visible. What triggered the alarm?

**Visible nodes:** `CAM` (21:10 CCTV still), `ACCESS` (door log), `SCHEDULE` (maintenance schedule). First camera inspection unlocks `CAM_R07` (identifier R-07 on low object). Maintenance schedule inspection unlocks `SCHEDULE_R07` (cleaning robot R-07 active in gallery 21:09–21:13). The door log records no door opening; **by itself it does not prove there was no unauthorized entry through all possible routes**.

**Minimum accepted proof:** inspect `CAM` AND inspect `SCHEDULE` AND valid link `CAM_R07` ↔ `SCHEDULE_R07`, then `!solve ROBOT` (case labels and input aliases declared in fixture). Reveal shows R-07 crossing gallery sensor with matching time; text describes the verified event. `!solve THIEF` is **not** accepted as proof. Do not reveal simply because someone guesses ROBOT before collecting evidence.

**Timeline, illustrative only:** 0–10 s hook → 10–30 s viewer inspect → 30–50 s evidence connection → 50–70 s verdict and 1–3 s reveal. Actual time must be measured.

**Auto-fold:** after solved, overlay displays a small success strip and fades to idle; streamer main game stays visible.

### Quick Q02 and Q03 (post-Q01 stretch, not required before first live test)

- **Q02 Clock That Lied:** one digital clock shows outage time inconsistent with power log; `!look CLOCK`, `!look REPORT`, `!link ...` yields a plausible clock-battery failure, NOT an unsupported culprit accusation.
- **Q03 Backstage Parcel:** three footprints/shelf positions; sequence reveals object was moved before a show started. One sequence plus one visual clue. Keep ≤4 cards and one primary reasoning step.

## Mystery Live case M01: The Missing Festival Trophy

**Premise:** At 18:47 trophy visible. At 19:02 it is missing after a blackout. Was it stolen, and where is it?

**Canon timeline:**
- 18:56 display overheating warning.
- 18:57 authorized maintenance relocation ordered.
- 18:58 case opened via maintenance access.
- 18:59 trolley removes trophy in protective wrap to cold storage room B4.
- 19:01 power/lighting blackout.
- 19:02 staff discovers display empty, announces possible theft without hearing maintenance report.

**Chapter 1 — Observe / hook:** gallery scene, initial photo, missing display, obvious speculation 'stolen during blackout'. Viewers inspect `PHOTO`, `CASE`, `ACCESS`; unlock true log at 18:58. Keep mystery about why/where rather than instantly spoiling.

**Chapter 2 — Reconstruct:** show 4–5 cards; viewers assemble `HEAT → ORDER → OPEN → TROLLEY → BLACKOUT` using visible IDs and `!order`. Server validates the authored sequence; unlock cart clue. Recognize theft-during-blackout theory contradicted by proven prior movement; does not yet prove authorized move.

**Chapter 3 — Find the trophy:** examine trolley insignia and facility map; evidence `CART_MARK` supports access to `B4`; after matching unlock B4 scene and trophy physically found. Don't claim cause solely from 'same logo'; require consistent location evidence.

**Chapter 4 — Verify motive / resolve:** maintenance work order, its authorization and the matching access record jointly support the safe relocation explanation. Host selects `SAFETY_MOVE`; engine checks timeline + B4 location + work-order/access match. Reveal recreates chain of events; show who discovered the pivotal earlier movement, who solved timeline, who made final proof.

**Hackathon short variant:** combine chapters 2 and 3 into one stage; still retain a real twist supported by evidence. Case playability should require ≤3 major proof actions beyond initial inspect.

**Error cases:** accusing an individual is an unproven theory, not automatic failed game. `!challenge THEFT ACCESS` may weaken only the specific *during-blackout* claim, not any possible theft theory. Hints H1 attention to times; H2 compare work order/access; H3 directs to B4.

## Co-op case C01: Signal of the Invisible Ship

**Premise:** A light flashes offshore; radar shows no ship. What is the source?

**Station A (Field):** coastline camera, flash sequence `2 short / 1 long / 2 short`, direction/position and close-up at P4. Valid player action `!scan P4` creates server-confirmed observation `SCAN_P4` with physical image of a buoy-like floating object.

**Station B (Records):** radar logs, buoy service manual and device B-17 maintenance records. `!verify B17` establishes reference signature `MANUAL_B17_212`, installation coordinates close to P4 and recorded test status.

**Cross-Community Breakthrough:** `SCAN_P4` from A + `MANUAL_B17_212` from B + server-authored `MATCH_SIGNAL_AND_POSITION` relation unlocks `JOINT_PROOF_B17`. Exactly two yes clicks without these facts cannot pass. Either team can propose the match only when prerequisites exist. Both screens receive the same revisioned proof event; overlay shows contributions from **both communities**, no weighting by audience size.

**Final:** a test buoy B-17 with signal test left running, not a ghost ship. Proof includes position, pattern, and device ID; avoid accepting 'not on radar' as sufficient reason.

**Disconnect:** remaining crew may keep inspecting already unlocked local materials; no fake partner input. Joint verification pauses until B reconnects (or host explicitly ends co-op while preserving state). Explicit switch of roles at next chapter is a full-game feature, not mandatory for single-breakthrough P1.

## Difficulty and delightful pacing

**Relaxed** 2–3 significant clues, one inference, readily available H1. **Standard** 4–8 clues, 2–4 inferences and one contradiction. **Detective** 8–18 clues, linked subproblems, clues and proof ledger. Display one objective at a time. In longer mode, 5–10-minute 'meaningful changes' are a pacing hypothesis to test, not enforced timers. Wrong guesses should offer a short clue-centric nudge, not penalty. Viewers should feel smarter for spotting something, not judged for misunderstanding.
