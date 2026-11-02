# Backend server

Fastify serves the API and static web build. Socket.IO shares the same HTTP
server. PostgreSQL stores host accounts, encrypted Twitch tokens, game sessions,
processed inputs, session events, overlay credentials, and the realtime outbox.
The deterministic game rules stay in `packages/engine` and authored case data
stays in `packages/cases`.

Last synchronized: 2 November 2026. Use English for documentation, feedback, authored content, comments, tests, and development instructions. See [local setup](../../docs/development/local-setup.md), [status](../../docs/STATUS.md), and [API contracts](../../docs/agent-handoff/BACKEND_CONTRACTS.md).

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

`GET /api/cases` is registered inside the auth-configured module and returns `404` when the signing/encryption keys are absent. `CLUENITE_DEV_CONTROLS` provides no host-login bypass. Frontend credential/invitation workflow acceptance is tracked separately in the frontend handoff.

## Twitch and security settings

- Register the exact callback `http://localhost:10000/api/auth/twitch/callback`
  in the Twitch developer console.
- Set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and
  `TWITCH_REDIRECT_URI` together. OAuth requests only `user:read:chat`.
- In production, `PUBLIC_ORIGIN` must use HTTPS. The callback must use that
  exact origin and `/api/auth/twitch/callback`; update the Twitch application
  registration for the assigned production URL. The initial Render callback is
  `https://cluenite-app.onrender.com/api/auth/twitch/callback`; completed production
  owner authorization remains pending. Local split-origin
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
- `GET /api/sessions`: recover participant sessions after refresh/login; defaults
  to open sessions, with optional bounded recent metadata and explicit rejoin hints.
- `POST /api/sessions`: create a pinned Q01, M01, or C01 session.
- `POST /api/coops/invitations`: invite by Twitch username or legacy numeric ID;
  returns a ready-to-share link with a fragment-only bearer returned at creation.
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

Socket handshakes require the configured origin, with an exact same-origin `Referer` fallback only when `Origin` is absent. Optional socket keys support exact retries; clients should preserve the original key for retries. Requests without keys retain compatibility handling and cannot claim exact retry identity.

## Verification

The [resource limits guide](../../docs/operations/BACKEND_RESOURCE_LIMITS.md)
records concurrency/connection budgets, database cancellation, idle polling,
overload diagnostics, retry behavior, and the limits of local load evidence.

The [simple setup handoff](../../docs/agent-handoff/BACKEND_SIMPLE_SETUP.md)
defines session rediscovery, username invitations, OBS credential handling, and
the remaining frontend wiring. These additive APIs preserve advanced controls
and existing authorization; they do not certify a completed host interface.

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
APIs, operator-triggered and clock-accelerated scheduled token refresh,
post-refresh real chat/proof, account revocation/reauthorization/rejoin,
two-channel C01 proof/final reveal, and Q01 gameplay/reload in actual OBS
were verified separately on 2 November. See the latest
[backend progress](../../docs/agent-handoff/BACKEND_PROGRESS.md) for scope,
cleanup, and preserved failed harness assertions. Natural expiry, an actual
provider-directed handoff/denied consent, full frontend acceptance, production
Twitch gameplay, restore rehearsal, and player playtests remain separate boundaries.

The [backend release record](../../docs/operations/BACKEND_RELEASE_2026-11-02.md)
tracks source publication, the Render target, required credentials,
deployment evidence, and recovery procedure. Backend checkpoint `8f06482` was verified live
with private PostgreSQL, five migrations, signed-out HTTP/browser checks,
Render-edge rate limits and a five-minute smoke load. A production logical
export restores into an isolated local cluster. Managed cloud PITR and live
rollback remain unrehearsed; completed owner OAuth and real production gameplay
remain open. Local fixture results are separate from real Twitch acceptance.

The [3 November frontend release](../../docs/operations/FRONTEND_RELEASE_2026-11-03.md) was deployed on the same service at source `f136bee`; its anonymous production HTTP/browser checks pass. Runtime backend behavior and migrations are unchanged from the earlier backend checkpoint. Production Twitch authorization and real chat/OBS/co-op acceptance remain separate.

Confirmed case switching is deployed at source `30e4738`. See [current status](../../docs/STATUS.md) for the exact running source and the [switching handoff](../../docs/agent-handoff/FRONTEND_BACKEND_INTEGRATION.md#switching-unfinished-cases) for stop/create ordering and retry behavior.

Twitch outage recovery is deployed at source `63ebdd2`: after eight fast retries, one 60-second timer continues recovery until success. Revocation, stop/replacement and shutdown cancel retry. The connection page distinguishes account sign-in from chat listening and offers reconnect/recheck actions. See [current status](../../docs/STATUS.md) and the [recovery handoff](../../docs/agent-handoff/FRONTEND_BACKEND_INTEGRATION.md#twitch-outage-recovery).
