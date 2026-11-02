# API and realtime contracts

The implemented HTTP and Socket.IO interfaces are defined by [shared contracts](../packages/contracts/src/index.ts), [auth routes](../apps/server/src/auth/routes.ts), [realtime handlers](../apps/server/src/realtime.ts), and the [round repository](../apps/server/src/db/roundRepository.ts). Keep producers and consumers compatible when adding fields.

OAuth browser outcomes redirect to `/connect?result=<code>` when HTML is preferred. Codes are `connected`, `denied`, `invalid`, `state_rejected`, `unavailable`, and `exchange_failed`. The query is a presentation hint; always confirm login with `GET /api/me`. JSON callers retain JSON errors. Callback responses use no-store and never echo provider errors or credentials.

HTTP overload returns `503 {"error":"server_busy"}` with `Retry-After: 1`; rate limits return `429` with a seconds-based `Retry-After`. Retry with backoff and the same mutation key. Twitch commands rejected during overload need a fresh chat send after recovery.

## Transport and authority

- One Fastify HTTP server and Socket.IO server share the same public origin. Socket.IO path: `/socket.io`.
- PostgreSQL owns persisted round state and revision. The engine in `packages/engine` owns all deterministic rules. Browser state is a projection of public snapshots; clients cannot submit truth, proof, Twitch actor identity, or team identity.
- Viewer gameplay arrives through Twitch EventSub, not a public HTTP viewer-command endpoint. The adapter validates and normalizes Twitch messages before `PostgresRoundRepository.applyInput()`.
- Host mutations require the `cluenite_session` HttpOnly cookie, a matching `Origin`, and `X-CSRF-Token` from `/api/me`. Mutating REST calls also require `Idempotency-Key` where listed.
- Read-only overlay HTTP reads use `Authorization: Bearer <overlay-token>`. Socket.IO overlay authentication uses `auth: { overlayToken }`. The overlay URL returned by the server puts the credential in the URL fragment; browser code reads it locally. Overlay credentials are session- and view-scoped, revocable, and read-only.
- Socket handshakes require an `Origin` matching configured `PUBLIC_ORIGIN`. If the browser omits `Origin` on same-origin polling requests, the server accepts only a credential-free `Referer` whose origin exactly matches `PUBLIC_ORIGIN`. A present but mismatched `Origin`, a foreign/malformed `Referer`, or both headers missing is rejected. Host sockets use the host cookie; overlay sockets use `overlayToken`. A host or overlay must also remain active in PostgreSQL.
- Invalid/unauthorized overlay snapshot reads deliberately return `404 session_not_found`, avoiding disclosure that a session exists.

## HTTP API

### Health and static app

| Method and path                | Auth | Actual response                                                                    |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------- |
| `GET /health/live`             | None | `200 {"status":"ok"}` when the process handles the request.                        |
| `GET /health/ready`            | None | `200 {"status":"ready"}` after `SELECT 1`; otherwise `503 {"status":"not-ready"}`. |
| `GET /` and built static paths | None | Served from `apps/web/dist` when that directory contains `index.html`.             |

### Twitch OAuth and host session

