# Immersive frontend verification - 3 November 2026

Environment: Windows, installed Chrome, current uncommitted working tree in `C:\Developer\Projects\Devpost\CodexTwitch`. This record covers the authorized presentation changes, not the independently deployed backend. It supersedes the older framed Manuscript layout and permanent object list.

## Checks

| Command or interaction | Result and scope |
| --- | --- |
| `npm --prefix apps/web run typecheck` | Exit 0 after the fullscreen and inspection fixes. |
| `npm --prefix apps/web run build` | Exit 0; owned preview serves the resulting production bundle. |
| `node_modules\.bin\vitest.cmd run tests/web apps/web/tests --reporter=dot` | 21 tests across five files pass, including local board timing/scoring and existing round-client recovery fixtures. |
| `node_modules\.bin\playwright.cmd test tests/e2e/immersive-live.spec.ts tests/e2e/twitch-status.spec.ts --workers=1 --reporter=line` | 11 scenarios pass in 2.4 minutes; installed Chrome, owned loopback fixtures. |
| Changed-source `eslint --quiet` | Exit 0. Inherited Vue formatting warnings are not mass-reformatted. |
| Built-preview public/sample smoke | 22 route/viewport combinations pass at 1440 and 390 px: no horizontal overflow or uncaught page errors, one h1, and shared fonts. Phone captures use 2x device density. |
| `node scripts/check-docs.mjs` and Git whitespace check | Exit 0: 75 Markdown files and 414 local links; no diff whitespace errors. |
| Independent read-only source review | No material regression found in the stable canvas wrapper, viewport correction, final-find focus, inspection, or direct session recovery. |

The six immersive scenarios use actual authored-engine validation behind a local API/Socket.IO fixture: Q01 server-gated proof/start/pause/resume/reveal, M01 rejected and accepted timeline/theory challenge/reveal, C01 private team projections and both viewer stations' shared proof, all three metadata-only previews, hosted-session recovery without POST/stop, and twelve Manuscript finds through proof/report. Five status/practice scenarios additionally check Twitch status/OBS separation, repeated hints, Express optional panels and replay, and Lighthouse early-share scoring/pause/shared proof/report. Lighthouse waits for the real 74-second local discovery milestone. These are deterministic local gameplay paths, not provider delivery.

Viewport checks cover 1440 x 900 and 390 x 844 where specified by each test. Manuscript checks a connected, visible canvas after Skip intro, more than 730 px of room height on desktop, no permanent Finds panel, final-find focus on Board, mobile Room return, and artwork within its dialog frame. Previews cannot expose authored observations or emit commands. Co-op checks private data before sharing and zero running animations in a reduced-motion phone context.

## Corrections established during verification

- Conditional PlateFrame wrappers detached the study canvas when the intro ended. The wrapper now stays mounted, and the browser test asserts the actual canvas rather than only surrounding text.
- The global margin reset placed a native dialog at the top-left. Explicit centered margins fix it.
- An image's intrinsic minimum enlarged the inspection grid row and clipped its object. A constrained `minmax(0, 1fr)` row and zero item minimums fix it; the image-bounds regression and screenshot confirm the full latch.
- A disabled lifecycle button could lose focus before Escape reached the optional panel. Window-level handling now closes the panel while respecting open native dialogs.
- The first combined run had ten passing scenarios and one stale test expecting literal question-mark separators. The fixture expectation now matches the corrected middle-dot copy; the complete confirmation run passes all eleven.
- Removed intro-only unused imports after the lint error gate identified them.

## Evidence and lifecycle

Private logs and captures: `%LOCALAPPDATA%/Temp/cluenite-codex-board-d347f840/`, including `final-immersive-browser-confirmed.log`, `final-web-tests.log`, `final-web-typecheck-confirmed.log`, `final-preview-build-confirmed.log`, and `final-frontend-lint-confirmed.log`. Playwright captures/traces are in ignored `test-results/`; user-review copies are under `user-preview-2026-11-03/`. Captures use public practice or synthetic fixture data, without credentials or real chat.

