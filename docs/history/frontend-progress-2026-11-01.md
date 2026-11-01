> Historical progress record from 1 November 2026. Preserved during the 2 November synchronization. Ports, tests, screenshots, account observations, and uses of “current” apply to the original session. See [current status](../STATUS.md) and the [active handoff](../agent-handoff/FRONTEND_PROGRESS.md).

# Frontend progress (Claude Code)

Date: 2026-11-01. Branch `main`, HEAD `c320a9b`. No commits were made in this session. All changes below are uncommitted and sit in the working tree next to other sessions' changes.

## Changed in this session (`apps/web`)

- `src/components/QuickCaseOverlay.vue`: two-column desktop layout at 1240px and wider, outside OBS. `.qc-main` holds the scene, progress steps, brief, and hint. `.qc-side` holds clues, evidence, link, verdicts, notice, and reveal. Mobile keeps one column. Template wrappers and CSS only; no logic changed. Whitespace re-indent after the screenshots (no visual change). The OBS card has its own bullet below.
- `src/components/QuickCaseOverlay.vue`, OBS card (`?mode=obs`, class `is-obs`): rebuilt as a fixed corner card, 540px wide (`min(540px, 100vw - 48px)`), 24px inset. `?pos=bl|br|tl|tr` picks the corner (default `bl`). `?scale=0.6` to `1.4` sets the size (default `1`) through `--qc-obs-scale`. Script adds `obsPosition` and `obsScale`, bound to the root only in OBS. The card shows the head, question, three clue cards, released evidence, and the link control in a 3-column grid. The scene, steps, premise, ledger, verdicts, notices, and connector are hidden in OBS. No `max-height` clip, so content cannot be cut off silently. No game logic changed.
- `src/components/CaseScene.vue`, `src/scene/caseScene.ts`: palette cleanup (lilac removed, Brown Noir tokens).
- `src/components/DashboardPanel.vue`: Brown Noir tokens; `.dash-button` has hover, disabled, and focus-visible states.
- `src/style.css`: `--case-*` Brown Noir tokens; focus-visible; reduced-motion rule.
- `index.html`: `theme-color` `#100d0a`. The favicon still uses non-palette values (see gaps).
- `src/App.vue`: layout edits only (h1 clamp, banners, 880px board cap, two columns at 1240px and wider). The `requireOverlay` / `connectRound` hunk belongs to another session and is untouched.
- `DESIGN.md` (`apps/web/DESIGN.md`): rewritten for the Brown Noir direction.

Added in the continuation of this session:

- Quick Case actions follow the server's `availableActions` (`QuickCaseOverlay.vue`, `quickCase/viewModel.ts`). Verdicts need `solve`. The hint button needs `hint` and no pause. Inspect needs `look`. Link needs `link` and at least two evidence records. The server still validates every action.
- Evidence actions send `!look <clueId>` and `!link <a> <b>` (`src/App.vue`). Preview mode sends nothing to the server.
- Hint: the "Ask for a hint" button sends `!hint`. The hint text shows `currentHint` with `hintLevel`. Preview uses the `PREVIEW_HINT` placeholder, which is not server output.
- `quickCaseFromSnapshot` maps `chosenVerdictId`, `currentHint`, and `hintLevel`.
- Dev proxy: `apps/web/vite.config.ts` reads `CLUENITE_API_PORT` from the shell process environment, default `10000`. Example: `CLUENITE_API_PORT=10001 npm --prefix apps/web run dev`. It is not read from `.env`.
- Scene (`src/scene/caseScene.ts`): the room is now a background sprite from `src/assets/quick-case/museum-gallery.jpg`. That file is a 1344×756 copy of the Mystery Live prototype `museum-gallery.png`. It is prototype art, and its reuse is not yet approved. The procedural wall, window, rain, clock, and frames were removed. The vitrine light cone lands on the vitrine. The detective has a thin amber rim (alpha 0.5) so the dark silhouette reads against the dark wall.
- Clue state: clue status and the "Released by" / "Context only" labels are in place. The clue-discovery animation (P5) is not built.

Not this session's work, and not claimed here: `MysteryLiveBoard.vue`, `MysteryLiveScene.vue`, `mysteryLive/previewSnapshot.ts`, `scene/mysteryLiveScene.ts`, `assets/mystery-live/` (untracked, another session), `TwitchConnectionStatus.vue` (untracked, another session), `net/roundClient.ts` (another session).

## Live status and blockers (2026-11-01, later pass)

- Live API on port 10000 is healthy: `/health/live` and `/health/ready` return ok and ready. `/api/cases` includes Q01 `Q01_GALLERY_SHADOW` (clues CAM, ACCESS, SCHEDULE, and others). `/api/me` returns 401 `authentication_required`. `/api/auth/twitch/start` returns 503 `twitch_oauth_not_configured`.
- **Blocked:** no host session can be created, so the live `!look`, `!link`, `!hint`, and `!submit` round trips have not run. See `FRONTEND_CONTRACT_REQUESTS.md` REQ-FE-003 (open). Until it is resolved, no result here is a live result.
- Port 10001 is not used (REQ-FE-004, information only).
- REQ-FE-001 is closed. ACCESS is context only. The correct link is CAM_R07 ↔ SCHEDULE_R07. No Q01 or contract change.

