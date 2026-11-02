# Frontend development target

**Prepared:** 2 November 2026. **Status:** reference review and implementation brief; the redesign has not been implemented by this documentation pass.

The eight user-provided images define the frontend's visual target. The user selected **shared visual system and public pages first** as the first implementation milestone. Keep the existing Cinematic Brown Noir identity and bring the actual Vue application toward these compositions. All authored UI, accessibility text, documentation, comments, and development reports use English.

Use this brief for what to build next, [PRODUCT.md](../../../apps/web/PRODUCT.md) for product behavior, [DESIGN.md](../../../apps/web/DESIGN.md) for existing tokens, and [current status](../../STATUS.md) for verification. The images control visual composition; public contracts and authored cases control behavior and content. A reference is not evidence that a feature works.

## Reference map

All eight originals were visually inspected. Each is a **1122 × 1402 PNG** showing a tall desktop composition, not a phone screen or a measured production viewport. Copies below are byte-identical to the supplied files. [Reference provenance](references/README.md) and [checksums](references/manifest.json) make the target portable without relying on a Downloads folder.

| Ref | Image and surface                                            | Existing route                                                      | Current implementation                                                                                                     | Development target                                                                                                                                         |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [Landing](references/01-landing.png)                         | `/`                                                                 | `site/LandingPage.vue`; illustrated hero, demonstration board, explanatory sections.                                       | Match the desk-led hero, framed board, four-step flow, mode table, status banner, and closing action.                                                      |
| 02  | [Streamer dashboard](references/02-dashboard.png)            | `/dashboard`                                                        | `site/DashboardPage.vue`; real account check, mode links, empty history section.                                           | Reuse the hero and board framing; show real account states, launch guidance, mode cards, session-history empty state, and OBS entry.                       |
| 03  | [Case menu](references/03-case-menu.png)                     | `/play`                                                             | `site/MainMenu.vue`; API cases, mode tabs, search, sign-in check, non-co-op session creation.                              | Add artwork-led case cards and coherent tab/filter styling around the existing flow. Render only real cases and supported metadata.                        |
| 04  | [Twitch and OBS setup](references/04-obs-setup.png)          | `/setup`                                                            | `site/SetupPage.vue`; instructions and a URL template; no credential controls.                                             | Build account, credential, setup-step, preview, and checklist panels using the existing API.                                                               |
| 05  | [Quick Case board](references/05-quick-case-sample.png)      | `/?view=quick`; related live surface at `/?session=<id>&view=quick` | `site/SampleCasePage.vue` is the public manuscript sample; `components/QuickCaseOverlay.vue` presents live Q01 separately. | Apply the tactile board/evidence/feedback hierarchy to both contexts while preserving their different content and permissions.                             |
| 06  | [Mystery Live investigation](references/06-mystery-live.png) | `/?view=mystery` or a live M01 session                              | `components/MysteryLiveBoard.vue`, `MysteryLiveScene.vue`; scene, evidence, timeline, theory/challenge, verdict.           | Give the scene primary space, with accessible inspection, evidence detail, timeline, and theory work beneath it. Adapt the artwork to M01.                 |
| 07  | [Active host control](references/07-host-control.png)        | `/?session=<id>&view=dashboard`                                     | `App.vue` plus `components/DashboardPanel.vue`; command input, Pause, Resume, Restart.                                     | Create a session-specific control surface with lifecycle actions, current board, actual feedback, and public progress. This is separate from `/dashboard`. |
| 08  | [Co-op invitation](references/08-coop.png)                   | `/coop`; participant session URLs after joining                     | `site/CoopPage.vue`; account/case reads and guidance, without invitation actions.                                          | Implement identity-bound invitations, waiting/acceptance/rejoin, and complementary C01 workstations.                                                       |

Source paths in the table are relative to [`apps/web/src`](../../../apps/web/src). Guide and settings have no dedicated target image; inherit the shared visual system while preserving their current content and browser-local preferences. OBS has a separate transparent composition; do not put the full website into the stream corner.

## Audience, task, and success

