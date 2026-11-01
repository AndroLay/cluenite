# Web application

Vue 3/Vite/Pinia provide the public site, local samples, live investigation presentation, host controls, and OBS presentation. Text, controls, and accessibility remain in the DOM; PixiJS is used for optional illustrated scenes.

`src/main.ts` mounts `site/SiteRoot.vue`. It serves the landing page at `/`, case menu at `/play`, guide/settings, and dashboard/setup/co-op pages. Query URLs with session/mode/view parameters select the investigation app; the dedicated `/?view=quick` sample is handled by `QuickSamplePage.vue`.

Read [PRODUCT.md](PRODUCT.md) for the complete route map and current limits, [DESIGN.md](DESIGN.md) for Cinematic Brown Noir, and [the local run guide](../../HOW_TO_RUN.md) for startup/proxy configuration. All authored web text and accessibility labels use English; the HTML document declares `lang="en"`.

## Data boundaries

For the next frontend implementation, follow the [eight-screen development target](../../docs/design/frontend-target/README.md). It includes preserved references, source mapping, visual primitives, responsive states, and acceptance checks. The selected first milestone is the shared visual system and public pages; Q01/host/OBS, M01, and C01 follow in that order. This brief does not claim the redesign is already implemented.

- Live boards consume public server snapshots and send authenticated host commands.
- The A Missing Manuscript Quick Case sample uses local UI state; it does not run Q01 proof rules.
- The M01 sample uses a visual preview snapshot and cannot submit live commands.
- OBS is read-only and requires a scoped credential. The web UI does not yet issue that credential.
- Co-op information exists, but browser invitation controls are unfinished.

The active `--case-*` palette is in `src/style.css`. Legacy token exports in `packages/ui` do not override current web design.

## Checks

Run `npm --prefix apps/web run typecheck` and `npm --prefix apps/web run build`. Browser fixture requirements are documented in [tests/e2e](../../tests/e2e/README.md). Current status and external gaps are in [docs/STATUS.md](../../docs/STATUS.md).
