# Repository instructions

- Use English for repository documentation, UI and accessibility copy, authored content, comments, tests and commit descriptions. Preserve identifiers, proper names and external quotations.
- Start with [documentation](docs/README.md), [architecture](docs/architecture.md) and the current source. Record only observed verification; distinguish local fixtures, real Twitch and production.
- Preserve user edits and backward compatibility. Use one writer per file and separate worktrees for concurrent edits. Keep changes small and run the relevant checks in [testing](docs/testing.md).
- Keep credentials, cookies, private chat, local state and generated build output out of source control and reports. Never introduce a production authentication bypass.
- Keep only README.md and AGENTS.md as root Markdown. Maintain public guides under docs/ and package-specific instructions beside the code. Internal notes and video production stay outside tracked application source.
- Follow the [hackathon rules and freeze](docs/hackathon.md). After the submission deadline, keep the submitted repository, live project and video unchanged unless the organizer authorizes updates; continue in a separate copy.
- External writes, deploys and destructive work require user authorization. Existing scoped authorization persists; never force-push over another contributor.