| Surface                                      | Visitor mode and task                                     | Evidence of success                                                                                                          |
| -------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Landing                                      | Persuade: a streamer deciding whether to try Cluenite.    | Understands streamer/viewer roles and can open the case menu or a clearly labeled sample.                                    |
| Menu, dashboard, setup, host controls, co-op | Operate: a host preparing or running a round.             | Can identify account/session state, the next valid action, and the result of that action.                                    |
| Investigation boards                         | Experience: streamer and viewers reasoning from evidence. | Can find the objective, inspect visible records, distinguish pending input from accepted proof, and understand what changed. |
| Guide and settings                           | Read/operate: learn commands or adjust this browser.      | Commands match the current case/contract; settings have clear scope and visible feedback.                                    |

The signature moment is a record becoming understandable evidence: inspect it, reveal a readable detail, connect the supported records, and show why the server accepted the discovery. Atmosphere supports that reasoning throughout the flow.

## Shared visual system

Keep the reference compositions recognizable through these common parts:

- A compact Cluenite navigation bar with a fine brass rule and diamond ornament. Selected navigation, keyboard focus, and account state remain explicit.
- Illustrated detective-desk headers: copy on the left, lamp/hat/window/noticeboard on the right, with a dark readable text area. Public pages can use a generous hero; active gameplay keeps a compact header so the board leads the first viewport.
- Dark walnut/leather panels with thin outer brass framing, inset rules, and restrained corner ornaments. Section titles and actions remain readable over texture.
- Parchment records with pins, restrained rotation, evidence photographs, and visible labels. Decorative strings never imply an accepted evidence relationship; accepted links have a text/status cue from the snapshot.
- Site pages use EB Garamond headings and Inter body text (decided 2 November 2026; see `docs/architecture/DECISIONS.md`). Live investigation surfaces keep Fraunces and IBM Plex Sans from `src/style.css` until that file adopts the site serif. Use the existing mono font for IDs/timers. Reuse the palette in `src/style.css`; do not introduce a second competing token set in page styles.
- Warm gold for the primary next action, quiet outlined secondary actions, and explicit unavailable/error/paused states. Decorative glow is brief and local to a discovery or current selection.

Build these as shared primitives when at least two surfaces need them: `SiteHero`, `NoirPanel`, `SectionHeading`, `StatusBadge`, `EvidenceCard`, `InvestigationProgress`, and `EmptyState`. These are proposed component names, not claims that the files exist. Keep session permission and transport logic outside decorative components. Use the existing Vue/DOM/CSS/SVG stack; reserve Pixi for scene display/hotspots and GSAP for meaningful transitions.

### Artwork work

Inventory and reuse `src/site/landing/` before requesting more assets: it already contains the hero scene, typewriter, mode art, step illustrations, ornaments, and icons. `src/assets/mystery-live/ASSET_SOURCES.md` records the generated prototype M01 assets. The reference PNGs are review material, not runtime backgrounds containing flattened text or buttons.

Prepare separate art only where the current assets cannot support the target: suitable hero crops, case-specific cover illustrations, a board/map texture, evidence-specific images, and lightweight frame/pin ornaments. Record provenance, subject, crop/focal point, intended surface, and approval status for each asset. Retain semantic HTML for every label, action, objective, and evidence description. A working fallback must preserve the evidence identity when an image or WebGL scene fails.

## Screen requirements and deliberate adaptations

### 01 — Landing

Preserve the image's sequence: promise and two actions → illustrative board → four steps → mode comparison → build-status banner → final case-menu action. Reuse the existing landing assets and content rather than rebuilding a screenshot as one image.

The board and chat examples must remain visibly illustrative. Replace the reference's ambiguous `LIVE PREVIEW` with a clear sample/illustration label. Its copy must describe linking released evidence, rather than teaching clue IDs as link operands. The Quick Case preview leads to the local manuscript sample and says so. A sample link does not establish Twitch or OBS readiness.

**Acceptance:** both main actions navigate correctly; sample status is visible beside the board; all sections remain readable at narrow widths and enlarged text; no live account request is required to understand the page.

