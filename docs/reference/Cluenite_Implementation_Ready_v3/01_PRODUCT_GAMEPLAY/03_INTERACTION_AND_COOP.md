# 03 — Streamer/Viewer Collaboration: Exact Actions, Fairness and Edge Cases

## Social design principle

The game is not a mass voting engine. **A valid observation from a single actual viewer can change a puzzle**, and two communities can combine different proven facts. Every successful action has a visible consequence. The streamer remains an entertaining investigator rather than a human API operator.

## Roles and authority

| Actor | Permissions | Non-permissions |
|---|---|---|
| Host broadcaster | Authorize channel; select/start/pause/resume/stop case; choose focus, hints and final verdict; invite co-host | Rewrite truth/hidden solution mid-session |
| Co-host | Explicitly accept; own workstation; control station actions; pause own station and request shared pause | Take over A's channel without consent |
| Viewer | Inspect, propose links/sequences/codes, challenge, submit theories, station-scoped actions in own channel | Start/stop other streamer's game; alter channel linking; forge message metadata |
| Engine | Decide authored validity, publish verified state revisions, record evidence and credits | Treat raw chat assertion as proven fact or infer hidden truth from free-form LLM |
| Spectator | Watch and understand from overlay | Required to use chat; no forced participation |

## Commands and input ergonomics

Case shows **only 1–3 relevant commands** on screen at once. Long help list lives in dashboard and optional throttled `!help` response. IDs must be short, uppercase/lowercase equivalent, unambiguous and ASCII; display localized friendly names, stable ID tokens. Do not require an extra viewer OAuth or another website.

| Viewer command | Game action | Example display feedback |
|---|---|---|
| `!look CAM` / `!inspect CAM` | Look at known node, unlock observation | 'Camera zoomed: R-07 found' |
| `!link CAM SCHEDULE` | Submit link between discovered evidence | 'Matching ID and time—connection verified' |
| `!order A C B` | Reconstruct timeline | 'Two events are out of sequence' (no answer spoiler) |
| `!code 241` | Try an authorized code | 'Document unlocked' |
| `!theory T1` | Surface unique theory tile | 'Theory proposed—not yet proven' |
| `!challenge T1 E4` | Check authored contradiction | 'T1 contradicted by E4' |
| `!solve ROBOT` | Submit simple quick case verdict | Accepted only after proof gate |
| `!scan P4` | Field workstation operation | 'Camera scan captured' |
| `!verify B17` | Records workstation verification | 'Reference pattern confirmed' |
| `!share E3` | Share already unlocked evidence | 'Evidence published to team board' |

Never interpret untrusted free text as an arbitrary SQL, file path, HTML, executable code, or new game fact. Non-commands are ignored by game parser so viewers can continue ordinary chat.

## Step-by-step single-stream collaboration (actual play)

1. Host starts The Gallery Shadow with compact overlay; only one objective appears: 'Why did the alarm sound?'
2. Viewer A does `!look CAM`, and the server reveals evidence R-07. Overlay briefly highlights only the new content; A credited once.
3. Viewer B does `!look SCHEDULE`. B's discovery publishes maintenance log R-07 with matching time.
4. Viewer C connects the two IDs; board line animates, creates authored proof link. Streamer reacts and asks chat what it implies.
5. Viewer D suggests the thief theory; engine keeps it an unproven hypothesis. Another viewer challenges using *specific* camera/log facts.
6. Streamer chooses final verdict once proof complete; reveal explains exactly why robot crossed sensor. A/B/C credited for actual contributions; D not mocked.
7. Overlay folds; streamer resumes main game. Clear choice to start next round, not automatic unlimited injection.

### With one viewer

One account can inspect multiple nodes, link evidence and solve; engine does not require minimum chat count or artificial co-discovery. The viewer is not blocked by 'not enough votes'.

### With 20 viewers

Distinct discoveries contribute. Duplicates become `ALREADY_KNOWN`; the overlay displays top relevant contributions, not all 20 messages. New viewers see current objective and evidence board.

### With 1,000 viewers

Server parses commands under bounded queue and rate limits, groups duplicate actions by semantic key, and **performs one state transition** for each first valid distinct action. Not proportional to chat volume. If backlog appears, show a truthful 'Processing chat' indicator, not fabricate actions. Enforce per-session load ceilings and graceful backpressure; benchmarks required before claiming scale.

## Two-streamer interaction protocol (product vision)

1. A generates invite with expiry; B opens authorized accept flow. Both channel identities shown. Session enters `COOP_WAITING`, then `COOP_READY` after B accepts.
2. A's Field station visualizes live observations; B's Records station visualizes reference material. Two independent sets of actions are possible in parallel, without interstitial waits.
3. A's viewer finds flicker pattern; B's viewer locates matching manual. Each action has source channel ID and an explicit event log entry.
4. Either station may publish a *verified* fact to shared board. Other team may challenge conclusion with the fact they discovered. The server checks **authored cross-station proof**.
5. At merge, A's scan plus B's reference must satisfy `JOINT_PROOF_B17`; merely clicking ready is insufficient. Both hosts may decide when to play the animated reveal, but neither can change engine's truth.
6. Both overlays show a shared moment, `A found the location; B identified the signal`, with bounded contributor display and equal team prestige.
7. Role rotation optional after checkpoint. Co-host disconnect freezes joint gate but not read-only board or independent investigation.

## Shared Chat specifics

When Twitch Shared Chat replicates a message across participating channels, use `source_message_id` and `source_broadcaster_user_id` when provided, otherwise the local message/channel ID. Deduplicate **source message** to prevent double-counting. Attribution to the original channel is separate from subscription-delivery channel. Do not assume Shared Chat is necessary for co-op; dual independent chat subscriptions are enough.

## Presence/failures

- **Streamer A leaves Quick:** optionally pause/collapse; never block ongoing main game.
- **B disconnects Co-op:** no synthetic proxy actions; shared steps paused; local inspection may continue; recovered state must be consistent.
- **Stream latency:** server timestamps determine ordering; no mechanic requires synchronized reaction within a few milliseconds or fastest-person wins.
- **Late arrival:** visible 'current objective' and 'last 2 breakthroughs', host `/recap`, optionally short chat `!help` without spam.
- **No correct submission:** H1 focus hint → H2 relation hint → H3 explicit direction; host may skip after declaring that no full solve occurred.
- **Wrong theory:** label 'Unverified' / 'Contradicted', show evidence explanation, allow revisiting.
- **Sensitive/abusive text:** no arbitrary viewer-generated long claims on public overlay; use authored IDs and sanitized Twitch display names. Moderation applies to text responses.
- **Watch-only audience:** narrative is decipherable without participation and actions visually readable even without Twitch chat transcript.

## Contribution fairness

Store factual `(session_id, action_id, twitch_user_id, source_channel_id, contribution_type, evidence_id, server_timestamp)` ledger. Show discovery, link and deduction highlights only if a real accepted action created them. Multiple same-time contributors can optionally be recognized within a short **server observation window**, but do not present this as a globally latency-equal race. Never punish smaller channels or require equal number of viewers for proof.

## Social playtesting script

Use at least one novice (uncoached) and one experienced participant. Observe without instructing for the first 10 seconds. Ask: 'What is the current goal?', 'What command would you use?', 'What evidence convinced you?', 'Would you want one more?' For co-op: 'What did your team contribute that the other could not?' Record hesitation and confusion; do not ask leading questions like 'Was this fun?'.
