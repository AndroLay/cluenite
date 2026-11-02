# Verification evidence

Evidence is versioned and scoped. A local check, a synthetic browser fixture, a real Twitch interaction and a deployed service establish different things. Read [current status](../STATUS.md) before using a result as a release claim.

| Record                                                             | Date            | Scope                                                                                                                                    |
| ------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [Frontend integration release](../operations/FRONTEND_RELEASE_2026-11-03.md) | 3 November 2026 WITA | Frozen frontend source, clean install, local PostgreSQL/API/browser gates, Linux CI and exact Render deployment. |
| [Immersive frontend](immersive-frontend-2026-11-03.md) | 3 November 2026 | Fullscreen practice/live presentation, 21 frontend tests, 11 Chrome fixture scenarios, compilation/lint, and explicit provider boundaries. |
| [Frontend/backend integration](frontend-integration-2026-11-02.md) | 3 November 2026 WITA | Latest immersive wiring, 22 focused unit tests, fifteen real API/PostgreSQL browser scenarios with synthetic accounts, and historical account readback. |
| [Initial Render deployment](../operations/BACKEND_RELEASE_2026-11-02.md#first-render-deployment) | 3 November 2026 WITA | Exact live source/deploy, ten remote probe groups, eight anonymous browser checks, private migrations and PITR; production OAuth remains open. |
| [Backend release](../operations/BACKEND_RELEASE_2026-11-02.md)     | 2 November 2026 | Published backend versions, local PostgreSQL and real Twitch/OBS observations, CI and remaining production gates.                        |
| [Backend predeploy](../operations/BACKEND_PREDEPLOY_2026-11-02.md) | 2 November 2026 | Configuration, recovery, retention/deletion and final backend checks.                                                                    |
| [Resource limits](../operations/BACKEND_RESOURCE_LIMITS.md)        | 2 November 2026 | Operating budgets and controlled overload/recovery probes; no production capacity guarantee.                                             |
| [Application screenshots](../assets/screenshots/manifest.json)     | 2 November 2026 | Actual anonymous local pages and explicitly identified practice.                                                                         |

Detailed historical progress remains in [backend](../agent-handoff/BACKEND_PROGRESS.md) and [frontend](../agent-handoff/FRONTEND_PROGRESS.md) handoffs. They retain earlier failures and superseded observations. Machine artifacts in ignored local caches are not a substitute for these readable summaries and are not included in a fresh checkout.

For new evidence, record the source/version, timestamp, selected environment, actual command or interaction, result, cleanup and untested behavior. Exclude credentials, private links and raw account/chat payloads. Do not mark a requirement complete solely because its route or component exists.