| Method and path                                | Auth                                | Actual response / failures                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/twitch/start`                   | None                                | Sets `cluenite_oauth_state` HttpOnly/SameSite=Lax cookie for 10 minutes and redirects to Twitch with `user:read:chat`. `503 {error:"twitch_oauth_not_configured"}` when Twitch OAuth is unavailable.                                                                                                                                                           |
| `GET /api/auth/twitch/callback?code=…&state=…` | State cookie + matching query state | On success validates the Twitch token and identity, saves encrypted tokens, sets `cluenite_session`, clears OAuth state, and redirects to `PUBLIC_ORIGIN`. State mismatch: `403 oauth_state_rejected`. Invalid/denied callback: `400 twitch_authorization_failed`; Twitch not configured: `503`; provider/exchange failure: `502 twitch_authorization_failed`. |
| `GET /api/me`                                  | Host cookie                         | `200 {authenticated:true, profile:{login,displayName}, twitch:{connected:true,chatStatus}, csrfToken, expiresAt}`. Missing/expired/revoked host session: `401 authentication_required`. `chatStatus` is a worker status string, not proof of a real Twitch message.                                                                                            |
| `POST /api/auth/logout`                        | Host cookie + same Origin + CSRF    | `204`; revokes the current host session, clears cookie. Failures use `401 authentication_required`, `403 origin_rejected`, or `403 csrf_rejected`.                                                                                                                                                                                                             |
| `POST /api/auth/twitch/disconnect`             | Host cookie + same Origin + CSRF    | `200 {disconnected:true, providerRevocation}`; `providerRevocation` is `confirmed`, `already_invalid`, `unconfirmed`, or `unconfigured`. Revokes local Twitch tokens/sessions and pauses active host sessions.                                                                                                                                                 |
| `GET /api/cases`                               | None                                | `200 {cases:[{id,version,mode,title,premise,question,clues:[{id,label,teaser,team}],verdicts:[{id,label}]}]}`. Public metadata only; it excludes private proof rules and accepted truth. Note: current registration is inside the auth-configured route module, so this endpoint is absent when session/encryption keys are not configured.                    |

### Sessions and host controls

`Idempotency-Key` must match `^[A-Za-z0-9_-]{16,128}$`. Host mutation requests also require same-origin and CSRF headers.

| Method and path                                      | Auth                                                                 | Body / response                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/sessions`                                  | Authenticated host cookie                                            | Query `status=open` (default) or `all`, `limit=1..50` (default 20). `200 {sessions:SessionSummary[]}`: participant metadata only, latest first, with role/team and explicit `needsRejoin`. Discovery does not restore consent. Bad/unknown query: `400 invalid_session_query`; database failure: `503 session_list_unavailable`.                                                      |
| `POST /api/sessions`                                 | Host mutation                                                        | Body `{caseId}`. `201 {snapshot}`. Missing/invalid key: `400 valid_idempotency_key_required`; invalid body: `400 invalid_session_request`; unknown case: `404 case_not_found`; same key with different create request: `409 idempotency_conflict`; unexpected failure: `500 session_creation_failed`.                                                                                 |
| `POST /api/sessions/:sessionId/:action`              | Host mutation                                                        | Actions: `start`, `pause`, `resume`, `restart`, `stop`. `200 {result:CommandResult}`. Invalid ID/key: `400`; unknown action or session: `404`. The result is persisted by session, authenticated host, and control action type. Exact retries return the original result; reusing the key for another action returns `IDEMPOTENCY_CONFLICT` at the current revision without mutation. |
| `GET /api/sessions/:sessionId/snapshot`              | Host participant cookie **or** bearer overlay token for that session | `200 {snapshot:RoundSnapshot}`. Bad ID: `400 invalid_session_id`; absent, unauthorized, revoked, or wrong-session overlay: `404 session_not_found`.                                                                                                                                                                                                                                   |
| `POST /api/sessions/:sessionId/overlay-credential`   | Host mutation                                                        | Requires idempotency key. `201 {url,expiresAt}`; URL is `/?mode=obs&session=<id>#overlay=<opaque-token>`. Key replay: `409 {error:"overlay_credential_already_issued",rotate_with_new_key:true}`. Invalid ID/key: `400`; unauthorized session: `404 session_not_found`. A new credential rotates the previous credential for that participant's view.                                 |
| `DELETE /api/sessions/:sessionId/overlay-credential` | Host mutation                                                        | `200 {revoked:true}` or `404 session_not_found`; revokes the participant's current team view credential.                                                                                                                                                                                                                                                                              |

Host control result object:

```json
{
  "code": "ACCEPTED_NEW",
  "reason": null,
  "message": "Round paused.",
  "missing": [],
  "revision": 4
}
```

Actual result codes: `ACCEPTED_NEW`, `ACCEPTED_ALREADY_KNOWN`, `INVALID`, `NOT_AVAILABLE`, `RATE_LIMITED`, `NOT_AUTHORIZED`, `IDEMPOTENCY_CONFLICT`, `PAUSED`, `CONTENT_ERROR`. The `reason` is nullable and restricted to `packages/contracts/src/index.ts`; the idempotency conflict uses `IDEMPOTENCY_KEY_REUSED`. `missing` exposes proof categories only, never authored truth. A transition increments `revision`; rejected, conflicting, duplicate, or already-known actions do not.

### Co-op invitations and recovery

