# 07 — Twitch, OBS, HTTP API, Socket.IO and Typed Action Contracts

## Up-to-date external integration requirements (verify before deploy)

- Twitch OAuth authorization-code grant with state, PKCE where appropriate, server-only secret handling and exact registered redirect URI. Follow: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
- Chat input through EventSub **`channel.chat.message` v1**, under the provider's valid authorization scheme. For an initial broadcaster user-token integration, `user:read:chat` is relevant; independent cloud-bot app-token flows require additional bot/channel authorization as documented. Do **not** request write permissions until actually sending messages. https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
- EventSub WebSocket connects to `wss://eventsub.wss.twitch.tv/ws`, handles `session_welcome`, notification, keepalive, reconnect, revocation, close and *resubscribe after unexpected connection loss*. Twitch does not replay events lost in this gap: never fake missed chat. https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- OBS Browser Source reads a bounded, revocable overlay URL. Streamer interacts through dashboard. No stream recording, chat scraping or chat polling hacks needed.

## Authentication flows

### Creator OAuth

1. GET `/api/auth/twitch/start` sets signed anti-CSRF `state` (and PKCE verifier if used), redirects to Twitch authorization endpoint with explicitly selected scopes.
2. Twitch redirects to `/api/auth/twitch/callback`; backend checks state, exchanges code, fetches verified Twitch account, stores encrypted token server-side and issues HttpOnly Secure session cookie.
3. Frontend gets `/api/me` (only non-secret profile and permission flags); code/refresh token never goes into URL after callback.
4. Refresh token with safe rotation and reauthorization path when needed; revoke and cleanly disconnect subscription on logout or loss of permission.

### Viewer input

No Cluenite login. The subscriber event supplies `chatter_user_id`, message ID, delivered broadcaster and optional Shared Chat original source. Normalized `ChatActionEnvelope` is produced only by validated provider adapter. A public browser may not forge a `chat` action.

### OBS credential

Creator clicks 'Create OBS overlay URL'. Server generates crypto-random opaque token, stores hash and grants read-only projection to exactly one session and view. Overlay token is **not** a host login; rotate/revoke from dashboard. Sensitive profile/case truth cannot be requested using this token. HTTPS always.

## Normalized inbound contract (TypeScript example)

```ts
interface ChatActionEnvelope {
  provider: 'twitch';
  eventsubMessageId: string;
  twitchMessageId: string;
  sourceMessageId?: string;
  broadcasterId: string;          // subscription delivery room
  originBroadcasterId: string;    // Shared Chat original source when provided
  actorTwitchId: string;          // Twitch-supplied verified user
  receivedAt: string;             // UTC ISO timestamp
  text: string;                   // full input, max parse length enforced
}

type GameAction =
  | { type: 'inspect'; nodeId: string }
  | { type: 'link'; leftId: string; rightId: string }
  | { type: 'order'; eventIds: string[] }
  | { type: 'decode'; code: string }
  | { type: 'propose_theory'; theoryId: string }
  | { type: 'challenge'; theoryId: string; evidenceId: string }
  | { type: 'submit_verdict'; verdictId: string }
  | { type: 'scan'; targetId: string }
  | { type: 'verify'; referenceId: string }
  | { type: 'share'; evidenceId: string };
```

`!look A`, `!inspect A`, `!link A B`, `!order B A C`, `!code 241`, `!theory T1`, `!challenge T1 E4`, `!solve ROBOT`, `!scan P4`, `!verify B17`, `!share E3`, `!hint`, `!help` are grammar aliases. Case-local IDs only; bounded tokens/length. Empty, unrelated or malformed chat should not flood main OBS panel.

### Shared Chat dedup

Canonical idempotency key uses provider + `source_message_id` if present, else original broadcaster + Twitch message ID; EventSub notification ID is an additional unique transport replay guard. The original source channel selects Team A/B. Do not confuse delivered subscription channel with originating channel. Non-Shared Chat events still preserve session broadcaster ID and verified actor ID.

## HTTP API (proposal; names may adjust consistently)

