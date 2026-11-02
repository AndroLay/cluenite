# Backend server

Fastify serves the API and static web build. Socket.IO shares the same HTTP
server. PostgreSQL stores host accounts, encrypted Twitch tokens, game sessions,
processed inputs, session events, overlay credentials, and the realtime outbox.
The deterministic game rules stay in `packages/engine` and authored case data
stays in `packages/cases`.

Last synchronized: 2 November 2026. Use English for documentation, feedback, authored content, comments, tests, and development instructions. See [local setup](../../HOW_TO_RUN.md), [status](../../docs/STATUS.md), and [API contracts](../../docs/agent-handoff/BACKEND_CONTRACTS.md).

## Local run

1. Start the project-local PostgreSQL service and confirm `.env` points to the
   local `cluenite` database.
2. Leave the Twitch and signing fields blank to run health checks and the
   simulation UI. The server applies pending migrations before it listens.
3. Configure the Twitch fields below to enable OAuth, host sessions, EventSub,
   and OBS credential routes.
4. Run `npm --prefix apps/server run start` or the root `npm run dev`.

The API reports liveness at `/health/live` and database readiness at
`/health/ready`. JSON auth requests return `503` until signing and encryption keys are
present; HTML OAuth navigation redirects to `/connect?result=unavailable`. A real Twitch connection also requires `TWITCH_ADAPTER=twitch` and the
three Twitch application values.

`GET /api/cases` is registered inside the auth-configured module and returns `404` when the signing/encryption keys are absent. `CLUENITE_DEV_CONTROLS` provides no host-login bypass. The web UI does not yet issue OBS credentials or complete co-op invitations.

## Twitch and security settings

- Register the exact callback `http://localhost:10000/api/auth/twitch/callback`
  in the Twitch developer console.
- Set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and
  `TWITCH_REDIRECT_URI` together. OAuth requests only `user:read:chat`.
- In production, `PUBLIC_ORIGIN` must use HTTPS. The callback must use that
  exact origin and `/api/auth/twitch/callback`; update the Twitch application
  registration when the actual Render URL is assigned. Local split-origin
  Vite/API development remains supported.
- `SESSION_SIGNING_SECRET` and `OVERLAY_TOKEN_SIGNING_KEY` must each contain at
  least 32 UTF-8 bytes; use cryptographically random values.
- `DATA_ENCRYPTION_KEY` must be canonical base64 encoding of exactly 32 bytes.
- Keep these values in `.env`; never commit or send them in chat. Do not use
  `TWITCH_ADAPTER=simulation` to claim a live Twitch connection.
- Host mutations require the session cookie, same-origin `Origin`, and the
  `x-csrf-token` returned by `GET /api/me`. Session creation and controls also
  require an `Idempotency-Key` header.

The host session cookie is HttpOnly, SameSite=Lax, and Secure under HTTPS.
Twitch access and refresh tokens use AES-256-GCM at rest. Host cookies and OBS
credentials are random opaque values; PostgreSQL stores keyed hashes only. OBS
links carry the scoped bearer in the URL fragment, and OBS connections can only
read their own session projection. Creating a new overlay credential revokes
the previous one; revoke it with `DELETE /api/sessions/:id/overlay-credential`.
`POST /api/auth/twitch/disconnect` attempts Twitch token revocation, clears the
local encrypted credentials, revokes overlays and co-op membership, and pauses
the broadcaster's active sessions.

## HTTP API

- `GET /api/cases`: public case metadata for Q01, M01, and C01.
- `GET /api/ops/diagnostics`: authenticated, participant-scoped connection,
  session revision, pending outbox, and database health diagnostics.
- `GET /api/auth/twitch/start` and `/api/auth/twitch/callback`: OAuth login.
- `GET /api/me` and `POST /api/auth/logout`: host profile, CSRF token, logout.
- `POST /api/auth/twitch/disconnect`: revoke provider access and local credentials.
- `POST /api/sessions`: create a pinned Q01, M01, or C01 session.
- `POST /api/coops/invitations`: invite the named broadcaster to a waiting C01.
- `POST /api/coops/invitations/:id/accept|decline`: accept or decline as the
  named, OAuth-authenticated broadcaster. Invitations expire after 24 hours.
