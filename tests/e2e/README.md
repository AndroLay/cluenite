# Browser tests

`twitch-status.spec.ts` and `immersive-live.spec.ts` use Playwright with the locally installed **Chrome channel**, as selected by `playwright.config.ts`. Each starts its own in-process API/Socket.IO fixture on an operating-system-assigned loopback port. Vite selects an available loopback port starting at `5173`; existing development servers can keep running. HTTP and socket proxies use the owned API address. Tests navigate to their own Vite address, then close their servers after the run.

```powershell
npm run test:e2e
```

The fixtures do not need PostgreSQL, Twitch credentials, or a real broadcaster. The six status/practice tests cover English Twitch status, public routes, mobile width, OBS exclusion, M01 repeated hints, unobstructed Express/Lighthouse workspaces, optional chat and command composers, nonmodal discoveries and deliberate evidence inspection, Pixi pause/reduced-motion/fullscreen behavior, Express proof/rejection/report/replay, and Lighthouse early trading/pause/shared proof/report. Lighthouse waits for the real 74-second rescue-log milestone and has a 120-second test budget.

The nineteen immersive tests cover Q01 proof/lifecycle/reveal, M01 rejected and verified timeline/theory challenge/reveal, C01 private A/B projections/viewer-only proof/shared reveal, three metadata-only previews, open-hosted-session recovery without a mutation, and all twelve Manuscript finds through deductions/report. Additional regressions cover authenticated menu-to-start paths, local invitation consent, restart/draft recovery, native Pixi object picking and lifecycle, native fullscreen sizing, responsive clue hit targets, and a usable fallback when WebGL is unavailable. Discovery notices dismiss automatically and allow clicks through; full artwork is inspected deliberately from a collected find. Theories suppresses scene notices while reading. The practice/OBS suite also checks the full/compact illustration toggle and transparent, read-only broadcast card at 1280 x 720 and 1920 x 1080. Authored case definitions are imported only by the test process, not the web bundle. Use one or two workers to bound concurrent Vite/Chrome use. Screenshots and traces go to ignored `test-results`, or a supplied private `--output` directory.

Installing Playwright's bundled Chromium does not satisfy a configuration that explicitly selects `channel: "chrome"`. Do not install browsers or stop someone else's process as a side effect of a test run; report unavailable prerequisites.

This covers the specified gameplay paths through a local fixture transport. It does not establish real Twitch delivery, OBS Studio, Render, broad assistive-technology, or player acceptance. See [current evidence](../../docs/STATUS.md).