### 02 — Streamer dashboard

Use the account card, three-step start board, three illustrated mode cards, history area, and OBS setup card from the reference. Account state comes from `/api/me`, with checking, signed-out, signed-in, disconnected, and unavailable states. Launch links lead into the existing menu; do not claim that a mode link has already created or started a round.

Keep recent sessions as an honest empty/unavailable section until a session-list contract exists. The image's names, dates, avatar, counts, `LIVE READY`, and Manage destination are examples. Do not manufacture them or treat an authenticated account as proof that Twitch chat is flowing. The co-op card leads to the implemented co-op flow only when that milestone is complete.

**Acceptance:** account retry/sign-in works; mode and setup links resolve; unavailable history has no invented rows; account errors do not hide navigation.

### 03 — Case menu

Follow the hero → three mode selectors → filter/search row → illustrated case library → closing banner hierarchy. Use only API-listed Q01 **The Gallery Shadow**, M01 **The Missing Festival Trophy**, and C01 **Signal of the Invisible Ship**, as available. The reference's Midnight Conservatory and Lantern Street are future content ideas, not additional implemented cases.

The current public case response has no duration, difficulty, or theme fields. Start with mode filtering and search. Add the three extra filters only after approved public metadata and real values exist; do not invent estimates or expose controls that cannot filter anything. A selected mode shows its own cases, even though the reference shows examples from several modes together.

Keep checking, loading, empty catalog, no search results, API error/retry, signed-out, creating, and creation-error states. Preserve same-origin cookies, CSRF, and idempotency handling. Creation opens the session host URL in `READY`; it is not equivalent to starting gameplay. Co-op launch stays unavailable until its invitation flow is implemented.

**Acceptance:** mode/search work against actual metadata; keyboard selection and selected state are clear; a double click cannot create two logical sessions; failures offer recovery; the new host page offers the required Start action.

### 04 — Twitch and OBS setup

Use the target's two-column account/browser-source and setup-summary structure, followed by four setup steps, a preview/checklist pair, and the next action. Bind account state to the current host. Build credential generation, copy, rotation, expiry, and revocation around the existing overlay API and a selected authorized session.

Use the server-returned URL shape `/?mode=obs&session=<id>#overlay=<token>`; the reference's `/overlay/detective_live` URL is conceptual. Keep credentials masked until an explicit reveal/copy action; exclude them from logs and screenshots. Rotation replay has a specific API error and requires a new explicit issuance operation; do not silently retry into a new credential. Preview through the actual read-only presentation and label local previews accurately.

The API endpoint selector, alternate overlay modes, theme picker, and two-minute walkthrough in the image are outside the current feature set. Omit them until there is a real supported choice or artifact. Checklist ticks are local host acknowledgements, not automatic verification of OBS Studio. `/?view=quick` alone tests a browser sample, not authenticated OBS delivery. Show readiness only for checks actually performed.

**Acceptance:** unauthorized, loading, issuance failure, copy failure, expired/revoked, and success states are covered; the overlay is read-only and transparent; host actions and Twitch account status do not appear in it; actual OBS Studio remains a separately recorded manual check.

### 05 — Quick Case and the manuscript sample

Keep the reference's investigation-board/feed split, objective/evidence/host summary row, contextual actions, progress, notes, and gated verdict. Reduce secondary sections as needed for Q01's small live presentation. The manuscript route remains a local sample, including its fictional feed and locally selected verdict; it must not acquire a `LIVE` badge, viewer count, or validated-solve claim.

Apply the visual language to live Q01 using its actual clues and released evidence. `CAM`, `ACCESS`, and `SCHEDULE` are clue IDs; `CAM_R07` and `SCHEDULE_R07` are the supported released records for the demonstrated link. `ACCESS` is context-only. Keep accepted/rejected/pending feedback separate, gate the verdict on `availableActions`, and reveal only the accepted snapshot result. Q01 has no authored hints, so a Request a hint action is not mandatory there. The reference's manuscript commands and multi-word/comma examples do not define live grammar.

