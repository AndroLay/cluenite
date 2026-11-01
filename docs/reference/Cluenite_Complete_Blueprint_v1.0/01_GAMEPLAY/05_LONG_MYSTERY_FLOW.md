# 05 — Mystery Live: Dedicated Investigation (20–60+ min)

## Promise

One connected mystery, multiple kinds of thinking, small discoveries every few minutes, plot turns established by evidence rather than arbitrary new rules. No forced speedruns and no endless wall of text.

## Reference case: The Missing Festival Trophy (35–45-min target)

### Acts and pacing

| Act | Duration target | Main question | Core play | Mandatory outcome |
|---|---|---|---|---|
| Opening | 0–5m | Why is the trophy missing after the blackout? | intro + photo inspect | establish 18:47 present, 19:02 absent |
| Act 1 | 5–12m | When was display opened? | access-log inspection | door opened 18:58 |
| Act 2 | 12–20m | What happened first? | timeline reconstruction | work order → access → cart → blackout |
| Act 3 | 20–29m | Where did it go? | evidence matching + location navigation | trophy in cooling room B4 |
| Act 4 | 29–38m | Theft or authorized relocation? | theory challenge + proof | signed safety work order & valid access |
| Resolution | 38–42m | What really happened? | host submits verdict + proof | reconstructed safe relocation |

These are sample pacing targets, not strict timers. Each act has its own hint ladder, short copy and recap.

### Experience rules

- **Opening:** 1–2 sentences with a clear visually depicted contradiction.
- **Scene choice:** 2–3 obvious interactive objects; optional extras give flavor but never gate main conclusion.
- **Progress:** track verified facts separately from chat theories. Evidence board clusters by source/time, not dozens of loose notes.
- **Uncertainty:** early clues may point toward theft; later facts refute it. The story's actual past never changes based on chat whims.
- **Soft guidance:** after 2–4 minutes of no useful progress (configurable), host can reveal an H1 hint; after additional time H2; never auto-spoil final verdict.
- **Checkpoints:** after each act, save state and show concise 1–2 line recap.
- **Audience:** late viewer can read objective and latest verified fact, submit actions immediately.

## Tension curve / cognitive load

```
curiosity → first proof ✓ → new lead → contradiction! → relief/clarity → final assembly → reveal
```

Don't stack three new abbreviations, five documents and two new suspect profiles at once. Show one immediate objective and one next possible move. When wrong theories are refuted, retain them as struck-through cards under "Ruled out" instead of deleting history.

## Verdict mechanics

- Viewer can propose `!theory MOVE` or `!theory THEFT`; host approves *which* theory to test.
- Validity checks requiring evidence: `OPEN_1858`, `WORKORDER_1857`, `CART_1859`, `FOUND_B4`.
- Verdict `AUTHORIZED_SAFETY_MOVE` is correct **only when** these proof requirements are unlocked; a guess before proof gets `insufficient evidence`, not accidental win.
- Wrong verdict `THEFT_DURING_BLACKOUT` receives a specific counterexample (display opened before blackout), no punitive death screen.
- Reconstruction uses 4 ordered frames; reveals truth and shows which actions contributed.

## Retention / replay without exhausting players

- Every case is a complete story; no required backlog of old streams.
- Alternate observation, match, chronology and theory tasks so consecutive acts don't repeat the same micro-mechanic.
- Optional discoveries can unlock epilogue details, never necessary evidence behind hidden easter eggs.
- Repeat the same fixed mystery only as replay/practice with a spoiler badge. Freshness needs a verified library rather than swapping names on a single rule.

## Streaming presentation surfaces

**Host:** full-screen dashboard with scene, active evidence, activity, controls.  
**OBS:** selected scene with large text and reduced tool chrome, host webcam area protected.  
**Viewer:** existing Twitch chat commands, optional pinned command cheat sheet.  
**Audience-only stream:** all critical logic visually demonstrated and accessible even to quiet viewers.

## When the stream ends mid-investigation

Host chooses `Save & End`; checkpoint and evidence remain persisted; link to recap for next session; on reopen, previous verdict not claimed and elapsed timer not running. Never silently progress offline unless explicit future autonomous mode is turned on.
