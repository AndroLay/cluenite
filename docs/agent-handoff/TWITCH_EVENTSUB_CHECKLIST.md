# Twitch OAuth, EventSub, co-op, and OBS verification checklist

**Owner:** integration operator and consenting streamer account owners.

**Reconciled on 2 November 2026, 10:48 UTC:** 113 source tests and passing Linux CI, real operator-triggered and accelerated scheduled refresh, actual post-refresh chat/receipt/proof correlation, Q01 reveal/reload in actual OBS, and two-channel C01 proof/final reveal pass. Secondary revoke/normal browser reauthorization/explicit rejoin passes without reviving old sessions. Separate real solo-host revoke automatically pauses its round; reauthorization/resume and CANCELLED cleanup pass. Both accounts are authorized again and the primary M01 remains untouched READY. Earlier `msg_rejected` attempts are superseded by actual delivered messages. Natural expiry, actual provider-directed handoff/denied consent, player evidence, complete frontend acceptance, and remote deployment remain separate. See [backend progress](BACKEND_PROGRESS.md) for preserved harness failures/readback and the [predeploy guide](../operations/BACKEND_PREDEPLOY_2026-11-02.md).

## Current local preparation

- The ignored root `.env` contains three independently generated application security keys. Development parsing, an AES-GCM round trip, and later loading of the real encrypted account credentials pass. Existing settings were preserved. The earlier zero-account observation predates the now-completed OAuth consent.
- The owner registered Cluenite and saved `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI` in the ignored `.env`. Development parsing passes. Real Twitch app-token issuance, client validation, and temporary-token revocation each returned 200; this is not broadcaster consent.
- The owner completed initial Authorize in the main Zen profile. The managed bridge remains unavailable; later native accessibility in background Brave completes normal secondary reauthorization without restoring/focusing the window, global keyboard/mouse input, or browser-cookie export. Navigation is withheld while Brave is foreground. The isolated headless proof is separate and did not supply real login.
- The real browser's `/api/me` and diagnostics calls pass. A separate background provider check validates the stored user token, expected account/profile, required chat-read scope, and one matching enabled chat subscription. No browser cookies or provider tokens were exported to reports.
- All 21 authenticated host/overlay browser checks pass. The newly created operator round was stopped in `CANCELLED`, its overlay credential was revoked, and its sockets closed. These checks send no Twitch chat and do not verify OBS desktop rendering.
- The owner authorized their second account `androcadangan` in Brave, alongside primary `layordna`, including explicit secondary test chat-write permission. Both identities/scopes/workers were validated before real Q01 and C01 chat. The secondary Q01 resolves through actual commands; C01 uses both channels and completes after real revoke/rejoin. Actual OBS receives the Q01 chat-driven reveal and is now closed after cleanup. The final separate solo-host probe verifies actual revoke/pause, fresh reauthorization, explicit resume, old-session invalidation, and CANCELLED cleanup.
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
- [x] With permission for the secondary owned channel, send actual `!look CAM`, `!look SCHEDULE`, `!link CAM_R07 SCHEDULE_R07`, then `!solve ROBOT` after proof. Confirm persisted revisions, attributed contributions, host/overlay Socket.IO updates, and Q01 RESOLVED revision 6.
- [x] Correlate actual provider message IDs with stored receipts/revisions, contribution event IDs, and authorized Socket.IO events. No provider IDs are printed in reports. Duplicate delivery remains a controlled fixture/harness test; a newly sent chat message has a different ID.
- [x] Complete one real operator-triggered refresh through the application API client and encrypted version-checked store. Ten checks confirm replacement-token persistence, unchanged identity/scope, and preserved browser sessions. After a hidden API reload, the enabled subscription is newly created after that restart. No new consent, Client Secret/key change, or account revocation occurred.
- [x] Exercise the production scheduled-refresh timer with real Twitch credentials and encrypted persistence. Eleven checks pass after its actual 60-second minimum delay using an injected advanced clock. This is an accelerated scheduled path; natural expiry is not observed.
- [x] Process actual commands in the refreshed primary channel during C01; correlate their EventSub receipts, persisted proof/attribution, and both workstation updates.
- [ ] Observe an actual provider-directed handoff if Twitch sends one. The consecutive-handoff fixture regression passes; it is not a real provider event. See Twitch's [WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).
- [x] Exercise actual secondary disconnect/revoke: provider rejects the old token, app sessions are revoked, encrypted credentials/scopes are cleared, and old host sockets are disconnected. Co-host loss preserves the primary game but blocks joint verdict. A separate solo-host test verifies automatic PAUSED state and a durable authorization-revoked event.
- [x] Reauthorize and explicitly rejoin the co-op after real revocation, preserving proof and old-session revocation. Internal revoked EventSub socket/timer shutdown is covered by source/fixture checks, not directly observable through revoked-account diagnostics.
- [x] Finish real reauthorization/resume/cleanup of the separate solo-host pause probe: 28 revoke and 23 recovery checks pass; the empty test round is CANCELLED revision 5 and the primary M01 stays READY revision 1.

