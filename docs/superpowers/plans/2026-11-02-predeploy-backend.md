# Backend completion before deployment

This plan follows the local adaptive-engineering planning adapter. The user authorized implementation through the predeploy boundary, excluding Haiku's frontend work and deployment itself. Execute inline; preserve the active checkout and all concurrent edits.

## Scope and baseline

- Baseline: `a0cf5cd6b9be36d64636bda7f776cd1e5fc39c0f`; the preceding source passed Linux CI with 70 tests across 17 files.
- Governing sources: v3 security/data and QA requirements, current code, and REQ-FE-005 in the frontend request log. Existing Q01/M01/C01, auth, persistence, and realtime contracts remain compatible.
- Haiku owns the dirty frontend pages, frontend handoffs, `docs/architecture/DECISIONS.md`, and `docs/reference/README.md`. Do not edit or stage those files. Publish backend responses in `BACKEND_CONTRACTS.md`.
- Use English in all authored code, tests, documentation, and reports. Do not expose secrets, change global tooling, stop shared services, provision resources, or deploy. Render key setup is deferred by the owner.
- Tests may use unique temporary schemas in the explicitly selected local `cluenite` database. No production database or real provider mutation is authorized by this plan.

## Confirmed remaining issues

An independent read-only review identified a late-refresh revocation race and post-stop worker resurrection, raw rejected command text in persisted summaries, missing retention/deletion operation, and missing HTTP admission controls. Source inspection also found browser OAuth errors returning raw JSON and default request logging of callback query strings. Address these before repeating broad checks.

## Task 1: Browser OAuth outcomes

Files: `apps/server/src/auth/routes.ts`, a focused OAuth presentation helper, `apps/server/src/index.ts` auth-disabled fallbacks, and auth/HTTP tests.

- [x] Add regressions for HTML navigation success and each REQ-FE-005 failure, JSON compatibility, state-cookie clearing, no token/code reflection, unavailable configuration, and rejected state before token exchange.
- [x] Redirect HTML clients only to the configured origin's `/connect?result=connected|denied|invalid|state_rejected|unavailable|exchange_failed`. Preserve existing JSON status/error contracts and success behavior for API clients. Use no-store responses and a safe referrer policy on the auth navigation response.
- [x] Record exact result codes, content negotiation, and frontend responsibilities in the backend handoff. Query results are presentation hints; `/api/me` remains the authentication authority.
- [x] Run focused configuration/auth/HTTP checks and record red-to-green evidence.

## Task 2: Authorization generation and worker lifetime

Files: `apps/server/src/auth/sessionStore.ts`, `apps/server/src/twitch/connectionManager.ts`, auth/provider lifecycle tests.

- [x] Reproduce a deferred refresh completing after disconnect and deferred validation completing after `stopUser()`.
- [x] Separate new OAuth authorization from conditional refresh persistence. Refresh must update only the still-active credential generation and must never clear revocation or restore membership.
- [x] Recheck worker identity/stopped state after asynchronous validation, refresh, and subscription boundaries. Stale work must neither create sockets nor revoke a newly authorized account.
- [x] Verify reauthorization, reconnect, revocation, and shutdown regressions with network-free fake provider boundaries and isolated PostgreSQL persistence where needed.

## Task 3: Data minimization and lifecycle

Files: `apps/server/src/db/roundRepository.ts`, bounded maintenance helpers, applicable schema/migrations only if required, repository/maintenance tests, and an operator guide.

- [x] Prove that unrelated or rejected commands can persist an arbitrary private marker before the fix.
- [x] Persist only sanitized command category/result metadata for new receipts; retain the payload fingerprint for exact retries. Do not weaken active-session deduplication or provider fencing.
- [x] Supply a documented, explicit retention/deletion mechanism with preview and application modes, transaction boundaries, active-session and co-op partner protection, repeat execution, and an operational owner. Keep current-session proof and idempotency receipts together.
- [x] Verify boundary ages, cascading cleanup, published versus pending delivery, and protected active/partner records in isolated schemas. Never execute deletion against the shared application schema or a remote database during this task.

## Task 4: HTTP admission and safe diagnostics

Files: `apps/server/src/index.ts`, focused HTTP guard/logger helpers, config/HTTP tests, and deployment configuration only when a verified proxy setting is necessary.

- [x] Add bounded early OAuth/API request admission and an explicit small request-body limit; prevent forwarding headers from bypassing the configured trust boundary. Preserve health and static asset delivery.
- [x] Prove that threshold excess does not invoke another provider call and returns stable 429/retry metadata. Limit in-memory key growth.
- [x] Remove credentials, callback query values, cookies, and raw request bodies from request logs. Verify redaction with distinctive synthetic secret markers.
- [x] Use current installed framework contracts and official platform documentation for proxy behavior; avoid broad proxy trust or extra dependencies without need.

## Task 5: Predeploy handoff and final evidence

CI follow-up: the first Linux run passed all assertions but exposed an HTTP shutdown timeout. Reproduced the active-WebSocket deadlock locally, moved shutdown before HTTP drain, bounded owned TCP cleanup, and added a narrow independent review. This extends the existing reliability gate without changing the deployment/frontend boundary.

Files: backend-owned operations/config helpers as needed, server package scripts, `apps/server/README.md`, `BACKEND_CONTRACTS.md`, `BACKEND_PROGRESS.md`, and a dated predeploy report.

- [x] Provide a non-mutating production configuration check that reports missing/invalid variable names without printing values, opening a network connection, or running migrations.
- [x] Document production startup/migrations, retention, health, recovery, stable secrets, provider registration, and the exact remaining owner actions. Identify deferred P2 functionality and frontend work separately from backend defects.
- [x] Run the focused regressions, full local PostgreSQL suite, backend typecheck/build/lint, and relevant workspace integration checks against the actual source. Do not attribute Haiku's visual/browser verification to this pass.
- [ ] Perform one bounded independent review of the final risky changes, resolve confirmed findings, and verify the actual final state. Publish only an explicit backend allowlist if committing; preserve Haiku's index/worktree changes.
- [ ] Stop before deployment. Report local code readiness separately from missing real Twitch credentials, real-account/OBS acceptance, and remote deployment evidence.
