# API & Realtime Contracts — Functional Specification

All routes illustrative. Version `/api/v1`. Server uses bearer/session auth with CSRF/session protections, HTTPS, Zod validation. **OBS overlay scoped tokens are not host privileges.**

## Host REST API

| Method | Path | Access | Input | Output / effect |
|---|---|---|---|---|
| GET | `/auth/twitch/start` | public | `returnTo` allowlisted | OAuth redirect with `state` |
| GET | `/auth/twitch/callback` | OAuth redirect | `code`, `state` | secure session cookie |
| GET | `/api/v1/me` | host | none | Twitch connection/status |
| GET | `/api/v1/cases?mode=quick` | host | filters | only published verified case summaries |
| POST | `/api/v1/sessions` | host | `{caseId,mode}` | `sessionId`, revision 0 |
| POST | `/api/v1/sessions/:id/start` | host | `{requestId}` | starts case once |
| POST | `/api/v1/sessions/:id/actions` | host | normalized action + requestId | accepted/reason, latest revision |
| POST | `/api/v1/sessions/:id/pause` | host | reason | persistent paused state |
| POST | `/api/v1/sessions/:id/resume` | host | requestId | resume state |
| POST | `/api/v1/sessions/:id/finish` | host | partial/resolve | recap link |
| POST | `/api/v1/sessions/:id/overlay-token` | host | `scope` | opaque URL issued once |
| POST | `/api/v1/sessions/:id/invites` | host | intended Twitch user ID | invite URL, expiry |
| POST | `/api/v1/invites/:inviteId/accept` | intended B | approval | station joined after auth |
| GET | `/api/v1/sessions/:id/snapshot` | authorized | optional revision | permission-scoped view |
| GET | `/api/v1/sessions/:id/recap` | authorized | none | proof and credits summary |

## Chat command grammar

```
!look <node_id>
!scan <scan_target>  # field station only
!verify <reference_id>  # records station only
!share <already_verified_evidence_id>  # evidence-owning station
!link <evidence_id> <evidence_id>
!order <event_id> <event_id> [<event_id> ...]
!code <safe_short_answer>
!challenge <theory_id> <evidence_id>
!theory <theory_id>
!solve <case_answer_alias>
!hint
!help
```

Shortcut aliases in chat like `!link CAM ROUTE` resolve only if each object ID unambiguously maps to a single currently discovered evidence ID. If ambiguous, require full evidence IDs. Commands are recognized only in active session for the Twitch broadcaster room delivering the event. `!link` maps canonical unordered pair to authored relation when relation is symmetric; `!order` preserves order. Full Unicode free text is not accepted for deterministic answers by default.

## Inbound action example (normalized domain event)

```json
{
  "requestId": "twitch:room-123:message-987",
  "sessionId": "session-uuid",
  "source": "twitch_chat",
  "channelTwitchId": "room-123",
  "actorTwitchId": "user-456",
  "command": {"verb":"link","args":["CAM_R07","ROUTE_R07"]},
  "receivedAt":"2026-10-31T12:00:00Z"
}
```

Only trusted Twitch EventSub adapter may set `source=twitch_chat` and verified actor identity; reject this payload if a public user tries to post it directly.

## Outbound WS protocol

Client connects to `/realtime?scopeToken=...` (or credentialed host session), receives snapshot and `revision`, then incremental messages:

```
{type:'SNAPSHOT',sessionId,revision,view:{...}}
{type:'EVENT',sessionId,revision,eventType:'EVIDENCE_UNLOCKED',payload:{...}}
{type:'STATUS',sessionId,connection:'live|reconnecting|unavailable'}
{type:'SYNC_REQUIRED',sessionId,expectedRevision}
```

**Rule:** if `revision` != current+1, fetch snapshot. Do not trust client UI state for solution or proof. Use WS pings/heartbeat, bounded queue and backpressure; drop cosmetic updates before authoritative transitions. Host view may include private station draft state; public OBS gets only permitted projection.

## Failure codes

`NOT_CONNECTED`, `NOT_AUTHORIZED`, `INVALID_ACTION`, `OUT_OF_PHASE`, `COOLDOWN`, `DUPLICATE`, `INSUFFICIENT_PROOF`, `UNKNOWN_NODE`, `COHOST_REQUIRED`, `CASE_INVALID`, `SESSION_PAUSED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

Clients translate codes to calm, explicit messages. Never echo raw exception traces, OAuth credentials or unmoderated chat text to OBS.

## Idempotency

- Dashboard mutations require `requestId` unique per client attempt and round.
- EventSub notifications use `metadata.message_id` or another Twitch-delivered unique ID; chat message IDs dedupe underlying chat content when an event can surface across sessions/rooms.
- If duplicate action is received, return previous outcome and do not create extra contribution credit.
