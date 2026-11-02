# Deterministic game engine

Pure TypeScript transitions and proof evaluation are implemented in `src/round.ts`; authored content validation is in `src/caseDefinition.ts`. The engine supports Q01 evidence linking, M01 ordering/theory/challenge/hints, and C01 team-specific scan/verify/share proof.

`createRound`, `applyCommand`, lifecycle helpers, and `toRoundSnapshot` are exported through `src/index.ts`. Inputs include an explicit clock value and trusted actor/team context; rendering, transport, randomness, database access, and Twitch clients stay outside the engine.

Only authored prerequisites and accepted actions advance proof. Invalid input and known duplicates do not advance revision. Public snapshots advertise state-aware `availableActions` and withhold private truth and expected sequence order.

Read [architecture decisions](../../docs/architecture.md), [API contracts](../../docs/api.md), and tests under `tests/engine`. Use English for authored feedback, comments, and tests. Runtime cases are provided by `packages/cases`.
