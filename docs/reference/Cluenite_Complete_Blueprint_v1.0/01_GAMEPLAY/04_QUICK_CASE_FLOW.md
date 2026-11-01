# 04 — Quick Case: 30–90-Second Stream Companion

## Player promise

"One tiny mystery, one joyful reveal, zero disruption to the stream." A streamer playing another game should be able to start, forget, pause or dismiss Cluenite without losing important gameplay. **30–90 seconds is an unverified target**; cases have optional untimed mode for latency.

## Lifecycle (normal)

```
IDLE → PREPARED → INTRO(0–5s) → ACTIVE(≤60s target) → SOLVED → REVEAL(3–5s) → DISMISS → IDLE
                                   ↘ PAUSED ↗
                                   ↘ ENDED_PARTIAL → IDLE
```

- `PREPARED`: select verified case, generate overlay scoped token, show input instruction.
- `INTRO`: visual hook; not an unskippable story cutscene.
- `ACTIVE`: 1 goal, 2–4 clues, one interaction affordance.
- `SOLVED`: all required proof nodes have been established, not merely a lucky answer if proof is required.
- `REVEAL`: 0.6s tension hold → 1.0s reveal animation → ~2s explanation/credit; obey reduced motion.
- `DISMISS`: overlay retracts; streamer main-game capture remains unchanged.

## UX in OBS

- Design at 600×340 concept module on a 1920×1080 stream; account for real video downscale. Default lower third/right but draggable anchor in settings.
- Always display: question, progress (if staged), 1 example command, short distinct evidence IDs.
- Never cover gameplay minimap/crosshair by default; host can place source anywhere. Support hide-hotkey via OBS source visibility rather than browser permission hacks.
- Streamer dashboard control: Start / Pause / Resume / Skip / Show hint / Next / Hide. No nested menus while live.
- On overlay disconnection, status changes to "Connection lost", no fabricated transitions; active session state persists.

## Complete 65-second sample: Gallery robot

| Proposed offset | Screen | Viewer | Engine | Streamer |
|---|---|---|---|---|
| 00–05s | "Who triggered the silent gallery alarm?" CCTV object + route list | guesses allowed | Create open node IDs: `CAM`, `ROUTE`, `SENSOR` | React while queueing |
| 05–16s | Zoom R-07 plate after `!look CAM` | Viewer 1 inspects | Unlock `CAM_R07`; credit observation | Asks "Is that a person?" |
| 16–29s | Schedule: R-07 active in gallery 21:09–21:13 | Viewer 2 `!look ROUTE` | Unlock `ROUTE_R07` | Thinks aloud |
| 29–40s | Sensor event 21:10 from lower beam zone matches robot path | Viewer 3 `!look SENSOR` | Unlock `SENSOR_LOW_2110` | Waits for chat suggestion |
| 40–51s | Two cards highlight, `!link CAM_R07 ROUTE_R07` | Viewer 4 links | Verify R07 same identity, unlock source hypothesis | "Oh, it's R-07!" |
| 51–65s | `!solve R07` followed by 3s reconstruction | Viewer 5 proposes | Check `R07` + required link and sensor, resolve | Laugh and resume |

**Important proof definition:** route + camera ID alone yields strong suspicion, but final confirmation also requires sensor placement/timing; do not falsely claim certainty without it. For extra short version begin with sensor card pre-unlocked.

## Wrong answers and timeouts

- Wrong `!solve PERSON` returns local non-shaming state `not confirmed` and optionally a short nudge. Do not announce a user's wrong username.
- Timeout/queue pops: host hides overlay or presses `Pause`; no negative points.
- No viewer commands: host can use dashboard Inspect/Solve. If streamer wants audience autonomy, show `!help` and invite a community action; do not invent chat input.
- If viewer floods 20 commands: cooldown, duplicate normalization, no acceleration.

## Session-level options

`duration_mode`: `untimed` | `gentle_90` | `brisk_60`; `chat_feedback`: off/minimal; `hints`: auto/manual; `overlay_anchor`: 9-grid slot; `autoplay_next`: default false, max 3 if enabled; `contributor_names`: visible/anonymous.

## Quick case type examples

1. **Spot:** one inconsistent detail in a screenshot/document.
2. **Link:** connect two known records, unlock event.
3. **Order:** three or four short timeline cards.
4. **Challenge:** refute an assertion using one verified fact.
5. **Pattern:** small pictorial code; one deterministic answer.

Never present all five at once in a 60-second round. Give each a distinct visual silhouette so repeated play doesn't feel like an exam with the same skin.