| Method and path                                 | Auth                                                                                  | Body / response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/coops/invitations`                   | Host mutation by Team A                                                               | Body `{sessionId,inviteeLogin}` or legacy `{sessionId,inviteeTwitchId}`, exclusively. `201 {inviteId,expiresAt,token,url,invitee?}`; token returned once in the agreed fragment-only link; sanitized `invitee` is included for username lookup. Missing session/user: `404`; invalid request/key: `400`; replay/conflict: `409`; absent account: `409 twitch_reauthorization_required`; temporary lookup/recovery: `503`, with `Retry-After: 2` for `twitch_connection_recovering`. Preserve the same retry key. |
| `POST /api/coops/invitations/:inviteId/accept`  | Authenticated Twitch broadcaster; must be the named invitee; CSRF and idempotency key | Body `{token}`. `200 {accepted:true,sessionId,revision,alreadyAccepted}`. Expired: `410 coop_invite_expired`; invalid ID/key/token: `400`; unavailable invite: `404 coop_invite_not_available`; conflict: `409 coop_invite_conflict`. Acceptance adds Team B and advances session to `READY`.                                                                                                                                                                                                                    |
| `POST /api/coops/invitations/:inviteId/decline` | Authenticated Twitch broadcaster; must be the named invitee; CSRF and idempotency key | Body `{token}`. `200 {declined:true,sessionId,alreadyDeclined}`. Expired: `410`; invalid ID/key/token: `400`; unavailable invite: `404`; conflict: `409`.                                                                                                                                                                                                                                                                                                                                                        |
| `POST /api/coops/sessions/:sessionId/rejoin`    | Authenticated former Team B broadcaster; CSRF and idempotency key                     | `200 {snapshot,alreadyRejoined}`; unavailable session/membership: `404 coop_session_not_available`. The current route validates a key but the repository operation is naturally idempotent and does not persist that key.                                                                                                                                                                                                                                                                                        |
| `GET /api/ops/diagnostics`                      | Host cookie (read-only)                                                               | `200 {capturedAt,database:{healthy:true},twitch:{status,activeSubscriptions,lastNotificationAt},sessions:[{sessionId,caseId,phase,revision,pendingOutboxCount}],pendingOutboxCount}`. Current `database.healthy` is a constant after the DB query succeeds; use `/health/ready` for readiness.                                                                                                                                                                                                                   |

## Socket.IO contract

All payloads are runtime-validated with Zod. Rate limits: host command/control max 5 events per socket per 5 seconds; resync max 3 requests per socket per 5 seconds. Expired or revoked principals are disconnected.

### Client to server

| Event             | Payload                              | Acknowledgement / effect                                                                                                                                                                                                |
| ----------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session:join`    | `{sessionId}`                        | Ack `{ok:true,snapshot}` or `{ok:false,code}`. Host must be a session participant; overlay must match the credential's session and view. Successful join enters only that principal's team room.                        |
| `session:resync`  | `{sessionId,currentRevision}`        | If authorized, server emits `session:resync-required` with `{sessionId,expectedRevision:currentRevision+1,serverRevision}`. It does not send the snapshot in that event; fetch `GET /api/sessions/:sessionId/snapshot`. |
| `session:command` | `{sessionId,text,idempotencyKey?}`   | Host only. Ack `CommandResult`; overlay gets `NOT_AUTHORIZED`. The engine accepts the authored commands listed above.                                                                                                   |
| `session:control` | `{sessionId,action,idempotencyKey?}` | Host only. Ack `CommandResult`; action is `start`, `pause`, `resume`, `restart`, or `stop`.                                                                                                                             |

