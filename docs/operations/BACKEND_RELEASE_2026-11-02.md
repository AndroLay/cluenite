# Backend release record - 2 November 2026

**Decision: NOT READY** for production acceptance. Local implementation checks pass; production configuration and real-account acceptance remain blocked. This record does not claim that Cluenite is deployed.

**Later scope and evidence:** the owner subsequently limited this task to work before deployment, with frontend implementation owned by Haiku and no foreground-window interaction. The owner registered the Twitch app; real local OAuth, 21 authenticated host/overlay checks, one operator-triggered token refresh, and refreshed-credential subscription recovery now pass. The later asset-routing correction passes 111 local tests and 46 background integration checks. Use the [latest predeploy follow-up](BACKEND_PREDEPLOY_2026-11-02.md#background-only-asset-and-recovery-follow-up) and [backend progress](../agent-handoff/BACKEND_PROGRESS.md) for current local evidence; the initial inventory and 70-test record below are dated history. Real post-refresh chat, account revocation/reauthorization, two-channel co-op, actual OBS, and production acceptance remain open.

## Scope and target

The user authorized backend completion through deployment, a new private GitHub repository, Andro's Render workspace, and creation of a Twitch developer application using their Zen browser. Operational owner: **AndroLay**.

| Surface            | Intended target                                                           | Observed state                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source             | Private [AndroLay/cluenite](https://github.com/AndroLay/cluenite), `main` | Backend source [fbc880a](https://github.com/AndroLay/cluenite/commit/fbc880aa9e8f98a1466047de221f8d9416e71bf9) is published with [passing Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41411273671). The earlier release evidence below is historical. |
| Render workspace   | Andro's workspace, `tea-d3akn7ruibrs73ccv4ig`                             | Confirmed by the user; no Cluenite service or PostgreSQL instance existed at the release inventory check. Unrelated services are outside scope.                                                                                                                       |
| Web service        | `cluenite-app`, Singapore, `0.5c-512mb`, one instance                     | Defined in `render.yaml`; no service ID, deploy ID, or public URL has been assigned.                                                                                                                                                                                  |
| Database           | `cluenite-db`, PostgreSQL 18, Singapore, `0.1c-256mb`, 1 GB               | Defined with `ipAllowList: []`; no production database or applied remote migrations are claimed.                                                                                                                                                                      |
| Twitch application | Cluenite, exact assigned production callback                              | Owner registered the app and saved validated credentials privately. Local OAuth passes; the actual production HTTPS callback remains later deployment configuration.                                                                                                  |

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

Source publication and Linux CI are complete for `4696a39`: frozen install, typecheck, production build, 70 tests across 17 files, and lint all pass. The source audit found no current `.env` secret values or selected provider/private-key patterns in 333 candidate files or 171 earlier reachable history blobs. `.env`, local data, generated builds, caches, and the old source ZIP are excluded. This is a bounded exclusion check, not a comprehensive security audit.

1. The owner must save `RENDER_API_KEY` in the ignored `.env` to enable supported API configuration. At the last presence-only check it was absent. The owner subsequently deferred this setup until later; deployment remains pending that owner action. Never paste it into chat or commit it.
2. Before a later authorized deployment, select the reviewed source commit with passing CI and use the latest predeploy evidence. The Twitch app and local consent are complete; do not create another app or repeat credential/MFA setup as a missing prerequisite.
3. Provision only the confirmed Cluenite resources. Configure private DB ingress and HTTP readiness before claiming the target is ready. The connected Render creation tools cannot set both required options; do not use public DB defaults as a workaround.
4. After the actual hostname is assigned, set `PUBLIC_ORIGIN` and `TWITCH_REDIRECT_URI` and register the exact callback. Reuse the privately saved Twitch app settings and keep the three existing application keys stable. Deploy the verified commit with `TWITCH_ADAPTER=twitch` only after deployment is authorized. Do not weaken production startup checks to get a green deployment.
5. Record the service/database IDs, deployed commit, deploy ID, terminal deploy state, and assigned URL. Verify HTTPS `/health/live`, `/health/ready`, migrations, current CSS/deep links, unauthenticated rejection, and Socket.IO on that remote service.
6. With consenting real accounts, verify post-refresh viewer chat -> persisted proof -> OBS reveal, provider revocation/reauthorization, and two-channel co-op. Local OAuth, scoped overlay APIs, and local restart/subscription recovery already have evidence; repeat target-dependent checks on the actual deployed origin later. Full signed-in frontend acceptance remains Haiku's work. Use the [external checklist](../agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md).

## Rollout, recovery, and stop conditions

There is no previous Cluenite production deploy to roll back to. Before the first successful release, correct configuration and redeploy the verified source commit. After the first success, retain its deploy ID and commit as the application rollback target; keep the database and encryption/signing keys stable. Rehearse redeployment and snapshot recovery against the actual target before claiming remote recovery works.

Migrations run before listening and are transactional/additive in the current implementation. An application rollback does not undo database writes. Do not drop production tables or regenerate the encryption key to recover a failed release. Before subsequent migrations, verify a usable database backup/restore path and compatibility with the prior application version. The first database contains no existing production player data; remote restore and load/capacity drills have not been performed.

Monitor Render deploy/build/runtime events and `/health/ready`; use authenticated `/api/ops/diagnostics` for participant-scoped session, outbox, and connection state. Do not log provider tokens or chat bodies. Incident ownership remains AndroLay; no external alert delivery or on-call integration is claimed.

Stop if workspace/repository identity differs, the database would be public, required real credentials are absent, production configuration fails, CI fails, migrations fail, readiness fails, or the deployed source differs from the verified commit. Do not claim production acceptance until the required remote and real-account gates pass.