**Acceptance:** the local sample still works and is unmistakably labeled; the live Q01 flow requires server proof; an early/wrong solve cannot be displayed as success; paused/disconnected/resolved states remain understandable; OBS uses its compact read-only variant.

### 06 — Mystery Live

Use the image's scene-first hierarchy: compact session strip → large inspectable scene and objective → evidence list/detail → timeline and theory/challenge work → next supported action. Preserve an equivalent keyboard-accessible clue list; canvas hotspots are an additional way to inspect, not the only one.

The Calder Museum Heist, broken display/glove/fibers, round totals, vote percentages, viewer count, and polls in the image are illustrative. Keep M01's authored trophy, heat warning, access record, cart, timeline, and proof. The current museum scene is prototype artwork; any replacement must fit the festival-trophy narrative. Use `snapshot.sequences`, `theories`, `currentHint`, `hintLevel`, and `availableActions`. Pending timeline order stays pending until accepted. Keep the current hint visible and offer another hint while the server permits it; the present `v-else-if` hides that button after hint 1.

Pan/zoom/minimap and a free-moving scene are optional inspection conveniences, not implemented world navigation. Defer them until the scene actually benefits. Audience polls, theory percentages, chat posting, and `!clue` need contracts; do not substitute voting for individual evidence-based progress.

**Acceptance:** one valid and one rejected action visibly explain their outcome; all authored hints remain reachable; timeline ordering works without drag-only input; evidence detail closes and restores focus; sample commands stay disabled; an authenticated case can reach the server-validated reveal.

### 07 — Active-session host control

Adapt the session banner → lifecycle toolbar → board/feedback split → progress/details structure. Derive the case title, phase, pause state, visible evidence, and result from the authorized snapshot. Reuse the board presentation rather than maintaining a second local game state. Keep `/dashboard` as the overview and the query-based URL as the active session.

The current `DashboardPanel` only exposes Pause, Resume, and Restart; Start and Stop still need explicit UI affordances for the existing controls. A new session cannot be treated as running while it remains `READY`. Add valid phase-aware controls, pending/error feedback, and an explicit consequence before restart/stop. A Request Reveal button cannot bypass proof: expose the supported solve/verdict action only when available. Hint controls follow the current case's availability.

The image's Winterhaven case, multi-round percentage, viewer/chat statistics, team activity, and host-note persistence are unsupported examples. Display public progress and actual command results; request contracts before adding analytics, history, or saved notes. A stop is not a successful verdict.

**Acceptance:** create → Start → valid command → Pause → Resume is possible through the UI; restart/stop never happen from decoration or preview; controls update only after acknowledgements/snapshots; disconnected/rejoining controls cannot issue a burst of duplicate mutations; a rejected action does not advance progress.

### 08 — Co-op

Follow the image's case preview → two investigator cards → invitation panel → workstation roles → shared board → start action hierarchy. Replace The Hollow Manor with C01 **Signal of the Invisible Ship**. Roles correspond to the server's Team A lighthouse/signal work and Team B harbor/archive work. Preserve independent station actions and the shared proof; the reference does not authorize arbitrary role reassignment.

Create the C01 session before inviting the named Twitch account. The API returns an opaque, expiring invitation token tied to that identity; it does not implement the image's generic `CLUE-7F4K` join code or username lookup. The frontend must collect the required Twitch ID, then support the named invitee's sign-in, accept/decline, conflict/expiry, and membership recovery. Design any same-origin invitation landing URL without changing the current `mode/view/session` dispatch; keep secret tokens out of logs and screenshots. A friendly invite URL may carry the existing invite ID/token, but is not a new backend join-code protocol.

Readiness comes from accepted membership and the session phase. Show no fabricated partner profile, connected badge, or completed assignment. Different accounts receive their own projected station view; browser reconnect is not proof that Team B rejoined membership.

**Acceptance:** wrong-account and expired invitations fail clearly; accepted Team B can join its own workstation; each team can act independently and contribute its required proof; reconnect/rejoin and a departing partner have explicit states; no public stream is treated as a private information boundary.

