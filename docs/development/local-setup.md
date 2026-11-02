# Run Cluenite locally

This guide runs the current application. The earlier gameplay-debate workflow is preserved in [the history archive](../history/gameplay-debate-workflow.md).

Run commands from the repository root. For a private checkout, GitHub access to `AndroLay/cluenite` is required. If you only need the frontend practice experience, see the frontend-only command below; live account/session functions need the backend.

## Prerequisites

- Node.js 22.12+ in the Node 22 line; pnpm 12.16.1 is pinned in `package.json`.
- A reachable development PostgreSQL database.
- A Twitch application and an authorized broadcaster account for real host login and chat. Local visual samples do not need Twitch.

```powershell
npx --yes pnpm@12.16.1 install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Keep existing `.env` values. Configure secrets locally; do not paste them into documentation, terminal output, or chat.

## Database

Set `DATABASE_URL` to the local database you intend to use. The API applies additive migrations before listening. A fresh checkout does not include PostgreSQL binaries, database files, or initialized users.

If this workspace already has the documented local PostgreSQL 18.6 installation, start it with:

```powershell
& '.local\postgresql\18.6\pgsql\bin\pg_ctl.exe' -D '.local\postgresql\data' -l '.local\postgresql\postgres.log' -o '-h 127.0.0.1 -p 5432' start
```

Only stop an instance you started and that is no longer needed by another process:

```powershell
& '.local\postgresql\18.6\pgsql\bin\pg_ctl.exe' -D '.local\postgresql\data' stop -m fast
```

## Environment and startup

The default development API port is `10000`; Vite normally uses `5173`. `PUBLIC_ORIGIN` must exactly match the browser origin, including scheme, hostname, and port. `localhost` and `127.0.0.1` are different origins.

```powershell
npm run dev
```

Open the Vite address that matches `PUBLIC_ORIGIN`, normally `http://localhost:5173`. Check the API at `http://localhost:10000/health/live` and `/health/ready`. Readiness checks the database; it does not establish Twitch connectivity.

For separate processes, run `npm --prefix apps/server run start` and `npm --prefix apps/web run dev`. Both `/api` and `/socket.io` use the same Vite proxy target. To use another API port, set the matching server `PORT` and set this in the frontend terminal before launch:

```powershell
$env:CLUENITE_API_PORT='10001'
npm --prefix apps/web run dev
```

`CLUENITE_API_PORT` is read from the shell environment, not from `.env`. Check the actual process/version at a port before treating it as the current backend. `LOG_LEVEL` is present in the environment template but is not currently consumed by the server logger configuration.

## Samples and live routes

| Address                                   | Current behavior                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                       | Public landing page.                                                      |
| `/play`                                   | Practice selection, authored case metadata, saved sessions and non-co-op creation. |
| `/play#practice`                          | Three local scripted practice cases; no Twitch account needed to play.   |
| `/preview/gallery`, `/preview/festival`, `/preview/signal` | Public metadata previews with no live commands; catalog API required. |
| `/practice/express`                       | Pearls on the Night Express: pinboard deductions and a scored reveal.    |
| `/practice/lighthouse`                    | The Lighthouse Went Dark: card trading with a scripted Station B.       |
| `/guide`, `/settings`                     | Player guide and browser-local settings.                                  |
| `/dashboard`                              | Main menu, account state and persisted session continuation.              |
| `/setup`                                  | Select a saved session and explicitly create/copy/replace/revoke its private OBS credential. |
| `/coop`                                   | Create/select a C01 lobby and invite a partner by Twitch username.         |
| `/coop/invite?invite=<id>#token=<token>`   | Explicit partner consent; validated same-tab continuation survives OAuth/reload for up to 20 minutes. |
| `/connect`                                | Confirm account state and continue a pending invitation after sign-in.    |
| `/?view=quick`                            | Local A Missing Manuscript sample; no server proof validation.            |
| `/?view=mystery`                          | M01 visual sample; no live chat commands.                                 |
| `/?session=<id>&view=dashboard`           | Host panel for a real, authorized session.                                |
| `/?session=<id>`                          | Investigation presentation selected from the server's case mode.          |
| `/?mode=obs&session=<id>#overlay=<token>` | Read-only overlay; requires a valid scoped token.                         |

When the signing/encryption keys are missing, host APIs are disabled and `/api/cases` is not registered. The landing page and samples remain independent of host login. With keys present but no Twitch application, OAuth returns `503 twitch_oauth_not_configured`.

## Enable real Twitch

Set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI` together, plus `SESSION_SIGNING_SECRET`, `DATA_ENCRYPTION_KEY`, and `OVERLAY_TOKEN_SIGNING_KEY`. Signing secrets must each be at least 32 UTF-8 bytes; use cryptographically random values. `DATA_ENCRYPTION_KEY` must be canonical base64 encoding of exactly 32 bytes. Keep `TWITCH_ADAPTER=twitch`.

For the default local API, register the exact callback `http://localhost:10000/api/auth/twitch/callback`. Restart the relevant development process after changing environment settings. Sign in from `/play`, select a non-co-op case, and use Start in the host panel to activate the created round.

OBS credentials are available in Stream setup and the live host panel. Copy the private link into an OBS browser source; the credential is shown only at creation and a replacement invalidates the previous one. For C01, use Co-op to create/select a lobby, copy an invitation and let the named partner accept before starting. Live Field/Records/Shared views use the authenticated team's server projection; station proof/sharing comes from viewer chat. The sessionless `/coop/field`, `/coop/records` and `/coop/shared` pages remain labeled previews.

Read [the integration handoff](../agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) for retries, consent and recovery. `CLUENITE_DEV_CONTROLS` does not provide an authentication bypass or host-bootstrap route. The [API contract](../agent-handoff/BACKEND_CONTRACTS.md) remains the source for advanced integrations.

For frontend-only practice development:

```powershell
npm --prefix apps/web run dev
```

This serves local practice without supplying an API. Account, saved-session and live controls still require the configured backend.

Practice actions remain in the browser; the shell's account check is separate. Express and Lighthouse reset progress and score when replayed or reloaded. They are original public samples, not the persisted Q01/M01/C01 cases.

All three practice cases use a viewport workspace. Manuscript's opening and room fill the available screen beneath translucent controls; open Finds for its object list/Grid/Assist, or Chat for the scripted feed. Case file contains deduction tabs. Command (or `/` outside a text field) opens the composer; Escape closes it. Case options contains sound and restart. The last find moves to the deduction board. Live Q01/M01/C01 use the shared workspace with optional Host controls and existing server commands. These authored cases still require Twitch sign-in and a session; public previews do not start one.

If Play reports another hosted case is open, use the direct Continue link or Saved sessions. The server permits one open hosted case. To switch, enter that session and explicitly Stop it in Host controls, then refresh Saved sessions. Starting another case never stops the previous one automatically.

## Verification commands

```powershell
npm run typecheck
node_modules\.bin\vitest.cmd run tests/engine tests/web tests/server --reporter=dot
npm run build
npm run lint
```

Run `npm run build` before `npm test`: the HTTP integration fixture serves the actual web build. `npm test` additionally includes PostgreSQL integration tests. Read [CONTRIBUTING.md](contributing.md) before running them against a selected database. Browser tests need an installed Chrome channel and free fixture ports; see [tests/e2e/README.md](../../tests/e2e/README.md).

The web package now declares its direct `tailwindcss` import. The 2 November release checks use a clean frozen install and verify production compilation and Vite CSS delivery without a temporary alias. See the [backend release record](../operations/BACKEND_RELEASE_2026-11-02.md) for evidence and deployment requirements.