The production-bundle smoke report and captures are in `built-final-2026-11-03/`. Recorded image dimensions include the clean gallery at 1672 x 941, observatory at 1983 x 793, and study thumbnail at 926 x 521. Representative phone mode cards render at 340 x 190; the 390 px hero canvas renders 780 physical pixels and the 739 px-high study renders 1478 physical pixels. The full latch is visible in the corrected discovery screenshot. Final visual review covered landing, Manuscript cover/room/discovery, and the fixture live/practice screenshots; this is a bounded review, not an exhaustive device audit.

The owned production preview at `127.0.0.1:5227` remains available for the user's requested review. Each test closes its fixture servers and browser contexts. No shared process was stopped. No commit, deploy, account change, real chat message, or external mutation was performed.

This pass does not establish real Twitch/OAuth/EventSub delivery, OBS Studio rendering, current deployed-version behavior, broad assistive-technology/contrast acceptance, player comprehension/timing/balance, or a final sound mix. Historical integration/provider evidence remains in [the integration record](frontend-integration-2026-11-02.md), [status](../STATUS.md), and [the backend release record](../operations/BACKEND_RELEASE_2026-11-02.md).

## Manuscript space and transparency refinement

The user's follow-up requested a more spacious layout with transparency. Only Manuscript opts into the new cinematic workspace presentation; the other cases keep their established layout. The room fills all viewport rows beneath translucent header/dock controls. Desktop Finds and case files float without resizing the room. A grouped Case file replaces repeated dock tabs; commands use a focused, optional composer. `/` opens it outside text fields, Escape closes it before a background drawer, and Case options holds sound/restart. Reduced-transparency preference restores solid surfaces. Main imagery itself is not blurred.

The strengthened browser regression failed before implementation against the 748px desktop room. It then passed with a 900px room, a 68px dock, unchanged room width when Finds/chat opens, command/options focus restoration, a slash shortcut that does not steal typing, and all twelve finds through proof/report. A landscape assertion now rejects the former height-based max-width constraint; the scene must occupy exactly 844 x 390 at that viewport. Final confirmation is in `spacious-manuscript-final.log`.

The final confirmation also reproduced a Chrome resize timing issue: `innerHeight` changed to 844 while `dvh` layout remained at 900 for two frames, then settled correctly. The fixture now polls its unchanged no-overflow assertion across that transition instead of sampling the first resize frame. The final Manuscript scenario passes in 17.5 seconds. The scoped mechanical layout scan returns `[]`; documentation links and diff whitespace also pass.

Six immersive fixture scenarios pass (44.6 seconds), and two status/default-workspace regressions pass (16.1 seconds). These verify compatibility during the refinement; earlier eleven-scenario evidence retains its own source boundary. The final targeted Manuscript run includes the added options, shortcut, top-layer Escape, and landscape assertions. Web typecheck, production build, and changed-source ESLint pass. No engine, transport, dependency, account, or deployment behavior was changed.

One visual batch covered 1440 x 900, 1024 x 768, 390 x 844 at 2x density, and 844 x 390, with room, Finds, chat, and command states. It found the objective panning out of view and phone intrinsic grid width clipping the header. Both were corrected together: HUD elements now belong to the viewport, and the cinematic grid has an explicit constrained column. Phone navigation uses compact icon/label targets; all measured dock targets are at least 44 x 44. The confirmation captures are in `spacious-confirmed/`, with no page errors or document overflow. The short-screen max-width constraint found in confirmation was removed and covered by the targeted geometry assertion. Internal pan space keeps lower objects reachable above the dock. No broader device or real-provider acceptance is inferred.

Private refinement logs use `spacious-*` filenames under the same task directory. The owned preview at `127.0.0.1:5227` serves the updated build and remains available for review. Documentation describes Case file, Command, Case options, and the cinematic layout; no external service was mutated.

