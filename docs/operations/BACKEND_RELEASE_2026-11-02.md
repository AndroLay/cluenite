# Backend release record - 2 November 2026

**Decision: NOT READY** for full live Twitch production acceptance. The initial Render backend deployment is live and its public HTTP/browser/private-database checks pass. Completed production account authorization, live gameplay/OBS/co-op and broader recovery/player acceptance remain open.

## Subsequent backend verification

Recorded 3 November 2026 WITA / 2 November 2026 UTC. This section supersedes the initial deployment's proxy, backup and load gaps below. The ongoing frontend working tree is excluded from this backend release.

- **Published/deployed source:** `8f06482d8e0303f9b892e536bf02520f41e6207b`, branch `deploy/backend-2026-11-02`, draft [PR #1](https://github.com/AndroLay/cluenite/pull/1). [Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41484184252) passes 152 tests in 28 files plus typecheck/build/lint. Render deploy `dep-dbkbs8ijnfac73a6eub0` reached `live` at `2026-11-02T16:46:29Z` on the existing service/database and approved plans.
- **HTTP admission:** the Render-only limiter uses a validated single `CF-Connecting-IP` from a private immediate peer; `trustProxy` remains disabled and caller `X-Forwarded-For` does not select the budget. Ordinary/non-Render callers retain peer-based limits. This trusts the private workspace boundary rather than proving cryptographic edge provenance. Twelve new regressions cover the boundary. The live canary confirms 20 OAuth redirects followed by 429 on request 21, while varying forged XFF has no effect; a forged CF header is rejected with 403 by the edge. Runtime logs confirm the validated Render-edge source without printing addresses.
- **Bounded smoke load:** `2026-11-02T16:48:49Z`–`16:53:49Z`, 753/753 HTTP requests returned 200, maximum four probe requests in flight; all 384 signed-out socket attempts were rejected as expected, maximum eight concurrent. Cases p95 was 91.2 ms; readiness p95 111.6 ms. This five-minute read-only exercise does not establish an authenticated viewer limit, saturation capacity or live Twitch throughput.
- **Logical restore:** the completed `2026-11-02T16:16Z` production export was restored into a separate loopback-only PostgreSQL 18.6 cluster. Five migrations, 13 tables and 14 validated foreign keys pass readback; gameplay/account tables were empty. The restore command took 714 ms; the temporary cluster was stopped. Production and the existing local cluster were unchanged. Managed cloud PITR and live application rollback have not been rehearsed.
- **Twitch configuration:** the existing application's production callback was saved successfully in the main Zen profile, preserving the local callback and existing credentials. Completed production owner OAuth and live chat/OBS/co-op remain pending.

Ignored evidence: `.cache/render-edge-canary-result.json`, `.cache/render-capacity-probe-result.json`, `.cache/render-restore-drill-result.json`. Backup URLs, archives, credentials and database connection strings are not included in this document.

## First Render deployment

**Date:** 3 November 2026 WITA / 2 November 2026 UTC. **Operational owner:** AndroLay. The owner explicitly approved web compute at $7/month plus database compute at $6/month and selected the free `onrender.com` address. Cloudflare setup and domain purchases are excluded from this rollout. Usage/workspace/tax charges remain separate from that base estimate.

| Target | Verified state |
| --- | --- |
| Public URL | https://cluenite-app.onrender.com |
| Service | `srv-dbkb33mc6qcc73e2in7g`, `cluenite-app`, Singapore, Node 22, one `0.5c-512mb` instance |
| Source | `fab7f99aa1ef10358915c42fc1ab75e8120e7349`, pinned branch `deploy/backend-2026-11-02`; [exact passing CI](https://github.com/AndroLay/cluenite/actions/runs/41445736060) |
| Deploy | `dep-dbkb346c6qcc73e2iptg`, terminal state `live`, completed `2026-11-02T15:52:54Z` |
| Deploy policy | Manual, `autoDeployTrigger: off`; readiness `/health/ready` |
| Database | `dpg-dbkb14942hec73f5kcng-a`, `cluenite-db`, Singapore, `0.1c-256mb`, PostgreSQL 18, 1 GB, disk autoscaling off |
| Database ingress | External allowlist exactly `[]`; the application uses the internal connection string |
| Private readback | Job `job-dbkb9e0ae00c738cmv80` succeeded; PostgreSQL `18.6`, migration count `5`, latest `0005_processed_input_fingerprint` |
| Recovery | Managed PITR `AVAILABLE`, recovery window begins `2026-11-02T16:00:01Z`; no restore rehearsal is claimed |

Creation used Render's API because the connector cannot express both the private database ingress and HTTP readiness settings. The reviewed Blueprint remains the configuration reference; no remote Blueprint auto-sync was created. App signing/encryption keys were supplied privately from the validated existing configuration and were not regenerated. `RENDER_API_KEY` was used locally for tooling, not added to application runtime variables. Local `.env`, local accounts/sessions and running development processes were preserved. Current frontend integration/design files were not committed or deployed.

**Remote checks, 15:58 UTC:** all ten groups pass: HTTPS liveness/readiness, English HTML, referenced production CSS/JS, five public deep links, signed-out private API rejection/no-store, missing API/asset JSON 404, three authored cases, exact production OAuth redirect/secure state cookie, and WebSocket authorization rejection. The anonymous Node socket probe was corrected to send the browser Origin header and to recognize the server's intentional signed-out handshake rejection; origin/auth protection was preserved.

**Browser checks:** eight anonymous page/viewport checks pass for `/`, `/play`, `/guide` and `/setup` at 390 and 1280 px in an owned headless Chrome. No horizontal overflow or page script errors. This verifies the deployed older frontend, not the uncommitted Opus design or signed-in gameplay.

The hosted SQL connector correctly refuses this database's empty external allowlist. Instead, the readback job used one internal connection and `BEGIN READ ONLY`, printing only server version and migration summary. No account/game/schema writes or public ingress changes were made. A temporary Render log-query 503 recovered on retry; the migration summary was then read successfully.

At the first checkpoint, the export request had only been accepted with HTTP 202 and the `16:15:58Z` readback listed no artifact. The completed export and local restore are recorded in the subsequent verification above.

A quiet ten-minute Render sample showed roughly 102–108 MiB service memory, one instance and 2–3 database connections. This is an idle/smoke observation, not sustained concurrency or production capacity certification. One-off verification compute is billed for its short execution at the approved service size.

**Twitch boundary:** the configured callback is `https://cluenite-app.onrender.com/api/auth/twitch/callback`. OAuth start reaches Twitch in an anonymous browser, but does not complete owner consent or establish the app console's registered callback list. The current native/browser control bridge is unavailable and no existing browser debugging endpoint was found. No owner cookies were extracted, production login fabricated, or local authorizations copied. Completion requires access to the existing signed-in Twitch developer/account session, then real production OAuth/chat/proof/OBS and partner checks.

Detailed one-shot reports remain in ignored `.cache/`: `render-deployment-state.json`, `render-public-probe-result.json`, `render-browser-probe-result.json` and `render-twitch-redirect-probe-result.json`. They contain no credential values or private connection strings. Later local state does not change the exact deployed source above.

## Earlier checkpoints

The following dated observations predate the initial deployment. Statements about missing resources or deferred access below retain their historical scope.

**Render access verified, 15:30 UTC:** the owner saved `RENDER_API_KEY` privately. A direct authenticated API check returns HTTP 200 and confirms access to the previously selected Andro's workspace. Current workspace inventory contains no Cluenite service or PostgreSQL database. Render's non-mutating Blueprint validation returns HTTP 200 and `valid: true` after replacing automatic generation of the three application keys with `sync: false`. Existing privately stored keys pass production configuration/key-format validation with the candidate HTTPS origin/callback; the local `.env` and running services were not changed. This is syntax/key-format evidence, not assigned-hostname, remote database or runtime acceptance.

The reviewed first backend deployment source is published `fab7f99`; `32ff3f4` is a deployment-code-equivalent documentation descendant. Current uncommitted Opus/frontend integration work is excluded from that source choice and must not be silently published. The prepared target remains `cluenite-app` (`0.5c-512mb`) plus `cluenite-db` (`0.1c-256mb`, PostgreSQL 18, private ingress) in Singapore, manual deploys, HTTP readiness `/health/ready`. [Current Render pricing](https://render.com/pricing), checked directly on 2 November, lists $7/month for this web compute and $6/month for this database compute, with 1 GB database storage included; additional storage/usage, workspace fees where applicable, and taxes are outside that $13 base estimate. No paid resources, remote configuration changes, commits or deployments were made in this access-validation pass. Confirm the paid rollout before crossing the owner's previous predeployment boundary.

**Earlier scope and evidence, 11:31 UTC:** backend source [a67f241](https://github.com/AndroLay/cluenite/commit/a67f2411a5f41f54383eda681b21adf1b4200721) is published privately with **125 local tests in 24 files**, server typecheck/build, zero-warning changed-file lint, and 14 passing real runtime readback checks. Its [Linux CI passes](https://github.com/AndroLay/cluenite/actions/runs/41438367754), including frozen install, workspace typecheck/production build, PostgreSQL tests, and lint. Additive session discovery and username invitations close backend REQ-FE-006 and support [the simpler setup handoff](../agent-handoff/BACKEND_SIMPLE_SETUP.md). Existing advanced controls, current primary/secondary gameplay, authorization, and frontend ownership are preserved. No migration, dependency, credential rotation, foreground interaction, or deployment is introduced. Frontend wiring/acceptance and production/remote gates remain open; these APIs do not certify a finished host interface.

**Earlier scope and evidence, 10:52 UTC:** the owner limited this task to work before deployment, with frontend implementation owned by Haiku and no foreground-window interference. Backend source [a2a581f](https://github.com/AndroLay/cluenite/commit/a2a581f6f32a1bebd8d9bf1fac591a68b2fd3548) has [passing Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41424727516) and 113 local tests/23 files. Real operator-triggered and accelerated scheduled refresh, post-refresh chat/proof, Q01 reveal in actual OBS, two-channel C01 proof/final reveal, secondary revoke/reauthorize/rejoin, and solo-owner revoke/pause/resume now pass. Sixteen final readback checks confirm healthy persisted authorization/subscriptions and cleaned test state. See [backend progress](../agent-handoff/BACKEND_PROGRESS.md) for artifacts, cleanup, preserved failed assertions, and observation boundaries. Natural expiry, actual provider-directed handoff/denied consent, player feedback, frontend acceptance, and remote acceptance remain separate. Initial inventories and earlier source/test checkpoints below are dated history.

**Latest hardening evidence, 12:37 UTC:** backend source [fab7f99](https://github.com/AndroLay/cluenite/commit/fab7f99aa1ef10358915c42fc1ab75e8120e7349) is published with [passing Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41445736060), **140 local tests in 27 files**, server typecheck/build, zero-warning changed-file lint, and independent review. [Resource limits](BACKEND_RESOURCE_LIMITS.md) bound HTTP/readiness/socket/Twitch work, reduce idle polling, and cancel stalled PostgreSQL work while preserving startup migration budgets. Twelve actual-account readback checks pass after the hidden owned API reload. An isolated authenticated 480-request burst returns 96 early 503s; every retried read succeeds, the pool stays at 10 connections, and liveness remains healthy. Source and evidence exclude Haiku frontend, deployment, actual game commands, and credential rotation. These are local short-burst/recovery checks, not measured sustained Render capacity.

## Historical predeployment scope and target

The user authorized backend completion through deployment, a new private GitHub repository, Andro's Render workspace, and creation of a Twitch developer application using their Zen browser. Operational owner: **AndroLay**.

| Surface            | Intended target                                                           | Observed state                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source             | Private [AndroLay/cluenite](https://github.com/AndroLay/cluenite), `main` | Backend source [fab7f99](https://github.com/AndroLay/cluenite/commit/fab7f99aa1ef10358915c42fc1ab75e8120e7349) is published; [its exact Linux CI run](https://github.com/AndroLay/cluenite/actions/runs/41445736060) passes clean-checkout verification. The earlier release evidence below is historical. |
| Render workspace   | Andro's workspace, `tea-d3akn7ruibrs73ccv4ig`                             | Confirmed by the user; no Cluenite service or PostgreSQL instance existed at the release inventory check. Unrelated services are outside scope.                                                                                                                                                            |
| Web service        | `cluenite-app`, Singapore, `0.5c-512mb`, one instance                     | Defined in `render.yaml`; no service ID, deploy ID, or public URL has been assigned.                                                                                                                                                                                                                       |
| Database           | `cluenite-db`, PostgreSQL 18, Singapore, `0.1c-256mb`, 1 GB               | Defined with `ipAllowList: []`; no production database or applied remote migrations are claimed.                                                                                                                                                                                                           |
| Twitch application | Cluenite, exact assigned production callback                              | Owner registered the app and saved validated credentials privately. Local OAuth passes; the actual production HTTPS callback remains later deployment configuration.                                                                                                                                       |

`https://cluenite-app.onrender.com` in the Blueprint is the requested origin, not an assigned or verified address. Replace it if Render assigns another hostname, then register that exact origin's `/api/auth/twitch/callback` with Twitch.

## Implemented release changes

The publication follow-up also reconciles the 18-entry v3 UI inventory and route mapping, preserves earlier frontend evidence, and translates the remaining preview reset label to English. It does not implement new UI flows.

- Production configuration rejects HTTP origins and callbacks at another origin or path. Local split-origin Vite/API development remains supported.
- The SPA fallback serves public deep links while `/api`, `/api/*`, `/health/*`, and `/assets/*` preserve JSON 404 behavior for missing routes. The integrator reviewed the frontend's cross-owner fallback change and added the `/api` regression.
- The HTTP integration fixture uses a temporary local PostgreSQL schema and an owned random-port Node process. It verifies readiness, signed-out rejection, public deep links, built CSS, missing-route handling, and listener shutdown before schema deletion. It does not use port `10000`.
- Node 22 bounds, pinned pnpm 12.16.1, the direct Tailwind dependency, frozen lockfile, Vue browser globals, and test discovery exclusions are reconciled.
- GitHub CI builds before running PostgreSQL integration tests. Its PostgreSQL 18 service and credentials are disposable CI fixtures. Official checkout/setup-node actions are pinned to release commits.
- The Blueprint uses the supported `postgresMajorVersion` field, explicit storage, private DB ingress, manual deploys, `/health/ready`, Node 22, and generated application keys. Build installation explicitly retains development tools needed to compile the workspace.

No authentication bypass, simulated production Twitch identity, or gameplay/schema incompatibility was introduced.

## Verification evidence

All local results below are from 2 November 2026. Captured logs and disposable fixtures remain ignored under `.cache/`; they are not release secrets or source artifacts.

| Check                               | Result and boundary                                                                                                                                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production configuration regression | Observed failures before the fix, then 10 passing configuration tests. Local split-origin behavior remains covered.                                                                                                                                             |
| Missing `/api` regression           | Observed HTML 200 before the fix, then JSON 404 after it.                                                                                                                                                                                                       |
| Full local suite                    | 70 tests across 17 files pass, including real local PostgreSQL persistence, auth, realtime, migration, leader, and HTTP fixtures. Twitch HTTP/WebSocket boundaries are mocked.                                                                                  |
| Workspace typecheck and build       | Pass for the current source.                                                                                                                                                                                                                                    |
| ESLint                              | `npm run lint -- --quiet` passes with zero errors; this does not claim zero warnings.                                                                                                                                                                           |
| Clean production installation/build | Pinned pnpm frozen install with `NODE_ENV=production` and `--prod=false`, then web/server build, both exit 0 in an isolated copy without the existing `node_modules`.                                                                                           |
| Fresh Vite dependency resolution    | CSS request returns 200 from the clean installation without a Tailwind alias. This is a CSS compilation check, not complete development-browser acceptance.                                                                                                     |
| Blueprint validation                | Passes structural validation against the current [Render JSON Schema](https://render.com/schema/render.yaml.json), draft 2020-12. Resource creation and account-specific plan availability remain untested.                                                     |
| Built public browser routes         | Signed-out Chrome checks `/guide`, `/settings`, `/setup`, and `/coop` at 390 and 1280 px: eight HTTP 200 results, English HTML, no horizontal overflow or page script errors.                                                                                   |
| Phone header targets                | Every header link measures at least 44 px high at 390 px against the current built application. This closes the stale-build measurement gap from the frontend handoff; it does not change the shared listener.                                                  |
| Independent source review           | Bounded read-only review of release configuration, HTTP/config tests, manifests, lockfile, and CI. Unsupported Blueprint version field fixed; direct Node fixture ownership uses a Windows-compatible file URL. Not a full audit of all earlier implementation. |

The browser check does not verify signed-in workflows, inline guide link target sizing, image contrast, all keyboard stops, full visual fidelity, real Twitch chat, two broadcaster channels, or OBS Studio. The existing process on port `10000` was not stopped or replaced. No frontend Slice E completion beyond the measured checks is implied.

## Remaining release gates

Source/CI, paid-resource authorization, actual service/database creation, the assigned HTTPS origin, private ingress, migrations, readiness, public assets/API boundaries and signed-out Socket.IO/browser acceptance are verified for the initial deployment above.

1. Complete owner production OAuth using the existing Twitch application and saved production callback. Main Zen access successfully saved the callback, but authorization completion is not yet verified. Do not repeat app registration/MFA or rotate existing secrets.
2. Verify production chat → persisted proof → actual OBS reveal, token/revocation/recovery and two-channel co-op on the deployed origin. Historical local checks do not substitute for target acceptance. Preserve ongoing local sessions when planning those tests.
3. Preserve the verified logical-export/local-restore path; rehearse live application rollback and cloud PITR before relying on them. The edge/IP canary and five-minute smoke load pass; authenticated capacity and saturation remain unmeasured.
4. Finish current frontend/player/accessibility acceptance with Opus, then publish a separately reviewed source commit and deploy it deliberately. The initial backend branch excludes those uncommitted changes.

## Rollout, recovery, and stop conditions

The first deploy `dep-dbkb346c6qcc73e2iptg`, source `fab7f99aa1ef10358915c42fc1ab75e8120e7349`, remains a prior application rollback artifact. The later verified live source is `8f06482`. Keep the database and encryption/signing keys stable. A subsequent deploy and isolated logical restore pass; live rollback and cloud PITR remain untested.

Migrations run before listening and are transactional/additive in the current implementation. Application rollback does not undo database writes. Do not drop production tables or regenerate the encryption key for recovery. Before subsequent migrations, refresh the backup/restore evidence and verify compatibility with the prior application version. The export used for the local restore contained no production player data; the bounded smoke load does not establish player capacity.

Monitor Render deploy/build/runtime events and `/health/ready`; use authenticated `/api/ops/diagnostics` for participant-scoped session, outbox, and connection state. Do not log provider tokens or chat bodies. Incident ownership remains AndroLay; no external alert delivery or on-call integration is claimed.

Stop if workspace/repository identity differs, the database would be public, required real credentials are absent, production configuration fails, CI fails, migrations fail, readiness fails, or the deployed source differs from the verified commit. Do not claim production acceptance until the required remote and real-account gates pass.
