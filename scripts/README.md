# Scripts

Keep deterministic local utilities here: case validation, migration orchestration, seed import, and explicit test-event fixtures. Simulated Twitch events must remain visibly labeled `SIMULATION` and must never be presented as real chat activity.

Run `npm run docs:check` from the repository root to validate root Markdown placement and local links/heading anchors in maintained Markdown, including HTML image/link targets. The dependency-free checker is read-only and skips generated/local directories and frozen reference packs as link sources. It does not check external URLs or replace source/runtime verification. See [the repository map](../docs/repository-map.md) for document placement.
