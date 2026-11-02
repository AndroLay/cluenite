# Twitch OAuth, EventSub, co-op, and OBS verification checklist

**Owner:** integration operator and consenting streamer account owners.

**Reconciled on 2 November 2026:** backend source tests, real broadcaster OAuth, authenticated HTTP/Socket.IO/overlay checks, and an enabled real EventSub subscription pass. Real chat-to-gameplay, two-channel co-op, provider refresh/revocation/handoff, and actual OBS acceptance remain open. The current user scope stops before deployment. See the [predeploy guide](../operations/BACKEND_PREDEPLOY_2026-11-02.md).

## Current local preparation

- The ignored root `.env` contains three independently generated application security keys. Development parsing, an AES-GCM round trip, and later loading of the real encrypted account credentials pass. Existing settings were preserved. The earlier zero-account observation predates the now-completed OAuth consent.
- The owner registered Cluenite and saved `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI` in the ignored `.env`. Development parsing passes. Real Twitch app-token issuance, client validation, and temporary-token revocation each returned 200; this is not broadcaster consent.
- The owner completed Authorize in the main Zen profile after the local login opened there. The managed bridge remains unavailable, and the Windows native provider cannot focus windows. The isolated headless proof is separate and did not supply the real login. The owner's latest instruction requires background work; browser input/new-tab actions have stopped.
- The real browser's `/api/me` and diagnostics calls pass. A separate background provider check validates the stored user token, expected account/profile, required chat-read scope, and one matching enabled chat subscription. No browser cookies or provider tokens were exported to reports.
- All 21 authenticated host/overlay browser checks pass. The newly created operator round was stopped in `CANCELLED`, its overlay credential was revoked, and its sockets closed. These checks send no Twitch chat and do not verify OBS desktop rendering.
- No consenting partner channel is selected. No OBS process was observed during the presence check. Real two-channel and OBS acceptance remain open.
- The previously owned local API was restarted to load the saved credentials; Vite was preserved. Readiness, public web, case proxy, unauthenticated identity rejection, and the OAuth-start redirect pass. The runtime record is `.cache/twitch-real-20261102-053344.json` and must be rechecked before any later process operation.
- Later background-only verification fixed startup-only asset registration. The current local suite passes 111 tests in 23 files with the selected owned real-adapter API stopped temporarily for database-wide advisory-lock isolation and restored afterwards. At 07:58 UTC, 46 integration checks pass, including exact built asset delivery and 16 public page/viewport checks across API/Vite without overflow or uncaught browser errors. `/guide` header links measure at least 44px at 390px; other navigation targets are not certified. The latest runtime observation is `.cache/background-api-current-20261102.json`, not the earlier PID record.
- Stored authorization and one enabled matching subscription recover after the API restarts. Headless callback failure inputs are synthetic and separate from actual provider denial/revocation. The empty headless context was closed; the main Zen profile was untouched. Maintenance preview has `applied: false` and all eligible counts zero.
- Production preflight now has an empty missing-variable list and correctly fails on the local HTTP origin. A real production HTTPS origin/callback is still required later.

## Select the local target and register Twitch

- [x] Select the browser origin and API port using [local setup](../../HOW_TO_RUN.md): `http://localhost:5173` and API port 10000. Vite targets the same API; case proxy and signed-in Socket.IO checks pass within the boundaries below.
- [x] Verify the selected owned runtime, database readiness, and current built HTML/JavaScript/CSS. New hashed assets now resolve after rebuilds; exact served/disk comparisons and the HTTP regression pass. Recheck ownership before any future process operation.
- [x] Select the exact local callback `http://localhost:10000/api/auth/twitch/callback`. A callback through Vite instead would need its exact browser-origin URL and registration. Do not invent a future Render hostname.
- [x] Follow Twitch's [app registration instructions](https://dev.twitch.tv/docs/authentication/register-app): the owner completed registration and supplied the resulting credentials privately.
- Registration was completed by the owner. The agent did not create a second application or retrospectively claim an inventory of other registrations. No further app creation is required for the selected local integration.
- [x] Obtain that app's client ID and secret; Twitch accepted them in the app-token probe. No existing secret was rotated by the agent.
- [x] Save the ID, secret, and callback together in the ignored `.env`, preserving the three application keys. No values were printed or included in chat, logs, screenshots, or Git.
- [x] Parse development configuration and restart only the selected, owned API process with `TWITCH_ADAPTER=twitch` and developer controls disabled. There is no login bypass.
- [x] Confirm outbound transport reachability: `id.twitch.tv` token/validation/cleanup requests return 200, an unauthenticated `api.twitch.tv` request returns the expected 401, and `eventsub.wss.twitch.tv` sends a connected welcome. The probe socket was closed without a subscription; authenticated EventSub/chat acceptance remains below.

## OAuth and one-channel gameplay