- `POST /api/coops/sessions/:id/rejoin`: restore a previously accepted C01
  partner after Twitch authorization is renewed.
- `GET /api/sessions/:id/snapshot`: host or scoped overlay snapshot.
- `POST /api/sessions/:id/start|pause|resume|restart|stop`: host controls.
- `POST /api/sessions/:id/overlay-credential`: issue a one-time OBS URL.
- `DELETE /api/sessions/:id/overlay-credential`: revoke active OBS URLs.

Viewer commands enter only through Twitch EventSub. The web dashboard socket
commands are restricted to the authenticated host and never count as viewer
contributions. EventSub message IDs and canonical Twitch message IDs are
deduplicated transactionally with each game transition.

Socket.IO joins are authorized against the host session or scoped overlay
credential. Committed outbox rows publish team-filtered `session:delta` events
with contiguous revisions, changed snapshot fields, and the persisted event ID.
Clients ignore stale revisions and request `session:resync` after a gap; the
server reports the missing and current revision, and the client fetches its
authorized REST snapshot. `connection:status` reports the Twitch worker state
to joined host and overlay clients. Full `session:snapshot` broadcasts remain
available while existing clients migrate to deltas.

Stopping a round with no investigation records `CANCELLED`; stopping after
accepted evidence or analysis records `PARTIAL`. Neither state reveals the
case solution or presents an incomplete run as a successful solve.

Socket handshakes require the configured origin, with an exact same-origin `Referer` fallback only when `Origin` is absent. Optional socket keys support exact retries; the current web round client omits them and uses non-retry-safe compatibility handling.

## Verification

For the current predeploy implementation, production preflight, HTTP admission, data retention/account deletion, and remaining remote gates, use the [predeploy operations guide](../../docs/operations/BACKEND_PREDEPLOY_2026-11-02.md). `npm --prefix apps/server run preflight` validates configuration without connecting to a service. `npm --prefix apps/server run maintenance` previews bounded cleanup; only `--apply` deletes eligible data. Never treat a local configuration check as a deployed acceptance result.

Run `npm run build` before `npm test`, which includes unit tests plus PostgreSQL integration tests. The HTTP fixture starts an owned random-port server and checks database readiness, signed-out rejection, English SPA deep links, current CSS, and JSON 404 responses for missing API, health, and asset paths. `GET /api` does not fall back to the HTML application.

Static assets are resolved at request time, so a frontend rebuild can add new hashed filenames without restarting the API. The HTTP regression fixture creates and removes only its own uniquely named asset after startup. Missing assets retain JSON 404 responses; they do not receive the application shell. This follows the plugin's [wildcard routing behavior](https://github.com/fastify/fastify-static#wildcard).

Before the full database suite, stop only the selected, owned API if it uses the real Twitch adapter, then restore it afterwards. PostgreSQL advisory locks are shared across schemas in a database: a live EventSub leader prevents the isolated election fixture from acquiring the same lock. The suite does not stop development servers automatically. Schema isolation still protects application data; it does not partition advisory locks.

The current
backend covers the deterministic Q01 Quick Case proof path, M01 Mystery Live
event order and verdict checks, and C01's two-broadcaster scan, verify, shared
evidence, and joint proof. Database
integration tests create a unique temporary schema inside the local `cluenite`
database and drop only that schema on completion. The fixture rejects remote hosts and other database names. The tests use mocked Twitch
HTTP and WebSocket boundaries. Real broadcaster OAuth, authenticated host/overlay
APIs, one operator-triggered token refresh, and refreshed-credential EventSub
recovery were verified separately on 2 November. Natural-expiry scheduling,
real post-refresh chat/proof, account revocation/reauthorization, two-channel
co-op, OBS gameplay, Render deployment, and player playtests remain separate
acceptance gates.

The [backend release record](../../docs/operations/BACKEND_RELEASE_2026-11-02.md)
tracks the private source repository, Render target, required credentials,
deployment evidence, and recovery procedure. Local test results are separate
from real Twitch or production acceptance.