## Two-channel co-op

- [x] Owner-selected channels are `layordna` and `androcadangan`, both owned by the requester, for the explicitly requested integration tests. Provider consent remains separate. Before sending, validate exact identities/scopes and ensure Shared Chat contains no unrelated participants.
- [x] Both owners completed real OAuth in separate browsers. Independent Twitch identity/scope validation and authenticated local operator diagnostics confirm both accounts/workers. Temporary operator cookies stay in memory and are revoked; they are not exported browser cookies or evidence of full frontend acceptance.
- [x] Create C01 from the primary and reject Start before partner consent. Invite and accept as the exact named, independently OAuth-authorized partner. Wrong-identity, decline, and expiry behavior have source/fixture evidence, not fresh real-account execution in this accepted session.
- [x] Start through the normal host lifecycle after consent. Confirm A sees its COAST clue without B's MANUAL and B sees MANUAL without COAST.
- [x] Process authorized real commands from both channels. Confirm independent station proof, shared `JOINT_PROOF_B17`, actual provider-message attribution/channel origins, and final RESOLVED/reveal revision 9 with canonical `TEST_BUOY` verdict (`B17` is an accepted alias). Duplicate-delivery behavior remains fixture evidence.
- [x] Revoke and rejoin the real secondary: while absent, reject the primary's joint verdict durably with `NOT_AVAILABLE / TEAM_REQUIRED`; after actual reauthorization and explicit rejoin, preserve proof, keep old sessions revoked, and complete through a new real chat message. Primary remains ACTIVE during co-host loss; solo-owner loss pauses its own round.

Use the exact [API and Socket.IO contracts](BACKEND_CONTRACTS.md). Frontend station previews and disabled lobby actions do not constitute a live co-op UI; Haiku owns that integration.

## OBS Studio Browser Source

- [x] Run actual OBS Studio 31.0.3 in an isolated portable copy on a private nonactive desktop. The main input desktop stays `Default`; no broadcast, recording, or virtual camera starts. User configuration is untouched.
- [x] Issue a credential for a new temporary operator-owned round and configure its Browser Source privately. Six PNGs come from OBS itself; no credential appears in shared evidence.
- [x] Verify 1280 x 720 rendering, transparent surrounding pixels, host-driven reveal, and current snapshot recovery. These are actual OBS captures, not Chrome captures or real-chat proof.
- [x] Verify actual Q01 Twitch chat reaches the OBS Browser Source: first proof, full reveal, and persisted reveal after reload are captured from OBS itself.
- [x] Confirm an overlay Socket.IO mutation returns `NOT_AUTHORIZED`: only authenticated host controls or authorized chat may mutate the game.
- [x] Revoke the test credential and confirm the old source displays disconnected status. The temporary round is resolved, its operator session is revoked, and the test scene/input are removed.
- [x] Reload the test Browser Source and verify durable reveal recovery. Unrelated OBS configuration is unchanged.

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
