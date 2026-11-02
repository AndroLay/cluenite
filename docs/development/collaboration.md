# Cluenite — Codex × Claude Code Collaboration Protocol

**Project:** Cluenite, Twitch-native cooperative mystery/puzzle game  
**Last synchronized:** 2026-11-02  
**Target:** A genuinely playable, visually compelling Twitch submission; no simulated events presented as real.  
**Schedule:** the earlier planning target was 2026-11-03 06:00 WITA. This is historical context, not a freshly verified official deadline; check the official schedule before submission work.

## Language and current context

Use English for project documentation, web copy, accessibility text, authored cases, code comments, tests, development prompts, and new commit/PR descriptions. Preserve identifiers, proper names, external user content, and historical quotations. See `AGENTS.md` and `docs/development/contributing.md`.

Start with `docs/README.md` and `docs/STATUS.md`. Q01/M01/C01 backend code and the public landing/menu/guide/settings exist. Saved sessions, host lifecycle, OBS credentials, co-op invitations/consent and live workstations are connected in the current working tree; see the [integration handoff](../agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) and [dated evidence](../evidence/frontend-integration-2026-11-02.md). The public manuscript, express and lighthouse practice experiences use separate scripted browser state. Historical logs and old debate turns are not the current assignment.

The next frontend target is the [eight-screen development brief](../design/frontend-target/README.md). The user selected shared visuals and public pages first, followed by a complete Q01/host/OBS slice, M01, then C01. Use the preserved images as visual authority while keeping authored cases and backend contracts authoritative for behavior. The brief is planning evidence, not completed UI work.

## Product truth (do not drift)

- **Quick Case:** a clear, lightweight 30–90-second design target, OBS-safe companion for gaming streamers; can be paused/dismissed without breaking the main broadcast.
- **Mystery Live:** satisfying evidence-based multi-stage investigation with observation, connection, theory challenge, hints, and a meaningful reconstruction/reveal. Easy to understand; suspenseful, not exhausting.
- **Co-op Mystery:** two real streamers, different workstations/tools and independent tasks, genuine cross-community evidence breakthroughs. Solo must remain fully playable.
- Each viewer's correct action may matter independently of vote totals. One viewer can complete a solvable experience; duplicates cannot spam progress or credit.
- The server owns state, proof, timers and final verdicts. Viewers use regular Twitch chat; host uses dashboard; OBS is read-only.
- Visual direction: **Cinematic Brown Noir** — atmospheric deep espresso/walnut, aged leather, antique brass, restrained warm amber, readable parchment text. Suspense without gratuitous horror. Scene is the hero, not a wall of cards or giant logo.
- Real Twitch messages, viewer counts, co-op sessions, achievements, and deployment states must NEVER be fabricated. Mock/demo data must be explicitly labeled.

## Source precedence

1. Latest explicit user decisions in this project (including brown-noir redesign and Render hosting).
2. `docs/reference/Cluenite_Implementation_Ready_v3/` if present, especially `00_READ_FIRST`, product/gameplay/QA documents.
3. `docs/architecture/DECISIONS.md` and current API contracts.
4. `docs/STATUS.md` for current source observations and dated verification; older progress entries are history, not proof of a current run.
5. Earlier blueprint/mockups for ideas, not as canonical production UI or necessarily correct case content.
6. `apps/web/PRODUCT.md` and `apps/web/DESIGN.md` describe current routes, sample boundaries, and Brown Noir presentation; earlier mockups do not override them.

## Ownership — no overlapping writes

This is the normal ownership split. An explicit user request may authorize a scoped cross-area integration pass; the 2 November documentation and frontend/backend integration passes are such work. Current frontend design ownership is Claude Code with Opus, replacing the earlier Haiku assignment. Keep one writer per file and preserve other sessions' work.

| Agent                       | Sole ownership                                                                                                                                                   | May read but not write                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Codex (GPT-6)**           | `apps/server/**`, `packages/engine/**`, `packages/cases/**`, `packages/contracts/**`, server tests, `render.yaml`, DB/migrations, `docs/agent-handoff/BACKEND_*` | `apps/web/**`, `packages/ui/**`, `packages/graphics/**`                              |
| **Claude Code (Opus)** | `apps/web/**`, `packages/ui/**`, `packages/graphics/**`, web visual assets, browser/visual tests, `docs/agent-handoff/FRONTEND_*`                                | `apps/server/**`, `packages/engine/**`, `packages/cases/**`, `packages/contracts/**` |

