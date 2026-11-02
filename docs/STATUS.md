# Project status

**Last checked:** 3 November 2026 (WITA).

## Implemented

- A Vue and Vite web application with public entry pages, browser-only practice cases, and live Q01, M01, and C01 case flows.
- A Node.js and Fastify service with PostgreSQL persistence, deterministic game rules, Twitch OAuth/EventSub integration, realtime session updates, and scoped read-only OBS overlays.
- A pnpm workspace with shared contracts and packages for game rules, authored cases, UI utilities, and graphics.
- A Render web service configuration backed by PostgreSQL 18. See [deployment](deployment.md) for the current release path.

## Verified and still open

Before publication on 2 November 2026 UTC (3 November WITA), the finalization checkout passed typecheck, production build, lint, all 197 Vitest tests against an isolated PostgreSQL 18 cluster, all 26 immersive browser scenarios, and documentation validation (32 Markdown files, 113 local links). Eleven tests specifically cover exact-commit deployment, target guards, timeout cancellation and the hackathon freeze. Browser fixtures do not make real Twitch calls.

[GitHub Actions](https://github.com/AndroLay/cluenite/actions/workflows/ci.yml) records the checked commit and its Render deployment. A successful deployment summary verifies the exact SHA and the [live service](https://cluenite-app.onrender.com). Readiness checks database access, not Twitch delivery, OBS Studio playback or a complete player session.

Local test and build results apply only to their recorded source revisions. Consult the current [CI workflow](../.github/workflows/ci.yml) and [testing guide](testing.md) for the checks attached to a particular revision. This status page does not carry forward counts from older runs as current results.

| Area             | Implemented                                                                                       | Acceptance boundary                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Browser practice | Scripted cases and local interaction                                                              | Progress is browser-local; it does not prove live engine or Twitch behavior.                         |
| Q01 and M01      | Authenticated host sessions, server-validated actions, persisted state, and viewer-safe snapshots | Current real-provider and full player acceptance must be verified separately.                        |
| C01 co-op        | Invitations, scoped team projections, and shared proof flow                                       | A complete production session with two authorized broadcasters is not established by local fixtures. |
| Twitch           | OAuth and EventSub integration                                                                    | Production login and chat delivery are not established by a healthy service response.                |
| OBS              | Scoped, revocable, read-only overlay                                                              | Mocked browser checks do not establish OBS Studio acceptance.                                        |
| Render           | Existing service is reachable and readiness has returned HTTP 200                                 | A health response does not prove the application's full live integrations or gameplay.               |

The deployment workflow validates a source revision before publishing it to the existing Render service. Automatic Render deployment is disabled. See [deployment](deployment.md) for the release boundary and the exact production URL.
