import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server as SocketServer } from "socket.io";
import { afterAll, beforeAll, expect, test } from "@playwright/test";
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
let socketServer: SocketServer;
let viteServer: ViteDevServer | undefined;

beforeAll(async () => {
  httpServer = createServer((request, response) => {
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
      "session:join",
      (
        _payload: unknown,
        acknowledge?: (response: {
          ok: boolean;
          snapshot: typeof snapshot;
        }) => void,
      ) => {
        acknowledge?.({ ok: true, snapshot });
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
    httpServer.listen(10000, "127.0.0.1", resolve);
  });
  viteServer = await createViteServer({
    configFile: resolve("apps/web/vite.config.ts"),
    root: resolve("apps/web"),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
    },
  });
  await viteServer.listen();
});

afterAll(async () => {
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
  await viteServer?.close();
});

test("shows Twitch health in the live app and keeps it out of the OBS source", async ({
  page,
  context,
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`/?session=${sessionId}`);

  const status = page
    .getByRole("status")
    .filter({ hasText: "Twitch connected" });
  await expect(status).toBeVisible();
  await expect(page.getByText("The Gallery Shadow")).toBeVisible();

  const previewPage = await context.newPage();
  await previewPage.goto("/");
  await expect(previewPage.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    previewPage.getByRole("navigation", { name: "Site" }),
  ).toBeVisible();
  await expect(
    previewPage.getByRole("link", { name: "Case Menu", exact: true }),
  ).toBeVisible();

  await previewPage.goto("/guide");
  await expect(
    previewPage.getByRole("heading", { name: "Guide", exact: true }),
  ).toBeVisible();
  await expect(
    previewPage.getByText("!link <evidence-id> <evidence-id>", { exact: true }),
  ).toBeVisible();

  await previewPage.goto("/?view=mystery");
  await expect(
    previewPage.getByRole("heading", {
      name: "The Missing Festival Trophy",
    }),
  ).toBeVisible();
  await expect(previewPage.locator(".mystery-live-scene canvas")).toBeVisible();
  await expect(
    previewPage.getByRole("heading", { name: "Evidence on the board" }),
  ).toBeVisible();
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
  await previewPage.goto("/?view=quick");
  await expect(
    previewPage.getByRole("heading", { name: "A Missing Manuscript" }),
  ).toBeVisible();
  await expect(
    previewPage.getByText("No Twitch chat", { exact: true }),
  ).toBeVisible();
  await previewPage
    .getByRole("button", { name: "Link evidence", exact: true })
    .click();
  await previewPage
    .getByRole("button", { name: "The gardener", exact: true })
    .click();
  await expect(
    previewPage.getByText(/Sample verdict, not recorded:/),
  ).toBeVisible();

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
  await obsPage.goto(`/?mode=obs&session=${sessionId}#overlay=test-token`);
  await expect(
    obsPage.getByRole("status").filter({ hasText: "Twitch" }),
  ).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
