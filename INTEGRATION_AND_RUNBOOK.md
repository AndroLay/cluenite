# Integration and verification runbook

## Entry points

Start with [the documentation map](docs/README.md), [current status](docs/STATUS.md), [development guide](CONTRIBUTING.md), and [TEAM_PROTOCOL.md](TEAM_PROTOCOL.md). All development material and web copy use English.

The repository already includes backend/frontend implementation and handoff files. Use [CODEX_START_PROMPT.md](CODEX_START_PROMPT.md) or [CLAUDE_START_PROMPT.md](CLAUDE_START_PROMPT.md) for the assigned task; the old debate workflow is archived.

## Ownership and isolated edits

Follow the normal backend/frontend ownership split. A user may authorize a scoped cross-area integration pass, such as documentation/language synchronization. Preserve all existing uncommitted work.

For authorized concurrent edits, use separate worktrees from an agreed baseline and one writer per file. Do not automatically commit, stash, reset, or create branches to prepare them. Read-only checks do not need another editing worktree.

Backend changes must keep [the API inventory](docs/agent-handoff/BACKEND_CONTRACTS.md) current. Frontend requests belong in [the request log](docs/agent-handoff/FRONTEND_CONTRACT_REQUESTS.md). Handoff documents do not automatically transfer changes between independent worktrees or run another agent.

## Local integration

1. Inspect the actual diff, selected database, process version, and frontend proxy target.
2. Follow [HOW_TO_RUN.md](HOW_TO_RUN.md); use one browser origin matching `PUBLIC_ORIGIN`, and one selected API port for both REST and Socket.IO.
3. Run relevant typechecks, unit tests, build, and lint. Run PostgreSQL tests only against the local `cluenite` development database supported by the fixture.
4. Run the browser fixture with its ports free; see [browser-test requirements](tests/e2e/README.md). A stale test route or mocked provider must not be mistaken for a live integration result.
5. Update `docs/STATUS.md` with fresh, dated outcomes and unverified surfaces. Preserve historical handoff evidence.

The source includes all three authored backend cases. The public Quick Case sample is a separate manuscript interface demonstration. The landing/menu/guide exist; OBS credential controls, co-op invitation controls, and M01's additional-hint button remain open UI work.

## External acceptance

Perform these steps only with authorized accounts and the selected service/desktop environment. Use [the external checklist](docs/agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md) for evidence.

1. Authenticate a real Twitch host, create Q01 from the case menu, start it in the host panel, and obtain a scoped OBS URL through the API until UI issuance exists.
2. Send a real viewer command, correlate accepted proof with one PostgreSQL revision, and observe the update/reveal in the actual OBS source. Confirm invalid/duplicate inputs do not create extra progress.
3. Reload/disconnect/reconnect and confirm the authoritative snapshot is recovered.
4. Complete M01's evidence, timeline, theory challenge, hint, and supported-verdict path through the intended interface.
5. If P0 is stable, verify C01 with two distinct consenting broadcasters, complementary station contributions, invitation acceptance, and disconnect/rejoin behavior. Mocked accounts do not satisfy this step.
6. Verify the selected Render service/database, deployed commit, migrations, health checks, HTTPS, and Socket.IO. A local port or `render.yaml` is not a deployed target.
7. Run real player sessions and capture actual app/OBS evidence. Prepare demo and submission materials against official requirements; do not infer current deadlines or submission state from old planning notes.

## Priority

P0 is a real, comprehensible Q01 chat → persisted proof → OBS reveal flow with recovery. P1 is a coherent M01 and one verified C01 joint proof if achievable. Extra content, generators, raid relay, and global progression remain deferred.

No deployment, external mutation, or submission is authorized merely by reading this runbook.