For either host mutation, a supplied `idempotencyKey` must match `^[A-Za-z0-9_-]{16,128}$`. The server persists a SHA-256 fingerprint of a sorted canonical payload containing session, authenticated actor, mutation type, command text/control action, the key, and applicable source, channel, broadcaster, or source-message metadata. Exact retries return the original `CommandResult` and do not increment revision. A reused key with a different payload returns `{code:"IDEMPOTENCY_CONFLICT",reason:"IDEMPOTENCY_KEY_REUSED",message:"This idempotency key was used for a different request.",missing:[],revision:<current>}` and does not mutate state. Key scope includes session, authenticated actor, and command-versus-control type. Authorization and team membership checks run before lookup, so another principal never receives the cached result. If omitted, the server creates a fresh key to preserve compatibility with older clients, but the event is not retry-safe. Persisted input and state changes share a PostgreSQL transaction; the session row lock serializes concurrent requests. Legacy rows without fingerprints can be replayed only when the authenticated actor matches and the stored action summary is shorter than 120 characters and exactly matches. A 120-character summary is treated as unverifiable and returns `IDEMPOTENCY_CONFLICT`, since its original suffix was not persisted. Shorter legacy rows retain only the fields written by the old schema and cannot retroactively validate metadata that was never stored; full canonical comparison applies to rows written with a fingerprint.

**Deployment constraint:** migration `0005_processed_input_fingerprint` is additive and nullable, but concurrent old and new server binaries do not provide the same idempotency guarantees. Drain old mutation handlers before the new version starts accepting mutations; old binaries do not persist request fingerprints or use the actor-scoped request IDs.

### Server to client

| Event                     | Payload                                                      | Notes                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session:snapshot`        | `RoundSnapshot`                                              | Full team-scoped snapshot; emitted at join and alongside every committed transition during client migration.                                                                          |
| `session:delta`           | `{sessionId,previousRevision,revision,changes,cues,eventId}` | Delta fields use `set`/`remove`; `cues` is currently empty. Durable outbox delivery is at-least-once; clients must deduplicate by event/revision and resync on a gap.                 |
| `session:resync-required` | `{sessionId,expectedRevision,serverRevision}`                | Client should fetch authoritative REST snapshot and replace local state.                                                                                                              |
| `connection:status`       | `{provider:"twitch",state,since}`                            | `state` is `ONLINE`, `RECONNECTING`, `OFFLINE`, or `REVOKED`; `since` is an ISO timestamp or null. Twitch EventSub worker state is separate from browser Socket.IO connection health. |

The delta publisher emits to `session:<id>:team:A` and `session:<id>:team:B`; the outbox stores both public team projections. Snapshot `team`, clues, evidence, and available actions are filtered by authored station/team visibility. Shared evidence becomes visible to both after the engine verifies `!share`/joint proof. Case proof rules, expected answers, and contribution ledger never appear in a snapshot.

### Snapshot shape

`RoundSnapshot` is defined by `roundSnapshotSchema` in `packages/contracts/src/index.ts`. Fields include `protocolVersion:1`, `revision`, `sessionId`, `source`, `caseId`, `caseMode`, `team`, public title/premise/question, `phase`, `stage`, `paused`, `timer:{elapsedMs,running}`, visible clues, evidence, sequences, theories, current authored hint, hint level, available actions, verdict choices, accepted `chosenVerdictId` only after solve, and `revealText` only after solve.

The public progress fields are:

- `evidence`: `[{id,label,team,shared}]`, filtered to the viewer's team and shared evidence.
- `sequences`: `[{id,label,complete,events?}]`; `events` are unordered public choices. The expected order is never sent.
- `theories`: `[{id,label,status}]`, where status is `UNVERIFIED`, `CONTRADICTED`, or `SUPPORTED`.
- `currentHint`: current hint text or `null`; `hintLevel`: number of hints revealed.
- `availableActions`: values are `look`, `link`, `order`, `code`, `theory`, `challenge`, `scan`, `verify`, `share`, `solve`, and `hint`. They are derived from state and team visibility: look needs an uninspected visible clue; link needs an authored relation between visible unlocked evidence; order needs an incomplete sequence with its prerequisites; code/theory remain available while authored entries remain; challenge needs a proposed theory and visible challenge evidence; scan/verify/share are team-scoped; solve appears only when proof is complete; hint appears while hints remain. Paused, resolved, or invalid rounds have no available actions.
- There is no public proof predicate or boolean. A `CommandResult.missing` list contains proof categories only.

`CommandResult` is `{code,reason,message,missing,revision}`. Result codes are `ACCEPTED_NEW`, `ACCEPTED_ALREADY_KNOWN`, `INVALID`, `NOT_AVAILABLE`, `RATE_LIMITED`, `NOT_AUTHORIZED`, `IDEMPOTENCY_CONFLICT`, `PAUSED`, and `CONTENT_ERROR`. Reasons are `BAD_SYNTAX`, `INPUT_TOO_LONG`, `TOO_MANY_TOKENS`, `UNKNOWN_COMMAND`, `UNKNOWN_TARGET`, `AMBIGUOUS_TARGET`, `NOT_UNLOCKED`, `NO_CONNECTION`, `SAME_TARGET`, `UNKNOWN_VERDICT`, `VERDICT_NOT_SUPPORTED`, `VERDICT_UNPROVEN`, `ROUND_RESOLVED`, `SEQUENCE_INVALID`, `CODE_INVALID`, `UNKNOWN_THEORY`, `CHALLENGE_UNSUPPORTED`, `TEAM_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `SHARE_NOT_ALLOWED`, and `HINTS_EXHAUSTED`; `reason` may be `null`.