Changed in this pass:

- `src/App.vue`: one line, `:notice="notice"` added to `QuickCaseOverlay`. `notice` already held the server result from `showResult`. The overlay did not receive it before.
- `src/components/QuickCaseOverlay.vue`:
  - New optional `notice` prop (default `null`).
  - `.qc-feedback` appears above the link row when a command result arrives. It is keyed by `noticeSeq`, so each result replays its entrance.
  - `is-warn` shakes once (380 ms). `is-ok` fades in (220 ms). Both have a `prefers-reduced-motion` guard.
  - Hidden in OBS, like `.qc-notice`.
- Released evidence cards fade in when first mounted (`qc-evidence-in`, 420 ms, reduced-motion guard). Keys are stable, so only new items replay.
- Not changed: the link success draw already exists (`buildEvidenceLinkTimeline` in `@cluenite/graphics`, reduced-motion aware).

Verification in this pass:

- `npm --prefix apps/web run typecheck`: exit 0, 0 `error TS` lines. Log `web-typecheck10.log`.
- `shot-v25.mjs` re-run: OBS start 540×187, OBS linked 540×217, mobile horizontal overflow 0, no page or console errors.
- Viewed `v25-desk-linked-1920x1080.png` (two columns, linked connector, no clipping) and `v25-mobile-390x844.png` (one column, no overflow).
- Not verified: the `.qc-feedback` warn and ok states. Preview mode never sets `notice`, so the feedback does not appear in any screenshot. It needs a live rejected `!link`.
- Not verified: the evidence fade-in mid-frame. The screenshots show only the final state.
- Known, not changed: after a successful link, the "Link selected (0/2)" button stays visible and disabled. It is pre-existing and unconfirmed as a bug.

## Screenshots (real app: Vite dev on 5175, Playwright; sample data, labeled "SIMULATION · NO TWITCH CHAT")

