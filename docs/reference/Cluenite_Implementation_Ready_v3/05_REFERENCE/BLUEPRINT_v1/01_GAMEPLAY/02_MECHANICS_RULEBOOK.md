# 02 — Mechanics Rulebook (Authoritative Design)

## Actors

- **Host:** authenticated Twitch broadcaster who selects case, controls progression, pauses, inspects stream dashboard, initiates reveal and ends session.
- **Viewer:** authentic Twitch user in one connected broadcaster's chat. Can issue validated commands. No game account, OAuth or download required.
- **Co-host:** second broadcaster who explicitly accepts invitation. Owns an independent workstation and its own chat scope.
- **Engine:** only authority for puzzle solutions, evidence visibility, time, checkpoints, score/credits and win/incorrect classification.

## Vocabulary

**Case:** authored mystery with immutable `case_version`, premises, truth, nodes and reveal.  
**Node:** inspectable object, puzzle, theory, scene or evidence link; unique stable ID.  
**Evidence:** verified factual observation unlocked through a valid action, not an unverified chat assertion.  
**Theory:** structured hypothesis about case truth; can have supported, contradicted or unresolved status.  
**Proof link:** authored relationship that explains how evidence supports/refutes theory.  
**Discovery:** first successful state transition to unlock evidence; may credit multiple participants within a short same-window fairness bucket.  
**Breakthrough:** multi-node conjunction from two stations unlocking a shared conclusion.

## Primary loop — never rigidly four mandatory clicks

1. **Observe:** show one objective and up to 2–4 salient interactions on Quick; 3–6 per scene on long form. Hover/focus/command offers accessible descriptions.
2. **Connect:** viewers submit a predefined relationship (`!link E1 E2`); server checks *relationship* in authored graph rather than simply both nodes being visible.
3. **Challenge:** `!challenge T1 E3` checks an authored contradiction. Can mark theory weakened or falsified; does not make alternate theory true by elimination unless proof rules warrant it.
4. **Reveal:** host or engine issues verdict against required evidence set. Reconstruction shows exactly why.

## Action types and resolution

| Action | User | Requirement | State change | Failure behavior |
|---|---|---|---|---|
| `inspect` | viewer/host | Visible node, valid session | Unlock observation, credit discovery | Provide neutral "not available yet" only to dashboard; don't spam chat |
| `link` | viewer | Two discovered IDs, authored relation | Unlock link / optional next scene | Highlight missing prerequisite privately or unobtrusively |
| `order` | viewer | Existing events, correct full sequence | Verify timeline, unlock context | Explain "order doesn't match evidence" with optional hint |
| `decode` | viewer | Visible code clue + valid normalized answer | Unlock document/scene | No penalty; rate-limit retries |
| `challenge` | viewer | Theory + evidence accessible, authored relation | Change theory status; reveal contradiction | Distinguish unsupported challenge from a proven false claim |
| `theory` | viewer/host | Known theory IDs | Mark proposal, do not overwrite verified truth | Queue distinct suggestions with no vote-as-truth |
| `verdict` | host; optionally viewer proposal | Case minimum proof satisfied | Resolve, generate credits/reconstruction | Show missing *type* of proof, not hidden answer |
| `hint` | host/aggregated viewers | Server timing/host policies | Reveal graded nudge | Do not reveal final truth before checkpoint |
| `scan` | field workstation | Co-op station verified + visible target | Generates local observation | Requires field station role |
| `verify` | records workstation | Co-op station verified + visible reference | Generates local reference | Requires records station role |
| `share` | viewer/host at evidence-owning station | Previously verified evidence | Publishes fact to shared board | No fake share or cross-room unauthorized edit |
| `pause/resume/stop` | host | Valid host session | Freeze clocks, persist | Commands during pause ignored with UI state |

## Puzzle grammar (MVP)

**Quick:** `spot`, `match`, `contradiction`, `sequence`. Each needs ≤1 typed answer or ≤1–2 evidence links to win.  
**Long:** `inspect`, `timeline`, `match`, `challenge`, `verdict`, optional `decode`.  
**Co-op:** same primitives plus `station_role`, `share_evidence`, `joint_verify` gates.

## Specific rules

- **Answer acceptance:** exact ID/synonym allowlist from case data; whitespace/case normalization. No fuzzy semantic acceptance for objective verdicts.
- **One source of truth:** `case.answer` and `proof_requirements` immutable after case starts; event log revision increases for transitions.
- **Visible knowledge vs actual truth:** evidence cards can reveal facts; theory cards are speculation until confirmed. Never render theory as fact.
- **False positives:** link valid only if a declared `link_id` exists and both prerequisites met. A coincidental time similarity alone does not prove cause.
- **No brute-force freebies:** for tiny quick cases only offer a small choice set when explicitly intentional. More advanced cases require multiple corroborating facts.
- **Invalid solution:** if content contradicts itself or no proof path exists, mark case invalid, end gracefully and report internally; no fictitious winner.
- **Credits:** event-based ledger with action IDs, Twitch IDs and channels, not estimated audience counts. Co-first credit within 2 seconds is optional host setting; never claim exact timing fairness across disparate stream delays.
- **Viewer with no chat:** story fully watchable; no mandatory participation.
- **Viewer joins late:** objective/current scene/last two discoveries remain visible; `!recap` optional, host can open recap panel.
- **Pause:** freeze server deadline and deterministic game progress; chat commands during pause don't mutate game.
- **Streamer gone:** Quick can be safely dismissed; long case save checkpoint; co-op local stations remain inspectable but joint gates freeze until reconnection or host-approved downgrade.
- **Game end:** recap is optional; next case requires host click or previously set autoplay with explicit cap.

## Hint ladder

- H0 objective: "Identify what caused the gallery alarm."
- H1 attention: "Look at the camera label and timetable."
- H2 relation: "The object ID from camera should match a record."
- H3 direct nudge: "Compare R-07 on the video with R-07 in the maintenance schedule."
- Hint thresholds are configurable or manual; not unbounded viewer `!hint` spam. No timer-driven penalties by default.

## Difficulty model

| Level | Complexity | Target audience | Hints |
|---|---|---|---|
| Relaxed | 2–3 clues, one logical step | Queue/BRB | H1 readily available |
| Standard | 4–8 clues, 2–4 inference steps | Casual dedicated stream | progressive H1–H3 |
| Detective | 8–18 clues, multi-stage proof | Longer session | optional and paced |

Avoid numeric "IQ", cognitive-load shame, fast reaction demands, time stress in long mode.

## Success vs failure semantics

- **Solved:** enough required evidence and correct verdict.
- **Partial:** time ended voluntarily or case stopped with checkpoint, but some discoveries logged.
- **Incorrect theory:** theory contradicted with evidence; game remains playable.
- **Interrupted:** stream resumed main game; pause state preserved.
- **Unavailable:** no Twitch connection; show clear disconnected status and allow separate local test mode explicitly labeled.
- **Invalid content:** validation cannot establish one coherent outcome; stop with apology and issue code, not fake reveal.