Do not infer allowed actions from labels: gate controls against `availableActions`, `phase`, `paused`, and the server result. `availableActions` is derived from current state: it is empty for paused, resolved, or invalid rounds; link and sequence actions require visible authored prerequisites; co-op station/share actions are team-scoped; solve appears only after proof is complete; and hint appears while hints remain. The server still validates every command, so this field is a UI affordance rather than authorization. `expectedOrder`, accepted verdicts, proof predicates, unrevealed observations, and private case explanation are never part of the schema.

## Q01 request path from real authored code

Case registration is `Q01_GALLERY_SHADOW`, version 1, mode `quick`. Use the **evidence IDs**, not clue IDs, for `!link`:

```text
Host creates: POST /api/sessions {"caseId":"Q01_GALLERY_SHADOW"}
Snapshot:      phase READY, team A, clues CAM / ACCESS / SCHEDULE; proof is absent
Host starts:   POST /api/sessions/<sessionId>/start
Viewer chat:   !look CAM                 -> unlocks CAM_R07
Viewer chat:   !look SCHEDULE            -> unlocks SCHEDULE_R07
Viewer chat:   !link CAM_R07 SCHEDULE_R07 -> authored link accepted
Host command:  !solve ROBOT              -> only accepted after proof
Overlay:       next authorized snapshot contains phase RESOLVED, chosenVerdictId ROBOT,
               and the authored revealText
```

`!solve ROBOT` before those facts returns `INVALID / VERDICT_UNPROVEN`, does not increment revision, and only names missing evidence categories. Repeating an already processed Twitch EventSub message ID returns its persisted result. The engine proof is in `packages/cases/src/q01GalleryShadow.ts`; the persistent transition path is `TwitchConnectionManager.processChat()` → `PostgresRoundRepository.applyInput()` → transactionally stored event/outbox → `session:delta` and `session:snapshot`.

## Environment names and known contract limitations

The source currently parses `DATABASE_URL`, `PUBLIC_ORIGIN`, `PORT`, `NODE_ENV`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI`, `SESSION_SIGNING_SECRET`, `DATA_ENCRYPTION_KEY` (base64 for exactly 32 bytes), `OVERLAY_TOKEN_SIGNING_KEY`, `CLUENITE_DEV_CONTROLS`, and `TWITCH_ADAPTER`. Production requires valid Twitch config, keys, DB URL, and `TWITCH_ADAPTER=twitch`. This is the implemented spelling in `apps/server/src/config.ts`; the v3 reference's `PUBLIC_BASE_URL`, `SESSION_SECRET`, `OAUTH_TOKEN_ENCRYPTION_KEY`, and `OVERLAY_TOKEN_HASH_PEPPER` names are not aliases in the current source.

Compatibility notes for future additions:

1. Keep current fields/routes/events unchanged for the frontend handoff. Add optional fields first; coordinate any required-field or event-semantic change here before implementation.
2. Socket.IO host command and control payloads accept an optional stable `idempotencyKey`. New clients should generate one per logical mutation and reuse it only for retries of the same payload. A different payload with the same key returns `IDEMPOTENCY_CONFLICT`. Legacy clients may omit it, but those events are not retry-safe.
3. Diagnostics' `database.healthy` should not be treated as a replacement for `/health/ready`.
4. Token credentials, host cookies, private case rules, raw Twitch messages, and private viewer chat must never enter this document or browser bundle.
