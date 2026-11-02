# Web application

Vue 3/Vite/Pinia provide the public site, local samples, live investigation presentation, host controls, and OBS presentation. Text, controls, and accessibility remain in the DOM; PixiJS is used for optional illustrated scenes.

`src/main.ts` mounts `site/SiteRoot.vue`. It serves the landing page at `/`, case menu at `/play`, guide/settings, and dashboard/setup/co-op pages. `/play#practice` offers Pearls on the Night Express (`/practice/express`), A Missing Manuscript (`/?view=quick`), and The Lighthouse Went Dark (`/practice/lighthouse`). Query URLs with session/mode/view parameters select the investigation app, except the dedicated manuscript sample in `SampleCasePage.vue`. The earlier static `QuickSamplePage.vue` stays on disk but is no longer routed.

Practice and non-OBS live play share the full-viewport `site/GameWorkspace.vue` and animated native `site/EvidenceDialog.vue`. Optional panels start closed. Manuscript's opening and room also fill the viewport; Finds/Grid/Assist are available in an optional panel. `/preview/gallery`, `/preview/festival`, and `/preview/signal` show public metadata without starting sessions. Actual authored play stays Twitch-based.

Read [PRODUCT.md](PRODUCT.md) for the complete route map and current limits, [DESIGN.md](DESIGN.md) for Cinematic Brown Noir, and [the local run guide](../../docs/development/local-setup.md) for startup/proxy configuration. All authored web text and accessibility labels use English; the HTML document declares `lang="en"`.

## Data boundaries

The [eight-screen development target](../../docs/design/frontend-target/README.md) preserves references and acceptance targets. The current implementation and verification boundary are described in [frontend progress](../../docs/agent-handoff/FRONTEND_PROGRESS.md); reference images alone are not evidence.

- `components/LiveCaseExperience.vue` consumes public server snapshots and sends existing authenticated host commands. App transport, stable retry, scoped overlays, and backend proof remain unchanged.
- The three playable practice cases run browser rules in `src/sampleCase/`. Their scripted chats and partner are labeled. Practice actions do not submit live commands or create persisted sessions; the shell can still check account state. Manuscript alone keeps a best score locally. Express/Lighthouse reports reset on replay or reload.
- Public case previews use catalog metadata and cannot inspect observations or submit commands. The legacy M01 sample also cannot submit live commands.
- OBS is read-only and requires a scoped credential. Setup and the live host panel explicitly create, copy, replace and revoke the session/team link.
- Live co-op supports lobby creation, invitations by Twitch username, same-tab consent continuation, team workstations, shared proof and explicit rejoin. Scripted practice stays separate from live rounds.

The active `--case-*` palette is in `src/style.css`. Legacy token exports in `packages/ui` do not override current web design.

See the [frontend/backend integration handoff](../../docs/agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) for saved sessions, route/data boundaries, reusable controls and verification evidence.

## Checks

Run `npm --prefix apps/web run typecheck`, `npm --prefix apps/web run build`, and `npm test -- tests/web apps/web/tests` from the repository root. On Windows, `.\node_modules\.bin\playwright.cmd test --workers=2` exercises the mocked browser flows; the Lighthouse case waits for its real 74-second discovery milestone. Browser fixture requirements and coverage are documented in [tests/e2e](../../tests/e2e/README.md). Current frontend evidence is in [frontend progress](../../docs/agent-handoff/FRONTEND_PROGRESS.md); integration status and external gaps are in [docs/STATUS.md](../../docs/STATUS.md).
