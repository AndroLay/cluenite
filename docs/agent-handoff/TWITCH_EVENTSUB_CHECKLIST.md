# Twitch OAuth, EventSub, and OBS verification checklist

**Owner:** integration operator / streamer account owner  
**Reconciled on 2026-11-02:** real Twitch, OBS Studio, Render, and player acceptance remain unverified in this pass. Mock tests do not count as external verification. See [status](../STATUS.md).

## Select the verification target

For local OAuth, use `PUBLIC_ORIGIN` and the exact callback in [local setup](../../HOW_TO_RUN.md). Render steps below apply only to a selected deployed target. Verify the actual process/version or deployed commit; old port observations are historical.

The web UI does not yet issue OBS credentials or complete co-op invitations. Use the implemented [API contracts](BACKEND_CONTRACTS.md) for authorized integration and keep credentials private.

## Before OAuth

- [ ] Confirm the Render web service and `cluenite-db` exist in the same workspace and Singapore region. The service uses the database's internal connection string through `fromDatabase`; keep public database access disabled unless an external operator explicitly needs it.
- [ ] Set `PUBLIC_ORIGIN` to the actual HTTPS Render/custom domain. Do not retain the placeholder if the service receives a different hostname.
- [ ] Register exactly `${PUBLIC_ORIGIN}/api/auth/twitch/callback` as the OAuth redirect URI in Twitch Developer Console and set the same full URL in `TWITCH_REDIRECT_URI`.
- [ ] Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in the Render service environment. `sync: false` values are not automatically supplied when syncing an existing Blueprint; enter or update them in the Render Dashboard.
- [ ] Set `DATA_ENCRYPTION_KEY` to canonical base64 for exactly 32 random bytes. Keep it stable across deploys; changing it without re-encrypting stored tokens makes them unreadable.
- [ ] Confirm `SESSION_SIGNING_SECRET` and `OVERLAY_TOKEN_SIGNING_KEY` each contain at least 32 bytes. The Blueprint generates them for new service environments; check existing environments because generated values are not proof that the current service has them.
- [ ] Set `NODE_ENV=production` and `TWITCH_ADAPTER=twitch`. Render provides `PORT`; the app binds to `0.0.0.0`.
- [ ] Confirm outbound HTTPS to `id.twitch.tv`, `api.twitch.tv`, and outbound WSS to `eventsub.wss.twitch.tv` is available from the service.
- [ ] Confirm the current local production build; dated results are in `docs/STATUS.md`. A clean Vite dev startup initially failed to resolve the `tailwindcss` CSS import without a temporary test alias; the frontend should reconcile its undeclared direct dependency and confirm a fresh dev install.
- [ ] Confirm a clean Render build/deploy. A passing local build is not proof of Render deployment.

## OAuth and chat subscription

- [ ] Open `${PUBLIC_ORIGIN}/api/auth/twitch/start` in a browser and verify Twitch shows the Cluenite application and the `user:read:chat` scope.
- [ ] Complete consent on the intended broadcaster account. Confirm the callback returns to `PUBLIC_ORIGIN`, sets the HttpOnly `cluenite_session` cookie, and `/api/me` returns that broadcaster's profile.
- [ ] Confirm `/api/ops/diagnostics` reports Twitch status and active subscription count. A `connected` UI label alone is not proof that a chat message was received.
- [ ] Verify the EventSub WebSocket receives `session_welcome`, the backend creates a `channel.chat.message` subscription, and a real chat message from that channel arrives.
- [ ] Send a harmless valid command (for example `!look CAM`) in the broadcaster's actual Twitch chat. Confirm the expected revision/evidence is persisted in PostgreSQL and the authorized browser/overlay receives it through Socket.IO.
- [ ] Send the same Twitch EventSub message again if the test harness permits. Confirm the revision and contribution credit do not duplicate.
- [ ] Verify a real EventSub reconnect/handoff and token refresh. Confirm the connection returns to `ONLINE` and a later real command is processed once.
- [ ] Revoke Twitch access in the provider/dashboard and confirm the service reports revocation, stops the worker, revokes local sessions, and pauses active games.

## OBS Browser Source

- [ ] In OBS Studio on the streamer's desktop, add the authorized URL returned by the host session's overlay-credential endpoint.
- [ ] Confirm the source renders transparently at the intended 1280×720 layout and shows a real state update from the test game.
- [ ] Attempt a gameplay action from the overlay and confirm it is read-only; only the authenticated host dashboard or Twitch chat may mutate the game.
- [ ] Rotate/revoke the overlay credential and confirm the old Browser Source loses access.
- [ ] Restart OBS and confirm the configured source can reconnect and recover the current snapshot.

## Evidence to attach before marking verified

- [ ] Redacted Render deploy/build log, service URL, commit identifier, and `/health/ready` response.
- [ ] Redacted OAuth callback and `/api/me` evidence; never attach authorization codes, access/refresh tokens, cookies, or signing/encryption keys.
- [ ] EventSub subscription status and timestamp of a real Twitch chat command, correlated with persisted revision and browser/OBS update.
- [ ] OBS screenshot or recording from the actual desktop application, plus the read-only and credential-revocation checks.

## External inputs and evidence still required

- Select the intended Render workspace/service/database for authorized inspection; no connector workspace or resource state was queried in this pass.
- Twitch app client ID/secret and an authorized broadcaster consent flow.
- A deployed Render service/database and permission to update its environment or deploy it.
- OBS Studio Browser Source access for the streamer desktop.
- A real Twitch channel/chat session for EventSub delivery and reconnect checks.