## Pixi consistency and control layout pass

The user expanded the scope to all six Pixi gameplay scenes and corrected overlapping controls, partial fullscreen, obstructive discovery previews, and the Express/Lighthouse layout. This section is the current local evidence for that pass; the earlier counts above retain their historical scope.

Manuscript keeps its interactive Pixi room. The five other cases share a lazy-loaded Pixi renderer with separate location layers and finite clue, proof and sharing responses. Express animates landscape depth, wheels, steam and lighting; Lighthouse animates clouds, water and the ship while preserving foreground order and the dark opening. Gallery, Festival and Signal use their existing sharp artwork with distinct lighting, depth and particles. Ambient effects do not create proof or introduce extra observations. Actual accepted public state triggers live evidence responses; practice activity remains labeled scripted.

The renderer caps frame rate at 60 on desktop and 45 on narrow screens, with density capped at 2 and 1.5 respectively. Resize/fullscreen updates those caps and the backing buffer; layered SVG rasterization also respects the WebGL texture-size limit. Particles are pooled. Pause, hidden tabs, offscreen scenes and reduced motion stop their owned ticker; a deduction board stops the effects ticker after finite feedback ends. Generated textures, observers, listeners and owned timelines are cleaned up without destroying Pixi's shared white/empty textures. A sharp SVG/image fallback and semantic DOM controls remain usable when WebGL cannot initialize.

Native fullscreen now sizes the workspace to the browser viewport, including phone controls. Inspection dialogs target the active fullscreen container. Intro Cases/Skip controls occupy a separate rail; Manuscript's Skip clears its header. Express/Lighthouse remove inherited grid areas that had collapsed the animated scene, enlarge the scene row, and keep commands in an optional composer. Score/time have a clearer hierarchy. Phone tool grids expose every destination. Responsive clue positions and compact co-op scene instructions keep main-case targets clear.

Discoveries are seven-second translucent left notices with no Close or action button. They do not intercept pointer input, so another item can be selected immediately. Full details and artwork remain available from collected items/cards. The connected Quick/Mystery creation path opens the scene's Start round action; explicit dashboard links retain host controls. Co-op keeps the invitation, consent and partner-ready workflow.

| Check on 3 November 2026 | Result and boundary |
| --- | --- |
| Web typecheck and production build | Pass; final toolbar build also passes. |
| Changed-source ESLint error gate | Pass with the repository configuration; inherited formatting warnings are not mass-reformatted. |
| Focused Vitest run | 22 tests across five files pass in 6.74 seconds. |
| Complete two-file Chrome regression | 22 scenarios pass in 3.5 minutes using owned local API/Socket.IO fixtures and actual authored-engine validation. |
| Final rendering/fullscreen confirmation | Four targeted scenarios pass in 34.9 seconds after responsive toolbar and renderer resize/density changes. |
| Final Express/Lighthouse toolbar confirmation | One targeted scenario passes in 16.7 seconds, including every phone dock button's bounds and center hit target. |
| Final built-preview phone confirmation | Gallery, Festival, Signal, Express and Lighthouse pass: five 2x-density captures, all header/dock controls within the viewport and center-hit accessible, no document overflow or uncaught page errors. |
| Documentation, whitespace and mechanical layout checks | 76 Markdown files and 424 local links pass; Git diff whitespace passes; the scoped layout scanner returns `[]`. |

The broad browser run covers all three authored reveal paths, private station projections and viewer-only co-op proof, connected menu-to-start and invitation-ready paths, hosted-session recovery, all twelve Manuscript finds and report, Express replay, and Lighthouse's real 74-second milestone. It also checks actual Pixi frame advancement, pause/reduced-motion stopping, all six scene identities, nonmodal discovery dismissal, native fullscreen geometry, short-screen clue access, and the no-WebGL fallback. Local invitation fixtures do not send invitations or Twitch messages.

