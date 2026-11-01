# 08 — PostgreSQL Model, State Consistency, Security and Privacy

## Data strategy

PostgreSQL is the **canonical state**, not Redis, Pixi, Pinia, Socket.IO or in-memory singleton. Store compact state snapshot and immutable event ledger to support evidence explanations and robust reconnect. Use strong constraints rather than only JavaScript `if` checks. Run migrations explicitly.

## Minimum tables

| Table | Key fields / constraints / reason |
|---|---|
| `twitch_accounts` | `twitch_user_id` unique, display info, encrypted OAuth credential metadata, scopes, expiry, revoked status |
| `cases` | `(case_id, version)` unique, content hash, status, public metadata, private definition reference |
| `game_sessions` | `id`, `host_twitch_id`, `case_id`, pinned version/hash, `phase`, `revision` bigint, state JSONB, created/updated |
| `session_channels` | `(session_id, broadcaster_id)` unique, team role, co-host consent, join/revoke times |
| `processed_inputs` | canonical provider message ID unique, session ID, actor, action summary, result code, timestamp |
| `session_events` | `(session_id, revision)` unique, stable event id, type, sanitized payload, author, time |
| `contributions` | `(session_id, event_id, actor_id, kind)` unique, origin channel, evidence id, source event reference |
| `outbox` | `id`, event ID, destination, serialized filtered payload, attempts, next retry, published at |
| `overlay_credentials` | hashed token unique, allowed session and view, expiry, revoked at |
| `coop_invites` | hashed token, A/B Twitch account IDs, assigned roles, expiry, consent/decline state |
| `user_sessions` | opaque session ID hash, creator identity, expiry, CSRF/session keys management |

Useful indices: `(session_id, revision)`, pending outbox `(published_at, created_at)`, input dedupe uniqueness, channel ID lookup. Session access must be scoped by current participant or overlay credential, never only by guessable session ID.

## Transaction boundary (non-negotiable)

```text
BEGIN
  SELECT game_sessions WHERE id = ? FOR UPDATE
  enforce current role, phase, case version
  INSERT processed_inputs ON CONFLICT DO NOTHING
  IF duplicate: return previous committed result, don't transition
  apply deterministic reducer on the locked state
  UPDATE game_sessions SET snapshot=?, revision=revision+1
  INSERT session_events (session_id, revision, ...)
  INSERT contributions only for verified new fact/action
  INSERT outbox event with same revision
COMMIT
```

On invalid/blocked command, do not advance revision; decide bounded audit logging so adversarial spam does not fill database. Never send a broadcast before DB commit; if publisher crashes, retry outbox. Client deduplicates multiple deliveries.

## Versioning, snapshots and replay

- Pin `(case_id, version, content_hash)` when session is created; never edit canon mid-run.
- Snapshot stores **only** needed state: current scene, unlocked evidence ids, verified links, theory statuses, progress flags, remaining hint ladder, timers, team presence, revision.
- Event ledger stores accepted domain events; allow reconstruction/diagnosis, but don't require full event sourcing rebuild for every read.
- On restart, load snapshot, reestablish service connection, resume timers if defined; no fabricated lost EventSub events.
- Proof status is computed from server-private canon and accepted facts; no `isSolved=true` from client accepted blindly.

## Authorization and threat model

**Actors:** Twitch viewers (untrusted chat), host creators (authenticated but constrained), read-only OBS URLs (can leak), webhook/WebSocket provider messages (not trusted until adapter validation), database process (trusted with least privilege).

**Entry points:** OAuth callback, REST POST, Socket.IO auth/join, EventSub ingest, case data parser, overlay URL. Require validation everywhere. Harden headers, origin policy, CSRF, cookie attributes (`Secure`, `HttpOnly`, `SameSite`), TLS and CORS as needed. Avoid using URL query parameters for access tokens where they will be logged.

**Twitch OAuth:** use minimal scopes, encrypted storage at rest with managed app key, verify state; store and redact refresh tokens; reauthorize on revocation; ensure token rotation.

**OBS overlay:** treat URL as bearer secret; store hash only, restrict read-only view, rotate/revoke and hide from stream; don't embed admin JWT in browser source or show secret in captured demo. Overlay must not be able to start/pause, solve, invite or access private proof data.

**Viewers:** only authentic EventSub identities can earn chat contributions. Authenticate host actions separately and check role/CSRF. Whitelist commands/IDs; limit length, token count, frequency and active session; don't render raw rich HTML from chat. Preserve moderation policy and avoid publishing arbitrary abusive free text.

**Replay/messaging:** canonical message ID unique plus EventSub ID guard, connect source channel to correct team, avoid Twitch Shared Chat double-count. Rate-limit in DB/in-memory with bounded process resilience. For larger scale later use reliable shared limiter.

**Abuse:** protect invite tokens with random secret and expiry, explicit B consent, limited invite creation, don't allow cross-channel takeover. No untrusted arbitrary asset URL, unsafe SVG scripts or code execution in case definitions.

**Privacy:** minimum Twitch identifiers necessary for attribution, avoid unrelated chat collection, sanitized audit logs, documented retention/delete mechanism, explicit disclosure about names/credits, don't export raw private chat in Devpost materials. Protect minors and sensitive user data through data minimization. No default indefinite message history retention.

## Failure handling

| Failure | Recovery | Must never happen |
|---|---|---|
| Twitch EventSub lost | show disconnected/reconnecting; resubscribe; don't fabricate missing messages | fake continuity or invented viewer acts |
| Render deploy overlap | EventSub ingestion leader lock with fencing + idempotency; drain before SIGTERM | double event credit |
| DB transient timeout | don't commit answer; retry safe transactional operations; indicate temporary pause | client locally marks case solved |
| Socket.IO client drops | reconnect, fetch snapshot, handle revision gaps | stale board/replayed fresh reward |
| Case invalid | graceful case-invalid state + diagnostic log, preserve participant contributions | nonsensical fabricated answer |
| Co-host disconnect | continue safe independent work, freeze joint gate and checkpoint | assign fake partner action |
| Overlay credential leaked | immediate rotate/revoke scoped URL; no admin powers | account/token exposure |

## Security verification checklist

- [ ] OAuth state mismatch denied; callback URI exact.
- [ ] Session fixation and CSRF checked for host POST.
- [ ] Unauthorized client cannot join another session/team room.
- [ ] Overlay token cannot call mutation endpoints or see answer bundle.
- [ ] Case truth absent from Vite production JS/HTML/source maps/network JSON.
- [ ] Same Twitch message processed twice yields same result with one revision/credit.
- [ ] No stored raw access/refresh tokens in logs.
- [ ] E2E injection strings appear as harmless text or rejected input.
- [ ] Invite expires and explicit target B consent required.
- [ ] Old revoked OBS token stops receiving private session projection.
