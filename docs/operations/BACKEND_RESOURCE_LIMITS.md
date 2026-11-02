# Backend resource limits and overload recovery

**Verified locally:** 2 November 2026, 12:28 UTC. Scope is one Node process with the current authored cases. Frontend wiring and deployment remain separate.

The server rejects excess work before expensive database/provider operations instead of building an unlimited application queue. Existing authentication, proof, idempotency, and read-only overlay boundaries remain in force. No new dependency, schema migration, or service is introduced.

## Current budgets

| Boundary             | Budget and behavior                                                                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API work             | At most 32 admitted API handlers per process. Excess work returns `503 {"error":"server_busy"}` with `Retry-After: 1`, before body parsing/auth/database work. Existing per-peer/API/OAuth and per-account mutation rate limits still apply.                                                              |
| Readiness            | Two concurrent database readiness probes, independently of API capacity. Excess probes return 503 `not-ready`; `/health/live` remains a cheap liveness check.                                                                                                                                             |
| HTTP transport       | 512 TCP connections, 10-second header timeout, 15-second request-receipt timeout, five-second keep-alive timeout, and 1,000 requests per socket. Receipt timeout is not cancellation of an already running handler.                                                                                       |
| Socket transport     | Admission at 256 Engine.IO clients, eight concurrent namespace authentication checks, 10-second namespace connect timeout, and a 16 KiB inbound payload limit. Existing polling transport and origin/auth checks are preserved.                                                                           |
| Socket work          | 16 concurrent expensive socket operations, at most two per socket. Join and resync are each limited to three attempts/five seconds; existing host command/control limits remain. Invalid acknowledgement arguments are ignored instead of throwing from event listeners.                                  |
| Session revalidation | Every 30 seconds, with four concurrent checks, shared-credential deduplication, and no overlapping sweeps. Close prevents new checks; an existing query can finish within the database timeout. Mutating/reading socket operations still check authorization independently.                               |
| Twitch startup       | Four concurrent account starts. Reconciliation discovers missing/stopped workers and preserves an existing worker's scheduled reconnect/backoff and exhausted retry budget.                                                                                                                               |
| Twitch commands      | 16 concurrent database-bound commands per manager, at most four per origin channel, in addition to the existing actor limiter. There is no pending in-memory chat queue. See rejection/recovery below.                                                                                                    |
| Realtime outbox      | Existing batches of 50 and no overlapping publisher runs. Empty/error polls back off to one second; a nonempty batch resets polling to 250 ms. First discovery after idle can add up to one polling second, plus database/transport time. Both delta and snapshot events remain for client compatibility. |
| PostgreSQL           | Pool of 10 connections; acquisition timeout five seconds, client query timeout 15 seconds, server statement timeout 10 seconds, lock timeout three seconds, and idle-in-transaction timeout 10 seconds. Idle pool errors produce a fixed sanitized warning instead of an unhandled error event.           |
| Startup migrations   | Transaction-local 30-second lock, 60-second statement/idle-transaction, and 65-second per-query client budgets. Commit/rollback restores ordinary request settings. Concurrent startup does not inherit the three-second interactive lock budget.                                                         |
| Logging              | Routine per-request info logging is disabled on the application server to avoid two log writes per normal request. Startup, explicit failure, and safe error diagnostics remain enabled. No raw credentials or chat payloads are added to logs.                                                           |

Budgets live in `apps/server/src/index.ts`, `ops/httpPolicy.ts`, `ops/workBudget.ts`, `db/pool.ts`, `db/migrate.ts`, `realtime.ts`, and `twitch/connectionManager.ts`. They are intentional operating defaults, not a measured production capacity or new user-facing configuration surface.

