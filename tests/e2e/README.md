# Browser tests

`twitch-status.spec.ts` uses Playwright with the locally installed **Chrome channel**, as selected by `playwright.config.ts`. It starts its own in-process mock API/Socket.IO fixture on `127.0.0.1:10000` and Vite on `127.0.0.1:5173`, then closes them after the run. Do not run another shared API or Vite process on these ports during this fixture.

```powershell
npm run test:e2e
```

The fixture does not need PostgreSQL, Twitch credentials, or a real broadcaster. It covers English Twitch status copy in a session view, the current public/sample routes, mobile width, and absence of status UI in OBS. Screenshots and traces go to Playwright's ignored `test-results` directory.

Installing Playwright's bundled Chromium does not satisfy a configuration that explicitly selects `channel: "chrome"`. Do not install browsers or stop someone else's process as a side effect of a test run; report unavailable prerequisites.

This is mocked browser coverage, not real Twitch, OBS Studio, Render, full gameplay, accessibility, or player acceptance. See [current evidence](../../docs/STATUS.md).
