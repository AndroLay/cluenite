# Run Cluenite locally

This guide runs the current application. The earlier gameplay-debate workflow is preserved in [the history archive](docs/history/gameplay-debate-workflow.md).

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
| `/play`                                   | Loads case metadata, checks host sign-in, and creates non-co-op sessions. |
| `/guide`, `/settings`                     | Player guide and browser-local settings.                                  |
| `/dashboard`                              | Host overview; not a persisted session-history browser.                   |
| `/setup`, `/coop`                         | OBS/co-op guidance and current limitations.                               |
| `/?view=quick`                            | Local A Missing Manuscript sample; no server proof validation.            |
| `/?view=mystery`                          | M01 visual sample; no live chat commands.                                 |
| `/?session=<id>&view=dashboard`           | Host panel for a real, authorized session.                                |
| `/?session=<id>`                          | Investigation presentation selected from the server's case mode.          |
| `/?mode=obs&session=<id>#overlay=<token>` | Read-only overlay; requires a valid scoped token.                         |

When the signing/encryption keys are missing, host APIs are disabled and `/api/cases` is not registered. The landing page and samples remain independent of host login. With keys present but no Twitch application, OAuth returns `503 twitch_oauth_not_configured`.

## Enable real Twitch

Set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI` together, plus `SESSION_SIGNING_SECRET`, `DATA_ENCRYPTION_KEY`, and `OVERLAY_TOKEN_SIGNING_KEY`. Signing secrets must each be at least 32 UTF-8 bytes; use cryptographically random values. `DATA_ENCRYPTION_KEY` must be canonical base64 encoding of exactly 32 bytes. Keep `TWITCH_ADAPTER=twitch`.

For the default local API, register the exact callback `http://localhost:10000/api/auth/twitch/callback`. Restart the relevant development process after changing environment settings. Sign in from `/play`, select a non-co-op case, and use Start in the host panel to activate the created round.

OBS credential issuance and co-op invitations are implemented in the API but have no complete web UI. Use the [actual API contract](docs/agent-handoff/BACKEND_CONTRACTS.md) for authorized manual integration. `CLUENITE_DEV_CONTROLS` does not provide an authentication bypass or host-bootstrap route.

## Verification commands

```powershell
npm run typecheck
node_modules\.bin\vitest.cmd run tests/engine tests/web tests/server --reporter=dot
npm run build
npm run lint
```

Run `npm run build` before `npm test`: the HTTP integration fixture serves the actual web build. `npm test` additionally includes PostgreSQL integration tests. Read [CONTRIBUTING.md](CONTRIBUTING.md) before running them against a selected database. Browser tests need an installed Chrome channel and free fixture ports; see [tests/e2e/README.md](tests/e2e/README.md).

The web package now declares its direct `tailwindcss` import. The 2 November release checks use a clean frozen install and verify production compilation and Vite CSS delivery without a temporary alias. See the [backend release record](docs/operations/BACKEND_RELEASE_2026-11-02.md) for evidence and deployment requirements.