The normal-motion built-preview review records 21 screenshots and 29 checks at 1440 x 900 and 390 x 844 with 2x device density. It found three offscreen Briefing buttons; visual inspection also found the partially clipped practice Command button. Both toolbars were corrected. The review reports zero page errors and no document overflow. A final five-screen phone confirmation passes after both corrections; representative final phone images and the desktop practice/intro/Manuscript discovery images were inspected. Main-case phone clue placement and the final practice toolbar have additional center hit-test coverage. These are bounded local visual and interaction checks, not a GPU benchmark or an exhaustive device audit.

Private logs and captures use `pixi-*` names under `%LOCALAPPDATA%/Temp/cluenite-codex-board-d347f840/`. The owned production preview remains at `http://127.0.0.1:5227`. No dependency, backend contract, commit, deployment, account change or external mutation was added. Real Twitch OAuth/EventSub, provider invitation delivery, OBS Studio, remote deployment, broad assistive-technology behavior and player balance were not revalidated in this pass.

## Practice scrolling and discoverability

The user supplied a short-screen Lighthouse screenshot and requested scrolling plus clearer gameplay for Express/Lighthouse. Both cases now have one focusable central scroll region containing the compact scene, contextual guide and naturally sized board. Header metrics and tools stay visible. Card heights no longer depend on the remaining viewport; phone cards retain 182px before rotation. The board itself does not introduce another nested scroller.

The guide explains the next available inspect/connect/challenge/accuse action. Expandable How to play explains the full sequence and scripted Station B timing. Connect evidence starts an explicit two-card selection; Cancel/Escape exits it. Face-down cards are excluded from connection/challenge selection. Collected-card inspection offers Connect to another card once two cards are available. Existing commands, proof requirements, score, partner schedule, pause and replay remain unchanged.

Current local checks on 3 November 2026:

- Web typecheck, changed-source ESLint and the final production build pass.
- The initial guidance regression failed before implementation. Express's full proof/report/replay path and Lighthouse's early-share/pause/74-second proof/report path pass in the affected practice run. That run also exposed a collapsed scene, corrected by explicitly stretching the new flex layout.
- Final workspace/guidance and both-scene Pixi lifecycle regressions pass together: two scenarios in 19.1 seconds. They cover button-only connection, optional instructions, full-card access through central scrolling, phone tools, pause/reduced motion and native fullscreen. A conflicting scoped workspace style initially displaced a phone tool in Vite; stronger board-specific selectors fix the development/build ordering difference. The assertions retain their strict bounds and center hit tests.
- One built-preview visual batch covers both cases at 1280 x 675, 390 x 844 and 844 x 390 with 2x device density: six measured case/viewport combinations and eight screenshots. Every last card is reachable, cards retain their natural heights, all header/tool center hit targets are accessible, and there is no document overflow or uncaught page error. Desktop top/bottom and phone board captures were inspected.
- The user's development server on port 5173 returns HTTP 200 with the new scrolling and toolbar CSS. No shared server was restarted. Private evidence uses `practice-scroll-*` names under the existing task directory.

These are local practice changes. No main-case layout, backend contract, Twitch delivery, deployment or external service was changed or certified by this follow-up.

## Interactive scenes, full illustration and OBS card

The latest user-directed pass keeps the central practice scroll area and defaults Express/Lighthouse to their complete 1200 x 360 illustration. A 44px Full illustration/Compact illustration toggle changes its size without overlaying the art. Theory cards separate speaker/status, statement, belief and challenge actions. Live Theories uses a list/action layout that stacks on phones. Practice board panels and live deduction surfaces hide timed notices while reading; measured header/dock heights keep scene notices above wrapped tools. Manuscript retains its final-find notification when it moves into deductions.

