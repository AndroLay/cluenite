# State Machine, Concurrency, Timing, Recovery

## Domain session state

`prepared` → `running` → `paused`/`reconnecting` → `running` → `resolved` or `ended_partial`; any pre-published invalid content can lead to `invalid` with no winner. A resolved session is immutable except display settings.

## Allowed transitions

| From | Input | To | Preconditions |
|---|---|---|---|
| prepared | host.start | running | Twitch connected (or explicit DEMO mode), validated case |
| running | host.pause | paused | host authenticated |
| paused | host.resume | running | host, desired adapter available |
| running | websocket.lost | reconnecting | automatic detection; save state |
| reconnecting | websocket.restored | running or paused | idempotent sync; host preference |
| running | case.verdict.verified | resolved | proof satisfied and final truth correct |
| running/paused/reconnecting | host.stop | ended_partial | checkpoint persisted |
| running | content.invalid | invalid | consistent failure with incident ID |

## Concurrency

All chat-originated actions targeting one session are serialized under session revision. A database transaction acquires a row or uses compare-and-swap `revision`, checks proof against latest state, inserts domain events and materialized state. Contestants never run their own proof validation locally.

## Timers

- Store `remaining_ms` and `deadline_at` on server; when paused, subtract elapsed server time, clear deadline; when resumed, restart using remaining.
- Late EventSub messages received after deadline are not accepted as if prior; optional `grace_ms` defined at case start. Display fairness note.
- Never use client `setTimeout` to decide who won; client timer merely approximates server.
- Co-op joint checks have no 5-second confirmation gate; instead they remain pending until both required station outputs arrive, or host pauses.

## Event durability

Sequence per accepted command: validate source/event ID → DB transaction → check current node state → apply one or more domain transitions → commit log/credits/projection revision → publish WS. A dropped WS frame does not drop the DB write. Subsequent clients request snapshot.

## Failure modes

1. **Twitch EventSub duplicates:** unique notification/message IDs; second event yields no new transition.
2. **Twitch EventSub unavailable:** display honest status; wait/reconnect; optionally stop round.
3. **Backend restart:** process resumes sessions from DB, re-establishes Twitch subscriptions, re-publishes snapshots. Initial running rounds may come back paused to avoid unfair timer loss.
4. **Browser source reload:** fetch snapshot; animate only transitions newer than last synchronized revision, avoid replaying entire reveal upon refresh unless manually requested.
5. **Co-host drop:** preserve station A/B results and block only joint gate; independent tasks continue where authored.
6. **Host loses credentials:** freeze control and require OAuth reconnect; don't show hidden solutions.
7. **Case graph has impossible prerequisite:** prevent publication; if found live, mark case invalid and preserve activity ledger, no fake solved status.
8. **Two viewers submit same link simultaneously:** only one link state transition, duplicate credit policy deterministic.

## Recovery playbook

- Any restart → `GET snapshot` and `GET connection status` on dashboard; compare revision with event log, reconcile if needed.
- After co-host reconnect, verify intended Twitch ID and station membership before reopening controls.
- During demo, provide a **manual recover connection** button for host; never ask viewers to log into app.
- Failed overlay token: rotate from host session, replace OBS source URL, invalidate leaked old token.
