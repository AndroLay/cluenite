# Backend predeploy completion

Date: 2 November 2026. Scope: backend implementation and local release preparation, stopping before deployment. Haiku owns frontend implementation and acceptance. This record supersedes the earlier backend code-gap list in the [release record](BACKEND_RELEASE_2026-11-02.md). Remote access/acceptance remain pending. No production service, database, Twitch app, scheduler, or deployment was created in this pass.

**Earlier real gameplay integration, 10:52 UTC:** backend source `a2a581f` has [passing Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41424727516) and 113 local tests/23 files. Real operator-triggered and clock-accelerated scheduled refresh, actual chat receipt/proof correlation, Q01 reveal/reload in actual OBS, two-channel C01 joint proof/final reveal, secondary revoke/normal browser reauthorization/explicit rejoin, and solo-owner revoke/pause/resume pass. Sixteen final readback checks confirm readiness/current assets, both persisted browser authorizations and actual enabled subscriptions, durable results, and test cleanup. The isolated OBS instance is closed; the primary's empty M01 is recreated READY. Natural expiry, actual provider-directed handoff/denied consent, player feedback, full frontend acceptance, and remote deployment/recovery remain separate. [Backend progress](../agent-handoff/BACKEND_PROGRESS.md) preserves exact scope, artifacts, and earlier failures; later checkpoints supersede the blanket real-provider blockers in historical sections below.

