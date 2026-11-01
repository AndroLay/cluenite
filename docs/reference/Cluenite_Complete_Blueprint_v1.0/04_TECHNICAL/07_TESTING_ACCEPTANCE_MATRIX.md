# Testing Matrix & Definition of Done

## Priority definitions

**P0:** required to claim working hackathon MVP. **P1:** high-value extra once P0 solid. **P2:** future. Tests must be run on actual code when available; the blueprint itself is not a passing build.

## P0 tests

| ID | Given | When | Must happen |
|---|---|---|---|
| AUTH01 | clean browser | OAuth connect Twitch | correct broadcaster shown, auth state verified |
| AUTH02 | invalid callback state | callback invoked | reject and no session created |
| EVT01 | one chat `!look CAM` from live Twitch | event delivered | real user's authorized session unlocks CAM |
| EVT02 | same notification delivered twice | process twice | one transition & one credit |
| EVT03 | unsolicited chat from another channel | process | no change to active session |
| CMD01 | invalid `!link A Z` | parse | neutral rejection, no state change |
| CMD02 | two valid distinct users | inspect+link | correct evidence credited and link shown |
| CMD03 | correct guessed verdict with missing required proof | submit | `INSUFFICIENT_PROOF`, not resolved |
| CASE01 | Q01 happy path | commands arrive | R-07 verified and 3–5s reveal appears |
| CASE02 | M01 happy path | all acts completed | accurate safety relocation final reveal |
| CASE03 | false theft assumption | challenge with real time clue | theory refuted, case stays playable |
| SESS01 | host presses pause | viewers keep typing | timer frozen, no further mutation |
| SESS02 | host presses resume | event arrives | resume at exact saved revision |
| SESS03 | overlay reload | fetch snapshot | visible state matches server, no answer leak |
| OBS01 | Browser Source 600×340 at 1080p stream | start quick | legible question, gameplay still visible |
| OBS02 | `prefers-reduced-motion` | reveal | no major translation/scale effects |
| SEC01 | public token tries host endpoint | mutate | 403; secret token not disclosed |
| SEC02 | devtools inspects public overlay payload | request | no hidden answer key or OAuth secrets |
| REL01 | EventSub disconnects | force socket close | honest reconnect status and recovery |
| CONTENT01 | intentionally invalid case fixture | publish/validate | rejected before game start |
| SUB01 | fresh clone of repo | documented setup | cold install and functional local demo |

## P1 co-op tests

| ID | Requirement |
|---|---|
| COOP01 | Two distinct Twitch broadcasters authorize independently and accept targeted invite |
| COOP02 | A-chat and B-chat actions bind to correct station and source channel |
| COOP03 | A-only observation cannot trigger `JOINT_PROOF_B17` |
| COOP04 | B-only reference cannot trigger `JOINT_PROOF_B17` |
| COOP05 | Both actual station outputs allow evidence-supported joint solve |
| COOP06 | B disconnect retains all prior evidence, pauses gate, resumes cleanly |
| COOP07 | Audience-size mismatch has no role-vote imbalance |

## Content invariants / property-based ideas

- Each case ID/version immutable for started session.
- Every reference in a proof condition exists as reachable evidence or relation.
- Every verified link's prerequisites unlocked before its relation event.
- All valid action sequences end in same authored verdict given sufficient proof (order may differ).
- Duplicate/reordered EventSub cannot award extra credits or skip nodes.
- Wrong theory never mutates ground truth.

## Human playtest matrix

**Round A (cold):** 5–10 new participants, one short case, screen watched at mobile scale. Observe confusion rather than coaching.  
**Round B (repeat):** 20 people or smaller realistic group, three cases in sequence, compare voluntary next-round choice.  
**Round C (co-op):** 2 hosts, unequal audience sizes, purposeful delay and disconnect; ask each what contribution only they could make.  
**Round D (content):** one participant tries to solve without understanding; check if proof gates reject lucky guesses.

## Performance budgets (target, measure on real deployment)

- Chat command feedback after backend receipt: p95 <750ms **excluding platform stream latency**.
- WS UI state propagation after DB commit: p95 <350ms under modest demo load.
- No uncontrolled bot chat flood; overlay should be lightweight and stable under browser source capture.
- Reconnect should eventually rebuild one authoritative state, not duplicate game session.

## Go/no-go

**Submit-able:** live Twitch chat → verified game state → OBS overlay → outcome visible in video; build instructions and Codex session ID.  
**Do not claim co-op:** unless actually tested with two authorized live accounts/channels.  
**Do not claim AI case generator:** unless generated cases have machine validation and human QA.  
**Do not publish:** if case truth reachable via public API before it is played.