Gallery, Festival and Signal now use native Pixi environments and selectable geometry in `investigationScene.ts`, rather than photo scenery. Gallery has a perspective hall, lamps and framed art; Festival adds bunting, a glass cabinet, books and trolley; Signal has layered water/cloud motion, rain, radar and a team-specific records room. Object hover/found effects and finite accepted-state responses retain the shared lifecycle. Direct canvas picking opens the existing public inspection, with equivalent semantic controls and a static vector fallback. The renderer receives only the current public clue projection, including C01's station limits. It does not receive private answers, unknown observations or invented radar contacts.

Manuscript room faces, suspect cards and scripted partner reuse the six-character atlas. Scene frame cleanup preserves its shared texture source. OBS uses a dedicated transparent read-only broadcast card through the existing authorized entry: title, elapsed time, question, stage, actual clue/finding progress and accepted reveal. Mode/station labels, chat commands and placement/scale remain supported. It starts no room renderer or ambient audio.

Current local verification on 3 November 2026:

- Web `vue-tsc` and production build exit 0. Changed-source `eslint --quiet` exits 0 across sixteen source/test files. Existing Vue formatting warnings were not mass-reformatted.
- Twenty-two focused unit tests pass across the Quick Case view model, practice board engine and session-launch rules.
- The two browser suites exercise twenty-five scenarios. The final broad pass passed twenty-four and exposed a final-find notification hidden by an overly broad Manuscript panel condition. Restoring that existing behavior passes the complete Manuscript search/deductions/report follow-up in 14.2 seconds. The other twenty-four results remain valid; no clean all-twenty-five rerun is claimed after that template-only correction.
- Native object picking, public object counts, desktop/phone/short-landscape clue hit targets, native fullscreen, pause, reduced motion and the no-WebGL fallback pass. M01's accepted timeline/theory/reveal and C01's private station/viewer proof remain covered. Both board cases complete their original proof/report paths, including Lighthouse's actual 74-second scripted milestone.
- The OBS fixture verifies no controls or Twitch connection status, transparent root/body, and bounds at 1280 x 720. Captures cover 1280 x 720 and 1920 x 1080; both PNGs have an actual transparent corner (8-bit RGBA, alpha 0). An additional 390px/1.4-scale regression first reproduced clipping, then passes after accounting for scale in the card's viewport width/height limits and corner spacing. That final OBS scenario passes in 16.6 seconds and its scaled capture was inspected. These use synthetic public state, not OBS Studio.
- A final built-preview batch captures sixteen desktop/phone states across all six gameplay scenes, including both full/compact practice illustrations, practice Theories and atlas faces. It reports zero uncaught page errors and zero horizontal document overflow. Main-case desktop/phone, practice full illustration/Theories, Manuscript faces and OBS captures were visually inspected. A discovered crew notice over phone Theories was corrected; final captures show unobstructed cards/actions.
- The owned preview on port 5227 serves the current build and returns HTTP 200 for `/play` and the real local three-case catalog. The user's development route on port 5173 also returns HTTP 200. No shared service was restarted.
- Documentation validation passes for 81 Markdown files and 442 local links; diff whitespace passes with the repository's Windows line-ending handling. Final production build exits 0 in 18.89 seconds. The current procedural scene source also returns HTTP 200 from the user's development server.

Private logs/captures use `scenes-*` and `current-scenes-review*` names under the existing task directory. Product/design guides, the reference differences and architecture decisions reflect the current source. No dependency, backend contract, commit, deployment or external mutation was added. Real Twitch OAuth/EventSub, live provider delivery, OBS Studio, remote deployment, broad assistive-technology behavior and player balance were not revalidated.

## Manuscript benchmark craft pass

The user subsequently asked for all cases to reach Manuscript's visual/animation quality and for more creative layout. This pass enriches the five other scenes while preserving the approved full/compact illustration, scroll, semantic controls, public clue coordinates and gameplay contracts. A bounded read-only review compared actual incumbent scenes against Manuscript and identified empty geometry, floating objects and busy phone composition as the highest-impact gaps.

