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
