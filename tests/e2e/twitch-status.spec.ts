import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server as SocketServer } from "../../apps/server/node_modules/socket.io/dist/index.js";
import { afterAll, beforeAll, expect, test, type Page } from "@playwright/test";
import type { CommandResult, SubmitCommand } from "@cluenite/contracts";
import { M01_PREVIEW_SNAPSHOT } from "../../apps/web/src/mysteryLive/previewSnapshot.js";
import {
  createServer as createViteServer,
  type ViteDevServer,
} from "../../apps/web/node_modules/vite/dist/node/index.js";

const sessionId = "browser-status-test";
const snapshot = {
  protocolVersion: 1,
  revision: 1,
  sessionId,
  source: "live",
  caseId: "Q01_GALLERY_SHADOW",
  caseMode: "quick",
  team: null,
  title: "The Gallery Shadow",
  premise: "A short browser test case.",
  question: "What triggered the alarm?",
  phase: "ACTIVE",
  stage: "observe",
  paused: false,
  timer: { elapsedMs: 0, running: true },
  clues: [
    {
      id: "CAM",
      label: "Camera still",
      teaser: "Inspect the still.",
      status: "locked",
      observation: null,
    },
  ],
  evidence: [],
  sequences: [],
  theories: [],
  currentHint: null,
  hintLevel: 0,
  availableActions: ["inspect"],
  verdicts: [{ id: "ROBOT", label: "A service robot" }],
  chosenVerdictId: null,
  revealText: null,
};

let httpServer: ReturnType<typeof createServer>;
const hintSessionId = "browser-m01-hints-test";
const hintSnapshot = structuredClone(M01_PREVIEW_SNAPSHOT);
hintSnapshot.sessionId = hintSessionId;
hintSnapshot.source = "live";
hintSnapshot.revision = 1;
hintSnapshot.hintLevel = 1;
hintSnapshot.currentHint =
  "Compare the gallery photo with the temperature warning.";
hintSnapshot.availableActions = ["hint"];
const hintCommands: SubmitCommand[] = [];

let socketServer: SocketServer;
let viteServer: ViteDevServer | undefined;
let webOrigin: string;

beforeAll(async () => {
  httpServer = createServer((request, response) => {
    if (request.url === "/api/me") {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          authenticated: false,
          error: "authentication_required",
        }),
      );
      return;
    }
    if (request.url === `/api/sessions/${hintSessionId}/snapshot`) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ snapshot: hintSnapshot }));
      return;
    }
    if (request.url === `/api/sessions/${sessionId}/snapshot`) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ snapshot }));
      return;
    }
    response.writeHead(404).end();
  });
  socketServer = new SocketServer(httpServer, { path: "/socket.io" });
  socketServer.on("connection", (socket) => {
    socket.on(
      "session:command",
      (
        payload: SubmitCommand,
        acknowledge: (result: CommandResult) => void,
      ) => {
        if (payload.sessionId !== hintSessionId || payload.text !== "!hint")
          return;
        hintCommands.push(payload);
        const previousRevision = hintSnapshot.revision;
        hintSnapshot.revision += 1;
        hintSnapshot.hintLevel += 1;
        hintSnapshot.currentHint =
          "Compare the service cart route with the trophy case.";
        acknowledge({
          code: "ACCEPTED_NEW",
          reason: null,
          message: "Another hint is available.",
          missing: [],
          revision: hintSnapshot.revision,
        });
        socket.emit("session:delta", {
          sessionId: hintSessionId,
          previousRevision,
          revision: hintSnapshot.revision,
          changes: [
            {
              field: "revision",
              operation: "set",
              value: hintSnapshot.revision,
            },
            {
              field: "currentHint",
              operation: "set",
              value: hintSnapshot.currentHint,
            },
            {
              field: "hintLevel",
              operation: "set",
              value: hintSnapshot.hintLevel,
            },
          ],
          cues: [],
          eventId: "550e8400-e29b-41d4-a716-446655440001",
        });
      },
    );
    socket.on(
      "session:join",
      (
        payload: { sessionId?: string },
        acknowledge?: (response: {
          ok: boolean;
          snapshot: typeof snapshot | typeof hintSnapshot;
        }) => void,
      ) => {
        acknowledge?.({
          ok: true,
          snapshot:
            payload.sessionId === hintSessionId ? hintSnapshot : snapshot,
        });
        socket.emit("connection:status", {
          provider: "twitch",
          state: "ONLINE",
          since: "2026-11-01T00:00:00.000Z",
        });
      },
    );
  });
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  const apiAddress = httpServer.address();
  if (!apiAddress || typeof apiAddress === "string")
    throw new Error("The browser fixture has no HTTP address.");
  const apiOrigin = "http://127.0.0.1:" + apiAddress.port;
  viteServer = await createViteServer({
    configFile: resolve("apps/web/vite.config.ts"),
    root: resolve("apps/web"),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": apiOrigin,
        "/socket.io": { target: apiOrigin, ws: true },
      },
    },
  });
  await viteServer.listen();
  const webAddress = viteServer.httpServer?.address();
  if (!webAddress || typeof webAddress === "string")
    throw new Error("The browser fixture has no Vite address.");
  webOrigin = "http://127.0.0.1:" + webAddress.port;
});

