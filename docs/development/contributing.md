# Development guide

## Language and scope

Use English for documentation, UI copy, accessibility labels, authored case text, comments, tests, development prompts, and new commit/PR descriptions. Keep established identifiers and proper names intact; externally supplied Twitch names and chat are user content. Repository-specific agent guidance is in [AGENTS.md](../../AGENTS.md).

Read [the documentation map](../README.md), [current status](../STATUS.md), and [TEAM_PROTOCOL.md](collaboration.md) before changes. Preserve the working tree. Do not commit, reset, stash another session's work, deploy, provision resources, or change credentials without authorization.

## Implementation boundaries

- The pure engine owns accepted progress and proof. Keep browser, provider, database, and rendering dependencies out of it.
- PostgreSQL owns persisted sessions and revisions. Keep state, processed input, events, and outbox writes transactional.
- The browser consumes public contracts; never import private authored answers into the production web bundle.
- Viewers use Twitch EventSub; dashboard commands are authenticated host actions. OBS is read-only.
- Use the existing stack and pinned package manager. Add dependencies only for an identified need.

## Checks

Run the smallest checks that cover the change. Keep output quiet and report the actionable failure boundary.

| Change                                     | Relevant check                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Documentation/copy                         | `npm run docs:check`; review code examples, English wording and formatting.                        |
| Types or shared contracts                  | `npm run typecheck` plus affected tests.                                                          |
| Engine, mocked provider, or client mapping | `node_modules\.bin\vitest.cmd run tests/engine tests/web tests/server --reporter=dot` on Windows. |
| Database/auth/realtime behavior            | `npm test` with an explicitly selected development PostgreSQL database.                           |
| Web routes or browser behavior             | `npm run test:e2e`; review [browser fixture requirements](../../tests/e2e/README.md).                   |
| Build configuration                        | `npm run build`.                                                                                  |
| Code formatting/lint                       | Targeted Prettier/ESLint; `npm run lint` for an integration pass.                                 |

Database integration tests require `DATABASE_URL` to select the local database named `cluenite`; the fixture rejects remote hosts and other database names. It creates a random `cluenite_test_*` schema and drops it afterwards, requiring schema-creation privileges. Inspect `apps/server/tests/testDatabase.ts` before running it; never target a production database. Mocked Twitch responses do not exercise a real account.

Run `npm run build` before the full `npm test` suite. Its HTTP runtime fixture launches an owned server on a random port, checks readiness and the current built web assets, then stops that process before dropping its temporary schema. It does not stop a shared development server. GitHub CI runs the build before the full PostgreSQL suite.

If the selected local API uses the real Twitch adapter, stop that owned process before the full database suite and restore it afterwards. Its EventSub leader holds a database-wide PostgreSQL advisory lock; temporary schemas do not isolate that lock, so the election fixture cannot acquire it while the API is running. Never stop an unrelated process to run tests. See the [server verification guide](../../apps/server/README.md#verification).

## Documentation maintenance

Update [docs/STATUS.md](../STATUS.md) for current implementation and fresh verification evidence. Update the relevant application/package guide and API handoff when behavior changes. Keep screenshots and old test results dated; a historical passing result is not a current run.

Preserve frozen source packs and reference fixtures. Document deviations in [the reference index](../reference/README.md) and [architecture decisions](../architecture/DECISIONS.md). Historical transcripts and implementation plans retain their original context and must not restart obsolete work.

Keep only `README.md` and `AGENTS.md` as root Markdown entry points. Follow [the repository map](../repository-map.md) for guide, evidence and archive placement; application/package READMEs stay next to their source. Update local links when moving files instead of leaving duplicate guides.

Before handoff, report changed paths, actual checks, unverified surfaces, and the next concrete gap. Never turn a local test result into a real Twitch, OBS Studio, Render, or player-acceptance claim.
