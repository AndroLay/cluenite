# Repository instructions

## Language

- Use English for all repository documentation, web interface copy, accessibility text, authored case content, code comments, tests, development prompts, and new commit or pull request descriptions.
- Preserve established identifiers, proper names, external user content, and verbatim historical quotations. Do not translate API fields or change identifiers to enforce language.
- Use English for development reports unless the user explicitly requests another language.

## Documentation and evidence

- Start with `docs/README.md` for the documentation map and `docs/STATUS.md` for current implementation and verification boundaries.
- Check source code before raising a feature's implementation status. Date test results and distinguish current checks from historical evidence.
- Keep `docs/reference/` source packs unchanged; record current implementation differences in `docs/reference/README.md` and `docs/architecture/DECISIONS.md`.
- Treat `GAMEPLAY_DEBATE.md` and older implementation plans as historical records, not current startup instructions.
- Update affected guides and handoff documents when routes, commands, contracts, setup, or product behavior change.

## Collaboration

- Follow `TEAM_PROTOCOL.md` for file ownership and handoffs. An explicit user request may authorize a scoped cross-area integration pass.
- Preserve existing local changes. Use one writer per file; use separate worktrees for concurrent edits.
- Keep secrets out of documentation, logs, screenshots, and chat. Do not commit credentials or generated local state.
- Use the smallest relevant checks and report unverified behavior. Do not deploy, mutate external services, or commit changes without authorization.