afterAll(async () => {
  await viteServer?.close();
  if (socketServer) {
    await new Promise<void>((closeDone) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(forceClose);
        closeDone();
      };
      const forceClose = setTimeout(() => {
        socketServer.disconnectSockets(true);
        httpServer.closeAllConnections();
        if (httpServer.listening) httpServer.close();
        finish();
      }, 1_500);
      socketServer.close(() => finish());
    });
  }
});

test("shows Twitch health in the live app and keeps it out of the OBS source", async ({
  page,
  context,
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(webOrigin + "/?session=" + sessionId);

  const status = page
    .getByRole("status")
    .filter({ hasText: "Twitch connected" });
  await expect(status).toBeVisible();
  await expect(page.getByText("The Gallery Shadow")).toBeVisible();

  const previewPage = await context.newPage();
  await previewPage.goto(webOrigin + "/");
  await expect(previewPage.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    previewPage.getByRole("navigation", { name: "Site" }),
  ).toBeVisible();
  // The landing page's own navigation labels the case menu "Cases".
  await expect(
    previewPage.getByRole("link", { name: "Cases", exact: true }),
  ).toBeVisible();

  await previewPage.goto(webOrigin + "/guide");
  await expect(
    previewPage.getByRole("heading", { name: "How to play", exact: true }),
  ).toBeVisible();
  await expect(
    previewPage.getByText("!link <evidence-id> <evidence-id>", { exact: true }),
  ).toBeVisible();

  await previewPage.goto(webOrigin + "/?view=mystery");
  await expect(
    previewPage.getByRole("heading", {
      name: "The Missing Festival Trophy",
    }),
  ).toBeVisible();
  await expect(previewPage.locator('canvas[data-pixi-scene="festival"]')).toBeVisible();
  await previewPage.getByRole("button", { name: /^Evidence/ }).click();
  await expect(previewPage.getByRole("heading", { name: "Follow the evidence" })).toBeVisible();
  await previewPage.screenshot({
    path: testInfo.outputPath("mystery-live-desktop.png"),
    fullPage: true,
  });
  await previewPage.setViewportSize({ width: 390, height: 844 });
  expect(
    await previewPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await previewPage.screenshot({
    path: testInfo.outputPath("mystery-live-mobile.png"),
    fullPage: true,
  });
  // The playable sample case: skip the opening, find one object with Assist (no WebGL needed), and read the result.
  await previewPage.goto(webOrigin + "/?view=quick");
  await expect(
    previewPage.getByRole("heading", {
      name: "A Missing Manuscript",
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    previewPage.getByText("Practice case \u00b7 No Twitch chat \u00b7 Progress stays in this browser", { exact: true }),
  ).toBeVisible();
  await previewPage
    .getByRole("button", { name: "Skip the intro", exact: true })
    .click();
  await previewPage.getByRole("button", { name: "Objects to find", exact: true }).click();
  await previewPage
    .getByRole("button", { name: "Assist", exact: true })
    .click();
  await previewPage
    .getByRole("button", { name: "Find Window latch", exact: true })
    .click();
  await expect(previewPage.getByRole("status", { name: "New discovery", exact: true })).toContainText("Window latch");
  await expect(previewPage.getByRole("dialog", { name: "Window latch", exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(status).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("twitch-status-mobile.png"),
    fullPage: true,
  });

  const obsPage = await context.newPage();
  await obsPage.goto(
    webOrigin + "/?mode=obs&session=" + sessionId + "#overlay=test-token",
  );
  await expect(
    obsPage.getByRole("status").filter({ hasText: "Twitch" }),
  ).toHaveCount(0);
  const broadcast = obsPage.getByRole("complementary", { name: "Broadcast case overlay", exact: true });
  await expect(broadcast).toBeVisible();
  await expect(broadcast.getByRole("button")).toHaveCount(0);
  expect(await obsPage.evaluate(() => [document.documentElement, document.body].map(element => getComputedStyle(element).backgroundColor))).toEqual(["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]);
  await obsPage.setViewportSize({ width: 1280, height: 720 });
  expect(await broadcast.evaluate(element => { const box = element.getBoundingClientRect(); return box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight; })).toBe(true);
  await obsPage.screenshot({ path: testInfo.outputPath("broadcast-1280.png"), omitBackground: true });
  await obsPage.setViewportSize({ width: 1920, height: 1080 });
  await obsPage.screenshot({ path: testInfo.outputPath("broadcast-1920.png"), omitBackground: true });
  await obsPage.setViewportSize({ width: 390, height: 844 });
  await obsPage.goto(webOrigin + "/?mode=obs&session=" + sessionId + "&pos=br&scale=1.4#overlay=test-token");
  await expect(broadcast).toBeVisible();
  expect(await broadcast.evaluate(element => { const box = element.getBoundingClientRect(); return box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight; })).toBe(true);
  await obsPage.screenshot({ path: testInfo.outputPath("broadcast-scaled-phone.png"), omitBackground: true });
  expect(pageErrors).toEqual([]);
});

test("offers further hints while the server permits them", async ({
  page,
}, testInfo) => {
  await page.goto(webOrigin + "/?session=" + hintSessionId);
  await expect(
    page.getByRole("heading", { name: hintSnapshot.title, exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  let hint = page.locator(".live-hint").filter({ hasText: hintSnapshot.currentHint! });
  const nextHint = page.getByRole("button", {
    name: "Request a hint",
    exact: true,
  });
  await expect(hint).toBeVisible();
  await expect(nextHint).toBeEnabled();
  await nextHint.click();
  await expect.poll(() => hintCommands.length).toBe(1);
  expect(hintCommands[0]).toMatchObject({
    sessionId: hintSessionId,
    text: "!hint",
  });
  expect(hintCommands[0]?.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
  await expect(hint).toHaveCount(0);
  hint = page.locator(".live-hint").filter({ hasText: "Compare the service cart route with the trophy case." });
  await expect(hint).toBeVisible();
  await expect(nextHint).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("mystery-next-hint-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nextHint).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("mystery-next-hint-mobile.png"),
    fullPage: true,
  });

  hintSnapshot.paused = true;
  hintSnapshot.revision = 3;
  await page.reload();
  await expect(hint).toBeVisible();
  await expect(nextHint).toBeDisabled();

  hintSnapshot.paused = false;
  hintSnapshot.availableActions = [];
  hintSnapshot.revision = 4;
  await page.reload();
  await expect(hint).toBeVisible();
  await expect(nextHint).toHaveCount(0);
});

async function practiceCommand(page: Page, text: string): Promise<void> {
  if (!await page.locator("#bc-command").isVisible()) await page.getByRole("button", { name: "Open command input", exact: true }).click();
  await page.locator("#bc-command").fill(text);
  await page.locator("#bc-command").press("Enter");
}

async function startPractice(page: Page, caseId: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(webOrigin + "/practice/" + caseId);
  await page
    .getByRole("button", { name: "Start the case", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Skip the intro", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Open command input", exact: true })).toBeEnabled();
}

async function practiceReport(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Show it all", exact: true }).click();
  await page
    .getByRole("button", { name: "See your report", exact: true })
    .click();
  await expect(page.locator(".bc-report")).toBeVisible();
}

test("uses an unobstructed practice viewport with optional chat and evidence inspection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startPractice(page, "express");
  await expect(page.locator('[data-workspace="game"]')).toBeVisible();
  await expect(page.getByRole("region", { name: "How to play this case", exact: true })).toContainText("Turn a card to begin");
  await page.getByText("How to play", { exact: true }).click();
  await expect(page.getByText("No typing is needed. Commands are optional.", { exact: true })).toBeVisible();
  await page.getByText("How to play", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1)).toBe(false);
  await expect(page.getByRole("dialog", { name: "Chat", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chat", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Chat", exact: true })).toHaveCount(0);
  await page.locator('.bc-card[data-card="DECK"]').click();
  await expect(page.getByRole("status", { name: "New discovery", exact: true })).toContainText("Magician");
  await expect(page.getByRole("status", { name: "New discovery", exact: true }).getByRole("button")).toHaveCount(0);
  await expect(page.locator(".evidence-dialog")).toHaveCount(0);
  await page.locator('.bc-card[data-card="CLASP"]').click();
  await expect(page.getByRole("status", { name: "New discovery", exact: true })).toContainText("Cut clasp");
  await page.locator('.bc-card[data-card="DECK"]').click();
  const evidence = page.getByRole("dialog", { name: /Magician.s deck/ });
  await expect(evidence).toBeVisible();
  await expect(evidence.getByText(/Fifty-two cards, all there/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(evidence).toHaveCount(0);
  await page.locator('.bc-card[data-card="TICKET"]').click();
  await page.locator('.bc-card[data-card="WATCH"]').click();
  await page.getByRole("button", { name: "Connect evidence", exact: true }).click();
  await expect(page.getByRole("status", { name: "Current board action", exact: true })).toContainText("Choose the first turned card");
  await page.locator('.bc-card[data-card="TICKET"]').click();
  await expect(page.locator('.bc-card[data-card="TICKET"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".evidence-dialog")).toHaveCount(0);
  await page.locator('.bc-card[data-card="WATCH"]').click();
  await expect(page.locator(".bc-proof")).toHaveAttribute("aria-label", "Proof 1 of 2");
  await expect(page.getByRole("button", { name: "Open theories", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open theories", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Theories", exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "New discovery", exact: true })).toBeHidden();
  await expect(page.getByLabel("Crew activity", { exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("animates both board scenes with Pixi and pauses their ticker with the game", async ({ page }, info) => {
  const rendererWarnings: string[] = [];
  page.on("pageerror", error => rendererWarnings.push(error.message));
  page.on("console", message => { if (message.type() === "warning" && message.text().includes("vector fallback")) rendererWarnings.push(message.text()); });
  for (const kind of ["express", "lighthouse"]) {
    await startPractice(page, kind);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const canvas = page.locator(".bc-scene-window canvas[data-pixi-scene]");
    await expect.poll(async () => ({ canvases: await canvas.count(), renderer: await page.locator(".bc-scene-window .board-scene").getAttribute("data-renderer"), warnings: rendererWarnings })).toEqual({ canvases: 1, renderer: "pixi", warnings: [] });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-pixi-scene", kind);
    const illustration = page.locator(".bc-scene-window");
    await expect(illustration).toHaveClass(/is-full/);
    expect(await illustration.evaluate(element => { const box = element.getBoundingClientRect(); return Math.abs(box.width / box.height - 10 / 3) < .04; })).toBe(true);
    await page.getByRole("button", { name: "Toggle full illustration", exact: true }).click();
    await expect(illustration).not.toHaveClass(/is-full/);
    await page.getByRole("button", { name: "Toggle full illustration", exact: true }).click();
    await expect(illustration).toHaveClass(/is-full/);
    await expect(canvas).toHaveAttribute("data-running", "true");
    const frame = await canvas.getAttribute("data-frame");
    await expect.poll(() => canvas.getAttribute("data-frame")).not.toBe(frame);
    await page.getByRole("button", { name: "Toggle fullscreen", exact: true }).click();
    await expect.poll(() => page.evaluate(() => { const box = document.fullscreenElement?.getBoundingClientRect(); return !!box && box.width === innerWidth && box.height === innerHeight; })).toBe(true);
    await page.getByRole("button", { name: "Toggle fullscreen", exact: true }).click();
    await page.screenshot({ path: info.outputPath(`${kind}-pixi-desktop.png`) });
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-running", "false");
    const stopped = await canvas.getAttribute("data-frame");
    await page.waitForTimeout(120);
    expect(await canvas.getAttribute("data-frame")).toBe(stopped);
    await page.locator(".bc-hud").getByRole("button", { name: "Resume", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-running", "true");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel("Case elapsed time", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Case score", { exact: true })).toBeVisible();
    const scrollArea = page.getByRole("region", { name: "Case scene and evidence", exact: true });
    await expect.poll(() => scrollArea.evaluate(el => el.scrollHeight > el.clientHeight + 10)).toBe(true);
    await page.locator(".bc-card").last().scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator(".bc-card").last().evaluate(el => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return box.top >= 0 && box.bottom <= innerHeight && !!hit && el.contains(hit);
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1)).toBe(false);
    await expect.poll(() => page.locator(".workspace-dock button").evaluateAll(buttons => buttons.flatMap(button => {
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return box.x >= 0 && box.right <= innerWidth && box.bottom <= innerHeight && box.height >= 44 && !!hit && button.contains(hit) ? [] : [{ label: button.textContent, box: [box.x, box.y, box.width, box.height], hit: hit?.tagName }];
    }))).toEqual([]);
    await page.screenshot({ path: info.outputPath(`${kind}-pixi-mobile.png`) });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(canvas).toHaveAttribute("data-running", "false");
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("completes Express practice and keeps full evidence readable on a phone", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await startPractice(page, "express");
  await practiceCommand(page, "!look DECK");
  const card = page.locator('.bc-card[data-card="DECK"]');
  await card.focus();
  await card.press("Enter");
  const detail = page.getByRole("dialog", { name: /Magician.s deck/ });
  await expect(detail).toBeVisible();
  expect(
    await detail
      .locator("p")
      .evaluate((el) => el.scrollHeight > el.clientHeight + 1),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("express-evidence-mobile.png"),
  });
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await practiceCommand(page, "!look TICKET");
  await practiceCommand(page, "!look WATCH");
  await practiceCommand(page, "!link TICKET WATCH");
  await practiceCommand(page, "!challenge CARRIAGE TICKET");
  await expect(page.locator(".bc-proof")).toHaveAttribute(
    "aria-label",
    "Proof 2 of 2",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await practiceCommand(page, "!solve MAGICIAN");
  await expect(page.locator(".bc-play")).toBeVisible();
  await practiceCommand(page, "!solve CONDUCTOR");
  await practiceReport(page);
  await page.screenshot({
    path: testInfo.outputPath("express-report-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.locator(".bc-card.is-up")).toHaveCount(0);
  await expect(page.locator(".bc-proof")).toHaveAttribute(
    "aria-label",
    "Proof 0 of 2",
  );
  await expect(page.locator(".bc-score .bc-stat-value")).toHaveText("0");
  expect(errors).toEqual([]);
});

test("keeps co-op trades on the scripted timeline and completes the shared proof", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startPractice(page, "lighthouse");
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await practiceCommand(page, "!look WICK");
  await practiceCommand(page, "!share WICK");
  await expect(
    page.locator('.bc-card[data-card="WICK"] .bc-sent'),
  ).toBeVisible();
  await expect(page.locator(".bc-score .bc-stat-value")).toHaveText("100");
  await expect(page.locator(".bc-requests")).toHaveCount(0);
  const tide = page.locator('.bc-card[data-card="TIDE"]');
  await expect(tide).not.toHaveClass(/is-up/);
  await expect(page.locator(".bc-feed")).toContainText(
    "Got it. That helps over here.",
  );
  await expect(tide).not.toHaveClass(/is-up/);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator("#bc-command")).toBeDisabled();
  await expect(page.locator(".bc-card").first()).toBeDisabled();
  await page
    .locator(".bc-paused")
    .getByRole("button", { name: "Resume", exact: true })
    .click();
  await expect(tide).toHaveClass(/is-up/, { timeout: 35_000 });
  await expect(page.locator(".bc-feed")).toContainText(
    "My chat turned up the tide table.",
  );
  await expect(page.locator(".bc-requests")).toHaveCount(0);
  await expect(page.locator(".bc-feed")).not.toContainText("quick hand-off");
  await practiceCommand(page, "!link WICK TIDE");
  await practiceCommand(page, "!ask BOAT");
  await practiceCommand(page, "!look LOG");
  await expect(page.locator(".bc-request")).toContainText("Keeper", {
    timeout: 35_000,
  });
  await practiceCommand(page, "!share LOG");
  await expect(page.locator(".bc-feed")).toContainText("quick hand-off");
  await expect(page.locator('.bc-card[data-card="RADIO"]')).toHaveClass(
    /is-up/,
    { timeout: 8_000 },
  );
  await practiceCommand(page, "!link LOG RADIO");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: testInfo.outputPath("lighthouse-board-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expect(page.locator('.bc-card[data-card="BOAT"]')).toHaveClass(
    /is-up/,
    { timeout: 25_000 },
  );
  await practiceCommand(page, "!challenge WARNING BOAT");
  await expect(page.locator(".bc-proof")).toHaveAttribute(
    "aria-label",
    "Proof 3 of 3",
  );
  await page.screenshot({
    path: testInfo.outputPath("lighthouse-proof-mobile.png"),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await practiceCommand(page, "!solve CAPTAIN");
  await practiceReport(page);
  await expect(page.locator(".bc-lines")).toContainText(
    "Requests answered for Station B (1)",
  );
  await expect(page.locator(".bc-lines")).toContainText("Quick hand-offs (1)");
  await page.screenshot({
    path: testInfo.outputPath("lighthouse-report-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
