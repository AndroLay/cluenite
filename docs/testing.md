# Testing and verification

Run commands from the repository root. Use the pinned Node and pnpm versions from [setup](setup.md).

## Local checks

```powershell
npm run typecheck
npm run build
npm test -- --reporter=dot
npm run lint -- --quiet
npm run test:e2e
npm run docs:check
```

Run the production build before the full test suite: the HTTP integration fixture serves the built web assets. `npm test` runs the Vitest suite, including PostgreSQL integration tests when `DATABASE_URL` is available. The Playwright suite uses locally installed Chrome and in-process fixtures; it does not need real Twitch credentials or a live broadcaster.

## PostgreSQL integration tests

The database fixture in `apps/server/tests/testDatabase.ts` accepts only a loopback host and a database named `cluenite`. It creates a random `cluenite_test_*` schema, applies migrations there, and drops that schema after the run. The database user needs permission to create and drop schemas. Use a disposable local development database, never production or a shared remote database.

Before running the suite, check that `DATABASE_URL` points to the intended loopback database. The fixture enforces the host and database-name guard, but that check does not tell you whether other local applications share that database.

If the selected local API process uses the real Twitch adapter, stop only that process before running the integration suite and restore it afterwards. Its EventSub worker holds a database-wide advisory lock used by one of the tests. Do not stop an unrelated process as a testing side effect.

## CI and what checks prove

The [GitHub Actions workflow](../.github/workflows/ci.yml) installs the locked workspace, typechecks and builds it, runs tests, checks lint errors, and validates local documentation links. Consult the workflow file for the triggers and exact steps attached to a revision.

Mocked tests check application behavior at local boundaries. They do not prove successful production OAuth, live Twitch chat, OBS Studio behavior, broad assistive-technology acceptance, player balance, or deployment state. Review [project status](STATUS.md) and [deployment](deployment.md) for those separate limits.
