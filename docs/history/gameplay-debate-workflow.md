> Historical archive. Preserved on 2 November 2026 from the earlier gameplay-discovery phase. Paths in the original text refer to the repository root. For current work, start with [the documentation map](../README.md). Do not execute the old startup instructions as the current project workflow.

# Running the Codex ↔ Claude debate

This pack is a ready-to-copy **gameplay discovery** starter. It does **not** implement the game.

## Files

- `GAMEPLAY_DEBATE.md`: shared requirements, rules, evaluation scorecard, and append-only transcript. **Both agents edit this same file.**
- `CODEX_START_PROMPT.md`: paste its contents into Codex to create Turn 01.
- `CLAUDE_START_PROMPT.md`: paste its contents into Claude Haiku 5.5 to create Turn 02.
- `HOW_TO_RUN.md`: this guide.

## Start

1. Copy the **four files** into the **same repository root** accessible to both agents. Keep the filename `GAMEPLAY_DEBATE.md` unchanged.
2. Open the repository in Codex and paste `CODEX_START_PROMPT.md`. Check that it wrote `Turn 01 — CODEX` and the final line `HANDOFF: CLAUDE`.
3. Open **that same repository and same physical file** in Claude and paste `CLAUDE_START_PROMPT.md`. Check that it appended `Turn 02 — CLAUDE` and `HANDOFF: CODEX`.
4. Continue alternating the agents in separate invocations. Run one at a time; do not let both concurrently edit the transcript.
5. After 6–8 turns (or earlier when disagreements are resolved), request a final human-facing recommendation, including competing concepts, unresolved risks and tests. **Do not start implementation until the direction is chosen.**

If Codex and Claude run in different cloud environments, they **do not automatically share files**. Use a shared repo, synchronize commits, or manually transfer the latest complete `GAMEPLAY_DEBATE.md` before each handoff. Do not assume that a chat message causes the other model to run.

## Reusable continuation prompt — give to the agent named in the last HANDOFF

> Read `GAMEPLAY_DEBATE.md` from top to bottom, including the last handoff and every previous turn. You are the agent indicated by the last `HANDOFF` line. Follow the exact debate rules in Section 2. Critically respond to the prior turn, improve or replace weak mechanics, and move the comparison toward a falsifiable, fun, Twitch-native gameplay concept. Include a concrete short-round scenario and a long-form co-op scenario. Append exactly one correctly numbered turn under Section 4; preserve every previous turn, and end with `HANDOFF` to the other agent. Do not implement code or pretend the other agent ran. If this is Turn 06 or later, explicitly say whether another round has high value or whether human review is appropriate.

## Important operating notes

- The two initial prompts are intentionally asymmetrical: Codex proposes competing mechanic families; Claude red-teams them and proposes its own.
- The file is a debate record, **not a claim of market evidence**. Unverified numbers must be labeled hypotheses.
- The previous Quick Play / Mystery Live split is a useful starting assumption, not a decision the agents must protect.
- Streamer value and viewer enjoyment are different variables; strong ideas should satisfy both.
- The name remains TBD. Avoid prior abandoned dragon/egg designs.
