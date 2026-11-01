# Server

Fastify is the single public HTTP entrypoint. Socket.IO attaches to the same
server and path; PostgreSQL is the durable store. The initial scaffold exposes
process and database health endpoints only. It does not implement Twitch OAuth,
EventSub, sessions, or game actions yet.

Keep domain code in `src/modules/<domain>` and transport adapters in
`src/plugins` or `src/adapters`. Only contracts, engine, and cases may be used
by the server runtime. Browser-only graphics must not be imported here.