The implementation uses the documented [Fastify server controls](https://fastify.dev/docs/v5.4.x/Reference/Server/), [node-postgres pool error handling](https://node-postgres.com/apis/pool), and [PostgreSQL 18 session timeouts](https://www.postgresql.org/docs/18/runtime-config-client.html). These mechanisms do not constitute a performance certification.

## Client retries and chat overload

For HTTP 429/503, respect `Retry-After`, use backoff, and retain the original mutation idempotency key. A rejected request has not been admitted to the handler. A disconnected client does not cancel already started database work; admitted work retains its slot until response processing. The database/provider timeouts bound those operations. Do not retry a mutation with a new key to disguise an uncertain outcome.

Socket join/command/control overload returns the existing `RATE_LIMITED` code. Resync may be ignored while saturated; retry with backoff and fetch the authorized snapshot after recovery. Clients must preserve explicit idempotency keys and revision-gap recovery.

When a Twitch command exceeds the work budget, it is **rejected before database processing**, not accepted or durably queued. The broadcaster's existing connection status temporarily becomes `error`/`OFFLINE`, and authenticated `GET /api/ops/diagnostics` includes:

```json
{
  "twitch": {
    "chat": { "inFlight": 0, "rejected": 1, "overloaded": false }
  }
}
```

`chat` is present when the real Twitch manager supplies diagnostics. `rejected` counts work-budget rejections, not ordinary non-command messages or the separate actor limiter. It survives worker replacement within this process and resets with a process restart; it is not durable gameplay history. Normal status returns when that worker drains, or within one second for a rejected worker that had no work of its own. No provider reconnect or fresh OAuth is required solely for this transient overload. Provider lifecycle status/revocation remains authoritative.

The rejected viewer must send the command again after recovery. No receipt, contribution, or success is fabricated. Provider reconnect does not establish replay of dropped notifications. This policy protects bounded memory and database work; it does not provide zero-loss chat delivery during a flood. Haiku should distinguish transient overload from missing authorization and expose the diagnostic count when troubleshooting.

## Evidence and operational boundary

- **140 tests in 27 files pass**, including 15 new regressions: overload admission/recovery, invalid socket acknowledgements, bounded startup/chat work, preserved provider retry scheduling, deduplicated parallel revocation checks, idle polling, actual PostgreSQL lock/statement cancellation, and separate migration budgets.
- Before/after isolated HTTP probe: 240 requests, three waves at concurrency 80, the same synthetic 30 ms handler. Before: peak 80, all 240 entered. After: peak 32, 96 entered and 144 received immediate 503; liveness returned 200 afterwards in both runs. This is admission evidence, not a throughput or hardware-sizing benchmark. The small latency difference is not claimed as a performance improvement.
- At 12:37 UTC, an additional isolated authenticated burst uses the actual auth/session/snapshot/diagnostics routes and production PostgreSQL pool with a synthetic account: 480 requests at concurrency 40 produce 384 successes and 96 early 503s. All 96 retried reads succeed after recovery; there are no unexpected statuses. The pool reaches 10 connections and at most 22 waiting acquisitions; liveness stays healthy. Only the unique temporary schema is removed. This is local short-burst evidence, not sustained or remote capacity.
- A deterministic 60-second idle-publisher regression observed 241 polls before the change; the corrected implementation performs at most 65 in the same test and finds newly pending work within one second.
- Twelve post-restart real-account readback checks pass: liveness/readiness, both saved browser authorizations and validated Twitch identities/scopes, both recovered workers with new chat diagnostics, and saved gameplay metadata/session discovery. This pass sent no real chat or game controls and rotated no credentials.
- Independent read-only review found overload recovery, migration-budget, and slow-revalidation issues; failing regressions reproduced them and the corrections pass. Final review reports no new blocker.
- Published backend source [fab7f99](https://github.com/AndroLay/cluenite/commit/fab7f99aa1ef10358915c42fc1ab75e8120e7349) has [passing Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41445736060), independently verifying frozen install, workspace typecheck/build, PostgreSQL tests, and lint.

Ignored evidence is recorded in [backend progress](../agent-handoff/BACKEND_PROGRESS.md). Production CPU/RAM, sustained authenticated workload, proxy fairness, slow-reader behavior, and actual Render recovery still require the assigned deployment environment. Severe database stalls can trigger fail-closed EventSub leadership recovery; this is bounded failure handling, not an uninterrupted-service guarantee. Preserve the single-process deployment/leader configuration until multi-instance capacity and admission coordination are separately validated.
