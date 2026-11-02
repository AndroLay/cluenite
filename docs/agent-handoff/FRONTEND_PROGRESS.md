# Frontend progress

## Decorative figure removal - 3 November 2026

The user's latest correction removes the additional investigator/head from Gallery, Festival and Signal entirely, including its idle animation and portrait-atlas loading. Scene detail, clue interaction, layout and other effects remain. Manuscript characters and practice suspect portraits are unchanged.

## Manuscript benchmark craft pass - 3 November 2026

The user requested more creative layout/animation across every case, with Manuscript as the benchmark. Gallery/Festival/Signal now include richer room set dressing, physical object supports, a shared-atlas investigator, subdued generated material finish and a quieter translucent briefing. Existing semantic controls, clue positions and proof remain unchanged. Express/Lighthouse gain train/passenger/metal details and lighthouse/coastal architecture, with native light/water movement. SVG layer extraction now preserves inherited paint and normalizes the ship pivot for texture density. Shared pause, reduced motion, scroll and full/compact behavior remain.

See the [dated craft evidence](../evidence/immersive-frontend-2026-11-03.md#manuscript-benchmark-craft-pass) for the bounded browser/visual checks. This is local frontend work; it does not establish subjective player approval or provider/OBS Studio acceptance.

## Interactive scenes and broadcast card - 3 November 2026

Express/Lighthouse now default to their complete illustration and offer a Full illustration/Compact illustration toggle within the existing central scroll region. Their theory cards have separate statement/status/action rows. Live Theories uses a list and action panel that stack on narrow screens. Notices hide while those reading surfaces are open; measured header/dock heights keep scene notices clear of wrapped tools. Manuscript preserves its last-find notice when opening deductions.

All three main cases now build their environment and recognizable selectable objects with native Pixi geometry, gradients, lighting and motion instead of photo scenery. Object picking opens the existing inspection, with equivalent keyboard/fallback controls; public projections and server proof remain authoritative. Manuscript room faces, suspect cards and partner share the existing cast atlas. OBS uses a transparent, read-only broadcast card with actual progress, findings and reveal, retaining placement/scale and authorization. No dependency or backend contract changed.

See [current dated checks and boundaries](../evidence/immersive-frontend-2026-11-03.md#interactive-scenes-full-illustration-and-obs-card). The owned production preview remains `http://127.0.0.1:5227`; this source is local and uncommitted.

## Practice scrolling and clearer actions — 3 November 2026

The user's short-screen screenshot showed the Express/Lighthouse board compressed below the illustration. Both now use one keyboard-accessible central scroll region, a smaller scene, naturally sized card rows and a visible scrollbar. Header metrics and the four tools remain in the viewport. No gameplay rule or main-case layout was changed.

A contextual next-step guide and expandable How to play explain the complete inspect/connect/challenge/accuse loop. Connect evidence starts an explicit two-card mode with cancellation; face-down cards are excluded from connection/challenge selection. Collected-card inspection names its connection action clearly, and Station B explains requesting and sharing. Commands remain optional. See [the dated evidence](../evidence/immersive-frontend-2026-11-03.md#practice-scrolling-and-discoverability) for checks and the local-only boundary.

Typecheck, lint and production build pass. Both complete practice proof/report paths pass; the final guidance/scroll/Pixi pair passes in 19.1 seconds. Six desktop/phone/short-screen combinations have reachable last cards and tools, natural card heights, zero overflow and zero page errors. Explicit stretching and stronger workspace selectors address the two layout findings. Port 5173 serves the new CSS; shared services were not restarted.

## Pixi gameplay and layout polish — 3 November 2026

All six gameplay scenes now use PixiJS. Manuscript retains its room renderer; Express/Lighthouse animate their existing illustration as cached GPU layers; Gallery/Festival/Signal share a location/effects renderer. Public accepted state drives discoveries, evidence sharing, theory and timeline responses. No private proof, authored answers, viewer chat or score is fabricated. Live mode displays the actual record count and timer; practice retains its score.

Discoveries are seven-second, pointer-transparent left notices with no close or action button. Full details remain on collected cards/finds. Native inspection targets the active fullscreen container. Phone fullscreen, separate intro Skip controls, larger score/time, optional practice command composers, responsive main-case tools and clue placement address overlapping controls. A newly created Quick/Mystery session opens the scene's Start round action; explicit dashboard links still open Host controls. Co-op retains the authenticated invitation/consent workflow.

The shared renderer owns its ticker, generated textures and observers, caps density/frame rate, and stops for pause, hidden/offscreen and reduced motion. Manuscript now observes tab visibility and preserves shared Pixi white/empty textures during cleanup. Existing art, gameplay rules, backend proof and transport are preserved; there is no new dependency.

Current local verification and limitations are recorded in [the dated evidence](../evidence/immersive-frontend-2026-11-03.md#pixi-consistency-and-control-layout-pass). The owned preview remains at `http://127.0.0.1:5227`. This is local work, not a deployment or a fresh real-provider acceptance claim.

## Current frontend/backend compatibility - 3 November 2026

The latest scoped integration preserves the current visual design and discovery notifications. Dashboard links now open the host panel; partner Session tools retain team-scoped OBS without offering owner-only commands; terminal rounds disable Restart. Confirmed restart and safe retry clear round drafts, while idle pause/resume preserves them. OAuth failure copy reflects the attempted authorization separately from an existing session, and sign-out intent clears invitation continuation even if its response is lost. C01 catalog previews omit live station-chat instructions.

The actual API/Socket.IO/PostgreSQL fixture passes fifteen scenarios with synthetic accounts, including partner OBS issuance/revocation, saved sessions, invitation consent, private projections, rejoin and final reveal. All fourteen immersive browser tests and twenty-two focused unit tests pass; web typecheck/build and changed-file lint pass. See the [integration evidence](../evidence/frontend-integration-2026-11-02.md#latest-compatibility-pass---3-november-2026-wita) and [handoff](FRONTEND_BACKEND_INTEGRATION.md). These local frontend changes are uncommitted and are not the older frontend currently deployed on Render.

## Manuscript layout refinement - 3 November 2026 (Codex)

The user accepted the viewport direction and requested a more spacious, translucent layout. Manuscript now opts into the shared workspace's cinematic variant: full-bleed room beneath a compact transparent header/dock, floating desktop Finds/file drawers, and viewport-anchored objectives. The dock replaces duplicate deduction destinations with Case file; Command opens a focused composer and `/` opens it outside text fields. Case options groups sound/restart. Escape closes the upper composer/options before a background Finds drawer and restores focus. Internal pan space keeps low objects clear of controls on short screens. Default live/Express/Lighthouse workspace layout is preserved.

The initial regression failed against the former 748px room; implementation passes the full-height room and non-shrinking Finds assertions. The six immersive engine/preview/session scenarios and two status/shared-workspace scenarios pass during this refinement. The final Manuscript confirmation adds options/shortcut/text-input/Escape/focus checks and repeats all twelve finds/proof/report. See the refinement section in [dated evidence](../evidence/immersive-frontend-2026-11-03.md) for final captures and boundaries.

## Immersive practice and authored presentation - 3 November 2026 (Codex)

The expanded user request now covers the three practice cases and actual Q01/M01/C01 presentation. The user retained Twitch sessions for authored play and requested clearly labeled previews. Current source remains local and uncommitted; no deployment or external service mutation was performed.

- `GameWorkspace.vue` and `EvidenceDialog.vue` provide a full-viewport header/surface/dock, optional panels, animated inspection, internal scrolling, Escape handling, and keyboard focus restoration. Express and Lighthouse retain their local proof/scoring/timeline and animate their scene during play.
- Manuscript now uses that viewport from the opening cover onward. Its room fills the main surface; Finds/Grid/Assist and chat are optional. Found objects open sharp vector-rendered close-ups. The final find opens deductions and restores focus to Board. A stable PlateFrame slot prevents canvas detachment when leaving the intro. The old framed room and permanent object list are superseded.
- `LiveCaseExperience.vue` consumes only public snapshots for Gallery, Festival, and Signal. Existing commands, lifecycle, retries, server proof, viewer-only station actions, and private co-op projections remain intact. Host/advanced OBS setup is optional. Actual round activity is not presented as mirrored Twitch chat.
- `/preview/gallery`, `/preview/festival`, and `/preview/signal` expose catalog metadata only. Selecting a different case while a hosted case is open offers a direct Continue link, without a create or stop mutation.
- Tiny stretched landing/menu artwork is replaced with larger existing art or scalable illustrations. Hero/study canvas density caps at 2x. The clean museum scene, original coastal observatory, shared painted cast atlas, and warmer detailed study characters follow the same palette; provenance is recorded beside new assets.

Fresh checks on 3 November: web typecheck/build pass; 21 frontend tests in five files pass; 11 installed-Chrome browser scenarios pass in 2.4 minutes; changed-source ESLint error gate passes. The browser fixture uses the real authored engine behind owned local API/Socket.IO, with synthetic viewer inputs. It checks Q01 proof/lifecycle/reveal, M01 timeline/theory/reveal, C01 team privacy/shared proof, metadata previews, session recovery without mutation, all Manuscript finds/proof/report, Express replay, and Lighthouse's actual 74-second discovery milestone. A focused artwork-bounds assertion catches popup clipping. Independent read-only review found no remaining material regression in the fullscreen/recovery correction.

See [the dated evidence](../evidence/immersive-frontend-2026-11-03.md) for commands, captures, failures corrected, and external boundaries. The owned preview at `http://127.0.0.1:5227` is retained so the user can review this build; fixture servers close after tests, and shared servers are untouched. No fresh real Twitch, OBS Studio, remote deployment, or player acceptance is claimed. The previous closeout and integration entries below retain their own narrower dates and scope.

## Frontend practice closeout - 2 November 2026 (Codex)

The user authorized Codex to continue Opus's unfinished frontend work. This pass completes the two pinboard practice cases and a bounded consistency pass, preserving the separate integration described below. It does not replace Q01/M01/C01 or claim new external acceptance.

- `/play#practice` offers Express, Manuscript, and Lighthouse. The Manuscript thumbnail captures its actual code-drawn study; the other cards reuse their SVG scenes.
- The pinboards share Brown Noir styling, readable full selected evidence, keyboard selection/Escape, pause guards, and reveal/report behavior. Lighthouse's partner is explicitly scripted, with warm copper/burgundy accents and no false live indicator.
- Early shares no longer invent requests/quick-hand-off bonuses or bypass Station B's discoveries. Prompted shares retain their scoring. Replies are suppressed if the matching file was already received through an explicit ask.
- M01 retains its current hint and offers the next request while the server permits it; paused/exhausted states remain authoritative. Quick Case state indicators use the shared SVG icons.
- Public, practice, live, and OBS surfaces share EB Garamond and Inter through root font tokens. Existing integration components, transport, credentials, session data, and local edits were preserved.

### Checks on 2 November 2026

- Web typecheck and production build: exit 0.
- `vitest run tests/web apps/web/tests --reporter=dot`: **21 tests in five files pass**, including 11 local board tests. The early-share regression failed before the correction and passed after. The stale root round-client test now matches the existing error-first join acknowledgement and coalesced HTTP recovery; production transport was not changed.
- `playwright test --workers=2 --reporter=line`: **four browser scenarios pass** using installed Chrome and owned Vite/mock API/Socket.IO servers. Coverage includes live status/OBS boundaries, a clicked M01 second-hint command and updated snapshot, Express proof/rejected verdict/report/replay, and Lighthouse early trading/pause/prompted bonus/shared proof/report. Lighthouse waits for its real 74-second discovery.
- Built-preview smoke: **22 route/viewport combinations** at 1440 and 390 px, with one `h1`, no overflow or uncaught page errors, and shared fonts. Three practice links and the loaded study thumbnail are checked. This visual pass precedes only the final redundant-dialogue guard; a separate browser-clock check covers that guard.
- Earlier bounded playthroughs also checked chat votes/hunches, wrong links, and reduced-motion SVG stability. The current Lighthouse browser test checks reduced-motion animation count.
- Changed-source ESLint error gate (`--quiet`): exit 0. Existing Vue formatting warnings remain; this pass does not reformat the inherited frontend. Git whitespace and local documentation links are checked separately.
- Independent read-only review found the early-trade timeline/credit issue; its focused follow-up found no remaining blocker. The minor already-received dialogue issue was also corrected and browser-checked.

Harness failures were corrected before the passing runs: occupied fixed ports, a missing revision field in the hint fixture, an ambiguous Resume selector, and a score assertion that omitted automatically turned chat cards.

Private evidence is under `%LOCALAPPDATA%/Temp/cluenite-codex-board-d347f840/`: `browser-final/`, `partner-dialogue.log`, `web-tests-final.log`, `e2e-final.log`, and typecheck/build/lint logs. Playwright screenshots are in ignored `test-results/`. Captures use public or signed-out fixture state; `/api/me` 401 is intentional. No credentials, real chat, or private invitation/overlay links are captured.

### Handoff boundary

Changes remain uncommitted. This closeout performs no deployment or external service mutation. The owned preview was retained for the subsequently expanded task; shared servers are untouched. Live integration evidence belongs to [the integration handoff](FRONTEND_BACKEND_INTEGRATION.md) and [its evidence record](../evidence/frontend-integration-2026-11-02.md). Player timing/comprehension, broader assistive-technology/contrast acceptance, final sound/art, and deployed-version checks remain separate.

Current routes and behavior are in [the product guide](../../apps/web/PRODUCT.md), [design guide](../../apps/web/DESIGN.md), and [local setup](../development/local-setup.md). Earlier entries below retain their original scope; their repeated-hint and typography gaps are superseded here.



## Current integration reconciliation — 2 November 2026 (Codex)

This scoped user-authorized integration preserves Opus's frontend design work and supersedes the disconnected-UI observations below. Saved session continuation, host Start/Pause/Resume/Restart/Stop, explicit OBS create/copy/replace/revoke, C01 lobby/username invitation/consent, live A/B workstations, shared proof and explicit rejoin are connected. The [integration guide](FRONTEND_BACKEND_INTEGRATION.md) owns the reusable components and retry/storage boundaries.

- Eight focused regressions pass. Main-checkout web typecheck/build and changed-source ESLint (`--quiet`, zero errors) pass.
- Fourteen owned headless browser scenarios pass against actual local Fastify/Socket.IO/PostgreSQL with synthetic provider/viewer inputs. These include lost acknowledgements, scoped overlay recovery, invitation continuation, team privacy, shared proof and explicit rejoin.
- Read-only checks with both existing authorized accounts pass through the current local frontend/API; no API mutations or chat messages were attempted. Temporary probe sessions were revoked.
- [Dated evidence](../evidence/frontend-integration-2026-11-02.md) records exact scope. This frontend working tree remains uncommitted; published backend CI is separate evidence.
- Remaining: visual polish, broader keyboard/contrast/assistive-technology and real player acceptance, M01's repeated-hint affordance, and production configuration/deployment. Local practice is separate from Q01/M01/C01 live authoring.

Earlier entries retain their original dates, source versions and limits; old credential/UI/publication blockers are not the current assignment.

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
- Open work: the OBS credential UI and stable client retry keys are in source (Slice J) but have not been exercised against a live session. Still open: browser co-op lifecycle, M01's additional-hint affordance, fresh Vite dependency resolution, final artwork, and real Twitch/OBS/Render/player evidence.

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

### Slice F: connection state and co-op stations (2 November 2026)

Scope: the 18-screen reference pack. This slice adds the missing screens S01, S11–S14, S16, and S17; extends S03 and S15 with the controls and notes they lacked; and makes one polish batch on existing site pages (see Changes). S04 has only the labeled sample page, not a live overlay. S05 and S07–S10 live in gameplay and `QuickCaseOverlay.vue`, which are off-limits here, so they are not built.

Changes (in `apps/web/src/site/`):

- `ConnectionStatusPage.vue` (S01) at `/connect`. It shows one state at a time, read from `GET /api/me`: checking, connected, connection needed (401), or check failed (with retry). Revoked and authorization-failed states are not rendered, because the server does not send those reasons to the browser. The page does not change the connection itself.
- `CoopPage.vue` (S11) at `/coop` is now a lobby layout. Its case block and host sign-in state come from `GET /api/cases` and `GET /api/me`. The second investigator is shown as not invited. "Start investigation" is disabled, because no co-op start control exists in the web app. Sending invitations is not wired (Slice F does not call `POST /api/coops/invitations`).
- `CoopWorkstationPage.vue` (S12–S14) at `/coop/field`, `/coop/records`, and `/coop/shared`. These are sample previews with labeled sample entries and disabled actions. They import no case data, so the browser never receives the other crew's clues. They are not connected to a live co-op session.
- `SiteRoot.vue` registers the new routes and titles.
- Craft-floor fixes, one batch, in existing site pages: removed the eyebrow above the Dashboard heading (`DashboardPage.vue`) and the kicker above the Quick Case sample heading (`QuickSamplePage.vue`; the "Sample data" chip still labels the sample). Removed the zero-offset gold glow on found clues and the current step node, and the looping "ping" and "glow" keyframes that used them (`QuickSamplePage.vue`). The current step keeps its gold border.
- Reference copy removed: the Dashboard's "Connected to Twitch" label now reads "Twitch connected" (`DashboardPage.vue`).
- `SetupPage.vue` (S03) adds a "Copy address template" button, which copies the placeholder address only, and a disabled "Test overlay" button with the reason stated. It adds a "Dimensions and safe zone" section with a CSS-only 16:9 sample frame that has no round content. The page does not enforce a safe zone or set opacity. The overlay token cannot be issued from the UI yet, so the address stays incomplete.
- `SettingsPage.vue` (S15) adds a "Not on this page yet" section. It names the volume, color-contrast, quick auto-hide, and hint-mode options that are not set here, and it adds no non-functional controls.
- `OfflinePage.vue` (S17) at `/offline` renders one state, "This round is not responding." A "Check the server" button makes one `GET /health/live` request and reports whether the server answered. The page cannot tell paused, expired, or disconnected rounds apart, so it does not show them as separate states.
- `LibraryPage.vue` (S16) at `/library` lists the cases from `GET /api/cases`, grouped by mode, with clue and verdict counts. Tags, difficulty, duration, and solved or recap history are not in the API, so the page says so and shows none. `/play` remains the menu that starts a case.

Deviations recorded for integrator review:

- Routes differ from the v3 pack's `/stage/:id` plan. The new paths follow the existing `/coop` and `/play` pattern.
- Browser OAuth callbacks currently return JSON, and success redirects to `/`. `/connect` is not on the automatic post-login path. See the request in `FRONTEND_CONTRACT_REQUESTS.md`.

Checks, 2 November 2026:

- `npm --prefix apps/web run typecheck`: exit 0 (re-run after the `ConnectionStatusPage.vue` reorder).
- `npm --prefix apps/web run typecheck`: exit 0, re-run on 2 November 2026 after the S03, S15, S16, and S17 edits and the `/offline` and `/library` routes.
- `npm --prefix apps/web run build`: exit 0, run on 2 November 2026 after the same edits. The build covers `LibraryPage.vue` and `OfflinePage.vue`. It does not show the pages render correctly.
- Browser check, bounded: a temporary Vite dev server served the current source. The port recorded at the time (`127.0.0.1:5180`) and the claim that the server was stopped afterward are unverified. Signed out, `/connect`, `/coop`, `/coop/field`, `/coop/records`, `/coop/shared`, and `/dashboard` at 390 px had no horizontal overflow (scroll width equal to client width) and no links or buttons under 44 × 44 px. The only page error was the expected signed-out `401` from `GET /api/me`.
- Screenshots, reviewed by eye: `/coop/field` at 1280 px and `/connect` at 390 px. On `/connect`, the status pill moved below the explanatory copy so it no longer sits above the heading. On `/coop` at 390 px, the full-page capture showed a blank band where the consent steps should be. Measured opacity was 0 before scrolling and 1 after, so this is the existing scroll-reveal motion in `site.css`, not a layout fault.
- Screenshots captured but not viewed: `/coop/records` at 390 px and `/dashboard` at 390 px. Desktop captures of `/coop`, `/coop/records`, `/coop/shared`, and `/dashboard` were not taken.
- Browser check of `/setup`, `/settings`, `/offline`, and `/library`, bounded, 2 November 2026: a temporary Vite dev server on `127.0.0.1:5190` served the current source and was stopped afterward. Port 5180 was already in use by another process, so no server was started there and nothing on that port was stopped. API responses were FIXTURE data supplied by Playwright routes in the browser only. At 390 px and 1440 px, none of the four pages had horizontal overflow. Console errors were empty after filtering the expected `401` from the fixture `GET /api/me`. On `/offline`, "Check the server" showed the answered state. `/library` grouped and listed both fixture cases. At 390 px no links or buttons were under 44 px on either side. At 1440 px the four site header links are under 44 px on at least one side; they are shared site chrome and were not changed. The mobile `/setup` capture was reviewed. Its verification section sits below the fold and appears only after scrolling, because of the scroll reveal in `site.css`.

Not verified:

- Desktop review of `/connect`, `/coop`, `/coop/records`, and `/coop/shared`, and mobile review of `/coop/records` and `/dashboard`.
- Scrolled screenshots of `/settings`, `/offline`, and `/library`, and desktop screenshots of `/setup`, `/settings`, `/offline`, and `/library`. Those four pages were checked only by the metrics above.
- The OBS source itself has not been tested in OBS Studio, and the "Test overlay" control is disabled until the UI can issue an overlay token.
- Reduced-motion behavior of the new pages, keyboard order, and computed contrast of the new pages.
- Signed-in flows (REQ-FE-003). The connected state has not been seen with a real session.
- Visual judgement against the reference PNGs.

### Slice G: gameplay sample screens S05–S10 (2 November 2026)

Scope: labeled, static sample layouts for the gameplay screens S05–S10. They are local-only previews. They do not connect to a round, the live overlay, or the live board. `MysteryLiveBoard.vue` and `QuickCaseOverlay.vue` are off-limits in this session, so the live versions of these screens are not built.

Changes (in `apps/web/src/site/`):

- `GameplaySamplePage.vue` (new, one component with a `screen` prop) renders six routes: `/sample/reveal` (S05), `/sample/stage` (S06), `/sample/evidence` (S07), `/sample/timeline` (S08), `/sample/theory` (S09), and `/sample/verdict` (S10). Every case, clue, theory, and person is invented, and the page says so.
- Interaction stays on the page. The timeline can be reordered with move earlier and move later, then checked. A theory can be selected and tested against the evidence marked for it. Evidence can be checked, and a verdict can be selected. The reveal strip can be dismissed. Nothing is saved, timed, animated, or sent. "Submit verdict" and "Check code" are disabled.
- `SiteRoot.vue` registers the six routes and titles. Each title carries "(sample)".

Deviations recorded for integrator review:

- The routes are `/sample/*`. The v3 pack's `/stage/:id` is not an implemented alias; live presentation uses `/?session=<id>` (see `docs/reference/README.md`). The `/sample/*` paths follow the existing `/coop` and `/play` pattern and keep these labeled previews separate from live rounds.
- S06 is a static stage layout, not the live mystery stage. The S07–S10 boards use invented evidence, not the live board data.
- Reference-only elements are omitted: the "Design target" timing note, the "Simulated session" pill, the community theories column, viewer discoveries, and icon glyphs.

Checks, 2 November 2026:

- `npm --prefix apps/web run typecheck`: exit 0, re-run after the final `GameplaySamplePage.vue` edit.
- `npm --prefix apps/web run build`: exit 0, re-run after the same edit.
- Browser check, bounded: a temporary Vite dev server on `127.0.0.1:5193` served the current source and was stopped afterward. Port 5190 was already in use by another process, and it was not stopped. API responses were answered in the browser only. Signed out, all six routes at 390 px and 1440 px had one `h1`, no horizontal overflow, and no console errors after filtering the expected `401` from `GET /api/me`. At 1440 px, "Check order" on `/sample/timeline` and "Test selected theory" on `/sample/theory` each returned their sample status text.
- Targets: the header links are under 44 px at 1440 px. They are shared chrome and were not changed. The radio and checkbox inputs are 20 px, but each sits inside a label with `min-height: 44px`, so the label is the target.
- Visible "simulation" text: none in the files this slice owns. The `source: "simulation"` enum and its data values remain. `QuickCaseOverlay.vue` and `MysteryLiveBoard.vue` (off-limits) still show "Sample verdict" and "Sample investigation" through that enum, and `mysteryLive/previewSnapshot.ts` (off-limits) has the same value in a comment.
- Screenshots, reviewed by eye: desktop `/sample/reveal` and mobile `/sample/theory`. Other captures were not viewed; they were checked only by the metrics above.

Not verified:

- Keyboard order, reduced-motion behavior, and computed contrast of the sample pages.
- Visual judgement of `/sample/stage`, `/sample/evidence`, `/sample/timeline`, and `/sample/verdict` against the reference PNGs.
- The status line under "Test selected theory" reserves `3em` of height so the layout does not shift when a note appears. This leaves some empty space until a note is shown. It is intentional.

### Slice H fix batch: inspection fixes for the site routes (2 November 2026)

Scope: fixes from the bounded inspection of the site routes at 390 px and 1440 px. One confirmation round ran after the first fix batch. The last three edits were checked with a numeric measurement only, not a new visual round.

Changes (in `apps/web/src/site/`):

- `SetupPage.vue`: the address box is a labeled region with `tabindex="0"`. The action row has 16 px vertical margin. At 390 px the address code stays on one line and the box scrolls sideways, so the box is 54 px tall instead of 102 px. The paragraph after the frame figure has 16 px top spacing.
- `CoopWorkstationPage.vue`: the station navigation buttons have `min-height: 44px`.
- `LandingPage.vue`: the shared `.lbtn` control has `min-height: 44px` (was `height: 36px`). The two landing buttons measure at least 44 px at 390 px.

Checks, 2 November 2026:

- `npm --prefix apps/web run typecheck`: exit 0, after the final edits.
- `npm --prefix apps/web run build`: exit 0, after the final edits (built in 10.33 s).
- Confirmation round, before the last three edits: at 390 px and 1440 px, `/setup` had one `h1`, no horizontal overflow, 16 px between the actions and the note, both buttons 44 px, and the address region role and label. At 390 px, all three `.ws-nav` links on `/coop/shared` and `/coop/field` were 44 px. No "simulat" text and no console errors after filtering the expected `401` from `GET /api/me`.
- Numeric measurement after the last edits, Vite on `127.0.0.1:5193`, reduced motion, API answered in the browser: `/setup` address 54 px tall at 390 px with no page overflow; the paragraph after the figure starts 16 px below the figure; landing CTAs at least 44 px at 390 px.

Not verified or not changed:

- The landing and setup changes were checked by measurement only. They were not reviewed in a screenshot after the final edits.
- Header links in `SiteRoot.vue` (shared chrome) are 32–35 px at 1440 px and were not changed. They meet the WCAG 2.2 AA minimum of 24 px but not the 44 px floor used elsewhere.
- Inline text links, such as "Quick Case preview" (14 px tall) in landing prose, were left as they are under the WCAG inline exception.
- Settings radio inputs are 18 × 18 px, but each sits in a label at least 81 px tall. The label is the target.
- Seven contrast results at 2.21:1 from the inspection estimator are false positives: the estimator mixes transparent backgrounds with white. A manual calculation for `--case-alert` (#d99a88) on about #1d1714 gives about 7.5:1.
- Keyboard order and computed contrast were not measured in this batch.
- Visible "simulation" text remains only in off-limits files: `QuickCaseOverlay.vue`, `MysteryLiveBoard.vue`, and `mysteryLive/previewSnapshot.ts`. The `source: "simulation"` enum value is kept.

### Slice I: reference screen pass S00–S17 (2 November 2026)

Scope: the site screens in the Cluenite reference pack (S00–S17, 1440 × 900) were rebuilt to follow the reference as closely as the current API and file ownership allow. The user's brief sets the direction. Where a craft rule conflicts with the reference, the brief wins, so the reference eyebrows (for example "STREAM CONNECTION" and "CO-OP MYSTERY · EXPLICIT CONSENT") are kept on purpose. S00 is the exception; see the S00 notes below.

Changes (in `apps/web/src/site/`):

- `LandingPage.vue` (S00, `/`): rebuilt to follow `Cluenite_ Noir Mystery Game Landing Page.png` (941 × 1672, outside the repo). Sections: nav with the Cluenite wordmark, Cases, Guide, Settings, and a gold "Sign in with Twitch" button (`/connect`); hero with "Play on Twitch" (`/play`) and "See how it works" (`/guide`); three mode cards; a case-board and chat monitor; "How a round runs"; "Modes"; "Current Build Status"; a closing band with "Open the case menu" (`/play`); and a footer. The root is `.landing`, which overrides the plate minimum height, so `SiteRoot.vue` is unchanged. The landing page calls no API.
- `ConnectionStatusPage.vue` (S01, `/connect`): reads `GET /api/me`. States: checking, connected, not connected (links to `/api/auth/twitch/start`), and check failed. One state renders at a time.
- `DashboardPage.vue` (S02, `/dashboard`) and `SideNav.vue` (new): sign-in state from `GET /api/me`.
- `SetupPage.vue` (S03, `/setup`): real link to `/api/auth/twitch/start`. "Test overlay" is disabled because the UI cannot issue an overlay token.
- `GameplaySamplePage.vue` (S05–S10, `/sample/*`): labeled sample layouts, as in Slice G.
- `CoopPage.vue` (S11, `/coop`): reads `GET /api/cases` and `GET /api/me`. Invitation and start controls are disabled.
- `CoopWorkstationPage.vue` (S12–S14, `/coop/field`, `/coop/records`, `/coop/shared`): labeled sample stations. Reference viewer chat is omitted.
- `SettingsPage.vue` (S15, `/settings`): uses `SideNav`. Controls with no backing are disabled or omitted.
- `LibraryPage.vue` (S16, `/library`): reads `GET /api/cases` and filters by mode. When the API lists no cases, the grid shows three labeled sample cards (reference copy, tag "SAMPLE · NOT LIVE", disabled "View case →"). Real cases show clue and verdict counts and link to `/play`. The profile panel is a labeled sample with "—" stats.
- `OfflinePage.vue` (S17, `/offline`): one state, "Connection lost". "Check the server" calls `GET /health/live`.
- `PlateFrame.vue` (new) and `plates.css` (new): shared nav and footer for plate screens, and the reference rules scoped under `.plate`. Plate fonts load from `apps/web/src/assets/fonts/` with their OFL license files.
- `SiteRoot.vue`: routes and `platePages` updated for the screens above.

Deviations, for integrator review:

- S04 (Quick Case overlay) is not built. `QuickCaseOverlay.vue` is off-limits in this session.
- The reference uses EB Garamond and Inter. `apps/web/DESIGN.md` names Fraunces and IBM Plex Sans. Plate screens use the reference fonts under the `Cluenite EB Garamond` and `Cluenite Inter` names. This conflict needs an owner decision.
- Reference-only content is omitted: fabricated viewer chat, unsupported difficulty and duration tags, and the "PROOF COMPLETE" status. Two reference controls, "Save preferences" and "Preview overlay", are replaced by "Restore defaults" and "Open OBS setup".
- Some sample copy was written to match the reference screens and needs owner review: S05 expanded text, S09 "YOUR NEXT ACTION", S10 "Case summary", the S12–S14 case titles, and the landing "R-07 seen at 21:10" and "Viewer_01–03" handles.
- S06–S10 are static sample layouts, not the playable M01 vertical slice the reference README asks for. That slice needs engine and server work.
- Only data-backed states are shown: no fake Live or Ready status and no viewer counts. Revoked and auth-failed states are not rendered because the server does not report them.
- S00 follows the newer reference `Cluenite_ Noir Mystery Game Landing Page.png`, not the pack reference `S00_Landing_Setup.png`. The pixel harness still compares S00 with the pack reference, so the S00 metrics above are not a match score for the new design. The reference eyebrow "THE TWITCH-NATIVE MYSTERY GAME" was dropped under the craft-floor ban on eyebrows above headings. This is a deliberate exception to the Slice I rule; the owner can restore it. The reference nav link "Community" was dropped because no route exists. The reference CTA and desk props are approximated with the existing assets.

Checks, 2 November 2026:

- `npm --prefix apps/web run typecheck`: exit 0.
- `npm --prefix apps/web run build`: exit 0, built in 11.56 s (re-run 2 November 2026 after the S02 nav-icon change, the S12 edits, and the S12 edge and scrim layers).
- S00 redesign, 2 November 2026: typecheck exit 0; build exit 0 (built in 10.41 s). `ONLY=S00` harness, Vite on `127.0.0.1:5193`, after the final fix: exact 0.94 %, within 8 45.85 %, mean diff 31.63, no errors. The screenshot was viewed after the fix: the gold button labels are dark on gold and readable.
- Pixel comparison against the reference PNGs, 2 November 2026, Vite on `127.0.0.1:5193`, Chrome, 1440 × 900 at DPR 1, `GET /api/me` mocked as 401 and `GET /api/cases` mocked as an empty list. Columns: exact-match %, within 8 channel levels %, mean absolute difference (0–255). The harness is outside the repo.

  | Screen | Exact % | Within 8 % | Mean diff |
  | --- | --- | --- | --- |
  | S00 (new design, old pack reference) | 0.94 | 45.85 | 31.63 |
  | S01 | 22.89 | 90.46 | 5.06 |
  | S02 | 10.85 | 92.84 | 5.29 |
  | S03 | 10.91 | 90.01 | 6.03 |
  | S05 | 16.17 | 93.51 | 5.62 |
  | S06 | 8.07 | 92.76 | 6.28 |
  | S07 | 12.18 | 91.79 | 5.71 |
  | S08 | 17.78 | 90.34 | 6.44 |
  | S09 | 13.35 | 90.59 | 6.27 |
  | S10 | 11.92 | 92.47 | 5.44 |
  | S11 | 11.03 | 92.92 | 4.68 |
  | S12 | 5.59 | 90.45 | 5.41 |
  | S13 | 12.39 | 93.50 | 4.98 |
  | S14 | 9.99 | 91.41 | 4.66 |
  | S15 | 12.14 | 92.85 | 6.02 |
  | S16 | 6.06 | 91.99 | 5.44 |
  | S17 | 16.08 | 94.64 | 4.53 |

  The other rows come from a canonical run of all screens before the S16 change (`pixel-diff.mjs`, no `ONLY` filter). The S16 row was re-measured after the change (`ONLY=S16`, 2 November 2026). Only `LibraryPage.vue` changed, and only `/library` renders it. Before the S00 redesign, all 17 in-scope screens were at or above 90 in the "Within 8 %" column, which holds a composite score for the earlier rows, not the raw `withinTolPct`. (The earlier S00 run showed `withinTolPct` 87.24 with a score of 94.83, so the two differ.) S03 (90.01), S08 (90.34), and S12 (90.45) were borderline. The S00 row now holds the raw harness metrics against the old pack reference. These numbers measure the gap between the new design and that reference, not a match to the target, and they are not comparable with the composite scores above.

  S16 before the sample cards (bare empty state, canonical): 0.79 / 70.79 / 11.94. S16 with the sample cards (canonical, empty `GET /api/cases`): 6.06 / 91.99 / 5.44. S16 with a fixture case list (`CASES_FIXTURE=1`, the real-case path, not the default): 5.83 / 91.38 / 6.09, unchanged. No screen is pixel-identical.

  The 91.99 score measures the sample layout. It does not measure live data. The sample cards are a choice made for S16 and are labelled in the UI. They are not a real case list.

  S12 edge and scrim: `CoopWorkstationPage.vue` adds a `ws-plate` class on `PlateFrame`. Scoped CSS darkens the right and bottom page-background edges with two gradient layers (`.plate.ws-plate::before`), and adds a 20 % scrim behind the community panel. The right strip (x 1380–1440) went from 24.9 % over tolerance to 0 %. The community panel patches went from 3–4 brighter to 0 % over. `plates.css` and the reference are unchanged. S13 and S14 use the same `PlateFrame` class, so the edge layer applies to them too.
  S12 residual: the sea, title, lower, and notebook bands are within about 1 px of the reference offset. The remaining difference is texture inside the stand-in scene photo (`plates/port.jpg`), which CSS cannot change. The community messages on S12 are sample content labelled "SAMPLE · NOT LIVE". The reference was rendered with Garamond and Inter on Linux; this Windows build uses Times New Roman and Inter, so exact matches are not reachable here. S04 is not measured because its overlay is off-limits.
- S16 sample card titles, premises, and button labels are reference design copy. They are shown only when the API lists no cases, and every card is labelled "SAMPLE · NOT LIVE". The duration and difficulty tags are not shown because the API does not supply them. The fixture file `packages/cases/fixtures/reference-v1.0/m01_missing_trophy.json` uses `mode: "long"`, which is not in the contract enum (`quick | mystery | coop`). That mismatch belongs to the Codex-owned contracts and cases packages and is reported, not changed.
- Confirmation round, Vite on `127.0.0.1:5193`, desktop 1440 px and mobile 390 px, for `/coop`, `/coop/field`, `/coop/records`, `/coop/shared`, and `/library`: mobile horizontal overflow is 0 on all five after `.plate .row { flex-wrap: wrap; }` was added at 760 px. Desktop overflow was 0 in the earlier round, and the 760 px rule does not change desktop. No broken images and no forbidden-term hits. Console errors were only the expected `401` from `GET /api/me`. Desktop screenshots of `/coop/field`, `/coop/records`, and `/coop/shared`, and the mobile screenshot of `/library`, were viewed.
- The live API on port 10000 still runs an old build. The library check therefore showed its empty state ("The server lists no cases yet."), with the sample cards. The populated card grid was not checked in a browser on this build.

Not verified:

- Keyboard order, reduced-motion behavior, and computed contrast on the new screens.
- The disabled "View case →" buttons on S16 sample cards look the same as enabled gold buttons. The disabled state is set only by the `disabled` attribute. A visual disabled style would change the match to the reference and was not added.
- S01 needs-connect and failed states against real Twitch sign-in (REQ-FE-003 stays open). The OBS Studio test on S03 has not been run.
- S00 below the first 1440 × 900 viewport (the monitor's lower rows, "How a round runs", "Modes", "Current Build Status", the closing band, and the footer) was not inspected in a screenshot. The S00 layout at 390 px was not captured. The closing image (`cta-papers.jpg`) is unchecked.
- Whether `Cluenite EB Garamond` loads on S00 was not checked with `document.fonts`. The screenshot headline looks like Garamond, but the Georgia fallback may be in use.
- Header links are 32–35 px at 1440 px. They are shared chrome and were not changed.
- Nothing in this slice is committed.

### Slice J: frontend completion pass (2 November 2026)

Scope: the open frontend items that do not depend on owner-only data or on files outside Claude's ownership. These are the dashboard session controls, the OBS overlay credential UI, stable client retry keys, the S01 connection-result page, and the invitee accept/decline page. Co-op invitation creation, co-op rejoin, and S04 are not built. The reasons are in `FRONTEND_CONTRACT_REQUESTS.md`.

Changes:

- `apps/web/src/net/idempotency.ts` (new): `newIdempotencyKey()` returns a UUID v4 from `crypto.getRandomValues`. It matches the server rule `^[A-Za-z0-9_-]{16,128}$`. Each logical call gets a new key; a key is not reused between clicks.
- `apps/web/src/net/roundClient.ts`: `submit` and `control` send `idempotencyKey`. The auth and overlay path in `connectRound` is unchanged.
- `apps/web/src/components/DashboardPanel.vue`: Start (READY only), Pause (ACTIVE), Resume (PAUSED), Restart, and Stop are gated by the snapshot phase, following the database transition rules. Restart and Stop ask for confirmation. Start is disabled outside READY, so a co-op session in COOP_WAITING cannot be started from this panel. Without a phase, Pause and Resume follow the paused flag alone.
- `DashboardPanel.vue`, overlay credential section: creates or rotates the OBS overlay link with `POST /api/sessions/:id/overlay-credential` (`Idempotency-Key` and `X-CSRF-Token` headers). Copy writes the link to the clipboard. Revoke sends `DELETE` after confirmation. Issuing a new link while one exists asks for confirmation first. The URL is held in a non-reactive variable. It is not rendered, logged, or stored in component state that the template reads.
- `apps/web/src/App.vue`: passes `phase` from the live snapshot to `DashboardPanel`. The `requireOverlay` logic is unchanged.
- `apps/web/src/site/ConnectionStatusPage.vue` (S01, `/connect`): reads `?result=` and accepts only the six outcomes the server sends (`connected`, `denied`, `invalid`, `state_rejected`, `unavailable`, `exchange_failed`). `connected` is shown as success only after `GET /api/me` confirms the connection. Failure outcomes show specific copy with a "Try again" link to `/api/auth/twitch/start`. The three static preview cards from Slice I were removed. They described states the page had not checked. The page now shows one card, derived from `/api/me`. The revoked state is still not shown because the server does not report it. The Slice I notes on S01 describe the earlier card set.
- `apps/web/src/site/CoopInvitePage.vue` (new, route `/coop/invite`): invitee accept and decline. The proposed link is `/coop/invite?invite=<inviteId>#token=<token>`; see `FRONTEND_CONTRACT_REQUESTS.md`. On load, the page reads the token from the fragment, removes it from the address bar with `history.replaceState`, and keeps it in memory only. It is never rendered or logged. It checks `GET /api/me`. Signed-out visitors get a Twitch sign-in link and must reopen the original invitation afterwards. Accept and decline send `POST .../accept` or `POST .../decline` with `X-CSRF-Token`, a new `Idempotency-Key` per click, and body `{token}`. The buttons are removed while a request is in flight. Outcomes: 200 shows accepted or declined (with an "already" note when the server says so); 410 and 404 show that the invitation cannot be used; 409 explains that the invitation changed; 400 `invalid_invite_id` or `invalid_coop_invite_token` shows the incomplete-link state, and other 400 codes show a generic message; 401 returns to the sign-in state; 403 `csrf_rejected` refreshes the session check without a reload, so the token stays in memory; 429 and 500 show retry copy. Rejoin is not built, because no route supplies the `sessionId`.
- `apps/web/src/site/SiteRoot.vue`: registers `coop-invite` for `/coop/invite` in the page id type, the path map, the titles, the plate-page set, and the render switch.
- `apps/web/src/site/plates.css`: dashboard-class plates (S02, S15, S16) keep the footer visible at 1440 × 900. The rule is scoped with `.plate:has(> .dashboard-grid)`.

Checks, 2 November 2026:

- `npm --prefix apps/web run typecheck`: exit 0 (re-run after the S01 change).
- `npm --prefix apps/web run build`: exit 0, built in 11.09 s (re-run after the S01 change).
- `ONLY=S01 node pixel-diff.mjs` (harness outside the repo; Vite on `127.0.0.1:5193`; `GET /api/me` mocked as 401): exit 0, no errors. Exact 12.09 %, within 8 82.53 %, mean diff 7.88. The screenshot was viewed. It shows one card, "Twitch is not connected.", with a "Connect Twitch" action.
- After the invitee page and the `/coop/invite` route were added: `npm --prefix apps/web run typecheck` exit 0; `npm --prefix apps/web run build` exit 0, built in 11.46 s. The S01 pixel harness was not re-run for this change, because `ConnectionStatusPage.vue` was not edited.

The S01 row in the Slice I table (22.89 / 90.46 / 5.06) is superseded by this measurement. The drop comes from removing the three reference cards. The reference shows connected, revoked, and failed states side by side. Those states cannot be verified here, so the owner should decide whether to trade the match for accuracy.

Not verified:

- The dashboard controls, the overlay issue, copy, and revoke flow, and the `/connect?result=` outcomes have not been run in a browser against a live server. The pixel harness cannot reach them.
- Signed-in S01 and the live `!look`, `!link`, `!hint`, and `!submit` round trip need a real Twitch host session (REQ-FE-003, still open).
- The OBS Studio test on S03 has not been run. "Test overlay" stays disabled.
- The invitee page (`/coop/invite`) has not been run against a live server or with two Twitch accounts. The accept, decline, and failure paths are unexercised. The link format is a proposal, not an agreed contract.
- Server replay behavior for retry keys was not exercised.
- Keyboard order, reduced motion, and computed contrast were not audited in this pass, apart from the focus-visible rules already present.
- Co-op C01 (`CoopPage.vue`) stays read-only. "Generate invitation", "Copy invitation", and "Start investigation" are disabled.
- Nothing in this slice is committed.

## Opus handoff: gameplay, polish, and motion

Recorded 2 November 2026 after Slice J. This section lists what the next owner (the Opus pass for gameplay feel, polish, and motion) needs: the definition of done, open decisions, blocked items, and unverified areas. It changes no implementation. Nothing in this handoff is committed.

### Definition of done for gameplay

Stated by the user on 2 November 2026:

1. The opening game works.
2. Streamer and viewer engagement works.
3. The gameplay is fun and enjoyable. The mystery investigation or puzzle, and each other mechanic, has a clear purpose.
4. There is a good ending, such as a score or a plot twist.
5. Scene composition and other details are left to the implementer's judgment.

Current state: not met. The live gameplay routes are not implemented. The `/sample/*` pages are labeled, local-only previews that are not connected to rounds. The live round (`!look`, `!link`, `!hint`, `!submit`) has not been run with a real Twitch host session (REQ-FE-003).

### Decisions needed

- **Owner of the off-limits gameplay files: open.** The user does not know who owns them. Until an owner is named, do not edit these files. Off-limits: `MysteryLiveBoard.vue`, `MysteryLiveScene.vue`, `mysteryLive/`, `scene/mysteryLiveScene.ts`, `assets/mystery-live/`, `QuickCaseOverlay.vue`, `TwitchConnectionStatus.vue`, `style.css`, the `requireOverlay` hunks in `App.vue` (small string edits only), the auth and overlay hunks of `connectRound` in `net/roundClient.ts`, and `apps/server/src/db/roundRepository.ts`. Also off-limits: `packages/contracts`, `packages/engine`, `packages/cases`, and `apps/server`.
- **Provenance of `apps/web/src/site/plates/*.jpg`: unknown.** The eight files are `case_board`, `evidence`, `festival`, `game_writing`, `manor`, `museum`, `office_wide`, and `port`. The user does not know their source or license. Confirm both before they are committed or shipped.
- **Museum image placeholder: pending.** `apps/web/src/scene/caseScene.ts` uses `museum-gallery.jpg` as a placeholder (see the Slice I notes above). Do not use or send `apps/web/src/assets/quick-case/museum-gallery.jpg`. Its size (234,548 bytes) differs from `site/plates/museum.jpg` (338,322 bytes), so the two files are not interchangeable.
- **Serif face: undecided.** `DESIGN.md` names Fraunces and IBM Plex Sans. Plate pages use `--plate-serif` (`"Times New Roman"`, `plates.css:21`). The landing page uses `--landing-serif`, which starts with `"Cluenite EB Garamond"` (`LandingPage.vue:258`). An EB Garamond trial on the plate pages scored lower and was reverted; Slice J did not record it, and this section does. Choose one serif for the site.
- **`mode: "long"`** in `packages/cases/fixtures/reference-v1.0/m01_missing_trophy.json`: Codex-owned. Report only; not changed here.

### Gameplay items blocked by file ownership

- **M01 hint.** `MysteryLiveBoard.vue` line 112 checks `actions.value.has("hint")`, line 258 emits `!hint`, and lines 746–759 render the hint panel and the "Request a hint" button. The button hides while `currentHint` is non-null, so a second hint cannot be requested from the UI. The server keeps `hint` in `availableActions` until three hints are used (`BACKEND_CONTRACTS.md:200`). The owner of `MysteryLiveBoard.vue` applies the fix.
- **"simulation" in UI copy.** `MysteryLiveBoard.vue` lines 151 and 316 check `source === "simulation"`. Remove the word from visible copy. Keep the enum and the data value `source: "simulation"`.
- **Unicode glyphs used as icons.** `QuickCaseOverlay.vue:174` (`✓ Linked`, `↔`) and `:221` (`◇ Sample verdict`, `✓ Solved`) are off-limits. The owner replaces them.

### Polish candidates in frontend-owned files

These are not blocked. They can be replaced with SVG icons during the polish pass.

- `PlateFrame.vue:19` (`⌕`), `plates.css:117` (`content: "◇"`), `SetupPage.vue:27` and `:111` (`→`, `⌕`), and `GameplaySamplePage.vue` lines 108–109, 111, 125, 159–163, 176, 242, 370, 455, and 479 (`✓`, `⌕`, `→`).
- Arrow characters in call-to-action labels: `LibraryPage.vue:197` and `:211`, `DashboardPage.vue:161` and `:209`, `CoopPage.vue:142`, and `CoopWorkstationPage.vue:129`.

### Blocked external items

- **REQ-FE-003 (real host session).** Needs a real Twitch host session or an approved fake-provider fixture. Blocks signed-in S01, the live round, the overlay path, and live co-op evidence. Sources: `FRONTEND_CONTRACT_REQUESTS.md` and `docs/operations/BACKEND_RELEASE_2026-11-02.md`.
- **REQ-FE-006 (numeric `inviteeTwitchId`).** `POST /api/coops/invitations` needs a numeric ID, and no route maps a login name to one. C01 "Generate invitation" and "Copy invitation" stay disabled. "Start investigation" stays disabled. Do not guess identities.
- **Invitee link format.** `/coop/invite?invite=<inviteId>#token=<token>` is a frontend proposal. It needs a backend-owner decision.
- **Rejoin.** `POST /api/coops/sessions/:sessionId/rejoin` has no frontend entry point, because no route supplies `sessionId`.
- **S04 Quick Case overlay.** Not built.
- **S03 OBS Studio test.** Not run. "Test overlay" stays disabled. Needs OBS Studio and a live session.

### Accessibility, motion, performance, and audio: unverified

- **Accessibility.** Keyboard order, reduced motion, and contrast are not audited for the new pages and the sample pages. Only the focus-visible rules already present were checked.
- **Motion.** Recorded full-motion animation counts: quick sample 24, play 5, dashboard 9, co-op 12, guide 18, settings 7. With reduced motion, the count is 0. No animation has been judged visually. Scroll-reveal motion is in `site.css`.
- **P5 clue-discovery animation.** Partial, according to the 1 November record (`docs/history/frontend-progress-2026-11-01.md:108`). Not rechecked.
- **Performance.** Pixi frame rate and heap use are not measured (`docs/history/frontend-progress-2026-11-01.md:96`).
- **Audio.** No audio mix or background sound exists. No frontend handoff covers it, and `docs/STATUS.md` lists it as open. The user has asked for background sound.

### Constraints for the next owner

- The overlay credential token must never be rendered in the DOM or logged. It may only be copied.
- Do not edit `docs/reference/` source packs. Record implementation differences in `docs/reference/README.md` and `docs/architecture/DECISIONS.md`.
- Do not commit, push, or open a PR without authorization.

### Last checks

- `npm --prefix apps/web run typecheck` exit 0, and `npm --prefix apps/web run build` exit 0 (built in 11.46 s), both after the invitee page was added (Slice J).
- The S01 pixel harness was last run before the invitee change: exact 12.09 %, within 8 82.53 %, mean diff 7.88. `ConnectionStatusPage.vue` has not changed since that run.
- This section is documentation only. No checks were re-run for it.

## Opus pass: sample case, polish, and motion (2 November 2026)

Recorded 2 November 2026 by the Opus session that took over gameplay feel, polish, and motion from the handoff above. Nothing in this pass is committed.

### Result against the definition of done

1. **Opening:** met for the public sample. `/?view=quick` opens on a case cover, a typed briefing, and the three suspects spotlit in the room, then "Start the search". The live round's opening is unverified (REQ-FE-003).
2. **Streamer and viewer engagement:** shown in the sample, not verified live. Scripted viewers react to finds and raise wrong theories that the player disproves, and the command line takes the sample's chat commands. Real Twitch chat is unverified (REQ-FE-003). A live hidden-object search needs REQ-FE-007.
3. **Purpose of each mechanic:** the search finds objects and opens evidence, links prove relationships, the timeline orders the night, claims answer the chat's theories, and the accusation closes the case. The proof gate (key link, timeline, locked-door claim) keeps the accusation earned. Not playtested with players.
4. **Ending:** the room replays the night, the twist lands ("The alarm was her alibi."), and a case report shows points by category, a seal rating, and the best score kept in this browser.
5. **Scene composition:** a PixiJS study drawn in code; see "Sample case" in `apps/web/DESIGN.md`.

### Changes

- New in `apps/web/src`: `sampleCase/manuscript.ts` (case data, scoring, ratings), `sampleCase/engine.ts` (local rules and command parser), `scene/studyScene.ts` and `scene/studyLayout.ts` (the study scene), `audio/sampleScore.ts` (generated score and ambience), `site/icons.ts` and `site/SiteIcon.vue` (inline SVG icons), and `site/SampleCasePage.vue` (the page).
- Edited in `apps/web/src/site`: `SiteRoot.vue` (routes `/?view=quick` to the new page); `PlateFrame.vue`, `SideNav.vue`, `SetupPage.vue`, `LibraryPage.vue`, `DashboardPage.vue`, `CoopPage.vue`, `CoopWorkstationPage.vue`, and `GameplaySamplePage.vue` (glyph icons replaced with SVG, plus motion on the sample screens); `plates.css` and `site.css` (serif token, contrast, focus rings, hit areas, motion); `LandingPage.vue`, `MainMenu.vue`, `GuidePage.vue`, and `SettingsPage.vue` (sample links and copy); `ConnectionStatusPage.vue` and `CoopInvitePage.vue` (one `h1` per page).
- Edited test, not run: `tests/e2e/twitch-status.spec.ts` (landing link name and the sample steps).
- Docs: `apps/web/DESIGN.md`, `apps/web/PRODUCT.md`, `apps/web/README.md`, `docs/reference/README.md`, `docs/architecture/DECISIONS.md`, `docs/design/frontend-target/README.md`, `FRONTEND_CONTRACT_REQUESTS.md`, and this file.

### Decisions

- **Genre:** an original hidden-object investigation with deduction on top. The case, scene, and rules were written for Cluenite; no existing game is recreated.
- **Serif:** EB Garamond is the one site serif. This closes "Serif face: undecided" above. `style.css` was outside this pass; see the proposals below.
- **Route:** `/?view=quick` renders `SampleCasePage.vue`. `QuickSamplePage.vue` stays on disk, unrouted.
- **Bundle:** the sample's answer ships in the public bundle. It is an original browser-only case, not an engine case.
- **Grammar:** the grid search (`!look C4`) exists only in the sample. The guide keeps `!look <clue-id>` for live rounds.
- **Chat:** the sample's chat is scripted and labeled "Scripted sample viewers · not Twitch".
- **Assist mode:** select a name in the list to find it. Assisted finds score, but they end combos and the time bonus. Assist mode turns on by itself when WebGL is unavailable.
- **Contrast:** `--dim` changed from `#836f5c` to `#a08c77` (6.15:1 on the page, 5.49:1 on panels). `.btn.muted` uses color instead of opacity (7.44:1). Disabled gold buttons have their own style.
- **Spoilers:** the landing monitor shows the sample instead of Q01 records, and the dashboard teaser no longer names Q01's answer.
- **Sound:** generated in the browser after the first user gesture. It follows the site sound setting.
- **Mobile:** the stage keeps an 860px width and scrolls sideways. Name tags and tooltips are hidden at 900px and below.

### Proposals for files outside this pass

These files were off-limits in this pass. Each proposal names the file, the line, and the change.

- `apps/web/src/components/MysteryLiveBoard.vue`, lines 112, 258, and 746–759: keep "Request a hint" visible below the current hint while `hint` is in `availableActions`, so the second and third hints can be requested.
- `apps/web/src/components/QuickCaseOverlay.vue`, line 174 (`✓ Linked`, `↔`) and line 221 (`◇ Sample verdict`, `✓ Solved`): replace the glyphs with `SiteIcon` (`check`, `link`) and keep the words.
- `apps/web/src/style.css`, line 50: `--font-display: "Cluenite EB Garamond", "Iowan Old Style", Georgia, serif;`. The font faces are already global: `site/site.css` is imported in `main.ts`.
- `apps/web/src/mysteryLive/previewSnapshot.ts`, line 4: the comment says the preview is "labeled as a simulation"; the UI labels it as a sample. Comment only.
- No visible "simulation" copy remains. `MysteryLiveBoard.vue` lines 151 and 316 test the enum and render "Sample investigation" and "Sample state for visual preview", so they need no change.
- `packages/cases/README.md`, line 15: the stale path is recorded in `FRONTEND_CONTRACT_REQUESTS.md`.

### Checks

- Contrast ratios were computed with a script; the values are listed under Decisions.
- Browser: one pass, a fix batch, and one confirmation pass. The session's own `vite preview` on port 5197 served the build and was stopped afterwards. System Chrome ran through Playwright 1.64.1, with `/api` mocked in the page (401 for `/api/me` and a fixture for `/api/cases`); no shared server was used. Viewports: 1440×900, 390×844 (DPR 2, touch), and reduced motion. Routes: `/?view=quick`, `/`, `/play`, `/guide`, `/settings`, `/dashboard`, `/setup`, `/library`, `/coop`, `/coop/field`, `/connect`, `/offline`, and the six `/sample/*` pages.
- Confirmation pass: no console or page errors, no horizontal overflow, and exactly one `h1` on every route. EB Garamond loaded on every site page, and Fraunces was not used. No glyph icons and no visible "simulation" were found, and no animations ran with reduced motion. A full sample playthrough (12 of 12 objects, links, timeline, three claims, accusation, and reveal) ended at "Master detective" with 8,290 points. Keyboard tab order was logical, with a 2px focus outline.
- Screenshots are in a private temporary folder, not in the repository.
- After the confirmation pass, one line of briefing copy changed in `SampleCasePage.vue`: it no longer says that live rounds use grid cells. The browser was not re-run after it.

### Limits

- Audio was not heard; the browser ran headless. The mix and levels are unjudged.
- Pixi frame rate and memory were not measured.
- `tests/e2e/twitch-status.spec.ts` was updated but not run.
- No player playtest: difficulty, timing, and fun are untested.
- At 390px, the objects are small. The stage scrolls sideways, and Assist mode is the fallback.
- Small targets remain: the settings switches draw 44×23 (the hit area is extended to 44px), the `/play` search input is 21px tall inside a 38px label, and inline preview links are 20px tall.
- `/sample/verdict` still shows M01's solution text. Whether that spoiler stays is an open decision.

### Blocked

REQ-FE-003 (real host session), REQ-FE-006 (numeric `inviteeTwitchId`), the invitee link format, rejoin, the S04 overlay, the S03 OBS Studio test, the provenance of `site/plates/*.jpg`, the museum image placeholder, and `mode: "long"` in the M01 fixture are unchanged from the handoff above. REQ-FE-007 (live hidden-object search) is new.

## Community, co-op, and living site pass (2 November 2026)

The user liked the sample's gameplay and asked for better community engagement and collaboration. They also said the landing page, the dashboard, and the other pages looked far weaker. A pixel comparison against the 16:39 harness shots showed that the earlier pass had changed those pages very little; the font switch was the main difference. The gap was the static plate design next to a living game. Nothing in this pass is committed.

### Changes

- **Crew calls (`sampleCase/crowd.ts`, `SampleCasePage.vue`):**
  - Scripted viewers call grid cells, and each call shows in the room as a ring tagged with the viewer's name.
  - Following a call (clicking the ring or the object, pressing Follow in the feed, or typing the same `!look`) searches the whole cell. A find credits the viewer and scores "Crew calls followed".
  - Calls can be wrong, and a wrong call costs a misclick. An object found alone in a called cell gives the caller a "spotted" credit.
  - Chat energy rises with good play and makes the crew call more often.
- **Polls:**
  - Claim cards show how much of chat believes each theory, and breaking a theory posts the collapse.
  - Verdict cards show chat's pick per suspect. The reveal says whether chat called it.
- **Crew in the report:** an MVP and the top four viewers, with finds, spots, and misses.
- **Co-op with Station B** (chosen on the cover; solo stays the default):
  - The hall desk (key register and guest book) belongs to a scripted partner station.
  - Station B shares the guest book, then asks for `CLOCK_STOP`. The register, which the key deduction needs, arrives only after this station sends it.
  - A second request asks for `OXBLOOD_NOTE`. Records can be sent from the Station B card, the Board tab, or `!share <record>`.
  - Score lines: answered requests and quick hand-offs (20 s or less).
- **Engine (`sampleCase/engine.ts`):** `mode`, `followCall`, `partnerFind`, `openRequest`, `shareRecord`, and `ownSearchDone`. In co-op, partner-desk clicks cost nothing. New score lines and missed-request notes. Points are in `manuscript.ts` (`crewCall`, `handoff`, `quickHandoff`).
- **Spoiler fixes:**
  - The command help now shows placeholders instead of solutions (it named the culprit and the key link).
  - The landing chat no longer shows the decisive `!challenge` line.
  - A request for a record not yet found shows its ID, not its content.
- **Living scene (`scene/heroScene.ts`):**
  - A new PixiJS scene drawn in code: a detective in a fedora at a red-thread evidence board, a swinging pendant lamp with dust, rain and lightning on the window, a coffee cup, parallax, and an arm that lifts a magnifier.
  - `pulse()` and `connect()` let the page make the board answer chat.
- **Landing (`LandingPage.vue`):**
  - The hero uses the living scene and a scripted sample chat. `landing/hero-scene.jpg` stays only as a fallback.
  - The headline gap is fixed: `.landing p` had overridden `.lead`.
  - The mode strip rides over the hero, with aligned cards.
  - The case board replays the sample's first minute: calls, pinned finds, a chat theory with a poll, and "Proof 0/3".
  - A new "Your chat is the crew" section (nav link "Community") shows the four community features, with a note that live rounds still need server support.
- **Dashboard (`DashboardPage.vue`):** the banner uses the living scene instead of `plates/office_wide.jpg`.

### Checks (2 November 2026)

- `npm --prefix apps/web run typecheck`: exit 0. `npm --prefix apps/web run build`: exit 0, built in 15.77 s (`heroScene` 33.03 kB, loaded on demand).
- Visual looks on the user's running dev server (port 5190, current source): landing hero (desktop and 390 px), case board demo, community section, dashboard, and a co-op run. In the co-op run, a crew call was followed (credited 3 points), Hale's request appeared, and no console errors were logged.
- Confirmation pass on the session's own `vite preview` (port 5197, stopped afterwards), with `/api` mocked in the page.
  - Scope: 37 page runs, desktop 1440 × 900 and mobile 390 × 844, plus reduced motion.
  - Results: zero console or page errors and no horizontal overflow. Exactly one `h1` on every route, with EB Garamond loaded, no Fraunces, and no glyph icons or "simulation".
  - Reduced motion ran zero animations on the sample, the library, and the sample reveal.
  - The full solo playthrough reached "Master detective, 8,290 points", and the report showed the new crew section.
- Pixel comparison before the pass: all plate screens were slightly further from the reference PNGs than the 16:39 shots (for example, setup mean diff 6.03 → 8.83, dashboard 5.46 → 6.93). The landing's first viewport was unchanged (31.62 against 31.63).

### Limits

- The crowd, the polls, and Station B are scripted. Real Twitch chat, per-viewer credit, and two-station trading need server support (REQ-FE-008).
- The cover's mode radios draw 13 × 13; the whole label card is the click target.
- Audio, frame rate, and memory were not measured. No player playtest.
- The other plate pages (setup, library, co-op, settings, `/sample/*`) are unchanged in this pass, and several still use `site/plates/*.jpg`, whose provenance is unknown.

## Historical evidence

The complete original session record, including test results and screenshot paths, is preserved in [the 1 November frontend archive](../history/frontend-progress-2026-11-01.md). It does not report current listener, account, deployment, or submission state. See [current status](../STATUS.md) for fresh checks and remaining work.
