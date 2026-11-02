# Deployment

Cluenite runs as one Node web service that serves the built Vue app, HTTP API and Socket.IO, with a private Render PostgreSQL database. The public address is **https://cluenite-app.onrender.com**. The app and database are paid resources already approved by the owner; the onrender.com address and TLS do not require a separate domain purchase.

## Existing resources

| Resource         | Configuration                                                          |
| ---------------- | ---------------------------------------------------------------------- |
| GitHub source    | [AndroLay/cluenite](https://github.com/AndroLay/cluenite), branch main |
| Render workspace | Andro's workspace                                                      |
| Web service      | cluenite-app, Singapore, one 0.5 CPU / 512 MB instance                 |
| Database         | cluenite-db, PostgreSQL 18, Singapore, private ingress, 1 GB storage   |
| Build            | Pinned pnpm frozen install with development tools, then pnpm run build |
| Start            | npm --prefix apps/server run start                                     |
| Health check     | /health/ready                                                          |

[render.yaml](../render.yaml) describes these resources. They were provisioned through the API; editing this file alone does not synchronize existing infrastructure. Avoid creating a second Blueprint stack for the same application.

## GitHub Actions to Render

The [workflow](../.github/workflows/ci.yml) verifies pull requests and main with PostgreSQL tests, typecheck, production build, lint, documentation links. Only successful main runs can deploy. Render platform auto-deploy remains off so it cannot bypass these checks.

GitHub Actions requires these repository settings:

| Name                | Type                     | Value                                          |
| ------------------- | ------------------------ | ---------------------------------------------- |
| RENDER_API_KEY      | Encrypted Actions secret | Owner-provided Render API key; never commit it |
| RENDER_SERVICE_ID   | Actions variable         | srv-dbkb33mc6qcc73e2in7g                       |
| RENDER_WORKSPACE_ID | Actions variable         | tea-d3akn7ruibrs73ccv4ig                       |

The [deployment script](../scripts/deploy-render.mjs) checks the approved workspace, repository, branch and service URL, confirms the tested SHA is still main, reuses an existing matching deploy, and sends an exact commit ID to Render. It waits up to 8 minutes, then checks production readiness, case metadata, signed-out account status and the play page. A failed workflow needs inspection; it does not silently promote another commit.

New deployments stop 10 minutes before the deadline to reserve build and cancellation time. Active deploys are canceled if they exceed the 8-minute polling budget. Automatic deployment is frozen from **2 November 2026 at 22:00 UTC** for hackathon judging. CI continues to verify source, while deployment is skipped. Do not remove the freeze or update submitted artifacts during judging without organizer permission. Keep later development in a separate copy; see [hackathon requirements](hackathon.md).

## Production environment

Store database and Twitch credentials in Render environment settings. Use the internal database URL, NODE_ENV=production, PUBLIC_ORIGIN=https://cluenite-app.onrender.com, TWITCH_ADAPTER=twitch, and the secret formats in [setup](setup.md). Render provides PORT; the server binds to 0.0.0.0. Never send RENDER_API_KEY to the running application.

The confidential Twitch application's OAuth Redirect URLs must contain exactly:

`https://cluenite-app.onrender.com/api/auth/twitch/callback`

Set TWITCH_REDIRECT_URI to that same URL. Broadcasters connect from the live application's Twitch page and explicitly authorize access. Session cookies and provider authorizations are environment-specific; a working local login does not establish production consent.

## Recovery and operations

Startup applies ordered migrations under a PostgreSQL advisory lock before listening. Current migrations are additive. Back up the database before a schema change and never roll back to a binary that cannot read the current schema. Drain old mutation handlers when changing replay semantics.

If a release fails, inspect GitHub Actions and Render events first. Render retains the last successful deployment during a failed build. If a live regression requires rollback before the submission freeze, redeploy a previously verified exact commit through the existing service and recheck readiness, HTTP, login and a representative round. During judging, request organizer permission before modifying submitted artifacts.

GET /health/live establishes process availability; GET /health/ready establishes database access. Neither proves Twitch delivery. Confirm chat listening in the account page and verify a permitted real chat command, persisted progress, reconnect and OBS independently when testing provider integration.

The server uses bounded request/database work, per-peer limits, transactional state, a persisted outbox and recoverable Twitch workers. Scale only after measuring CPU, memory, database pool use and latency; this single-instance configuration is not a claim of unlimited capacity.

Run `pnpm --filter @cluenite/server run preflight` to validate production configuration without connecting. `pnpm --filter @cluenite/server run maintenance` previews bounded retention cleanup. Adding `--apply` deletes eligible records and requires explicit operational authorization. Protect active rounds, preserve backups and keep secrets out of logs.
