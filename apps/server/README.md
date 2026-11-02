# Cluenite server

Fastify hosts the HTTP API, Twitch OAuth, Socket.IO and the production Vue build on one origin. PostgreSQL persists sessions, memberships, game revisions, idempotent input receipts and the event outbox. The shared deterministic engine validates every game transition.

From the repository root:

`pnpm --filter @cluenite/server run dev`

Use [setup](../../docs/setup.md) for PostgreSQL, environment keys and Twitch registration. Production startup applies migrations before listening on 0.0.0.0 and the configured PORT (default 10000). The built web app is served from apps/web/dist.

- [API and realtime contracts](../../docs/api.md)
- [Persistence, auth and recovery](../../docs/architecture.md)
- [Tests and integration boundaries](../../docs/testing.md)
- [Render deployment and operations](../../docs/deployment.md)

Host mutations require an authenticated cookie, the configured origin, CSRF and stable mutation keys. Overlay credentials are scoped, revocable and read-only. Twitch workers restore stored authorization, refresh encrypted tokens and retry temporary outages; revocation cancels the worker. Browser practice does not enter this persistence path.

Readiness checks database access, not actual Twitch chat delivery. Do not log cookies, tokens, private messages or authored proof rules. Production configuration has no fake-provider or development-control bypass.
