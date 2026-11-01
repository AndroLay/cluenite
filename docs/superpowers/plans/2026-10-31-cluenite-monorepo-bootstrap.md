# Cluenite Monorepo Bootstrap Plan

> **For agentic workers:** Use `superpowers:executing-plans` to carry out this plan inline. The user authorized workspace scaffolding and dependency installation; no subagents are needed.

**Goal:** Establish a clean, installable Cluenite monorepo using the Render v2.1 technical architecture and the v1.0 gameplay blueprint.

**Architecture:** A pnpm TypeScript modular monorepo with one Fastify/Socket.IO server and one Vue/Vite web app. Shared contracts, deterministic engine, authored case data, accessible UI, and optional Pixi/GSAP graphics remain separate packages. Render configuration is authored locally only.

**Tech Stack:** Node.js 22.12+, pnpm 12, Vue 3, Vite, Tailwind CSS, Pinia, PixiJS 8, GSAP, Fastify, Zod, Socket.IO, PostgreSQL, Drizzle ORM, Vitest, Playwright.

**Spec:** `CLUENITE_FINAL_ARCHITECTURE_v2.1_RENDER.md`; `docs/reference/Cluenite_Complete_Blueprint_v1.0/`.

## Global Constraints

- Gameplay truth remains authored and proof-based; the browser never receives hidden answers.
- Use Socket.IO per v2.1; v1.0's older raw `ws` realtime choice is superseded. Use `ws` only for outbound Twitch EventSub if needed.
- Keep one origin for Fastify API, realtime, dashboard, and OBS routes.
- Only `contracts`, `engine`, and `cases` are shared server packages; `graphics` stays browser-only.
- No Twitch credentials, deployments, paid cloud resources, or fabricated Twitch activity are created. Generated local PostgreSQL credentials stay in ignored `.env` and `.local/` files.
- Install package archives, allow only the required `esbuild` build script, and download the browser runtime explicitly; do not run unit or E2E tests in this bootstrap task.

---

### Task 1: Preserve specifications and establish project entrypoints

**Files:**
- Create: `README.md`
- Create: `docs/architecture/DECISIONS.md`
- Copy: `docs/reference/Cluenite_Complete_Blueprint_v1.0/` (the supplied reference package)

**Deliverable:** The full design package is available inside the workspace. The decision note states that v1.0 owns gameplay, cases, art and fairness; v2.1 owns runtime, package boundaries and Render hosting.

- [x] Copy the 51-file blueprint package into `docs/reference/Cluenite_Complete_Blueprint_v1.0/` and compare source/copy SHA-256 hashes.
- [x] Add root project README and architecture precedence note.

### Task 2: Create the workspace and shared toolchain

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.nvmrc`, `.env.example`
- Create: `tsconfig.base.json`, `eslint.config.mjs`
- Create: `render.yaml`

**Deliverable:** Pinned pnpm workspace, strict shared TypeScript defaults, safe env placeholders, reproducible root scripts, and a single paid Render Web Service/Postgres blueprint with synchronization disabled.

- [x] Create the root workspace manifest, package manager pin, workspace globs, Node engine floor and ignored generated paths.
- [x] Add shared TypeScript, ESLint, environment example and Render Blueprint configuration.

### Task 3: Create installable apps and owned packages

**Files:**
- Create package manifests and minimal entry files under `apps/server`, `apps/web`, `packages/contracts`, `packages/engine`, `packages/cases`, `packages/ui`, `packages/graphics`, and `packages/config`.
- Create: server module ownership README, Vite/Vue entrypoint, shared package READMEs, and case/token provenance notes.

**Deliverable:** Every workspace package has an owner, package name, script boundary and declared dependencies. The server has health endpoints and the web app has a minimal scaffold; no game features are claimed complete.

- [x] Add manifests and ownership notes for both apps and six shared packages.
- [x] Add the minimal Fastify health service and Vue/Vite entrypoint.
- [x] Copy the three sample cases and design tokens into their runtime-owned package locations with provenance notes.

### Task 4: Install the complete declared dependency graph

**Commands:**
- Run `npx --yes pnpm@12.16.1 install --frozen-lockfile` after package manifests are complete.
- Download Chromium for Playwright into `.cache/playwright` after package installation.

**Deliverable:** `pnpm-lock.yaml`, workspace `node_modules`, package store and the Chromium test runtime exist locally. Verify direct dependency resolution and lockfile presence; do not run tests.

- [x] Resolve and download the pinned package manager and all declared workspace packages.
- [x] Download the Chromium browser runtime for Playwright into a workspace-local cache.
- [x] Confirm workspace package graph, lockfile and browser binary paths without running tests.

### Task 5: Install a local PostgreSQL development database

**Files:**
- Create: `.local/postgresql/` (ignored), local `.env`
- Update: `.gitignore`, `README.md`

**Deliverable:** PostgreSQL 18.6 binaries and data are stored within the workspace, the listener is loopback-only, and the app connects through a non-superuser `cluenite` role. No Windows service or Render resource is created.

- [x] Download the EDB Windows binary archive and verify its published SHA-256.
- [x] Initialize a local cluster with SCRAM host authentication and a generated app credential stored in ignored `.env`.
- [x] Start PostgreSQL on `127.0.0.1:5432` and verify the `cluenite` role/database connection.
