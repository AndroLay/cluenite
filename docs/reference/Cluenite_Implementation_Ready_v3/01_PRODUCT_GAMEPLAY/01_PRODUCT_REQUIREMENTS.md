# 01 — Product Requirements Document (PRD)

## Product thesis

**Cluenite turns spare minutes in an ordinary Twitch gaming stream into satisfying little mysteries; the same social proof mechanics can become a dedicated collaborative investigation with multiple communities.** A viewer can discover one real thing, not merely join a poll. Streamers retain a natural on-camera role; their primary content is respected.

## Audiences/jobs-to-be-done

| Persona/context | Need | Cluenite's promise | Failure to avoid |
|---|---|---|---|
| Gaming streamer between matches | 30–90-second entertaining activity | Launch one small puzzle without switching primary game | Setup takes longer than the round; overlay obscures action |
| Viewer from mobile | Participate immediately | Type one short visible command in normal Twitch chat | Second login, tiny text or hard-to-type formulas |
| Quiet viewer | Follow and enjoy watching | Understand objective, discoveries, theory and reveal from visuals | Dense command lists, reading wall of text |
| Dedicated mystery host | Hold attention for 20–60+ min | Authored case with meaningful reveals, chapters, checkpoints | 30 unrelated trivia questions glued into a story |
| Two streamers with different audience sizes | Mutual work, no domination | Independent stations, useful shared proof, symmetric prestige | Larger chat auto-wins or smaller chat waits idle |
| New viewer joins mid-case | Know what happened and what to do next | Constant objective + recent discoveries + recap | Needs 20 minutes of explanation |

## Experience profiles

**Quick Case:** 30–90 s target (test hypothesis), one objective, 2–4 inspectable clues, 1–2 proof transitions, no punitive timer, safe interrupt/resume/close. Host may use compact overlay as a scene in OBS. Twitch chat input can continue even if host isn't active in the dashboard; clearly indicate pause/disconnect.

**Mystery Live:** 20–60+ min target, 3–5 chapters for product vision, several complementary puzzle primitives with shared evidence board, theory correction, progressive hint ladder and satisfying reconstruction. **Hackathon P0 case:** 3–4 meaningful proof steps in roughly 5–12 min so it can actually be tested and demoed; this does not replace long-form vision.

**Co-op Mystery:** 30–60 min vision, two authenticated broadcasters, separate workstations, simultaneous progress, explicit merge points, equal contribution prestige despite audience imbalance, reconnect tolerance. **Hackathon P1:** one verified joint proof, not an entire 60-minute production case.

## Core player loop / fun pillars

1. **Notice:** a visual discrepancy or question is understandable without a tutorial lecture.
2. **Act:** viewer or host selects an inspectable, records a hypothesis, connects evidence or requests a counterexample.
3. **Payoff:** a valid discovery immediately changes stage, board, understanding or available action.
4. **Converse:** streamer can read/react to visible evidence and chat's conflicting predictions naturally.
5. **Reveal:** evidence explains the truth; show how earlier assumptions were wrong, with credit from verified action logs.
6. **Next:** one-click next quick round (explicit host enable, not spam); in long mode, a new chapter with a short recap.

### Social mechanics

- Discovery and proof do **not** use majority votes. Voting may select an investigation branch only if every branch preserves solvability and fairness.
- First valid action can unlock content, but final credit should not be exclusively 'fastest typist'; dedupe repeated inputs, optionally recognize co-discoverers in a small event-time fairness window.
- Wrong theories can become the setup for funny *evidence refutation*, never a public humiliation.
- Host has leadership on narrative pace, hints, skip, abort, next chapter, final verdict and what appears on stream.
- Large chat: show only deduped useful contributions and a small number of credited examples, not a wall of usernames.

## User journey A — gaming streamer

1. Visit dashboard and select **Connect Twitch** (one-time OAuth grant).
2. Start Quick Case: choose a ready-made case and copy a scoped OBS Browser Source URL.
3. Preview overlay, drag/position once in OBS. Choose 'compact' and safe-area preset.
4. Between matches click **Play 1 round**; overlay shows premise/object IDs/commands.
5. Real viewer types `!look CAM`; server accepts exactly once and reveals inspected clue.
6. Another viewer types `!link CAM LOG`; case proof advances; clip-worthy reveal appears with restrained animation.
7. Round auto-collapses or host taps Dismiss as match begins; finished history preserved.
8. Show 'Next quick' only when host chooses or explicitly enabled with bounded limit.

## User journey B — mystery night

1. Select Mystery Live case, open full-screen stage and evidence board; enable slower relaxed pacing.
2. Intro illustrates question and current objective in 15–30 sec; viewers see inspectable object IDs.
3. Viewers discover authentic facts; streamer chooses focus and voices theories; evidence book fills.
4. Timeline or logic puzzle changes accepted interpretation; hint H1/H2/H3 offered after stalls.
5. Stage advances to new location as proof requirements pass; late viewers see recap.
6. Streamer submits verdict only after enough *distinct supporting evidence*; reveal reconstructs events.
7. End board distinguishes confirmed evidence, incorrect theories and optional unsolved side clues. Save community credits.

## User journey C — two streamer collaboration

1. Host A invites B; B authenticates and explicitly accepts; show both channel identities.
2. A gets Field Station; B gets Records Station; jobs can rotate between chapters.
3. Chats perform different valid actions, enabling useful work independently.
4. `share` publishes a verified observation on the common board with source channel label.
5. Joint inference requires **a fresh observation from A plus independently verified reference from B**; not merely two confirmation buttons.
6. Show mirrored Cross-Community Breakthrough overlay. If B disconnects, freeze only joint gates and preserve completed local work.
7. Final conclusion displays facts and credited contributions from both communities with fair presentation.

## Success conditions — acceptance vs hypotheses

**Non-negotiable for P0:** one real Twitch message causes observable valid transition; correct proof gates the verdict; OBS shows it; reload/reconnect restores state; quick hide/pause works; no secrets exposed; project can be run by judge from instructions.

**Playtest hypotheses, not assumed facts:** 15/20 novice viewers recognize objective within 10 sec; ≥12/20 can explain what changed when proof accepted; ≥50% opt to play another Quick Case when offered; short case not regularly exceeding 120 sec; people can describe the final solution without guessing. These are initial validation targets, not platform-wide data or promised KPIs. Measure with real tests.

## Quality boundaries

- Small readable overlays at 600×340 or equivalent; 1920×1080 full-stage layouts with stream safe zones.
- Avoid relying on red/green alone, strobe lights, sharp sudden loud effects, or tiny baked-in asset text.
- Reduce motion available; animations skip/complete state deterministically.
- 60fps is an active-motion **target**, not a guarantee; idle OBS GPU load should be minimized.
- Case content avoids graphic violence and promotes curiosity and humor over distress.
