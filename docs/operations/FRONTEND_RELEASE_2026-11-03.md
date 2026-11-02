# Frontend integration release — 3 November 2026

## Scope and target

The user authorized deploying the latest frontend and its backend integration. The release uses the existing public GitHub repository `AndroLay/cluenite`, branch `deploy/backend-2026-11-02`, and Render service `srv-dbkb33mc6qcc73e2in7g` in Andro's workspace. The public origin is https://cluenite-app.onrender.com. There is no database migration, dependency upgrade, credential rotation, plan change or new service. Deployment remains manual.

The snapshot includes the immersive live/practice frontend, saved sessions, host and partner permissions, host lifecycle, scoped OBS credentials, invitation/consent/rejoin flows, private team projections and shared proof. The final capture also includes mobile/landscape hit targets, GPU texture caps and lower mobile rendering frequency. Later local edits are outside this frozen release.

The source includes the documentation reorganization, English guides and screenshot provenance. Local demo-video work, generated outputs, logs, caches and environment files are excluded. The repository was verified public before source review; no visibility change was made.

## Preparation evidence

- Clean isolated clone based on the previously deployed backend `8f06482d8e0303f9b892e536bf02520f41e6207b`. The user's original checkout and index are preserved.
- Pinned pnpm 12.16.1 frozen workspace installation passed with the demo-video workspace excluded. No lockfile or dependency change.
- Workspace typecheck and production build passed. ESLint error checks and documentation links passed. Existing Vue formatting warnings are outside the zero-error gate.
- All **172 tests in 31 files** passed against a disposable loopback PostgreSQL 18 cluster. The ordinary local app keeps the database-scoped EventSub leader lock, so a schema-only fixture was insufficient; no leader behavior or running app was changed. The disposable cluster was stopped.
- **15 actual API/Socket.IO/PostgreSQL browser scenarios** passed using synthetic provider accounts and viewers. They cover lost responses/acknowledgements, lifecycle persistence, OBS issuance/revocation, invitations, team permissions, rejoin and the server verdict. These checks are separate from real Twitch acceptance. The probe explicitly opens the latest frontend's host drawer when needed.
- The **final frozen frontend passed all 22 Chrome browser scenarios**, including mobile/landscape controls, GPU rendering, reduced motion, owner/partner permissions, Q01/M01/C01 and practice. Final web typecheck, full production build and zero-error lint also passed. Documentation checks pass for 76 Markdown files and 418 local links. Browser fixtures run headlessly and close their own servers. Clean-install test imports resolve Socket.IO from its owning server workspace.

Machine artifacts are ignored local verification records: `.cache/current-release-test-isolated.log`, `.cache/current-release-api-result.json`, `.cache/current-release-final-freeze.json`, `.cache/current-release-browser-final.log`, and `.cache/current-production-probe.json`. They contain no published credentials.

## Publication and deployment

Pending at source preparation. Record the exact source commit, Linux CI, Render deploy and anonymous production verification here after completion. An earlier backend deployment does not establish acceptance of this frontend.

## Recovery and remaining acceptance

The rollback baseline is Render deploy `dep-dbkbs8ijnfac73a6eub0`, source `8f06482d8e0303f9b892e536bf02520f41e6207b`. Stop promotion if CI, readiness, assets, public navigation or authorization boundaries fail. Existing Render configuration and PostgreSQL data remain unchanged; rollback does not imply a database restore. No live rollback is claimed.

Production OAuth completion, real production Twitch chat/OBS/co-op, authenticated capacity and broader player/accessibility acceptance remain open. Earlier logical restore and load evidence remains scoped to the backend checkpoint in the [backend release record](BACKEND_RELEASE_2026-11-02.md).
