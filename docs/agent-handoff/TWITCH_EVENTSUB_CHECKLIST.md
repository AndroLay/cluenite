# Twitch OAuth, EventSub, co-op, and OBS verification checklist

**Owner:** integration operator and consenting streamer account owners.

**Reconciled on 2 November 2026:** backend source and synthetic-provider tests pass. Real Twitch and OBS acceptance remain open. The current user scope stops before deployment. See the [predeploy guide](../operations/BACKEND_PREDEPLOY_2026-11-02.md).

## Current local preparation

- The ignored root `.env` now contains three independently generated application security keys. Development configuration parsing and an AES-GCM round trip pass. Existing nonempty settings were preserved. A prior read-only query found zero stored Twitch accounts in the local application database.
- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI` remain unset. Production preflight correctly fails; keys alone do not enable real OAuth.
- Zen processes are running, but both supported control surfaces report unavailable native/browser hosts. No Twitch app or provider credential was created. The owner selected reconnecting Zen.
- No consenting partner channel is selected. No OBS process was observed during the presence check. Real two-channel and OBS acceptance remain open.
- No shared API process was restarted. Saving `.env` does not update a running server.

## Select the local target and register Twitch

- [ ] Select the browser origin and API port using [local setup](../../HOW_TO_RUN.md). `PUBLIC_ORIGIN` must exactly match the browser origin. Vite must proxy `/api` and `/socket.io` to the same API process.
- [ ] Verify that process serves the current source/build, database readiness, and current assets. Prefer an owned process on a free port; do not terminate a shared listener or assume it reloaded configuration.
- [ ] Select the exact callback for that process. The default split-origin setup documents `http://localhost:10000/api/auth/twitch/callback`; a callback through Vite instead needs its exact browser-origin URL and working proxy. These are different registrations. Do not invent a future Render hostname.
- [ ] Follow Twitch's [app registration instructions](https://dev.twitch.tv/docs/authentication/register-app) in the selected, signed-in Zen account. Email verification, 2FA, or an interactive challenge may require the owner to act.
- [ ] Inspect existing registrations before creating one. For a new app, use an available Cluenite name, the selected callback, and the appropriate category. Select a confidential/server client if offered.
- [ ] Obtain that app's client ID and initial secret. Do not replace an existing app's secret without checking its use: Twitch invalidates the previous secret.
- [ ] Save the ID, secret, and callback together in the ignored `.env`. Never print them or include them in chat, logs, screenshots, or Git. Preserve the three application keys already generated.
- [ ] Parse development configuration and restart only the selected, owned API process. Keep `TWITCH_ADAPTER=twitch`; there is no login bypass.
- [ ] Confirm outbound HTTPS to `id.twitch.tv` and `api.twitch.tv`, and WSS to `eventsub.wss.twitch.tv`, from this target.

## OAuth and one-channel gameplay

- [ ] Open `/api/auth/twitch/start` from the selected browser origin. Confirm Twitch identifies the intended app and requests `user:read:chat` access.
- [ ] Consent as the intended broadcaster. Browser navigation returns to `/connect?result=connected`; the HttpOnly session cookie and authenticated `GET /api/me` must agree. The result query alone never proves sign-in.
- [ ] Check denied consent: HTML navigation returns to `/connect?result=denied`. Other fixed browser outcomes are `invalid`, `state_rejected`, `unavailable`, and `exchange_failed`; JSON clients retain JSON errors. Haiku must wire result copy without treating it as authentication.
- [ ] Create and start Q01 through the authenticated API/host controls. Creation leaves it `READY`, not `ACTIVE`.
- [ ] Inspect `/api/ops/diagnostics` for connection/subscription state. A connected label alone is not proof of real chat delivery.
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

- [ ] Record the source commit, local origin/ports, timestamps, readiness response, and actual executed checks. Label synthetic data explicitly.
- [ ] Retain only redacted identity results, chat receipt/revision correlation, team visibility, and actual OBS observations. Never retain secrets, authorization codes, cookies, or overlay credentials in reports.
- [ ] Keep unexecuted/failed checks open with a concrete reason. Backend tests, fixtures, previews, and configuration validation do not replace real consent or OBS acceptance.
- [ ] Hand signed-in frontend findings to Haiku. Do not mark unfinished controls complete because their endpoints pass.

## Later deployment-only gates

These items are outside the current before-deploy scope. The owner selected Andro's Render workspace and deferred Render API access.

- [ ] Obtain deferred access and explicit deployment authorization; pin a reviewed commit with passing CI.
- [ ] Verify the selected Singapore web service/private PostgreSQL target, private ingress, internal database URL, and HTTP readiness path.
- [ ] Register the actual HTTPS production origin's `/api/auth/twitch/callback` in Twitch and the runtime. Keep application keys stable and privately recoverable.
- [ ] Run production preflight, then verify actual deployment, migrations, readiness, assets, Socket.IO, provider behavior, and recovery on that remote target.

Local and remote acceptance remain separate records. No deployment or production restore drill is claimed here.
