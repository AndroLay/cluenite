# Contributing

Cluenite welcomes focused fixes and improvements. Read [setup](setup.md), [architecture](architecture.md), and [testing](testing.md) before changing runtime behavior.

## Before you change code

- Keep documentation, interface copy, accessibility text, authored case material, comments, and tests in English. Preserve established identifiers, proper names, and verbatim quotations.
- Keep changes focused and consistent with the package boundaries in the [architecture guide](architecture.md).
- Avoid overlapping edits: assign one writer per file. Use a separate worktree when parallel changes need isolation.
- Keep `.env`, credentials, local database state, browser traces, and other generated artifacts out of commits. `.env` is ignored by Git.
- Do not describe mocks or local checks as real provider, OBS, deployment, or player acceptance.

## Before you submit

Run the smallest relevant checks from [testing](testing.md), and summarize the change, checks, and unverified behavior in your pull request. Update the affected public guide when a command, route, API contract, setup step, or user-visible behavior changes. Do not include generated secrets or test artifacts.

After a hackathon submission deadline, treat the submitted copy as frozen. Keep later maintenance or experiments in a separate follow-up change so the submitted snapshot remains identifiable; see [hackathon notes](hackathon.md).