- [x] Complete the browser consent step at `http://localhost:5173/api/auth/twitch/start` in the main Zen profile. The owner clicked Authorize; Twitch's token validation confirms the configured client, intended account, and `user:read:chat`.
- [x] Verify actual sign-in after consent: active account/session rows are stored, the browser returns to Cluenite, and its cookie-authenticated `GET /api/me` returns 200. The result query alone was not used as proof.
- [x] Check the running local callback with synthetic `denied`, `invalid`, and `state_rejected` inputs: HTML redirects, legacy JSON errors, state-cookie clearing, and privacy headers pass. Headless denied-result navigation leaves the browser signed out. Source tests separately cover `unavailable` and `exchange_failed`; Haiku owns result copy and must not infer authentication from the query.
- [ ] Exercise owner-denied consent at the actual Twitch prompt when main-profile interaction is authorized. The synthetic callback probe is not evidence of that external action.
- [x] Create/start Q01 through authenticated APIs; creation is `READY`. The 21-check run also validates CSRF, creation/control idempotency, Pause/Resume/Stop, host/overlay Socket.IO, read-only overlay boundaries, and revocation. Its own test round and credential were cleaned up.
- [x] Inspect authenticated diagnostics: database healthy, EventSub connected, one active subscription. Independent official Twitch listing confirms one matching enabled WebSocket chat subscription. A connected subscription is not proof of real chat delivery.
- [x] Restore the owned API after exclusive source tests and confirm readiness, stored token/profile/scope, and exactly one enabled matching real chat subscription without reauthorizing or rotating credentials. This is local restart/subscription recovery.
- [ ] With permission for this exact channel, send `!look CAM`, `!look SCHEDULE`, and `!link CAM_R07 SCHEDULE_R07` in real chat. Confirm persisted revisions and authorized Socket.IO updates. Submit a verdict only after proof exists.
- [ ] Correlate a provider message ID with one stored receipt/revision. Replaying that same ID is a controlled harness test; sending another chat message creates a different provider ID and does not reproduce duplicate delivery.
- [ ] Observe an actual refresh and a later real command. Observe a provider reconnect/handoff if it occurs; do not label a local simulation as provider evidence. See Twitch's [WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).
- [ ] After active test sessions are ready to be paused, exercise the authorized disconnect/revoke flow. Confirm local sessions lose access, the worker stops, and active games pause. Reauthorize before other signed-in checks.

## Two-channel co-op

- [ ] Record primary/partner channel usernames and both owners' consent. Obtain explicit permission before sending test messages to either channel. Never select or message an unrelated public channel automatically.
- [ ] Sign in both real broadcasters with the same app in separate browser sessions. Verify each through `/api/me`; never export cookies or tokens.
- [ ] Create a C01 invitation from the primary host; verify only the named invitee can accept. Check decline/expiry separately from the active accepted session.
- [ ] Accept as the partner and start through the implemented host lifecycle. Confirm team-specific snapshots hide the other workstation's private evidence.
- [ ] Process authorized real commands from both channels. Confirm independent progress, a shared breakthrough, attribution without duplicate credit, and the final proof/reveal.
- [ ] Disconnect/rejoin one consenting host. Confirm pause/recovery behavior and rejection of an unrelated identity.

Use the exact [API and Socket.IO contracts](BACKEND_CONTRACTS.md). Frontend station previews and disabled lobby actions do not constitute a live co-op UI; Haiku owns that integration.

## OBS Studio Browser Source

- [ ] Open actual desktop OBS. Create a test scene/source without overwriting the streamer's production setup or starting a broadcast.
- [ ] Issue an overlay credential as the authenticated host and privately configure the returned Browser Source URL. Never include its fragment token in shared evidence.
- [ ] Verify transparent rendering at 1280 x 720, current snapshot recovery, and a visible real-chat update. A browser screenshot alone is not OBS evidence.
- [ ] Confirm an overlay mutation is rejected: only authenticated host controls or authorized chat may mutate the game.
- [ ] Revoke the test credential and confirm the old source loses access. Issue a replacement before later reconnect checks.
- [ ] Restart/reload the test source and verify recovery without changing unrelated OBS configuration.

## Evidence and completion

- [x] Record the backend source change, local origin/ports, timestamps, readiness, actual checks, and evidence paths in [backend progress](BACKEND_PROGRESS.md). Git history identifies the published source; label synthetic inputs explicitly.
- [x] Retain only sanitized results for executed checks. No chat receipt correlation, real team visibility, or OBS observation is claimed without execution. Reports contain no secrets, authorization codes, cookies, or overlay credentials.
- [x] Keep unexecuted/failed checks open with a concrete reason. Backend tests, fixtures, previews, and configuration validation do not replace real consent or OBS acceptance.
- [x] Publish signed-in findings and the later static-delivery/headless observation in the [backend handoff](BACKEND_CONTRACTS.md#background-only-integration-handoff-2-november-2026-0758-utc). Endpoint success does not complete Haiku's interface or visual acceptance.

## Later deployment-only gates

These items are outside the current before-deploy scope. The owner selected Andro's Render workspace and deferred Render API access.

- [ ] Obtain deferred access and explicit deployment authorization; pin a reviewed commit with passing CI.
- [ ] Verify the selected Singapore web service/private PostgreSQL target, private ingress, internal database URL, and HTTP readiness path.
- [ ] Register the actual HTTPS production origin's `/api/auth/twitch/callback` in Twitch and the runtime. Keep application keys stable and privately recoverable.
- [ ] Run production preflight, then verify actual deployment, migrations, readiness, assets, Socket.IO, provider behavior, and recovery on that remote target.

Local and remote acceptance remain separate records. No deployment or production restore drill is claimed here.
