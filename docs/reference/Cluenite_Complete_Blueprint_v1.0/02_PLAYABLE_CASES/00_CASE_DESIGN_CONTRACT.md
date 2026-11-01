# Case Authoring Contract — No Guesswork, No Hallucinated Truth

Every case must have the following authored elements:

1. `id`, `version`, localized `title`, `mode`, `estimated_seconds` (design target, never measured behavior).
2. `premise` one line, `question` one line, `audience_safe` boolean.
3. `truth`: explicit solution, narrative explanation, no ambiguous culprit; a clear distinction between observation and inference.
4. `scenes` with unique object IDs, `available_from`, `inspect_reveals`, content copy and art asset IDs.
5. `evidence` array with fact IDs, exact statements, origin, role/channel access and `prerequisites`.
6. `puzzles` array with input grammar, `validator_type`, aliases, correct states and error responses.
7. `relations`: permitted links and challenges; define meaning (not mere coincidence).
8. `proof_requirements`: AND/OR/threshold conditions *that logically justify the verdict*; never infer causality solely from co-occurrence.
9. `hints` tiered H1/H2/H3; `recap` 3–5 sentences; optional alternate paths.
10. `QA`: reachable solution, unique verdict, wrong guesses do not pass, impossible content rejected.

## Validation approach

- Static schema + referential checks: every required ID exists, all puzzle aliases map to allowed values, no cyclic hard prerequisites, graph has at least one complete reachable proof path.
- Runtime test: replay scripted intended event trace → solved; replay a guessed answer with missing evidence → not solved.
- Variant generation: if authoring parameterized variation, re-run solver and evidence consistency tests for every published variant. For hackathon, **use only authored deterministic cases**.
- Localized art: illustration must not contain vital info invisible to text/screen readers; provide accessible clue descriptions.

## Resolution truth semantics

An evidence card may be an observation about an unreliable witness, e.g. "witness claims door locked". It proves **the claim was made**, not that the door was locked. Two independent records can contradict the witness statement. Case proof should specify whether witness reliability is being evaluated.

## Art + animation hook contract

Each node defines `art_ref` and optional `motion_key` such as `clue_discover`, `evidence_link`, `theory_refuted`, `case_reveal`. See `03_ART_AND_MOTION/04_ANIMATION_SPEC.md`.

## Puzzle attribution

Only completed valid events count toward public contributor credits. Usernames are display-only (escaped), Twitch user IDs are stable attribution IDs, and credits are not part of objective truth.
