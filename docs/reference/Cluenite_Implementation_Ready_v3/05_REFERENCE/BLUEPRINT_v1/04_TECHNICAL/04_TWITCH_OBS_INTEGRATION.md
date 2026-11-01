# Twitch + OBS Integration Playbook (Current Official API Strategy)

## Why this qualifies as a Twitch app

Cluenite uses live Twitch chat events to drive **actual puzzle state** and displays real-time progress through OBS. Optional co-op connects two authenticated channels. This is not merely a standalone web game with a Twitch logo.

## Recommended short-path Twitch flow

1. Create a Twitch developer application and register exact HTTPS redirect URI. Put `CLIENT_ID`, `CLIENT_SECRET`, callback and server encryption key in host secrets, not Git.
2. Broadcaster authorizes app via server-side OAuth **authorization-code grant** with anti-CSRF `state` and requested least-privilege chat-reading scope(s).
3. Validate user and granted scopes; fetch user identity, store token encrypted; refresh securely when needed.
4. For simple MVP, consume `channel.chat.message` through **EventSub WebSocket** using the broadcaster's authorized user token for their own chat, with the correct `user_id`/`broadcaster_user_id` conditions. Verify permissions against official docs during implementation. A separate chatbot identity is not required to read messages under this approach.
5. The WebSocket server sends `session_welcome` with session ID; use it to subscribe to the event. Watch `keepalive`, `reconnect`, and notification types. Resubscribe when needed; store delivered IDs for at-least-once dedupe.
6. Parse `!look`, `!link`, `!challenge`, `!solve` only for active session/channel; route into trusted case engine.
7. Show status and state on the dashboard/OBS via your own backend websocket. Do **not** connect OBS directly to Twitch with the client's secret.
8. Optional sending bot messages via Helix `Send Chat Message` requires appropriate `user:write:chat`/bot permissions. Leave it off for first demo if permissions are unclear.

## Chat scope nuance

Per Twitch's `channel.chat.message` docs, authorization depends on the identity whose token is being used; app tokens additionally involve bot scopes/permission from broadcaster/mod status. The simplest broadcaster-as-reader path must be tested in a real channel. Do not assume one OAuth grant lets the app read arbitrary other streamers' chats. **Each co-host authorizes their own channel.**

## Error handling

- Missing OAuth grant or revoked token: mark connection unavailable, ask broadcaster to reconnect.
- EventSub socket drops: show `Reconnecting chat…`, make countdown pausable, reconcile event IDs and prevent duplicate contributions; no fake participants.
- Twitch rate limit: retry with exponential backoff respecting official HTTP `Retry-After`; do not hammer subscription endpoints.
- Stream delay: user sees delayed OBS video but chat action arrives as broadcaster live traffic; avoid millisecond racing and super-short timed windows.
- Shared Chat: maintain source channel attribution if event provides it; test once separately. Co-op need not use Shared Chat.
- Twitch disconnect during reveal: resolved authoritative state persists, overlay reconstructs after reconnect.

## OBS Browser Source setup instructions for user

1. In broadcaster dashboard select `Overlay Setup` and choose compact (600×340) or stage (1920×1080).
2. Copy session-specific HTTPS source URL. It contains a **view-only opaque token**; do not publish it in screenshots or chat. Rotate if leaked.
3. OBS → Sources → `+` → Browser → paste URL → set width/height to indicated size.
4. Position the source away from minimap, chat and webcam; test with preview at phone-scale.
5. Enable/disable source via OBS UI or streamer-configured hotkey; game state remains persistent on server.
6. Press `Start Test` (labeled DEMO MODE if simulated) to verify the browser source renders, then switch to live chat connection for official demo.

**Security:** overlay source URLs are access tokens; don't leave them in source control. An overlay URL cannot start/end session or create invites. Configure `Cache-Control: no-store` for sensitive overlay token responses, appropriate CSP and no ambient OAuth cookies.

## Twitch official docs cited

- https://dev.twitch.tv/docs/authentication/getting-tokens-oauth
- https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types
- https://dev.twitch.tv/docs/eventsub/handling-websocket-events
- https://dev.twitch.tv/docs/chat/chatbot-guide/
- https://dev.twitch.tv/docs/chat/send-receive-messages
- https://dev.twitch.tv/docs/api/reference

As of 2026-10-31 these pages describe the relevant APIs; permissions and rate limits may change, so verification in the actual developer console is a deployment gate.
