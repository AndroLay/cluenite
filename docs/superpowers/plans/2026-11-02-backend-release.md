# Backend completion and Render release

## Authorized scope

The user requested completion of the backend through deployment, authorized a new GitHub repository under their account, and confirmed Andro's Render workspace. Use a private `AndroLay/cluenite` repository and the existing Singapore web/PostgreSQL design. Preserve frontend work; the F1 redesign remains a separate assignment.

## Current evidence and acceptance

Baseline: 60 tests in 16 files pass against the local isolated PostgreSQL fixtures and fake Twitch boundaries; workspace typecheck and web/server build pass. The backend already implements Q01/M01/C01, auth, persistence, invitation lifecycle, outbox, revision recovery, and EventSub fencing. Complete actual release gaps rather than rebuilding those modules.

Risk is consequential: production configuration, public auth exposure, database provisioning, secrets, and deployment. The engineering plugin's referenced gate scripts/assets are absent from this installed package; apply the relevant gates explicitly: configuration regressions, database tests, clean frozen install/build, source review, secret exclusion, remote commit/deploy identity, health/recovery, and rollback constraints.

## Sequence

1. Add failing production URL/callback regressions; enforce HTTPS and a callback at the deployed origin's auth route while retaining local split-origin development.
2. Reconcile Node bounds, the directly imported Tailwind dependency, frozen lockfile, lint browser globals, and a Linux/PostgreSQL CI gate. Verify a clean installation without using the current dependency tree.
3. Validate Render configuration against current documentation/schema. Preserve one paid always-on web service, smallest paid PostgreSQL, Singapore, private DB access, manual deployment, and database-backed readiness. Generate new application secrets securely for the new service; never put them in Git or reports.
4. Publish only reviewed source/config/docs to the requested private repository. Exclude `.env`, local data, logs, caches, generated builds, and the old source ZIP. Record the exact release commit.
5. Provision/configure the confirmed Render target using supported tools; require real Twitch app credentials before a production start. Monitor the exact deploy to a terminal state and verify HTTPS health, database migrations, static routing, auth rejection, and Socket.IO. Real broadcaster OAuth/chat requires the owner's consent and live evidence.
6. Record readiness, deploy evidence, gaps, operational owner, and executable rollback/roll-forward steps in the release report and current backend handoff.

## Stop conditions and ownership

Do not substitute fake production Twitch credentials, disable startup guards, make the repository public, or open database ingress to work around missing access. The connected Render tools lack full Blueprint/health/ingress configuration and browser access is currently unavailable; use an authenticated supported API/CLI when available or identify the precise owner action needed. Continue independent local/repository work while credentials or access are pending.

Operational owner: the repository owner, AndroLay. No older live version or production database exists in the confirmed workspace. Before the first successful deploy, recovery is to correct configuration and redeploy the verified commit; after it, retain the live deploy ID for application rollback. Database rollback is not part of application rollback; migrations remain transactional and additive, with isolated migration/replay coverage.
