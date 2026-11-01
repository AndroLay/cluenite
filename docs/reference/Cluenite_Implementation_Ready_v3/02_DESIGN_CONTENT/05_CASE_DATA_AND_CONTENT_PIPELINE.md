# 05 — Case Data Specification, Proof Validation and Content Pipeline

## Goal

Case authoring must remain **data-driven and deterministic**, not a folder of hardcoded frontend scenes and hallucinated consequences. A case is *playable* only if its story truth matches every accepted proof and art reveal, all required evidence is reachable, commands are valid, and no hidden answer is leaked in public client bundles.

## Authoritative case shape (conceptual, not fixed API code)

```yaml
caseId: q01_gallery_shadow
version: 1.0.0
public:
  title: The Gallery Shadow
  format: quick
  difficulty: relaxed
  targetDurationSeconds: [30, 90] # target only
  artSceneId: gallery_evening
private:
  truthId: robot_r07_triggered_sensor
  proofRequirements:
    all:
      - observed: CAM_R07
      - observed: SCHEDULE_R07
      - linked: [CAM_R07, SCHEDULE_R07]
  acceptedVerdicts: [ROBOT]
  falseVerdicts: [THIEF]
nodes:
  - id: CAM
    type: inspectable
    publicLabel: Camera
    unlocks: [CAM_R07]
  - id: SCHEDULE
    type: inspectable
    publicLabel: Maintenance Log
    unlocks: [SCHEDULE_R07]
links:
  - from: CAM_R07
    to: SCHEDULE_R07
    relationId: same_identifier_and_time
hints:
  - 'Examine the camera label.'
  - 'Compare the object ID with the maintenance log.'
reveal:
  sceneCue: r07_sensor_crossing
  explanation: 'Robot R-07 passed the sensor during its scheduled cleaning run.'
```

This is an **illustrative authoring format**. Actual Zod/TypeScript case schema must be defined once in `packages/contracts` and validated end to end. Avoid shipping `private` case truth to browser endpoints, browser sourcemaps, static JSON or OBS payloads. Store private truth in server bundle or access-controlled database.

## Case model to implement

- Public case catalog metadata: ID, immutable version/hash, title, format, duration estimate, accessibility tags, locale, authored/validated status.
- Authored scene IDs and illustration asset mappings, local evidence ID definitions, allowed inspectables, diagram hotspots with text alternatives.
- Initial objective; unlock conditions for nodes, evidence relationships, ordered puzzles and theory claims.
- Private truth and proof predicate(s); accepted synonyms/aliases; authored explanations for wrong guesses that do not spoil solution.
- A final `reconstruction` made of fact-backed storyboard panels and reference IDs for its logical statements.
- Hints H1/H2/H3 at each stall-prone stage, host optional skip branch.
- Optional co-op: team A/B role-gated tools, allowed share events, joint gate predicate and no-bottleneck independent tasks.
- Artwork references and versioned accessibility descriptions; audio/motion cue registry.

## Required validator before publishing

1. **Schema**: all fields correct and stable unique IDs; aliases unambiguous within stage.
2. **Graph**: every prerequisite exists; reachable unlocks; no accidental cycles trapping state.
3. **Truth consistency**: no authored evidence contradicts canon; no false verdict passes any path.
4. **Proof completeness**: at least one valid action path yields verified outcome; required inputs attainable within realistic scene count.
5. **No unsupported leaps**: a CCTV shadow plus a schedule matching an ID proves identity/time match, but not unobserved facts unless authored verification establishes them.
6. **Negative tests**: wrong order, missing link, wrong code, guessed verdict without proof, repeated action, impossible evidence relationship.
7. **Co-op viability**: each station has at least one meaningful independent action; joint proof requires factual output from A and B, not two ready toggles.
8. **Art/story consistency**: final reveal matches source facts; clue is legible at downscale; all text alternative labels exist.
9. **Content budget**: at least one obtainable relevant result per 30–60 sec in Quick or every stage in Mystery; no lengthy dead end without hint.
10. **Version/hash pinning**: new published version cannot mutate existing sessions.

## Authoring production workflow

`Story pitch → Canon truth timeline → Evidence list → Provisional theories → Contradictions → Proof graph → Player commands → Pacing/hint ladder → Art & motion cues → Automated validator → 2–5-person paper playtest → Revision → Publish version`.

Always design **truth first**, then plant sufficient evidence fairly. Do not invent surprise twists just for shock: reveal must feel retrospectively inevitable when evidence replayed.

## Test cases to create immediately

- Q01 exactly one correct final solution, valid proof link; premature correct guess rejected until prerequisites.
- M01 chronological facts at 18:56/57/58/59/19:01/19:02 and safety relocation proof.
- C01 station A produces unique `SCAN_P4`, B produces unique `MANUAL_B17`, full proof requires both; event replay idempotent.
- Snapshot serialization/deserialization identical case state and revision after restart.
- Two concurrent valid chat inputs on same node commit one unlock with truthful contributor credit.

## Case content prioritization

Use a **small authored library, not unrestricted LLM-generated cases**. P0 publish Q01 and one short version of M01. C01 is P1 if two real channels can connect. Extra cases and a case editor are post-submission. AI may create rough drafting assistance later; it must never automatically publish contradictory/unsolvable mysteries or decide truth at runtime.