**Shared root files** (`package.json`, `pnpm-lock.yaml`, CI config, root tsconfigs) are integration-owner-only. If a dependency change is required, record the exact request and avoid changing those shared files while the other agent works. When using separate Git worktrees/branches, any shared-file changes must be reviewed during integration rather than silently overwritten. `docs/STATUS.md` is merged once at integration; agents update only their own logs.

## Preferred parallel workflow

1. Create two Git worktrees/branches from the same baseline if the repository is under Git: e.g. `agent/codex-backend` and `agent/claude-frontend`. Do not operate both agents against the same working directory concurrently.
2. **Codex publishes the current contract inventory** in `docs/agent-handoff/BACKEND_CONTRACTS.md` before making breaking changes. Source of truth remains `packages/contracts` and the actual routes/events.
3. **Claude implements against existing contracts**. It writes contract requests to `docs/agent-handoff/FRONTEND_CONTRACT_REQUESTS.md` without changing backend-owned files.
4. Codex responds through `docs/agent-handoff/BACKEND_CONTRACTS.md` with additive, backward-compatible schema/API updates and concrete examples. Any incompatible change requires explicit coordination and tests.
5. Integrator brings Codex changes onto the frontend branch (or a third integration branch), resolves conflicts, runs all tests and manual smoke checks, and updates `docs/STATUS.md` with verified evidence. Neither agent may claim the other agent's tests as its own.
6. Do not make both agents commit the same root lockfile edits independently. Avoid unnecessary new dependencies.

## Product priorities and deadlines

**P0 — unmistakably working Twitch slice:** valid Q01 case, host authentication, chat command, deterministic evidence/solution, PostgreSQL persistence, visible OBS overlay response, safe reconnect, comprehensible brown-noir visuals, and a polished reveal. Make a live or clearly labeled mocked path for development, but do not conflate them.

**P1 — strong differentiated demo:** a coherent M01 Mystery Live experience; one C01 meaningful two-workstation co-op breakthrough, if achievable without compromising P0. Each needs clear UX and validated proof requirements.

**P2 — beyond hackathon:** large case library, content generation, raid handoff, global progression. Defer unless P0/P1 and submission are secure.

Keep a protected window for real Twitch/OBS/Render integration, demo recording, and Devpost submission. Do not expand to three incomplete modes at the expense of one demonstrably playable mode.

## Non-negotiable evidence-based quality gates

- Fresh checkout passes relevant `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`, `npm run test:e2e` (or missing infrastructure is documented precisely).
- No unresolved critical authorization, secret-leakage, proof-validation, duplicate credit, or data-loss bugs.
- Screenshots are from the **actual rendered app** at desktop, OBS 1280×720, and phone widths; images created as concepts are not falsely called application screenshots.
- OBS overlay does not require rendering a large canvas constantly during idle; supports transparent / low-effects modes.
- UI explicitly states disconnected, paused, waiting, or simulated status. It never claims a real Twitch stream without a real authenticated channel.
- One-viewer, many-viewer, late-joiner, invalid action, duplicate action, disconnect/rejoin, and one co-host leaving are each intentionally handled and tested where in scope.
- Each agent records: commit/hash if available; changed files; commands run and outputs; screenshots/log evidence; blockers; handoff notes; next most valuable work.

## Progress and handoff

- Codex writes `docs/agent-handoff/BACKEND_PROGRESS.md` and `BACKEND_CONTRACTS.md`.
- Claude writes `docs/agent-handoff/FRONTEND_PROGRESS.md` and `FRONTEND_CONTRACT_REQUESTS.md`.
- Work in small verified vertical slices. Don't stop at a planning report when implementation is feasible. Conversely, do not falsely claim success or promise unattended work after the current execution session.
- Be candid about dependencies on Twitch app credentials, two real channels, OBS desktop, user-owned Render account, and actual Twitch viewer feedback.