Gallery/Festival now include wall joinery, runner, furniture, plants and physical supports under selectable objects. Signal adds distant harbour and chart-table detail. The recurring illustrative investigator borrows the existing atlas face and has a restrained idle pose; it is scenery, not a new suspect or clue. Cabinet reflection, lighting and static generated material finish add depth without full-screen filters or per-frame noise generation. Desktop objects are more proportionate and the translucent briefing leaves a quieter phone area. Header/dock treatment and paper records follow the existing brown/brass material language.

Express gains carriage panelwork, passenger silhouettes, metal highlights, native window light and star glints. Lighthouse gains masonry, a keeper's cottage, coastal contours and moving water glimmers. Extracted SVG clouds now retain their inherited paint instead of defaulting to black. The ship pivot is normalized to source texture density; a final 2x-density capture confirms it sits by the rocks rather than beyond the illustration edge. All additions use existing pause/visibility/reduced-motion lifecycles and scene-owned resource cleanup; borrowed atlas frames do not destroy the shared source.

Current scoped checks:

- Web typecheck and production build exit 0; changed-source `eslint --quiet` exits 0 across the four affected render/layout files. No dependency was added.
- Five targeted browser scenarios pass in 51.2 seconds: native main-case picking/lifecycle/fullscreen/phone/short-screen/reduced motion, metadata-only previews, the complete Manuscript search/deduction/report, board workspace/inspection and both board renderers. After the visual correction batch, the unchanged native test passes again in 21.1 seconds, and the final board test passes in 15.8 seconds. One native canvas startup expectation timed out during a concurrent build; the isolated confirmation passes without weakening that assertion. No complete engine/transport/provider suite rerun is claimed for these drawing/layout-only changes.
- The built-preview desktop/phone batch covers sixteen states across the six scenes with zero uncaught page errors and zero horizontal document overflow. Representative native rooms, phone Festival, both full board illustrations and the high-density Lighthouse correction were inspected. Excessive initial material grain and a crowded briefing were corrected together; final texture strength is restrained.
- An independent read-only closeout review of the actual final captures reports no serious visual/control defect. This is bounded review evidence, not certification of subjective artistic parity or player acceptance.

Private evidence uses `craft-*` names and the existing `current-scenes-review` folder. Local preview remains on port 5227; the development source remains on port 5173. No deployment, commit, external mutation, Twitch delivery or OBS Studio acceptance is part of this refinement.

## Decorative figure removal

The latest explicit user correction removes the additional investigator, including its head/body, idle movement and portrait-atlas request, from all three main environments. It does not remove Manuscript characters or practice suspect portraits. The source change is limited to `investigationScene.ts` and `caseStage.ts`; current design/handoff record the correction. Verification is recorded after the removal rather than inferred from the earlier craft pass.

After removal, web typecheck/build and the two-file ESLint check exit 0. The existing native environment regression passes in 16.5 seconds across all three main cases, including actual object picking, fullscreen, phone/short-screen target access, pause and reduced motion. The current Gallery capture confirms the additional figure is absent. Documentation links pass, and the owned preview returns HTTP 200 with the current build. Private evidence uses `remove-figure-*` names. No deployment or provider acceptance is claimed.

## Repository publication checks

On 3 November 2026 WITA, the user authorized committing and pushing the complete source. Fresh workspace typecheck, production build and repository ESLint error checks pass. All 62 focused engine/web/provider unit tests and all 32 Chrome browser scenarios pass; the browser suite completes in 2.7 minutes. The optional demo source passes its own TypeScript check.

The source-only index export passes documentation validation without local recordings or rendered outputs. Staged text contains no matches for private environment credentials, and no environment file, log, recording or generated audio is staged. Optional demo compositions, scripts, lockfile and licensed fonts are included; generated media remain local. The optional npm project is excluded from the application pnpm workspace and uses its own checks.

Private verification logs remain in the operating system temporary directory under `cluenite-github-closeout`. These local checks do not rerun PostgreSQL integration, real Twitch delivery, OBS Studio or a production deployment. GitHub CI provides the separate PostgreSQL integration gate for the published source.