Folder: `C:\Users\andro\AppData\Local\Temp\cluenite-shots\`

| File | Viewport | What it shows |
| --- | --- | --- |
| `v18-desk-1920x1080.png` | 1920×1080 | Two columns. Scene, steps, brief, clues, evidence, link, and verdicts all fit above the fold. |
| `v18-desk-1280x720.png` | 1280×720 | Two columns. The bottom of the board (ledger) goes below the fold and needs a scroll. |
| `v18-mobile-390x844.png` | 390×844 | One column. Scene bleeds to the edges; steps wrap 2×2. |
| `v18-obs-1280x720.png` | 1280×720, `?mode=obs` | Read-only OBS board in one column. The board uses about 600px of the 1280px viewport, and its height is taller than 720px. |
| `v19-desk-1920x1080.png` | 1920×1080 | Re-captured after the whitespace re-indent. Same two-column layout; the whole loop is above the fold. |
| `v19-obs-1280x720.png` | 1280×720, `?mode=obs&view=quick` | Re-captured. Single column, board about 600px wide, transparent background on the right half. |
| `v19-mobile-390x844.png` | 390×844 | Re-captured. Single column; steps 2×2; first clue card visible. |
| `v20-obs-before-1280x720.png` | 1280×720 | OBS baseline before the rebuild (600px-wide column). |
| `v23-obs-1280x720.png` | 1280×720, `?mode=obs&view=quick` | Current OBS card, bottom-left, 540×250 at scale 1. No clipping. Clue cards 77px. |
| `v23-obs-1280x720-tr.png` | 1280×720, `?mode=obs&view=quick&pos=tr&scale=0.9` | Top-right, 486×225 at x=770, y=24. |
| `v23-desk-1920x1080.png` | 1920×1080 | Desktop, unchanged by the OBS work. Board 1720×770, clue cards 136px. |
| `v23-mobile-390x844.png` | 390×844 | Single column. Document width 390, no horizontal overflow. |
| `v24-desk-start.png`, `v24-desk-linked-hint.png`, `v24-obs-1280x720.png`, `v24-mobile-390x844.png` | 1920×1080, 1280×720, 390×844 | Earlier scene (procedural room). Taken before the gallery background. |
| `p4-desk-start.png` | 1920×1080 | Quick Case before linking. Gallery background, vitrine light cone, detective with amber rim. |
| `p4-desk-linked.png` | 1920×1080 | After linking CAM ↔ SCHEDULE. "Ask for a hint" and both verdict buttons visible in the Challenge step, detective rim visible. Verdict enabled state not checked in the screenshot. |
| `v17-desk-1920x1080.png` | 1920×1080 | Before the layout change: single column, clues and verdicts below the fold. |
| `v16-desk-1280x800.png`, `v16-mobile-390x844.png`, `v16-obs-1280x720.png` | earlier | Earlier palette pass. |

These are sample screenshots of the Quick Case surface. They are not screenshots of a live Twitch session.

## Verification run in this session

- `npm --prefix apps/web run build`: exit 0, built in 10.33 s, output to `C:/Users/andro/AppData/Local/Temp/cluenite-tmp/web-dist`, log `web-build.log`. Ran after the `.qc-main` / `.qc-side` change.
- `npm --prefix apps/web run typecheck` (`vue-tsc --noEmit`): exit 0, log `web-typecheck.log`. Rerun at the end of the session: exit 0, 0 `error TS` lines, log `web-typecheck2.log`.
- Browser: earlier console errors were Vite 500 reload failures from mid-edit template states. In the v19 pass, the first 1920 capture was blank white. The console showed `ReferenceError: Cannot access 'idempotencyKeySchema' before initialization` at `packages/contracts/src/index.ts`, a temporary state while another session was editing that file. After the file settled (the symbol is defined at line 68 before its first use), a retake rendered correctly. This is not a layout problem; it is a note for Codex.
- `npm --prefix apps/web run typecheck` rerun after the last CSS edits: exit 0, 0 `error TS` lines, log `web-typecheck5.log`.
- Continuation (actions, hint, scene art): typecheck exit 0, 0 `error TS` lines, logs `web-typecheck7.log` and `web-typecheck8.log` (the second one after the detective rim edit).
- Playwright `C:\Users\andro\AppData\Local\Temp\cluenite-tmp\shot-p4.mjs` (1920×1080, linked flow: clue 0, clue 2, two evidence cards, "Link selected"): canvas 888×369, no console errors or page errors. Screenshots `p4-desk-start.png` and `p4-desk-linked.png`. Run twice; the second run is after the rim edit.
- Playwright browser: the bundled Chromium is not installed in this environment. `shot-p4.mjs` resolves `playwright`, `@playwright/test`, or `playwright-core` from the repo's package and launches the `msedge` channel, falling back to `chrome`.
- Not re-captured after the scene change: OBS 1280×720 and mobile 390×844. The OBS card hides the scene, so it should not change, but this is not verified in a screenshot.
- Not verified against a live API: `!look`, `!link`, and `!hint` round trips. At the last check, ports 10000 and 10001 were not listening. PostgreSQL health is unverified. The hint and action paths are checked by typecheck and by reading the code only.
- WCAG contrast (script-computed, earlier): parchment on obsidian 14.55:1; parchment-dim on espresso 8.29:1; gold on espresso 9.11:1; alert rose on espresso 7.42:1; brass thread on espresso 6.84:1.

Not run: unit, server, and e2e tests (not requested in this session); lint; reduced-motion and keyboard-focus pass in a browser; automated accessibility audit; Pixi FPS and heap; live session data; real OBS Studio browser source; real Twitch.

## Remaining gaps (frontend)

1. Closed (REQ-FE-001): ACCESS is context only, and the link is CAM_R07 ↔ SCHEDULE_R07. No contract change.
2. The Quick Case room uses prototype gallery art (a copy of Mystery Live `museum-gallery.png`). Reuse is not yet approved. The figures, table, and chips are still procedural shapes, not final art.
3. Mystery Live UI exists in untracked files from another session. It is not integrated or verified by this session. Ownership is not confirmed.
4. Co-op C01 has no frontend in this session.
5. `quickCaseFromSnapshot` now maps `chosenVerdictId`, `currentHint`, and `hintLevel`. `sequences` and `theories` were not re-checked in this pass.
6. OBS: at 1280×720 the card is 540×187 at start and 540×217 when linked (`?pos=bl`, scale 1), measured after the CSS trim. Shrinking to 200–220 px height needs no further change at this scale. `?pos=` and `?scale=` are preview controls. The user still has to choose the final OBS corner and size. Not tested in real OBS Studio.
7. `index.html` favicon uses `#0f0a06`, `#c9974a`, and `#e2a94e`, which are not palette values. Not changed.
8. `TwitchConnectionStatus.vue` (another session) still uses navy and teal rgba values.
9. Discovery animation (P5) is partial. Released evidence cards fade in (`qc-evidence-in`). Clue cards keep the existing `clue-open` animation. Neither has been checked frame by frame, and no live release has been observed.
10. The `!look`, `!link`, and `!hint` paths are not verified against a live API (see Verification).

## Next most valuable work

1. Resolve REQ-FE-001 with the user, then wire the linkable state into the Quick Case clue cards.
2. Integrate the Mystery Live board from the other session after confirming ownership, then verify it with the same three viewports.
3. Replace the procedural Quick Case figures and table with production art (commissioning or licensed assets), and keep the prototype label until then.
