# 09 — Render Deployment, Environment, Release and Operations

## Host choice (fixed)

**Render** is chosen to use remaining user credits when applicable and avoid new Railway billing. **Do not assert credit balance**; check Render Billing and credit expiration before provisioning. The cost is not guaranteed capped by credits. Use Render paid always-on Web Service + paid Render Postgres in **Singapore**, same region, for MVP. Render free services can sleep after 15 minutes without inbound traffic, and free databases have expiration/backups limitations; do not rely on Free for live judging.

Official docs: https://render.com/docs/websocket ; https://render.com/docs/free ; https://render.com/docs/regions ; https://render.com/docs/postgresql-creating-connecting ; https://render.com/docs/health-checks ; https://render.com/docs/deploys

## Deployment topology

```text
                     Twitch servers
               (OAuth/Helix/EventSub)
                          |
                   outbound WSS/HTTPS
                          |
              cluenite-app (Render Web Service)
                   PAID; 1 replica
             Fastify + Socket.IO + EventSub
             compiled Vue / dashboard/overlay
                          |
                  private DATABASE_URL
                          |
              cluenite-db (Render Postgres)
                    PAID; same region
```

One public HTTPS origin for app/callback/Socket.IO/overlay removes unnecessary cross-origin complexity. No separate static frontend until profiling justifies it. Frontend built at deploy and served as static files by Fastify; host runtime listens on `0.0.0.0:$PORT` with one public HTTP server; Socket.IO attached to that same server.

## Environment values (names; no real secrets in files)

```dotenv
NODE_ENV=production
PORT=10000
PUBLIC_BASE_URL=https://<your-render-domain>
DATABASE_URL=<from-render-internal-postgres>
TWITCH_CLIENT_ID=<from-twitch-dev-console>
TWITCH_CLIENT_SECRET=<server-secret>
TWITCH_REDIRECT_URI=https://<your-render-domain>/api/auth/twitch/callback
SESSION_SECRET=<generated-long-random-secret>
OAUTH_TOKEN_ENCRYPTION_KEY=<generated-key-not-in-repo>
OVERLAY_TOKEN_HASH_PEPPER=<generated-secret>
LOG_LEVEL=info
APP_INSTANCE_ID=<render-provided-or-derived>
```

`.env.example` should contain placeholders only. Exact Render env references and build commands should be authored **after scripts exist**. Do not commit an untested `render.yaml` pretending to be deployable.

## Build/release sequence

1. Verify current commit and `pnpm-lock.yaml`; CI runs typecheck, lint, unit, case schema tests and build.
2. Build Vue/Vite client (including lightweight OBS entry) and compile Fastify server.
3. Execute tested Drizzle migrations in a controlled deploy step; migration must be backward compatible during overlap.
4. Deploy one paid Render app; configure health endpoint and HTTPS; enable actual app env secrets.
5. Confirm `/health/live`, `/health/ready`, `/api/me` and Vite pages; perform OAuth from public origin.
6. Confirm EventSub subscription created and EventSub lifecycle health available; send **real** chat from test Twitch account.
7. Confirm game state write, Socket.IO revision and OBS animated reveal; refresh overlay and verify snapshot.
8. Disable automatic deployment ahead of live hackathon demo; release only tested commits to avoid interrupting active OBS WebSockets.

## Deployment overlap and leadership

Render can have old and new instances alive briefly during deployment; run a PostgreSQL-backed single **EventSub ingest leader** with robust lease/fencing so the same channel is not subscribed and processed by two app versions independently. Also enforce input-level idempotency. A single-instance plan does not mean one process can never overlap during rollout.

Handle `SIGTERM` gracefully: stop taking new mutations, persist durable outbox, stop Twitch subscription owner, close Socket.IO and HTTP after bounded drain, release ownership. Unexpected crash must recover from Postgres snapshot and reconnect provider; missed Twitch messages are not replayable.

## Performance budgets — targets, not benchmarks

- **User-perceived:** accepted proof shows a clear overlay update promptly; measure p50/p95 end-to-end `Twitch EventSub received → DB committed → browser render` and distinguish Twitch delivery/stream delay from local processing.
- **Client:** 60 FPS during short reveal on target setup when feasible; near-idle GPU activity on static overlay, cap Pixi tickers, filters and texture sizes.
- **Backend:** bounded per-command work, capped queue and backpressure; measure Node heap, CPU, Postgres connections, Socket.IO clients and event dedup rates.
- **Reliability:** 30+ min stable session check, forced Render restart and Twitch reconnect; result must be correct and truthful.

Do not advertise numeric viewer concurrency without a synthetic rate/load test and one real small-scale Twitch test. Use synthetic events in local load CI labeled clearly, never as actual Twitch demo footage.

## OBS practical setup

- Streamer uses OBS Browser Source with HTTPS URL generated by dashboard; default 600×340 for Quick visual composition (Browser Source may be larger if scaled in OBS), 1920×1080 for full-stage scene. Transparent background for compact, alpha-safe gradients/text.
- Source can be positioned away from game HUD; Quick Case auto-collapse on completion; pause control is dashboard-side.
- Audio may need explicit setup and stream mix review; volume defaults conservative.
- Preserve cursor/game focus; no keyboard interception from OBS. Test OBS with an actual game running to measure capture/GPU contention.

## Monitoring and operations

- `/health/live` indicates process; `/health/ready` indicates ability to serve core requests and DB; provider connectivity displayed separately to avoid restart loops during Twitch outage.
- Logs structured by `requestId`, `sessionId`, `caseId`, `eventType`, `revision`, `originChannelId` (redact IDs as appropriate in public logs), no tokens or case secret solutions.
- Minimum admin diagnostics: current EventSub connection, subscriptions, last notification time, current session revision, pending outbox count, DB connection health.
- Spend guardrails: verify remaining credits/billing, scale instances=1, remove idle preview services, set alerts/spending limits where offered, don't configure additional paid resources without owner review.

## Render verification matrix

- [ ] The web service is **paid always-on** and has a working HTTPS URL.
- [ ] Database and service region match; internal DB URL works.
- [ ] Auth callback matches Twitch Developer Console exactly.
- [ ] Live EventSub event from real chatter accepted and reflected in OBS.
- [ ] Case persists when overlay is refreshed mid-investigation.
- [ ] Deployment/restart recovers from Postgres; no double-credit.
- [ ] EventSub is **re-subscribed** after unexpected socket connection failure.
- [ ] OBS token rotation revokes old overlay.
- [ ] No leaked secrets in logs/build artifacts.
- [ ] Billing credit availability verified independently.
