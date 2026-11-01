> Historical request log. Superseded by the current request disposition in [the active handoff](../agent-handoff/FRONTEND_CONTRACT_REQUESTS.md). Paths below refer to the original repository context.

# Frontend contract requests

Owner: Claude Code (frontend). Written 2026-11-01 against `main` at `c320a9b`. Updated the same day after product-owner decisions.
Codex answers requests in `docs/agent-handoff/BACKEND_CONTRACTS.md`. Codex owns `packages/contracts`, `packages/engine`, and `packages/cases`; this file does not change them.

## REQ-FE-001: Clue-to-evidence linkability. CLOSED (no contract change)

Decision (product owner, 2026-11-01): do **not** add `unlocksEvidenceIds` and do **not** change Q01 content. `ACCESS` is contextual information, not linkable evidence. The correct link in Q01 is `CAM_R07` ↔ `SCHEDULE_R07`.

Frontend behavior that follows: `ACCESS` is shown as context only and is not offered as a link source. The link control uses only released evidence. The server still validates every `!link`.

## REQ-FE-002: Verdict and reveal fields (no request)

- `chosenVerdictId` is in `roundSnapshotSchema` (placement fixed in `c320a9b`). The frontend reads it.
- Persistence gap, not a contract gap: `apps/server/src/db/roundRepository.ts` does not yet store or return `chosenVerdictId`. That file has uncommitted changes from another session; Codex should check it.

## REQ-FE-003: No way to create a host session for live testing. OPEN, needs Codex and user

Found while starting the live Quick Case test (2026-11-01):

- `GET /api/auth/twitch/start` returns `503 twitch_oauth_not_configured` on port 10000. The running API has no Twitch OAuth configuration, so no host cookie can be issued.
- `POST /api/sessions` requires a host cookie and returns 401 without one. So no `sessionId` exists, and `!look`, `!link`, `!hint`, and `!submit` cannot be exercised against the live API.
- `CLUENITE_DEV_CONTROLS` is parsed in `apps/server/src/config.ts` (lines ~115 and ~198), but no route reads `devControls`. The flag currently has no effect.

Requested (choose one; Codex decides the shape):

1. Provide a dev-only host bootstrap behind `CLUENITE_DEV_CONTROLS=1`. It must refuse to run when `NODE_ENV=production`, which config already enforces. It should return a host cookie for a fixed local dev identity, labeled as dev-only. Frontend tests can then create a Q01 session through `POST /api/sessions`.
2. Or the user supplies Twitch developer credentials in the server environment and performs one real login in a browser. This requires a server restart, and restart needs user approval.

Until one of these exists, the live end-to-end Quick Case test (`!look` → `!link CAM_R07 SCHEDULE_R07` → verdict → hint) is blocked. Frontend results must not be reported as live results before then.

## REQ-FE-004: Port 10001 is a different build. Information only

- Port 10000: `/api/cases` returns authored cases including Q01. Auth reports `authentication_required`. This is the endpoint the frontend targets (`apps/web/vite.config.ts` default).
- Port 10001: `/api/cases` returns 404. `/api/me` returns 503 `authentication_not_configured`. It appears to be an older or different build. Owner not confirmed. It is not used by this frontend work.

## Fields already in the contract (frontend work, no contract change)

- `sequences`, `theories`, `currentHint`, and `hintLevel` are in `roundSnapshotSchema`. The frontend `quickCaseFromSnapshot` (`apps/web/src/quickCase/viewModel.ts`) maps `currentHint`, `hintLevel`, and `chosenVerdictId`. `sequences` and `theories` are not yet mapped in the Quick Case view. Mystery Live will map them on the frontend. No backend request.

## Observed earlier, status now

- `GET /api/sessions/dev/snapshot` returned 404. This is expected for a session ID of `dev` (no such session). Not a route bug. No action.
- Earlier `FST_ERR_DUPLICATED_ROUTE` on port 10000 is not reproduced now. Port 10000 is `ready`.
