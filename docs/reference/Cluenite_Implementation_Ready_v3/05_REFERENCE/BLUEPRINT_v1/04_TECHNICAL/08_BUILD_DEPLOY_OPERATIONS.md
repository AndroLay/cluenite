# Build, Deploy, Debug & Observability Runbook

## Environments

- `local`: mock Twitch adapter with clearly labeled **SIMULATION MODE**, sample case JSON, SQLite optional.
- `staging`: real OAuth and Twitch test channel, same Postgres schema, test OBS Browser Source.
- `production-demo`: real Twitch OAuth/Chat, publicly reachable TLS backend, persistent DB and stage/compact overlay. No fake events in recorded live demonstration.

## Illustrative environment keys (names only)

```dotenv
NODE_ENV=production
PUBLIC_ORIGIN=https://your-domain.example
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
TWITCH_REDIRECT_URI=https://your-domain.example/auth/twitch/callback
DATABASE_URL=postgresql://...
SESSION_SIGNING_SECRET=...
DATA_ENCRYPTION_KEY=...
OVERLAY_TOKEN_SIGNING_KEY=...
LOG_LEVEL=info
TWITCH_ADAPTER=eventsub  # local alternative: simulated; explicit UI badge
```

NEVER commit populated `.env`, tokens, viewers' private data or real overlay URLs. Keep `.env.example` placeholders only.

## Local steps after actual code exists

1. `pnpm install` and create local env from `.env.example`.
2. Run database migrations and verify a seeded Q01/M01 case appears as published.
3. Run `pnpm test` + case validator; test one mock event trace with known answer.
4. Start frontend and backend; observe health endpoint and overlay preview.
5. Authorize Twitch test account; verify EventSub subscription active before considering live.
6. Add browser source to OBS, paste secret view token only in OBS configuration.
7. Send real `!look CAM` in connected chat and verify UI changes. Screenshot case state, not secrets.

## Health endpoints & logs

- `/health/live`: process alive.
- `/health/ready`: DB accessible + case cache valid, Twitch connection status reported separately.
- Structured logs include request/action/session ID, no raw OAuth tokens or unfiltered chat message body.
- Metrics: sessions started/completed, valid action count, rejected/duplicate events, chat connection duration, case validation failures, overlay reconnects, co-op partial latency.
- Session error lookup by opaque incident ID. Never dump full Twitch user IDs to public telemetry.

## Deployment gate

- Persistent DB exists, backup enabled, migration tested and TLS/WSS reachable.
- Host remains awake for EventSub; verify cold deployment doesn't suspend background WebSocket.
- OAuth callback matches developer console exactly.
- Validate redirect/cookie domain behind proxy, CORS/CSP, WebSocket upgrade, secrets.
- One real Twitch chat event reaches real OBS source. Take internal recording and inspect clarity.
- Simulated adapter visually distinguished; cannot accidentally display fake "live" badge.

## Rollback procedure

Maintain previous application deploy and compatible migration version; case versions immutable. On bad deploy stop new sessions, preserve active checkpoints, restore stable server, and resubscribe EventSub. Don't delete event logs to "repair" truth.

## Open technical questions before implementation

- Existing repository? If yes, choose its established framework rather than migrate to Fastify/Vue by default.
- Does the hosting plan guarantee long-lived outbound sockets and persistent storage?
- Are two real broadcaster accounts available for co-op demo? If not, flag co-op P1 and don't pretend.
- Twitch account scopes accepted? Verify actual `/validate` result and event delivery.
- Will the stream show 1080p or lower? Verify smallest text in real capture.