**Later deployment:** the initial backend is now live at [Cluenite](https://cluenite-app.onrender.com). The [deployment record](BACKEND_RELEASE_2026-11-02.md#first-render-deployment) supersedes this predeploy record's old access/resource observations and records remaining production Twitch acceptance. Earlier dates and source checkpoints below remain historical.

## Implemented changes

- Resource hardening at 12:28 UTC: [bounded work/connection budgets](BACKEND_RESOURCE_LIMITS.md), PostgreSQL cancellation/idle-error handling, separate startup migration budgets, preserved Twitch backoff, bounded chat processing with explicit overload rejection diagnostics, and reduced idle polling are implemented. All 140 tests/27 files, server typecheck/build, changed-file lint, independent review, and 12 real-account readback checks pass locally. Routine per-request info logging is now disabled on the app server; the safe serializers below still apply to explicit error diagnostics. Capacity on the actual production target remains unmeasured.
- REQ-FE-005: HTML OAuth navigation redirects to the configured origin at `/connect?result=connected|denied|invalid|state_rejected|unavailable|exchange_failed`. JSON clients retain their existing status/error contracts. Callback cookies are cleared, sensitive responses are not cached, and callback navigation uses `Referrer-Policy: no-referrer`. The query never proves authentication; `/api/me` does.
- Refresh persistence uses a compare-and-swap credential version. A late refresh cannot clear revocation, restore membership, overwrite a new OAuth authorization, or revoke its replacement. New authorization and revocation lock the account before membership changes. Superseded/stopped workers check their identity after asynchronous boundaries and cannot open sockets or mark late subscriptions connected.
- New command receipts store a whitelisted command category and result code, without raw arguments or unrelated chat text. SHA-256 request fingerprints retain exact retry/conflict checks. Historical fingerprint-less receipts keep their conservative compatibility behavior; this pass does not rewrite existing audit history.
- HTTP admission precedes provider/database handler work: 600 API requests and 20 Twitch-auth requests per transport peer per 60 seconds; authenticated mutations share a 60/account/60-second budget across cookies and routes. Exhaustion returns `429 {"error":"rate_limited"}` with `Retry-After`. Maps are bounded at 10,000 keys each and fail closed at capacity. API bodies are limited to 16 KiB, with `413 {"error":"request_body_too_large"}`. Health and static delivery are outside these budgets. All API responses are `no-store`.
- Routine per-request info logging is disabled on the application server. Startup and explicit safe failure diagnostics remain enabled. Safe serializers omit request URLs, query values, headers, cookies, bodies, and raw error messages/stacks. Unexpected HTTP errors use generic response bodies; investigate with request IDs, stable error codes, database health, and participant-scoped diagnostics.
- Production preflight and bounded retention/account deletion commands are available without new dependencies or schema migrations.
- Shutdown disconnects Socket.IO/Engine.IO before HTTP drain, stops background workers, destroys remaining TCP connections owned by this server, then awaits Socket.IO and database cleanup. A client may lose an in-flight response; retry mutations only with the original idempotency key and resync snapshots after reconnecting.

## Production configuration check

Run from the repository root, with the intended environment available privately:

```powershell
npm --prefix apps/server run preflight
```

This command loads the ignored root `.env` without overriding existing process variables, then applies production validation even when the local runtime defaults to development. It prints only a validity result, missing variable names, and fixed validation messages. Exit 0 means configuration syntax/relationships pass; exit 1 means correction is required. It does not connect to PostgreSQL/Twitch, run migrations, authorize an account, validate the actual credentials, or prove deployment readiness. `RENDER_API_KEY` is deployment tooling access, not an application runtime requirement.

Required values: `PUBLIC_ORIGIN`, `DATABASE_URL`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI`, `SESSION_SIGNING_SECRET`, `DATA_ENCRYPTION_KEY`, and `OVERLAY_TOKEN_SIGNING_KEY`. Production requires HTTPS, the exact same-origin `/api/auth/twitch/callback`, disabled developer controls, and the real Twitch adapter. Signing keys must have at least 32 bytes; the encryption key must be canonical base64 for exactly 32 bytes. Generate real random values privately; keep encryption/signing keys stable across redeploys and recovery.

## Retention and deletion

The application owner operates this policy daily after deployment. This task supplies the command and tests; it does not schedule or execute production deletion. Preview first:

```powershell
npm --prefix apps/server run maintenance
```

The preview performs SELECT statements and rolls back its transaction. It reports counts, never tokens or account identifiers. Explicit application is:

```powershell
npm --prefix apps/server run maintenance -- --apply
```

Each transaction handles at most 100 sessions, 1,000 expired/revoked host-session rows, and 100 unreferenced accounts. Transactions are serializable, with bounded statement/lock timeouts. Concurrent changes may cause a safe rollback; rerun a fresh preview. A successful batch is idempotent. Repeat batches until the preview reports zero eligible rows; preserve a backup/restore path before destructive maintenance.

| Data                                                 | Retention/deletion rule                                                                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RESOLVED`, `PARTIAL`, `CANCELLED` sessions          | Delete after more than 30 days since last update, only when every outbox event is published. Cascades remove the session's events, input receipts, contributions, outbox, overlay credentials, memberships, and invitations together. |
| `COOP_WAITING`, `READY`, `ACTIVE`, `PAUSED` sessions | Preserve current proof and deduplication. The owner must explicitly stop an abandoned session before its terminal retention period begins.                                                                                            |
| Host sessions                                        | Remove after expiry or revocation is more than one day old. Active host sessions are preserved.                                                                                                                                       |
| Accounts                                             | Remove after revocation or token expiry is more than 30 days old, only when no retained session, membership, invite, contribution, processed-input/event actor reference, or remaining host-session row refers to them.               |
| Overlay/invite retry receipts                        | Keep with their parent session, including expired credentials, to preserve replay handling.                                                                                                                                           |
| Pinned authored case metadata                        | Keep as product configuration; it is not player history.                                                                                                                                                                              |

`blockedPendingSessions` counts old terminal sessions protected by undelivered outbox events. Resolve/retry delivery before cleanup; do not silently discard events to make the number zero. Open sessions and blocked deliveries require operator review, so the command does not promise that all data disappears automatically at day 30.

For a specific deletion request, revoke the account using the authenticated disconnect flow first. Then preview and, when eligible, apply:

```powershell
# Set this to the requesting account's verified Twitch user ID.
$twitchUserId = "REPLACE_WITH_VERIFIED_TWITCH_ID"
npm --prefix apps/server run maintenance -- --erase-account "$twitchUserId"
npm --prefix apps/server run maintenance -- --erase-account "$twitchUserId" --apply
```

Targeted erasure bypasses the 30-day account age only. It requires revocation and refuses any retained session/co-op/invitation/contribution/input/event reference. It never deletes a partner's investigation to erase another account. Close the owner's abandoned sessions through normal controls and resolve retained shared-history handling before retrying. A blocked erasure is not a completed deletion; record it for owner follow-up. Repeating an already-completed erasure reports zero accounts. Backups and external provider history have their own lifecycle; these commands affect the selected application database only.

## Runtime and deployment boundary

The [Blueprint](../../render.yaml) remains a manual deployment definition for the confirmed workspace: one Singapore web instance and private PostgreSQL 18. Build with the pinned package manager and frozen lockfile. Startup runs the existing ordered migrations in one transaction under an advisory lock before listening; failure must stop startup. `/health/live` proves HTTP process liveness and `/health/ready` additionally checks PostgreSQL.

Proxy trust stays disabled. IP budgets use the immediate transport peer, and forged `X-Forwarded-*` headers cannot bypass them. Render terminates TLS before forwarding HTTP, so multiple clients can share a proxy budget. Confirm the real proxy path and appropriate thresholds during remote acceptance before increasing scale. Do not trust every proxy or adopt hop-count-only trust. This conservative choice follows [Fastify's proxy guidance](https://fastify.dev/docs/latest/Reference/Server/#trustproxy) and [Render's web-service transport documentation](https://render.com/docs/web-services); it is not evidence of the as-yet undeployed network path. The limiter is per process and resets on restart; multi-instance deployment requires shared admission state or verified edge enforcement.

Before any later deployment, the owner must supply the deferred Render access, configure the actual production HTTPS origin/callback using the already validated Twitch app and stable application keys, and authorize that deployment. Pin the reviewed source commit and require CI to pass. Verify remote readiness, private database ingress, current assets, Socket.IO, real OAuth/chat, refresh/revocation, one-viewer proof, two-channel C01 consent, OBS read-only behavior, and restart/outbox recovery on the actual target. Follow the [external checklist](../agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md) and existing [rollback/recovery procedure](BACKEND_RELEASE_2026-11-02.md#rollout-recovery-and-stop-conditions). No prior successful production deployment or remote restore drill is claimed.

Frontend routes, copy, visual acceptance, signed-in browser flows, OBS UI, co-op workstations, and remaining client retry/hint affordances stay with Haiku. Large libraries, generated cases, global progression, and raid handoff remain P2 scope; they are not release promises.

## Verification record

Final command results and publication identity are recorded after final verification in the [backend progress log](../agent-handoff/BACKEND_PROGRESS.md). All database mutation tests use unique temporary schemas inside the explicitly allowed local `cluenite` database; provider HTTP/WebSocket boundaries are synthetic and labeled. No shared API process or application schema was stopped, restarted, or cleaned.

The corrected source passes 110 local tests in 23 files, backend build/lint, and the earlier workspace compilation gates. The [first Linux CI run](https://github.com/AndroLay/cluenite/actions/runs/41352849382) passed all 108 assertions but failed its HTTP teardown timeout; it is not a passing release run. A local reproduction confirmed that active WebSockets could block Fastify before its old `onClose` cleanup ran. The correction moves shutdown work to `preClose`, awaits final resource cleanup, and adds platform-independent active-WebSocket/unfinished-body checks. A narrow independent review found no further actionable shutdown defect. Corrected Linux CI evidence is recorded after publication below.

The first unrestricted parallel suite hit a native Windows PostgreSQL backend exception (`0xC0000142`), followed by shared-memory recovery error 487. The verified project cluster required process recovery after native shutdown timed out; it completed WAL replay and returned to localhost readiness. The API on port 10000 was not stopped. No data directory, application schema, ACL, or global setting was deleted or changed. A two-worker run then passed all 108 tests across 22 files, and the repository now caps Vitest at two workers. This bounds fixture/process pressure; it does not establish the exact Windows failure cause or claim a PostgreSQL engine fix. Interrupted test schemas were not bulk-deleted.

## Published source and final result

The earlier hardened backend source was [commit `6dd69f1`](https://github.com/AndroLay/cluenite/commit/6dd69f10242bf8769c872423071128d1febea852), following the main hardening commit `8e2f7f2`. [Linux/PostgreSQL CI passed](https://github.com/AndroLay/cluenite/actions/runs/41353837869): frozen install, workspace typecheck, production build, **110 tests in 23 files**, and lint with zero errors. The repository was confirmed private. The later asset correction and its publication identity are recorded below; this paragraph retains the earlier source checkpoint.

All backend code gates in this predeploy scope are complete. At publication, Haiku's eight modified tracked files and two new frontend pages were excluded and preserved. At that point the local environment lacked Twitch app configuration and the three application security keys, and the owner had deferred Render access. These local/CI results do not authorize or prove a production deployment, real Twitch/OBS acceptance, or completed frontend integration.

## Private configuration follow-up

Later on 2 November, the previously empty session, encryption, and overlay keys were generated privately in the ignored root `.env`, preserving existing settings. Development parsing and an application encryption/decryption round trip pass. The owner subsequently registered Cluenite and saved all three Twitch application settings. Actual Twitch app-token issuance, matching-client validation, and revocation of the temporary token each returned 200. No credentials or tokens were published, and no existing key was rotated. Keep the generated application keys stable and privately recoverable.

The selected, ownership-verified local API was restarted to load those credentials; Vite was preserved. Readiness, public web, case proxy, signed-out identity rejection, and the real OAuth-start redirect pass. Current production preflight reports no missing variables and correctly fails because the local origin uses HTTP; a production HTTPS origin and exact callback remain later configuration. The earlier no-restart statements above describe the source-test pass, not this subsequent owned runtime restart.

The owner subsequently completed broadcaster consent in the main Zen profile. Real browser `/api/me` and diagnostics checks pass, with the expected account and one connected EventSub subscription. A separate background check loads the encrypted stored credentials and validates the user token/profile and one enabled matching chat subscription directly with Twitch. The managed browser bridge remains unavailable; native focus control is unsupported. The owner now requires background work, so browser interactions have stopped.

Twenty-one real cookie-authenticated browser checks pass for one new local Q01 operator round: creation/control idempotency, CSRF rejection, host lifecycle, host and overlay Socket.IO, transition delivery, overlay REST read-only boundaries, and revocation. Cleanup ended that round in `CANCELLED`, revoked its test overlay credential, and closed its sockets. No existing rounds or credentials were changed, and no real chat commands were sent. This is authenticated backend evidence rather than complete Haiku frontend or OBS desktop acceptance. The [updated integration checklist](../agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md) keeps real chat-to-proof/reveal, refresh/revocation/handoff, two consenting channels, actual OBS, and later deployment open.

## Background-only asset and recovery follow-up

At 07:58 UTC on 2 November, the running API serves the exact current built HTML, JavaScript, and CSS after fixing startup-only static asset registration. New frontend asset hashes are now resolved on demand; missing API/health/assets remain JSON 404s. The new regression fails with the prior behavior and passes after the correction. No frontend source, dependency, database schema, or key changed. This follow-up supersedes the earlier source-unchanged boundary above.

The full local suite passes 111 tests in 23 files, with backend typecheck/build and changed-file ESLint passing. A running real-adapter API holds the database-wide EventSub advisory lock, which temporary schemas do not isolate. Its verified owned process was stopped only for the exclusive suite and restored in `finally`; Vite and all user windows were preserved. Restored readiness, stored Twitch authorization, and exactly one enabled matching chat subscription pass. This is local restart/subscription recovery, not a token-refresh or production-recovery claim.

Forty-six background integration checks pass, including 16 signed-out public page/viewport checks on API/Vite at 390 and 1280px without horizontal overflow or uncaught browser errors. Only the two `/guide` header measurements prove 44px minimum height; other navigation targets and visual acceptance remain with Haiku. Live callback tests use synthetic denied/invalid/state-rejected inputs, retain JSON contracts/privacy headers, and do not authenticate the empty headless browser. Actual provider denial, refresh/revocation, real chat-to-proof/reveal, two real consenting channels, actual OBS, and deployment remain open.

Maintenance preview reports `applied: false` with all eligible counts zero; no deletion was applied. The [backend progress record](../agent-handoff/BACKEND_PROGRESS.md) describes the fixture-lock diagnosis, unread anonymous frontend response observation, sanitized evidence, and handoff. The headless context was closed and no main-profile browser interaction occurred.

## Real refresh and final source publication

Backend source [fbc880a](https://github.com/AndroLay/cluenite/commit/fbc880aa9e8f98a1466047de221f8d9416e71bf9) is published to the confirmed private repository. [Linux CI passes](https://github.com/AndroLay/cluenite/actions/runs/41411273671) for frozen install, workspace typecheck, production build, engine/auth/realtime/PostgreSQL tests, and lint. Haiku's uncommitted frontend files were excluded.

At 08:19 UTC, one actual operator-triggered Twitch token refresh passes ten checks. The application's API client and encrypted compare-and-swap store preserve expected identity/scope and active browser-session rows. Client Secret, application keys, and browser cookies are unchanged. At 08:21 UTC, after a hidden owned-API reload, readiness and direct provider validation pass with one enabled matching subscription created after that restart. No token appears in reports. This later check supersedes the earlier blanket no-refresh boundary; it does not observe natural-expiry scheduling or post-refresh gameplay.

Still open: real chat-to-proof/reveal after refresh, authorized account disconnect/revocation and reauthorization, actual provider-directed handoff if exercised, two consenting real channels, actual OBS, full frontend acceptance, and deployment. No real messages, account revocation, main-profile GUI interaction, OBS launch, or deployment were performed. Detailed timestamps and sanitized artifacts are in [backend progress](../agent-handoff/BACKEND_PROGRESS.md).
