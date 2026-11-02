# Integration and verification runbook

## Entry points

Start with [the documentation map](../README.md), [current status](../STATUS.md), [development guide](../development/contributing.md), and [collaboration guide](../development/collaboration.md). All development material and web copy use English.

Use the [current handoffs](../README.md#current-handoffs) and the user's latest task. The [frontend/backend integration guide](../agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) identifies connected flows and their boundaries. Earlier startup prompts and debate records are archived under [history](../history/README.md); they do not assign current work.

## Ownership and isolated edits

Follow the normal backend/frontend ownership split. A user may authorize a scoped cross-area integration pass, such as documentation/language synchronization. Preserve all existing uncommitted work.

For authorized concurrent edits, use separate worktrees from an agreed baseline and one writer per file. Do not automatically commit, stash, reset, or create branches to prepare them. Read-only checks do not need another editing worktree.

Backend changes must keep [the API inventory](../agent-handoff/BACKEND_CONTRACTS.md) current. Frontend requests belong in [the request log](../agent-handoff/FRONTEND_CONTRACT_REQUESTS.md). Handoff documents do not automatically transfer changes between independent worktrees or run another agent.

## Local integration

1. Inspect the actual diff, selected database, process version, and frontend proxy target.
2. Follow [local setup](../development/local-setup.md); use one browser origin matching `PUBLIC_ORIGIN`, and one selected API port for both REST and Socket.IO.
3. Run relevant typechecks, unit tests, build, and lint. Run PostgreSQL tests only against the local `cluenite` development database supported by the fixture.
4. Run the browser fixture with its ports free; see [browser-test requirements](../../tests/e2e/README.md). A stale test route or mocked provider must not be mistaken for a live integration result.
5. Update `docs/STATUS.md` with fresh, dated outcomes and unverified surfaces. Preserve historical handoff evidence.

The source includes all three authored backend cases. Public practice experiences remain separate scripted browser content. Saved session continuation, host lifecycle, OBS credential controls, co-op invitations/consent and authorized workstations are connected; [local integration evidence](../evidence/frontend-integration-2026-11-02.md) records their checked scope. M01's additional-hint affordance, broader visual/accessibility acceptance and real player feedback remain open.

## External acceptance

Perform these steps only with authorized accounts and the selected service/desktop environment. Use [the external checklist](../agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md) for evidence.

1. Authenticate a real Twitch host, create Q01 from the case menu, start it in the host panel, and create/copy a scoped OBS URL from Stream setup or host controls.
2. Send a real viewer command, correlate accepted proof with one PostgreSQL revision, and observe the update/reveal in the actual OBS source. Confirm invalid/duplicate inputs do not create extra progress.
3. Reload/disconnect/reconnect and confirm the authoritative snapshot is recovered.
4. Complete M01's evidence, timeline, theory challenge, hint, and supported-verdict path through the intended interface.
5. If P0 is stable, verify C01 with two distinct consenting broadcasters, complementary station contributions, invitation acceptance, and disconnect/rejoin behavior. Mocked accounts do not satisfy this step.
6. Verify the selected Render service/database, deployed commit, migrations, health checks, HTTPS, and Socket.IO. A local port or `render.yaml` is not a deployed target.
7. Run real player sessions and capture actual app/OBS evidence. Prepare demo and submission materials against official requirements; do not infer current deadlines or submission state from old planning notes.

## Priority

P0 is a real, comprehensible Q01 chat → persisted proof → OBS reveal flow with recovery. P1 is a coherent M01 and one verified C01 joint proof if achievable. Extra content, generators, raid relay, and global progression remain deferred.

No deployment, external mutation, or submission is authorized merely by reading this runbook.
