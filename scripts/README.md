# Repository scripts

- `pnpm run docs:check`: read-only validation of root Markdown placement, maintained local links, heading anchors and HTML image/link targets. It does not check external URLs.
- `pnpm run deploy:render`: guarded exact-commit deployment to the existing approved Render service. GitHub Actions supplies the encrypted key and service variables; see [deployment](../docs/deployment.md). It blocks deployments at the hackathon freeze.

Keep deterministic utilities here. Simulated Twitch events must be clearly labeled and never presented as real chat evidence. Generated output and credentials stay ignored.
