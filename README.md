# Cluenite

Cluenite is a Twitch-native social detective game. Viewers inspect evidence, connect facts, challenge theories, and help the streamer reach a proof-backed reveal. Quick Case and Mystery Live share one deterministic case engine; co-op adds two broadcaster workstations.

**Project state:** monorepo bootstrap. The documents define the product and target architecture; they do not mean the game or a live Twitch integration is implemented. See [implementation status](docs/STATUS.md) for current verification gaps.

## Source of truth

- [Implementation-ready pack v3.0](docs/reference/Cluenite_Implementation_Ready_v3/00_READ_FIRST/README.md) is the controlling specification. Its precedence is: v3 read-first decisions, v3 gameplay/contracts/delivery, v2.1 technical rationale where v3 leaves a gap, then v1 examples and assets.
- [Gameplay and visual blueprint v1.0](docs/reference/Cluenite_Complete_Blueprint_v1.0/00_START_HERE/README.md) remains the original source for detailed case examples and visual assets; examples must be reviewed and adapted before production use.
- [Technical architecture v2.1](CLUENITE_FINAL_ARCHITECTURE_v2.1_RENDER.md) remains a technical reference where v3 does not supersede it.
- [Architecture decisions](docs/architecture/DECISIONS.md) records how these sources map to this workspace and which project choices are still only local setup.

## Workspace

- `apps/server`: Fastify API, Twitch OAuth/EventSub ingress, Socket.IO, persistence, and session orchestration.
- `apps/web`: creator dashboard, mystery stage, and OBS overlay routes.
- `packages/contracts`: Zod schemas and shared wire types.
- `packages/engine`: pure deterministic state transitions and proof evaluation.
- `packages/cases`: versioned authored cases and validation.
- `packages/ui`: accessible DOM components and design tokens.
- `packages/graphics`: browser-only PixiJS scenes and GSAP timelines.
- `packages/config`: shared TypeScript, ESLint, and Vitest configuration.
- `docs/reference`: frozen source documents and visual assets for the original v1.0 blueprint and the controlling v3.0 pack. The v3 pack includes preserved v1 and v2.1 references.

## Toolchain

- Node.js 22.12 or newer in the Node 22 line.
- pnpm 12.16.1, pinned through Corepack and the root `packageManager` field.
- Runtime: Vue 3, Vite, Tailwind CSS, Pinia, PixiJS 8, GSAP, Fastify, Zod, Socket.IO, PostgreSQL, and Drizzle ORM.

## Local setup

```powershell
npx --yes pnpm@12.16.1 install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npx --yes pnpm@12.16.1 dev
```

The server needs PostgreSQL for its readiness check. PostgreSQL 18.6 binaries and this workspace's database files live under ignored `.local/postgresql/`. Start the local server before `pnpm dev`, and stop it when you're finished:

```powershell
& '.local\postgresql\18.6\pgsql\bin\pg_ctl.exe' -D '.local\postgresql\data' -l '.local\postgresql\postgres.log' -o '-h 127.0.0.1 -p 5432' start
& '.local\postgresql\18.6\pgsql\bin\pg_ctl.exe' -D '.local\postgresql\data' stop -m fast
```

Populate local secrets only in `.env`; never commit that file. Do not overwrite an existing `.env` with `.env.example` because its database URL must match the local database credentials. Playwright's browser runtime is kept under `.cache/playwright`.

In PowerShell, set the browser path in each terminal before installing or using Playwright:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location).Path '.cache\playwright'
npx --yes pnpm@12.16.1 exec playwright install chromium
```

## Deployment

`render.yaml` describes one always-on web service and one PostgreSQL database in Singapore. The file is an infrastructure definition only; creating or syncing it with Render is a separate deployment action.
