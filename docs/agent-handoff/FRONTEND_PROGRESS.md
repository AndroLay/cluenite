# Frontend progress (Claude Code)

## Integrator follow-up - 2 November 2026 (Codex)

The backend release integration supersedes the stale-build and publication observations in the earlier F1/Slice E notes below. Source is published privately at `4696a39`; [Linux CI passes](https://github.com/AndroLay/cluenite/actions/runs/41345208201), including 70 tests across 17 files, typecheck, production build, and lint. The [release record](../operations/BACKEND_RELEASE_2026-11-02.md) owns current deployment status.

- The direct Tailwind dependency and frozen lockfile are reconciled. A clean install/build and fresh Vite CSS request pass without an alias.
- The integrator reviewed `setNotFoundHandler` and fixed `/api` falling back to HTML. Missing API, health, and asset paths retain JSON 404 responses.
- The current built application was checked on an owned random-port server with an isolated PostgreSQL schema. Guide, settings, setup, and co-op pass at 390 and 1280 px with no overflow or page script errors; every phone header link measures at least 44 px. This closes the header measurement gap without stopping the shared process on port `10000`.
- The `unavailable` routes are intentional 503 fallbacks inside the branch used when signing/encryption keys are absent. They are not dead routes shadowing the configured auth handlers; no removal is required.
- Signed-in browser acceptance (REQ-FE-003), image contrast, inline guide targets, full keyboard focus, and visual judgment remain open. Real Twitch app creation is the selected path; absent credentials and unavailable Zen/browser control prevent it. No frontend gameplay or design changes were made by this follow-up.

The following sections preserve each earlier pass's scope and evidence; their old PID, asset, and uncommitted-state observations are historical.

## Current reconciliation ? 2 November 2026

Documentation integration inspected the current source rather than repeating the older session's feature list. Fresh verification is recorded in [docs/STATUS.md](../STATUS.md).

- `src/main.ts` mounts `site/SiteRoot.vue`. The landing page, case menu, guide, settings, host overview, OBS setup, and co-op information pages exist in source.
- Mystery Live is integrated through `App.vue`; its richer snapshot UI is no longer merely an unintegrated file set. Complete current gameplay acceptance remains unverified.
- The public `/?view=quick` route is the local A Missing Manuscript sample, not Q01. `/?view=mystery` is the M01 visual preview. Session URLs select the live presentation from server snapshots.
- All six Twitch status labels now use English, and `index.html` declares `lang="en"`. The status component already uses Brown Noir colors; the old navy/teal observation below is superseded.
- The host command example now links released evidence IDs. Guide copy explains the required OBS credential and distinguishes local sample verdicts from validated live results.
- Browser expectations now target the landing page and current sample routes. Historical screenshots below do not show this new entry flow.
- Open work: OBS credential UI, browser co-op lifecycle, M01's additional-hint affordance, stable client retry keys, fresh Vite dependency resolution, final artwork, and real Twitch/OBS/Render/player evidence.

## Frontend target brief — 2 November 2026

The user supplied eight target PNGs and selected **shared visual system and public pages first**. All eight were visually inspected and copied unchanged into [the reference catalog](../design/frontend-target/references/README.md), with original filenames and SHA-256 values in its manifest.

The [development brief](../design/frontend-target/README.md) maps every image to current routes/source files, describes shared visual primitives and screen-specific behavior, lists responsive/error/permission states, and defines acceptance for F1 public visuals, F2 Q01/host/OBS, F3 M01, and F4 C01. `/dashboard` and active query-based host controls remain separate surfaces.

Important source findings: `DashboardPanel.vue` currently exposes Pause/Resume/Restart but lacks Start/Stop controls, although creation leaves a session in `READY`; M01's repeated-hint affordance remains open. The brief schedules both against existing contracts. Sample labels, real case identity, evidence-ID commands, scoped OBS URLs, and identity-bound co-op invitations take precedence over fictional example data in the images.

This pass changes documentation and preserves design references only. It does not implement or visually validate the redesign, run a new gameplay session, or verify Twitch/OBS/Render. Checks passed: all eight copies match the originals and manifest; 87 local links resolve; formatting and Git whitespace checks pass; all 321 baseline-protected source/reference/history files are unchanged. **Next implementation: F1**, using the existing assets and public flows before expanding into the live slice.

## F1 implementation — 2 November 2026

Scope: the shared visual foundation (partial Slice A) and the public landing, case menu, and dashboard (Slices B–D). No new shared primitive components were added; the pages use scoped styles and the existing `site.css` tokens. Guide, settings, setup, and co-op (Slice E) were not reworked or visually reviewed in this pass. The live F2–F4 surfaces were not changed.

Changed files:

- `apps/web/src/site/site.css`: `body:has(.site)` uses `background-attachment: scroll` to remove a seam from `style.css`.
- `apps/web/src/site/DashboardPage.vue`: rewritten. Account state comes from `GET /api/me` only (checking, signed out, unreachable with retry, signed in with or without Twitch connected). The page lists no sessions and says that no list endpoint exists yet.
- `apps/web/src/site/LandingPage.vue`: board image uses `step-map.jpg`; the "LIVE PREVIEW" badge is now "Sample board"; the hero photo is hidden at 760 px and below.
- `apps/web/src/site/MainMenu.vue`: feathered hero art; updated Quick Case description; single-border case cards; loading, error, empty, no-results, signed-out, creating, creation-error, and co-op "not available yet" states.
- `apps/server/src/index.ts` (Codex-owned; deliberate, reported exception): `setNotFoundHandler` (about lines 210–230) returns `index.html` for extensionless GET requests outside `/api` and `/health`, so client routes survive a reload. Other unknown requests return a JSON 404. Integrator review requested.
- `docs/agent-handoff/FRONTEND_CONTRACT_REQUESTS.md`: appended the "F1 frontend pass items" table. The file already existed and was reconciled on 2 November; it was appended to, not overwritten.

Verification (2 November 2026):

- `npm --prefix apps/web run typecheck`: exit 0.
- `npm --prefix apps/web run build`: exit 0. Bundles `assets/index-BxTV4-jw.js` (268.80 kB) and `assets/index-aJucme0k.css`.
- Browser capture against the local API at `127.0.0.1:10000`: `/`, `/dashboard`, and `/play` at 1920×1080, 1280×800, 1280×720, 390×844, and 1122 full page. 15 of 15 returned HTTP 200. Horizontal overflow was 0 in every capture. No page errors. The landing page logged no console errors. The dashboard and menu each logged one `401` for the signed-out `/api/me` check, which is expected.
- Reviewed by eye: `menu-1280x800` and `landing-390` only. Captures are in a temp folder outside the repo.

Stale server: the first capture returned 404 for the new hashed assets. The API process had started before the rebuild and served a static route list without them. The API was restarted; after the restart, `/health/ready`, both asset files, and `/dashboard` returned 200. Restart the API after each web build.

Not verified:

- Color contrast (4.5:1) was not measured.
- Guide and settings were not visually reviewed.
- Signed-in dashboard and session start. This needs a real Twitch sign-in or an approved fake-provider fixture (REQ-FE-003).
- Motion: full-motion animation counts are 24 (quick), 5 (play), 9 (dashboard), 12 (co-op), 18 (guide), and 7 (settings). Reduced motion gives 0. Not judged visually.

Blocked or deferred:

- Recent sessions list: no `GET /api/sessions` route (returns 404). Adding one needs `roundRepository.ts`, which is off-limits. The dashboard shows an honest note instead.
- Start/Stop controls: the backend accepts `start` and `stop` through `POST /api/sessions/:sessionId/:action`, but `DashboardPanel.vue` lacks them. Scheduled for F2.
- Co-op invitations: `POST /api/coops/invitations` exists. UI wiring is F4.
- OBS overlay credential: endpoints exist. UI wiring and the signed-in path are not verified.
- M01 repeated hint: the hint button hides after the first hint, but the server allows three. `MysteryLiveBoard.vue` is off-limits.
- Visible glyphs and "Sample" wording: `QuickCaseOverlay.vue:221` renders Unicode glyphs (`◇`, `✓`) and "Sample verdict"; `MysteryLiveBoard.vue` checks `source === "simulation"` near lines 151 and 316. Both files are off-limits. The enum stays.
- `apps/server/src/index.ts` (about lines 177 and 184): `unavailable` stubs for `/api/coops/sessions/:sessionId/rejoin` and `/api/sessions/:sessionId/overlay-credential`. The live auth routes answer, so the stubs are likely unreachable. Integrator to confirm.
- `tailwindcss` is imported in `style.css` but not declared in `apps/web/package.json`. Not changed.
- The `museum-gallery.jpg` placeholder is used by `apps/web/src/scene/caseScene.ts`, which the live Quick Case room also uses. Decision pending.

Pending decisions:

- Signed-in test path: real Twitch credentials or an approved fake-provider fixture. The dev-only bootstrap was withdrawn because REQ-FE-003 forbids using `CLUENITE_DEV_CONTROLS` to authenticate.
- Approval of any sample data shown in the UI (channel names, viewer counts, invite code, overlay URL, sample sessions).
- Keep "Sample board" on the landing page. This is a reversible label choice that replaces "LIVE PREVIEW".
- Use crops of target images as temporary art. Recommended: no.
- Add Midnight Conservatory and Lantern Street. This touches `packages/cases`. Recommended: no.
- Replace or approve the `museum-gallery.jpg` placeholder.
- Edit the off-limits files for glyph and label wording.

### Slice E: guide, settings, setup, and co-op (2 November 2026)

Changes (in `apps/web/src/site/`):

- Guide and settings spacing tightened: `.settings-block + .settings-block` margin reset and clamped section spacing in `.guide`.
- The setup address box is keyboard-focusable (`tabindex="0"`) so its overflow can be scrolled. The note below it has a fixed gap.
- At 640 px and below, header links and the brand get `min-height: 44px` (`site.css`). The built CSS contains the rule. It has not been re-measured on a running server.
- Server: `setNotFoundHandler` in `apps/server/src/index.ts` returns `index.html` for extensionless GETs outside `/api` and `/health`. This is the reported exception and needs integrator review.
- Co-op needed no change. Its case block is a single bordered article.

Checks, 2 November 2026:

- `npm --prefix apps/web run typecheck`: exit 0.
- `npm --prefix apps/web run build`: exit 0, no error lines.
- Browser audit on `/guide`, `/settings`, `/setup`, and `/coop` at 1920x1080, 1280x800, 1280x720, 390, and 1122 full page: all loads returned 200, with no horizontal overflow. Console errors: none on guide, settings, and setup. Co-op logs one `401` from the signed-out `GET /api/me`, which is expected.
- Settings persistence: the reduced-motion switch and text size survive reload (`cluenite.settings.v1`). The large text size sets the root font to 18 px at 390 px with no overflow.
- Reduced motion, from the system preference: 0 running animations. Not judged visually.
- Keyboard focus on `/guide`: the first three stops (skip link, brand, Case Menu) show a 2 px focus ring at 3 px offset.

Verified in this pass:

- Persistence, large text, reduced motion (animation count only), overflow, console errors, and the focus ring on the first stops.

Not verified:

- Signed-in flows (REQ-FE-003).
- Visual judgement against refs 06–08.
- Contrast: approximate computed-style check with no failures at 1280x800 and 390 px. Text on images was not measured.
- 44 px touch targets at 390 px: the header links measured 32–35 px before the fix. The re-measure is pending because the local API on port 10000 still serves the previous build.
- Inline text links in the guide (about 20 px tall) are unchanged. Whether they count as exempt is not decided.
- Focus beyond the first stops on the settings radio group.

Local API state:

- Two restart attempts failed with `EADDRINUSE` on 0.0.0.0:10000.
- The listener is a verified process chain from our start script: `bash 18324` → `npm 20332` → `cmd 4652` → `tsx 14580` → `node 26332`. It still serves the previous build (`/assets/index-KMFnhuET.css` returns 404).
- Stopping it was denied by the auto-mode classifier, so it is still running. To finish: `taskkill /PID 18324 /T /F` once approved, then start with `start-api-f1e.sh`, confirm `/health/ready` and the new CSS asset, and re-run the 390 px touch probe.
- Nothing has been committed or pushed.

## Historical evidence

The complete original session record, including test results and screenshot paths, is preserved in [the 1 November frontend archive](../history/frontend-progress-2026-11-01.md). It does not report current listener, account, deployment, or submission state. See [current status](../STATUS.md) for fresh checks and remaining work.