| Route | Auth | Meaning |
|---|---|---|
| `GET /health/live` | public | Process liveness, no secrets |
| `GET /health/ready` | public | HTTP/DB readiness, conservative Twitch status separate |
| `GET /api/me` | host cookie | Identity and authorized permissions |
| `GET /api/auth/twitch/start` | public | Begin verified OAuth |
| `GET /api/auth/twitch/callback` | Twitch redirect | Complete OAuth / anti-CSRF |
| `POST /api/sessions` | host cookie | Create pinned case session; idempotent request |
| `POST /api/sessions/:id/start` | host | Start session |
| `POST /api/sessions/:id/pause` | host | Pause server timers/action intake |
| `POST /api/sessions/:id/resume` | host | Resume after valid state check |
| `POST /api/sessions/:id/stop` | host | Cancel/partial with checkpoint |
| `POST /api/sessions/:id/verdict` | host | Submit verdict against proof requirements |
| `GET /api/sessions/:id/snapshot` | host/overlay scoped | Only permitted public projection |
| `POST /api/sessions/:id/overlay-credential` | host | Issue/rotate scoped read token |
| `POST /api/coops/invitations` | host | P1 invite to another Twitch account |
| `POST /api/coops/invitations/:id/accept` | authenticated target B | Explicit accept P1 |

All POST mutations use CSRF/session authorization as appropriate plus idempotency key and strict Zod schema. Do not expose direct 'unlock evidence' endpoint to anonymous browsers. Connection setup statuses should remain queryable for diagnosis, but no tokens visible.

## Snapshot projection contract

```ts
interface ClientSnapshot {
  sessionId: string;
  caseId: string;
  caseVersion: string;
  revision: number; // monotonic, server assigned
  phase: 'READY'|'ACTIVE'|'PAUSED'|'RESOLVED'|'PARTIAL'|'CANCELLED';
  connection: 'ONLINE'|'RECONNECTING'|'REVOKED';
  currentObjective: string;
  sceneId: string;
  visibleEvidence: Array<{id: string; title: string; text: string; sourceTeam?: string}>;
  verifiedLinks: Array<{from: string; to: string; relationId: string}>;
  publicTheories: Array<{id: string; status: 'UNVERIFIED'|'CONTRADICTED'|'SUPPORTED'}>;
  availableActions: string[];
  view: 'HOST'|'OVERLAY'|'FIELD'|'RECORDS'|'SHARED';
  recentBreakthroughs: Array<{eventId: string; label: string}>;
}
```

No private solution/answer map in public projection even if hidden in CSS or source map. Clients cannot 'unlock' via local state.

## Socket.IO room and events

Room names are implementation details, *authorization is required at join*:

- `session:{id}:shared`, `session:{id}:host`, `session:{id}:team:A`, `session:{id}:team:B`, `session:{id}:overlay:{view}`.
- `session:delta`: `{ sessionId, previousRevision, revision, changes, cues, eventId }`.
- `session:resync-required`: `{ sessionId, expectedRevision, serverRevision }`.
- `connection:status`: `{ provider: 'twitch', state, since }`.

Client rule: apply delta only when `previousRevision === currentRevision`; ignore stale repeated event/revision; on gap, fetch authorized snapshot and reconcile. After reconnect, fetch snapshot **even if Socket.IO recovered some packets**. Presentation animation should not replay as a new award when snapshot already includes event.

## Errors (typed, human-readable)

| Code | Cause | User-facing behavior |
|---|---|---|
| `TWITCH_RECONNECTING` | EventSub source interrupted | connection chip; no fictitious messages |
| `AUTH_REVOKED` | Twitch scopes revoked | host reauthorize button |
| `PAUSED` | Host paused current case | muted paused overlay, chat actions ignored |
| `NOT_AVAILABLE` | Hidden/unreachable clue | subtle 'not available yet' without answer spoiler |
| `ALREADY_KNOWN` | duplicate proven relationship | no duplicate animation/credit |
| `VERDICT_UNPROVEN` | guess correct without enough evidence | show missing **kind** of proof |
| `CONTENT_INVALID` | case logical failure | stop gracefully, log/report error, no fabricated solve |
| `REVISION_GAP` | missed socket updates | snapshot resync and clean visual state |
| `RATE_LIMITED` | spam/overload | muted or bounded feedback; never flood public chat |

## EventSub rollout and connectivity tests

Use Twitch's official test tools where practical, but **a mocked event is not proof of live chat**. Record live viewer event (with PII redacted in public logs), its canonical message ID, accepted domain transition, DB revision and visible OBS result. Force Twitch socket close and verify resubscription and truthful gap indicator. Revoke OAuth and confirm no further game input credited.