## Implementation sequence

Rows are planned work. Only reference review and documentation are complete in this pass. Keep one writer per file under [TEAM_PROTOCOL.md](../../development/collaboration.md); preserve existing local changes.

| Milestone                                                       | Scope and main files                                                                                                                                                                                                                                                                                                                    | Dependency                                                                    | Exit evidence                                                                                                                                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1 — Shared visual system and public pages (selected first)** | Inventory current art; extract only repeated visual primitives; unify `style.css`, `site/site.css`, `SiteRoot.vue`; bring `LandingPage.vue`, `MainMenu.vue`, `DashboardPage.vue`, `GuidePage.vue`, and `SettingsPage.vue` into the target language. Give `/setup` and `/coop` the same shell while retaining honest unavailable states. | Existing assets, routes, case/account reads. No new backend feature required. | Actual desktop/mobile screenshots beside refs 01–03; navigation, mode/search, signed-out/error/empty states, settings, keyboard focus, and sample labeling checked. Log remaining functional dependencies.        |
| **F2 — One complete Q01, host, and OBS slice**                  | `QuickCaseOverlay.vue`, `CaseScene.vue`, `DashboardPanel.vue`, `App.vue`, `net/roundClient.ts`, and `SetupPage.vue`; style the local `SampleCasePage.vue` separately. Add Start/Stop, existing credential lifecycle, and stable command/control retry keys.                                                                             | F1 foundation; current session/overlay contracts.                             | Create/start/inspect/released-evidence link/solve on a server-backed session; invalid, pause/resume, reconnect and OBS read-only checks; refs 04, 05, 07 compared. Clearly name a mocked Twitch provider if used. |
| **F3 — Mystery Live**                                           | `MysteryLiveBoard.vue`, `MysteryLiveScene.vue`, `scene/mysteryLiveScene.ts`, M01 assets. Finish evidence/detail, timeline/theory/challenge/reveal and repeated hint requests.                                                                                                                                                           | F1 primitives and reliable transport from F2.                                 | M01 valid/invalid actions, all hints, pending/verified order, keyboard inspection and accepted reveal; reference 06 comparison.                                                                                   |
| **F4 — Co-op**                                                  | `CoopPage.vue`, participant entry and C01 board presentation; consume existing invitation/rejoin endpoints.                                                                                                                                                                                                                             | F2 lifecycle/transport and C01 team projections.                              | Named invitation accepted/declined/expired/wrong-account cases, distinct team work, shared proof, reconnect/rejoin; reference 08 comparison. Real two-channel acceptance remains separate.                        |
| **Deferred additions**                                          | Session history, analytics/viewer counts, polls, generic join codes, role reassignment, extra cases, unsupported metadata filters, saved host notes, free-roaming navigation.                                                                                                                                                           | A concrete product decision plus the necessary contracts/content.             | No fake UI implying these additions exist. Open a scoped contract request only when an implementation slice needs one.                                                                                            |

F1 is a bounded visual/public-flow milestone, not a reason to perfect every ornamental detail before F2. The first integrated product outcome remains a working Q01 round and read-only OBS presentation.

### F1 build checklist

Complete these small slices in order, preserving working behavior after each one:

1. Capture baseline public routes and their real loading/error/signed-out states. Inventory the existing tokens, landing artwork, repeated markup, and settings behavior. Resolve the documented local startup issue before treating a screenshot failure as a design defect.
2. Establish the shared header/footer, hero, panel, action, focus, and status treatments. Extract a primitive only where actual reuse justifies it; keep transport and account state in their existing owners. Check the shell on desktop and phone before changing all pages.
3. Finish landing composition 01 and case-menu composition 03. Keep real mode/search behavior, API errors, and sample links intact. Use approved case artwork or explicitly identified placeholders; extra mockup cases and metadata stay out of the catalog.
4. Apply the same system to dashboard composition 02, then guide/settings and the setup/co-op information shells. Keep account/history/invitation/credential limitations visible until the relevant functional milestone is complete. Test settings persistence and large-text/reduced-motion presentation.
5. Capture the affected routes, compare them with refs 01–03, check keyboard/mobile behavior, run the relevant web checks, and update the frontend progress log. Record what F2 must still implement, especially Start/Stop and OBS credentials. Do not call a styled placeholder a completed live flow.

