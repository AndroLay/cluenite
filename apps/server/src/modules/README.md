# Backend source layout

- `auth/`: OAuth callback, host session cookies, CSRF checks, and scoped OBS
  credentials.
- `db/`: PostgreSQL migrations, schema declarations, persistent round state,
  event history, deduplication, and transactional outbox.
- `twitch/`: Twitch API client, normalized chat messages, and EventSub socket
  lifecycle.
- `realtime.ts`: authenticated Socket.IO joins, host controls, and committed
  snapshot publishing.
- `index.ts`: configuration, migration, worker, HTTP, and shutdown lifecycle.

The engine remains deterministic and transport-independent in
`packages/engine`; the server must not duplicate case proof rules.
