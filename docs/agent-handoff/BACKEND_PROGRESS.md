# Backend execution progress

## Backend completion before deploy - 2 November 2026

Latest scope: finish non-frontend implementation and predeploy preparation; **do not deploy**. Haiku's frontend and active frontend/reference/architecture handoffs remain separate. The implementation and operator policy are in the [predeploy guide](../operations/BACKEND_PREDEPLOY_2026-11-02.md).

- Closed server work for REQ-FE-005 with fixed-origin browser OAuth outcomes and preserved JSON behavior. The frontend must still confirm `/api/me` and wire result copy.
- Closed the late-refresh revocation/reauthorization race and stopped-worker resurrection. Credential refresh is conditional on the original active generation; stale validation/subscription work cannot create sockets or revive status.
- New processed-input receipts omit raw chat arguments while preserving fingerprint-based retries/conflicts. Added bounded retention preview/application and guarded account erasure, including rejected receipt and legacy event actor references.
- Added early HTTP/API/OAuth and shared per-account mutation budgets, a 16 KiB body cap, generic unexpected error responses, `no-store` API responses, and safe request/error serializers.
- Added `npm --prefix apps/server run preflight` and `maintenance`. No new dependencies or schema migrations. A clean Vitest configuration now limits concurrency to two workers after the Windows PostgreSQL fixture incident documented in the guide.
- Independent read-only review confirmed the original stopped-validation reproduction now creates zero sockets after stop. Its two additional findings (multiline route admission bypass and retained input identity during erasure) were reproduced, fixed, and verified with focused regressions.

| Final local check    | Evidence                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full suite           | `vitest run --reporter=dot`: **108 passed, 22 files**, no failures/skips; `.cache/predeploy-final-tests.log`. Real isolated local PostgreSQL, synthetic Twitch boundaries.                                         |
| Typecheck/build      | `npm run typecheck`, `npm run build`, and server build pass. Current frontend compilation is integration evidence only, not Haiku's visual acceptance.                                                             |
| Lint                 | Backend source/tests: zero errors/warnings. Workspace: exit 0, zero errors and 651 frontend warnings; no auto-fix or frontend edits.                                                                               |
| HTTP runtime         | Owned random-port server: readiness, 401, browser unavailable OAuth/cookie clearing, body cap, built English deep links/CSS, JSON 404, clean child teardown.                                                       |
| Production preflight | CLI executes without network/migrations against synthetic complete configuration. Actual ignored environment exits 1: Twitch ID/secret/callback and all three security keys are missing. No secret values printed. |
| Review/doc hygiene   | Scoped independent review resolved; affected local links resolve; no tracked `.env`, caches, local data, or build artifacts; explicit backend-only publication allowlist.                                          |

The browser E2E fixture owns ports 10000/5173 and was not rerun against the shared listener; no new real-account/browser/OBS acceptance is claimed. The local PostgreSQL cluster recovered committed state from WAL after a native Windows failure; no shared application schema was cleaned. Do not attribute the interrupted unrestricted suite to a passing test run.

Remaining external gates are the deferred Render access, real Twitch app and stable random keys, real OAuth/chat/refresh/revocation, two-channel consent, OBS, and remote recovery. Current production configuration is **not valid** and no deployment was attempted. P2 expansion remains deferred. Publication and CI results will be linked in the predeploy guide after the final source commit is verified.

## Backend release integration - 2 November 2026

The user authorized backend completion through deployment, a new private GitHub repository, Andro's Render workspace, and Twitch app registration using Zen. Current evidence, remaining gates, operational ownership, and recovery steps are in the [backend release record](../operations/BACKEND_RELEASE_2026-11-02.md) and [status](../STATUS.md).

- Q01/M01/C01 engine, auth, persistence, migrations, idempotency, outbox, realtime recovery, EventSub fencing, and team projections are implemented. Fresh local verification passes: 70 tests in 17 files, workspace typecheck/build, and lint with zero errors. Provider boundaries remain mocked.
- Production configuration now requires HTTPS and the exact same-origin Twitch callback. Local split-origin development remains supported.
- The integrator accepted the frontend SPA fallback change and added a regression so `/api` stays JSON 404. Owned random-port HTTP tests cover current built assets/deep links, database readiness, signed-out rejection, and server teardown. No shared process was stopped.
- The direct Tailwind dependency, frozen lockfile, Node bounds, Vue browser globals, and Linux/PostgreSQL CI are reconciled. A clean production install/build and a fresh Vite CSS request pass without an alias. The earlier dependency request is resolved.
- **Slice E measurement follow-up:** signed-out Chrome checks `/guide`, `/settings`, `/setup`, and `/coop` at 390 and 1280 px pass with no overflow or page script errors. Every header link is at least 44 px high at 390 px on the current built server. This closes the stale-build measurement gap; it does not validate all inline targets, focus stops, image contrast, or signed-in states.
- `AndroLay/cluenite` was created privately and release source `4696a39` was pushed. [Linux CI](https://github.com/AndroLay/cluenite/actions/runs/41345208201) passes frozen install, typecheck, build, 70 tests in 17 files, and lint. The Render workspace was inventoried and confirmed; no Cluenite resources were present. The Blueprint passes current schema validation. Remote deployment evidence and remaining access gates are tracked in the release record.
- Deployment is blocked by absent Render API access and Twitch app credentials. The last presence check found no `RENDER_API_KEY`; the owner then deferred saving it until later. Deployment remains pending that owner action. Native and browser control hosts are unavailable, so Zen app registration could not be performed. No fake production credentials or public database workaround was used.
- REQ-FE-003 remains external real-account verification. OBS credential UI, browser co-op lifecycle, M01's repeated-hint affordance, and stable client retry keys remain frontend work against existing contracts. The public manuscript sample remains separate from Q01.

No Devpost state, real Twitch login/chat, actual OBS application, or deployed recovery was verified in this pass. Historical logs below remain dated evidence.

## Historical evidence

The complete original session record, including test results and screenshot paths, is preserved in [the 1 November backend archive](../history/backend-progress-2026-11-01.md). It does not report current listener, account, deployment, or submission state. See [current status](../STATUS.md) for fresh checks and remaining work.