## Responsive layout and states

The images establish hierarchy and art direction; their 1122 × 1402 export is not a fixed page size. Adapt each composition rather than scaling the whole picture.

| Context                            | Required behavior                                                                                                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1920 × 1080 and 1280 × 800 desktop | Public pages have a readable centered column; active boards can use the existing wider game surface. Keep objective and first action in the first viewport. Preserve the reference's main/secondary panel proportions where content fits. |
| 1280 × 720                         | Compact operational headers, wrapping toolbars, readable evidence; no large masthead pushing the actual investigation entirely below the fold.                                                                                            |
| 768px tablet and 390px phone       | Stack hero, board, feedback, and evidence in task order; wrap navigation and mode selectors. Convert decorative board positioning to a readable list/grid where needed. No off-screen controls or whole-page horizontal scroll.           |
| OBS at 1920 × 1080 and 1280 × 720  | Transparent canvas, compact corner card, supported position/scale, no site header/footer/host controls. Check stream readability, idle rendering, resize, and reconnect independently.                                                    |
| Larger text/reduced motion         | Content reflows at 200% text size; focus remains visible. Discoveries and accepted state are understandable without animation; disable decorative motion and autoplay ambience when appropriate.                                          |

Every implemented surface needs loading, empty/unavailable, error/retry, and success feedback where relevant. Live surfaces additionally need ready, active, paused, disconnected/rejoining, rejected/duplicate command, and resolved states. Invitation and credential states are named in their screen requirements. Render actual public content lengths and counts, including long case titles, no evidence, several evidence records, and long error messages; do not freeze counts to the images.

Normal text should meet 4.5:1 contrast, large text 3:1, with non-color status cues. Aim for 44px touch targets. Modal evidence inspection needs a label, focus containment, Escape/close, and focus restoration. Forms use labels and inline errors; changing board state should produce concise accessible feedback without repeatedly announcing an entire feed.

## Verification and handoff

For this documentation pass: verify reference hashes, local links, formatting, and preservation of source/frozen packs. No new UI, browser, or live-service result is claimed.

For each future implementation slice:

1. Capture the actual app's affected route and important state at the named desktop, phone, and relevant OBS sizes. For direct reference review, also capture public pages at 1122px CSS width with full-page height; do not force all content into the reference's 1402px export height. Compare structure, scene prominence, typography, art crop, panel framing, and primary action with its reference. Record intentional content adaptations from this brief. Make one focused correction pass before broadening scope.
2. Exercise the affected interaction and its failure path. For session flows, use the real server and deterministic engine; name any fake Twitch fixture. Check reload/reconnect and state authority, not just a static screenshot.
3. Run `npm --prefix apps/web run typecheck`, `npm --prefix apps/web run build`, and the relevant browser tests. Add a focused regression test for changed stateful behavior such as Start, repeated hints, invitation expiry, or retry keys. Follow [browser test setup](../../../tests/e2e/README.md); no extra dependency is needed for the visual foundation.
4. Check focus, overflow, touch layout, reduced motion, console errors, and secret-free screenshots. Record exact routes/states, screenshot paths, commands/results, unresolved gaps, and the next milestone in [frontend progress](../../agent-handoff/FRONTEND_PROGRESS.md).

Existing project-wide lint failures and fresh-install dependency concerns are recorded in [STATUS.md](../../STATUS.md); report their actual result rather than calling a design milestone fully green. Real Twitch OAuth/EventSub, desktop OBS Studio, remote Render, two consenting broadcasters, and player comprehension require their own evidence. Follow the [external checklist](../../agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md) when those checks are separately authorized.

The first implementation handoff is **F1**: reuse the supplied world and existing assets, make the shared shell and public pages consistent, preserve current data boundaries, and return rendered evidence before proceeding to the Q01/host/OBS slice.
