import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server as SocketServer } from "../../apps/server/node_modules/socket.io/dist/index.js";
import { afterAll, beforeAll, expect, test, type Page } from "@playwright/test";
import type { CommandResult, RoundSnapshot, SessionControl, SubmitCommand, TeamRole } from "@cluenite/contracts";
import { AUTHORED_CASES, C01_HARBOR_SIGNAL, M01_MISSING_TROPHY, Q01_GALLERY_SHADOW } from "../../packages/cases/src/index.js";
import { applyCommand, createRound, restartRound, setPaused, toRoundSnapshot, type RoundState } from "../../packages/engine/src/index.js";
import { FIND_ITEMS } from "../../apps/web/src/sampleCase/manuscript.js";
import { createServer as createViteServer, type ViteDevServer } from "../../apps/web/node_modules/vite/dist/node/index.js";

// Owned loopback transport + the real authored engine. This does not emulate a real Twitch connection.
let http: ReturnType<typeof createServer>;
let sockets: SocketServer;
let vite: ViteDevServer;
let origin: string;
const rounds = new Map<string, { state: RoundState; phase: RoundSnapshot["phase"] }>();
const commands: SubmitCommand[] = [];
const controls: SessionControl[] = [];
const receipts = new Map<string, CommandResult>();
let engineTime = 0;

function reset(id: string, definition = Q01_GALLERY_SHADOW, phase: RoundSnapshot["phase"] = "ACTIVE"): void {
  rounds.set(id, { state: createRound(definition, { sessionId: id, source: "live" }), phase });
}
function projection(id: string, team: TeamRole = "A"): RoundSnapshot {
  const round = rounds.get(id)!;
  return { ...toRoundSnapshot(round.state, ++engineTime, round.state.def.mode === "coop" ? team : null, round.state.solvedBy ? "RESOLVED" : round.phase), chosenVerdictId: round.state.solvedBy };
}
function broadcast(id: string): void {
  for (const socket of sockets.sockets.sockets.values()) if (socket.data.session === id) socket.emit("session:snapshot", projection(id, socket.data.team));
}
function viewer(id: string, text: string, team: TeamRole): CommandResult {
  const round = rounds.get(id)!;
  const transition = applyCommand(round.state, text, ++engineTime, { actor: "twitch", team });
  round.state = transition.state;
  broadcast(id);
  return transition.result;
}

beforeAll(async () => {
  http = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/api/cases") {
      response.end(JSON.stringify({ cases: AUTHORED_CASES.map(item => ({ id: item.id, mode: item.mode, title: item.title, premise: item.premise, question: item.question, clues: item.clues.map(({ id, label, teaser }) => ({ id, label, teaser })), verdicts: item.verdicts.map(({ id, label }) => ({ id, label })) })) })); return;
    }
    if (request.url === "/api/me") { response.writeHead(401); response.end(JSON.stringify({ authenticated: false })); return; }
    const id = /^\/api\/sessions\/([^/]+)\/snapshot$/.exec(request.url ?? "")?.[1];
    if (id && rounds.has(id)) { response.end(JSON.stringify({ snapshot: projection(id, request.headers.cookie?.includes("fixture_team=B") ? "B" : "A") })); return; }
    response.writeHead(404); response.end("{}");
  });
  sockets = new SocketServer(http, { path: "/socket.io" });
  sockets.on("connection", socket => {
    socket.data.team = socket.handshake.headers.cookie?.includes("fixture_team=B") ? "B" : "A";
    socket.on("session:join", (payload: { sessionId: string }, ack: (body: unknown) => void) => {
      if (!rounds.has(payload.sessionId)) { ack({ ok: false, code: "SESSION_NOT_FOUND" }); return; }
      socket.data.session = payload.sessionId;
      ack({ ok: true, snapshot: projection(payload.sessionId, socket.data.team) });
      socket.emit("connection:status", { provider: "twitch", state: "ONLINE", since: "2026-11-02T00:00:00.000Z" });
    });
    socket.on("session:command", (payload: SubmitCommand, ack: (result: CommandResult) => void) => {
      commands.push(payload);
      const duplicate = receipts.get(payload.idempotencyKey);
      if (duplicate) { ack(duplicate); return; }
      const round = rounds.get(payload.sessionId)!;
      const transition = applyCommand(round.state, payload.text, ++engineTime, { actor: "host", team: socket.data.team });
      round.state = transition.state;
      receipts.set(payload.idempotencyKey, transition.result);
      ack(transition.result);
      broadcast(payload.sessionId);
    });
    socket.on("session:control", (payload: SessionControl, ack: (result: CommandResult) => void) => {
      controls.push(payload);
      const round = rounds.get(payload.sessionId)!;
      if (payload.action === "pause" || payload.action === "resume") round.state = setPaused(round.state, payload.action === "pause", ++engineTime);
      else if (payload.action === "restart") round.state = restartRound(round.state);
      else round.state = { ...round.state, revision: round.state.revision + 1 };
      round.phase = payload.action === "pause" ? "PAUSED" : "ACTIVE";
      ack({ code: "ACCEPTED_NEW", reason: null, message: `Round ${payload.action} accepted.`, missing: [], revision: round.state.revision });
      broadcast(payload.sessionId);
    });
  });
  await new Promise<void>(done => http.listen(0, "127.0.0.1", done));
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("No fixture address");
  const api = `http://127.0.0.1:${address.port}`;
  vite = await createViteServer({ root: resolve("apps/web"), configFile: resolve("apps/web/vite.config.ts"), logLevel: "error", server: { host: "127.0.0.1", port: 5173, strictPort: false, proxy: { "/api": api, "/socket.io": { target: api, ws: true } } } });
  await vite.listen();
  const web = vite.httpServer?.address();
  if (!web || typeof web === "string") throw new Error("No web fixture address");
  origin = `http://127.0.0.1:${web.port}`;
});
afterAll(async () => {
  await vite?.close();
  sockets?.disconnectSockets(true);
  await new Promise<void>(done => sockets?.close(() => done()));
  http?.closeAllConnections();
});

async function fits(page: Page): Promise<void> {
  // Chrome can report the new viewport before dvh styles settle after rotation or resizing.
  await expect.poll(() => page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth + 1, y: document.documentElement.scrollHeight > innerHeight + 1 }))).toEqual({ x: false, y: false });
}
async function inspect(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: `Examine ${label}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: label, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Inspect this clue", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status", { name: "New discovery", exact: true }).getByRole("heading", { name: label, exact: true })).toBeVisible();
}
async function chooseVerdict(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: "Verdict", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(label, "i") }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit verdict", exact: true }).click();
}
async function fullscreenFits(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Toggle fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const box = document.fullscreenElement?.getBoundingClientRect();
    return !!box && Math.abs(box.x) <= 1 && Math.abs(box.y) <= 1 && Math.abs(box.width - innerWidth) <= 1 && Math.abs(box.height - innerHeight) <= 1;
  })).toBe(true);
  await page.getByRole("button", { name: "Toggle fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
}

test("starts connected cases from the scene and guides a co-op host through the lobby", async ({ page }) => {
  await page.route("**/api/me", route => route.fulfill({ json: { authenticated: true, profile: { login: "fixture_host", displayName: "Fixture Host" }, twitch: { connected: true, chatStatus: "connected" }, csrfToken: "fixture-csrf" } }));
  let rows: { sessionId: string; caseId: string; title: string; phase: string; revision: number; team: string; role: string; needsRejoin: boolean; updatedAt: string }[] = [];
  await page.route(/\/api\/sessions(?:\?.*)?$/, async route => {
    if (route.request().method() !== "POST") { await route.fulfill({ json: { sessions: rows } }); return; }
    const definition = AUTHORED_CASES.find(item => item.id === route.request().postDataJSON().caseId)!;
    const id = `connected-${definition.mode}`;
    const phase = definition.mode === "coop" ? "COOP_WAITING" : "READY";
    reset(id, definition, phase);
    rows = [{ sessionId: id, caseId: definition.id, title: definition.title, phase, revision: 1, team: "A", role: "host", needsRejoin: false, updatedAt: "2026-11-03T00:00:00Z" }];
    await route.fulfill({ json: { snapshot: projection(id) } });
  });
  for (const [mode, definition] of [["Quick Case", Q01_GALLERY_SHADOW], ["Mystery Live", M01_MISSING_TROPHY]] as const) {
    rows = [];
    await page.goto(`${origin}/play`);
    await page.getByRole("group", { name: "Case mode" }).getByRole("button", { name: new RegExp(mode) }).click();
    await page.getByRole("button", { name: "Start case", exact: true }).click();
    await expect(page.getByRole("heading", { name: definition.title, exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Host controls", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Start round", exact: true }).click();
    await expect(page.locator("canvas[data-pixi-scene]")).toHaveAttribute("data-running", "true");
  }
  rows = [];
  await page.goto(`${origin}/play`);
  await page.getByRole("group", { name: "Case mode" }).getByRole("button", { name: /^Co-op/ }).click();
  await page.locator(".pl-card").getByRole("link", { name: "Create a co-op lobby", exact: true }).click();
  await page.getByRole("button", { name: "Create co-op lobby", exact: true }).click();
  await page.getByLabel("Partner's Twitch username", { exact: true }).fill("fixture_partner");
  await page.route("**/api/coops/invitations", route => route.fulfill({ json: { url: `${origin}/coop/invite#fixture-only`, expiresAt: "2026-11-04T00:00:00Z", invitee: { login: "fixture_partner" } } }));
  await page.getByRole("button", { name: "Create invitation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy invitation", exact: true })).toBeVisible();
  await expect(page.locator(".live-lobby")).toContainText("Cluenite does not send it automatically");
  rounds.get("connected-coop")!.phase = "READY";
  rows[0]!.phase = "READY";
  await page.locator(".live-lobby").getByRole("button", { name: "Refresh sessions", exact: true }).click();
  await page.getByRole("link", { name: "Open co-op host controls", exact: true }).click();
  await page.getByRole("dialog", { name: "Host controls", exact: true }).getByRole("button", { name: "Start", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator('canvas[data-pixi-scene="signal"]')).toHaveAttribute("data-running", "true");
});

test("opens the host controls requested by the dashboard link", async ({ page }) => {
  const id = "requested-host-controls";
  reset(id, Q01_GALLERY_SHADOW, "READY");
  await page.goto(`${origin}/?session=${id}&view=dashboard`);
  const panel = page.getByRole("dialog", { name: "Host controls", exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
});

test("does not offer restart for a cancelled session", async ({ page }) => {
  const id = "finished-session-controls";
  reset(id, Q01_GALLERY_SHADOW, "CANCELLED");
  await page.goto(`${origin}/?session=${id}`);
  await page.getByRole("button", { name: "Host controls", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Host controls", exact: true }).getByRole("button", { name: "Restart", exact: true })).toBeDisabled();
});

test("keeps partner session tools without offering owner commands", async ({ page, context }) => {
  const id = "partner-session-tools";
  reset(id, C01_HARBOR_SIGNAL);
  await context.addCookies([{ name: "fixture_team", value: "B", url: origin }]);
  await page.goto(`${origin}/?session=${id}`);
  await page.getByRole("button", { name: "Session tools", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Session tools", exact: true });
  await expect(panel.getByRole("textbox", { name: "Command", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("group", { name: "Round controls", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("heading", { name: "OBS overlay", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Examine ${C01_HARBOR_SIGNAL.clues.find(clue => clue.team === "B")!.label}`, exact: true }).click();
  await expect(page.getByRole("button", { name: "Inspect this clue", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Request a hint", exact: true })).toBeDisabled();
  expect(commands.filter(command => command.sessionId === id)).toEqual([]);
});

test("clears local timeline drafts after another tab restarts the same session", async ({ page }) => {
  const id = "same-session-restart";
  reset(id, M01_MISSING_TROPHY);
  await page.goto(`${origin}/?session=${id}`);
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  const initial = await page.locator(".live-timeline li code").allTextContents();
  await page.locator(".live-timeline li").nth(1).getByRole("button", { name: /earlier$/ }).click();
  expect(await page.locator(".live-timeline li code").allTextContents()).not.toEqual(initial);
  // Pause/resume and ordinary snapshots preserve an unfinished local draft.
  const round = rounds.get(id)!;
  round.state = setPaused(round.state, true, ++engineTime);
  round.phase = "PAUSED";
  broadcast(id);
  await expect(page.getByText("Round paused. Your findings are saved.", { exact: false })).toBeVisible();
  expect(await page.locator(".live-timeline li code").allTextContents()).not.toEqual(initial);
  round.state = setPaused(round.state, false, ++engineTime);
  round.phase = "ACTIVE";
  broadcast(id);
  await expect(page.locator(".live-phase-notice")).toHaveCount(0);
  await expect(page.locator(".live-timeline")).toBeVisible();
  expect(await page.locator(".live-timeline li code").allTextContents()).not.toEqual(initial);
  await page.getByRole("button", { name: "Scene", exact: true }).click();
  await inspect(page, M01_MISSING_TROPHY.clues[0]!.label);
  round.state = restartRound(round.state);
  round.phase = "ACTIVE";
  broadcast(id);
  await expect(page.locator(".investigation-scene")).toBeVisible();
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.locator(".live-timeline li code")).toHaveText(initial);
});

test("clears an idle paused round draft after the owner's confirmed restart", async ({ page }) => {
  const id = "idle-owner-restart";
  reset(id, M01_MISSING_TROPHY);
  page.on("dialog", dialog => dialog.accept());
  await page.goto(`${origin}/?session=${id}`);
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  const initial = await page.locator(".live-timeline li code").allTextContents();
  await page.locator(".live-timeline li").nth(1).getByRole("button", { name: /earlier$/ }).click();
  await page.getByRole("button", { name: "Host controls", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.locator(".investigation-scene")).toBeVisible();
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.locator(".live-timeline li code")).toHaveText(initial);
});

test("distinguishes a declined authorization attempt from an existing connection", async ({ page }) => {
  await page.route("**/api/me", route => route.fulfill({ json: { authenticated: true, profile: { login: "fixture_host", displayName: "Fixture Host" }, twitch: { connected: true, chatStatus: "connected" }, csrfToken: "fixture-csrf" } }));
  await page.goto(`${origin}/connect?result=denied`);
  await expect(page.locator(".cx-facts").getByText("Fixture Host", { exact: true })).toBeVisible();
  await expect(page.locator(".cx-link")).toHaveAttribute("data-state", "on");
  await expect(page.getByText("Nothing was connected.", { exact: false })).toHaveCount(0);
});

test("clears an invitation when logout is requested even if its response is lost", async ({ page }) => {
  await page.route("**/api/me", route => route.fulfill({ json: { authenticated: true, profile: { login: "fixture_host", displayName: "Fixture Host" }, twitch: { connected: true, chatStatus: "connected" }, csrfToken: "fixture-csrf" } }));
  await page.route("**/api/auth/logout", route => route.abort("failed"));
  await page.addInitScript(() => sessionStorage.setItem("cluenite.pending-invite.v1", JSON.stringify({ id: "bd14af67-6417-4734-9e39-3fb5d931ce74", token: "x".repeat(43), savedAt: Date.now() })));
  await page.goto(`${origin}/connect`);
  await page.getByRole("button", { name: "Sign out of this browser", exact: true }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("cluenite.pending-invite.v1"))).toBeNull();
  await expect(page.getByRole("link", { name: "Continue co-op invitation", exact: true })).toHaveCount(0);
});

test("runs distinct Pixi environments and freezes rendering when paused or motion is reduced", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const definition of [Q01_GALLERY_SHADOW, M01_MISSING_TROPHY, C01_HARBOR_SIGNAL]) {
    const id = `pixi-${definition.id}`;
    reset(id, definition);
    await page.goto(`${origin}/?session=${id}`);
    const canvas = page.locator(".investigation-content canvas[data-pixi-scene]");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-running", "true");
    const frame = await canvas.getAttribute("data-frame");
    await expect.poll(() => canvas.getAttribute("data-frame")).not.toBe(frame);
    await fullscreenFits(page);
    await page.screenshot({ path: info.outputPath(`${definition.id}-pixi-desktop.png`) });
    await page.getByRole("button", { name: "Host controls", exact: true }).click();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-running", "false");
    const stopped = await canvas.getAttribute("data-frame");
    await page.waitForTimeout(120);
    expect(await canvas.getAttribute("data-frame")).toBe(stopped);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(canvas).toHaveAttribute("data-running", "true");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel("Case elapsed time", { exact: true })).toBeVisible();
    await fits(page);
    expect(await page.locator(".scene-hotspot").evaluateAll(elements => elements.flatMap(element => {
      const box = element.getBoundingClientRect(); const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return !hit || !element.contains(hit) ? [element.getAttribute("aria-label")] : [];
    }))).toEqual([]);
    await page.screenshot({ path: info.outputPath(`${definition.id}-pixi-mobile.png`) });
    await page.setViewportSize({ width: 844, height: 390 });
    await fits(page);
    expect(await page.locator(".scene-hotspot").evaluateAll(elements => elements.flatMap(element => { const box = element.getBoundingClientRect(); const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return !hit || !element.contains(hit) ? [element.getAttribute("aria-label")] : []; }))).toEqual([]);
    await page.screenshot({ path: info.outputPath(`${definition.id}-pixi-landscape.png`) });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(canvas).toHaveAttribute("data-running", "false");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("dismisses a discovery automatically and preserves clue controls without WebGL", async ({ page }) => {
  const id = "no-webgl-discovery";
  reset(id, Q01_GALLERY_SHADOW);
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      if (String(args[0]).startsWith("webgl")) return null;
      return getContext.apply(this, args as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.clock.install();
  await page.goto(`${origin}/?session=${id}`);
  await expect(page.locator(".case-atmosphere img")).toBeVisible();
  await inspect(page, Q01_GALLERY_SHADOW.clues[0]!.label);
  const notice = page.getByRole("status", { name: "New discovery", exact: true });
  expect(await notice.evaluate(element => element.getBoundingClientRect().left)).toBeLessThan(30);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.clock.fastForward(7500);
  await expect(notice).toHaveCount(0);
  await page.getByRole("button", { name: `Examine ${Q01_GALLERY_SHADOW.clues[1]!.label}`, exact: true }).click();
  await expect(page.getByRole("button", { name: "Inspect this clue", exact: true })).toBeEnabled();
});

test("investigates Q01 through accepted server proof, pause, and reveal", async ({ page }, info) => {
  const id = "immersive-q01";
  reset(id, Q01_GALLERY_SHADOW, "READY");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/?session=${id}`);
  await page.getByRole("button", { name: "Start round", exact: true }).click();
  await expect.poll(() => controls.some(control => control.sessionId === id && control.action === "start")).toBe(true);
  await expect(page.getByText("The case is ready.", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Verdict", exact: true }).click();
  await expect(page.getByRole("button", { name: /The cleaning robot R-07/i })).toBeDisabled();
  expect(rounds.get(id)!.state.solvedBy).toBeNull();
  await expect(page.locator(".is-revealed")).toHaveCount(0);
  await page.getByRole("button", { name: "Scene", exact: true }).click();
  for (const clue of Q01_GALLERY_SHADOW.clues) await inspect(page, clue.label);
  await page.getByRole("button", { name: "Host controls", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Request a hint", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Host controls", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Evidence/ }).click();
  await page.getByRole("article").filter({ hasText: "CAM_R07" }).getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("article").filter({ hasText: "SCHEDULE_R07" }).getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("button", { name: "Test connection (2/2)", exact: true }).click();
  await expect.poll(() => rounds.get(id)!.state.recorded.length).toBe(1);
  await fits(page);
  await page.screenshot({ path: info.outputPath("gallery-board-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await fits(page);
  await chooseVerdict(page, "Robot");
  await expect(page.locator(".live-reveal-copy")).toContainText("Verified:");
  await expect(page.locator(".is-revealed h2")).toHaveText(Q01_GALLERY_SHADOW.verdicts[0]!.label);
  await page.screenshot({ path: info.outputPath("gallery-reveal-mobile.png") });
  expect(commands.filter(command => command.sessionId === id).every(command => /^[A-Za-z0-9_-]{16,128}$/.test(command.idempotencyKey))).toBe(true);
  expect(errors).toEqual([]);
});

test("reconstructs M01 with real timeline validation and theory challenge", async ({ page }, info) => {
  const id = "immersive-m01";
  reset(id, M01_MISSING_TROPHY);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/?session=${id}`);
  await expect(page.getByRole("heading", { name: M01_MISSING_TROPHY.title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Request a hint", exact: true }).click();
  await expect(page.locator(".live-hint strong")).toHaveText("Hint 1");
  await page.getByRole("button", { name: "Request a hint", exact: true }).click();
  await expect(page.locator(".live-hint strong")).toHaveText("Hint 2");
  for (const clue of M01_MISSING_TROPHY.clues) await inspect(page, clue.label);
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await page.getByRole("button", { name: "Check timeline", exact: true }).click();
  await expect(page.locator(".live-feedback")).toContainText("That event order is not supported by the evidence.");
  expect(rounds.get(id)!.state.completedSequences.size).toBe(0);
  const expected = ["HEAT", "ORDER", "OPEN", "TROLLEY", "BLACKOUT"];
  for (let target = 0; target < expected.length; target++) {
    let labels = await page.locator(".live-timeline li code").allTextContents();
    while (labels.indexOf(expected[target]!) > target) {
      const index = labels.indexOf(expected[target]!);
      await page.locator(".live-timeline li").nth(index).getByRole("button", { name: /earlier$/ }).click();
      labels = await page.locator(".live-timeline li code").allTextContents();
    }
  }
  await page.getByRole("button", { name: "Check timeline", exact: true }).click();
  await expect(page.locator(".verified-state")).toContainText("Verified");
  await page.screenshot({ path: info.outputPath("festival-timeline-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Theories", exact: true }).click();
  await page.getByRole("button", { name: "Propose this theory", exact: true }).click();
  await page.getByLabel("Challenge with a record", { exact: true }).selectOption("ACCESS_RECORD");
  await page.getByRole("button", { name: "Test the theory", exact: true }).click();
  await expect(page.locator(".theory-card")).toContainText("contradicted");
  await fits(page);
  await chooseVerdict(page, "safety");
  await expect(page.locator(".live-reveal-copy")).toContainText("cold storage B4");
  await page.screenshot({ path: info.outputPath("festival-reveal-mobile.png") });
});

test("keeps C01 team projections private and requires both viewer stations", async ({ page, browser }, info) => {
  const id = "immersive-c01";
  reset(id, C01_HARBOR_SIGNAL);
  const partnerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await partnerContext.addCookies([{ name: "fixture_team", value: "B", url: origin }]);
  const partner = await partnerContext.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/?session=${id}`);
  await partner.goto(`${origin}/?session=${id}`);
  await expect(page.getByText("Co-op · Field station", { exact: false })).toBeVisible();
  await partner.getByRole("button", { name: "Briefing", exact: true }).click();
  await expect(partner.getByRole("dialog", { name: "Case briefing", exact: true })).toContainText("Records station");
  await partner.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Examine Harbor radar/ })).toHaveCount(0);
  await expect(partner.getByRole("button", { name: /Examine Coastline/ })).toHaveCount(0);
  await inspect(page, C01_HARBOR_SIGNAL.clues[0]!.label);
  await expect(page.getByRole("button", { name: /^Scan|^Verify|^Share / })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("signal-scene-desktop.png") });
  expect(viewer(id, "!scan P4", "A").code).toBe("ACCEPTED_NEW");
  await partner.getByRole("button", { name: /^Evidence/ }).click();
  await expect(partner.locator(".live-records")).toHaveCount(0);
  expect(viewer(id, "!share SCAN_P4", "A").code).toBe("ACCEPTED_NEW");
  await expect(partner.locator(".live-records")).toContainText("SCAN_P4");
  await page.getByRole("button", { name: "Verdict", exact: true }).click();
  await expect(page.getByRole("button", { name: /Beacon B-17/ })).toBeDisabled();
  expect(rounds.get(id)!.state.solvedBy).toBeNull();
  expect(viewer(id, "!verify B17", "B").code).toBe("ACCEPTED_NEW");
  await page.getByRole("button", { name: /^Evidence/ }).click();
  await expect(page.locator(".live-records")).not.toContainText("MANUAL_B17_212");
  expect(viewer(id, "!share MANUAL_B17_212", "B").code).toBe("ACCEPTED_NEW");
  await expect(page.locator(".live-records")).toContainText("JOINT_PROOF_B17");
  await expect(partner.locator(".live-records")).toContainText("JOINT_PROOF_B17");
  await fits(partner);
  expect(await partner.locator(".workspace-header").evaluate(element => element.getBoundingClientRect().height)).toBeLessThanOrEqual(150);
  expect(await partner.evaluate(() => document.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
  await partner.screenshot({ path: info.outputPath("signal-shared-mobile.png") });
  await chooseVerdict(page, "Beacon B-17");
  await expect(page.locator(".live-reveal-copy")).toContainText("Verified:");
  await expect(partner.locator(".live-reveal-copy")).toContainText("Verified:");
  await partnerContext.close();
});

test("previews each case without sending commands or exposing observations", async ({ page }) => {
  const before = commands.length;
  for (const [route, definition] of [["gallery", Q01_GALLERY_SHADOW], ["festival", M01_MISSING_TROPHY], ["signal", C01_HARBOR_SIGNAL]] as const) {
    await page.goto(`${origin}/preview/${route}`);
    await expect(page.getByRole("heading", { name: definition.title, exact: true })).toBeVisible();
    await expect(page.getByText("Visual preview · no live session", { exact: true })).toBeVisible();
    await expect(page.locator(".station-instructions")).toHaveCount(0);
    await page.getByRole("button", { name: `Examine ${definition.clues[0]!.label}`, exact: true }).click();
    await expect(page.getByRole("dialog")).not.toContainText(definition.clues[0]!.observation);
    await expect(page.getByRole("button", { name: "Inspect this clue", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await fits(page);
  }
  expect(commands.length).toBe(before);
});

test("offers the existing hosted session instead of creating a different case", async ({ page }) => {
  let mutations = 0;
  await page.route("**/api/me", route => route.fulfill({ json: { authenticated: true, profile: { login: "fixture_host", displayName: "Fixture Host" }, twitch: { connected: true, chatStatus: "connected" }, csrfToken: "fixture-csrf" } }));
  await page.route("**/api/sessions?**", route => route.fulfill({ json: { sessions: [{ sessionId: "existing-festival", caseId: M01_MISSING_TROPHY.id, title: M01_MISSING_TROPHY.title, phase: "PAUSED", revision: 4, team: "A", role: "host", needsRejoin: false, updatedAt: "2026-11-03T00:00:00.000Z" }] } }));
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/api/")) mutations++; });
  await page.goto(`${origin}/play`);
  await expect(page.getByRole("region", { name: "Saved sessions", exact: true }).getByText(M01_MISSING_TROPHY.title, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start case", exact: true }).click();
  const notice = page.getByRole("alert");
  await expect(notice).toContainText(`${M01_MISSING_TROPHY.title} is still paused`);
  await expect(notice.getByRole("link", { name: `Continue ${M01_MISSING_TROPHY.title}`, exact: true })).toHaveAttribute("href", "/?session=existing-festival&view=dashboard");
  expect(mutations).toBe(0);
});

test("searches all Manuscript objects and moves into the deduction workspace", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${origin}/?view=quick`);
  await fits(page);
  await page.screenshot({ path: info.outputPath("manuscript-cover-desktop.png") });
  await page.getByRole("button", { name: "Skip the intro", exact: true }).click();
  await expect(page.locator(".sc-canvas canvas")).toBeVisible();
  await expect(page.locator(".sc-canvas canvas")).toHaveCount(1);
  await fullscreenFits(page);
  expect(await page.locator(".sc-canvas canvas").evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(300);
  await fits(page);
  await expect(page.locator(".sc-desk")).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Objects to find", exact: true })).toHaveCount(0);
  const stageHeight = await page.locator(".sc-stage-box").evaluate(element => element.getBoundingClientRect().height);
  expect(stageHeight).toBeGreaterThan(884);
  expect(await page.locator(".workspace-dock").evaluate(element => element.getBoundingClientRect().height)).toBeLessThanOrEqual(76);
  await expect(page.locator("#sc-command-input")).toBeHidden();
  await page.getByRole("button", { name: "Open command input", exact: true }).click();
  await expect(page.locator("#sc-command-input")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open command input", exact: true })).toBeFocused();
  await expect(page.locator("#sc-command-input")).toBeHidden();
  await page.getByRole("button", { name: "Case options", exact: true }).click();
  await expect(page.getByRole("button", { name: "Toggle sound", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Restart case", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Case options", exact: true })).toBeFocused();
  await page.keyboard.press("/");
  await expect(page.locator("#sc-command-input")).toBeFocused();
  await expect(page.locator("#sc-command-input")).toHaveValue("");
  await page.locator("#sc-command-input").fill("!");
  await page.keyboard.press("/");
  await expect(page.locator("#sc-command-input")).toHaveValue("!/");
  await page.locator("#sc-command-input").fill("");
  await page.keyboard.press("Escape");
  const roomWidth = await page.locator(".sc-stage-box").evaluate(element => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  expect(await page.locator(".sc-stage-box").evaluate(element => element.getBoundingClientRect().width)).toBe(roomWidth);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Room", exact: true })).toBeFocused();
  await page.screenshot({ path: info.outputPath("manuscript-room-desktop.png") });
  await page.getByRole("button", { name: "Objects to find", exact: true }).click();
  expect(await page.locator(".sc-stage-box").evaluate(element => element.getBoundingClientRect().width)).toBe(roomWidth);
  await page.getByRole("button", { name: "Open command input", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Objects to find", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Assist", exact: true }).click();
  for (const item of FIND_ITEMS) {
    await page.getByRole("button", { name: `Find ${item.label}`, exact: true }).click();
    await expect(page.getByRole("status", { name: "New discovery", exact: true })).toContainText(item.label);
    if (item === FIND_ITEMS[0]) {
      await expect(page.locator("dialog.evidence-dialog")).toHaveCount(0);
      await page.getByRole("button", { name: `Inspect ${item.label}`, exact: true }).click();
      const discovery = page.getByRole("dialog", { name: item.label, exact: true });
      await expect(discovery).toBeVisible();
      const image = await discovery.locator("img").boundingBox();
      const frame = await page.locator(".evidence-dialog-art").boundingBox();
      expect(image && frame && image.y >= frame.y && image.y + image.height <= frame.y + frame.height + 1).toBe(true);
      await page.screenshot({ path: info.outputPath("manuscript-discovery-desktop.png") });
      await page.keyboard.press("Escape");
    }
  }
  await expect(page.getByRole("heading", { name: "Reconstruct the evening", exact: true })).toBeVisible();
  await expect(page.locator("#sc-tab-board")).toBeFocused();
  await page.screenshot({ path: info.outputPath("manuscript-board-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await fits(page);
  await page.screenshot({ path: info.outputPath("manuscript-board-mobile.png") });
  await page.getByRole("button", { name: "Room", exact: true }).click();
  await expect(page.locator(".sc-canvas canvas")).toBeVisible();
  await fits(page);
  await page.screenshot({ path: info.outputPath("manuscript-room-mobile.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await fits(page);
  const landscapeRoom = await page.locator(".sc-stage-box").boundingBox();
  expect(landscapeRoom?.x).toBe(0);
  expect(landscapeRoom?.width).toBe(844);
  expect(landscapeRoom?.height).toBe(390);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Case file", exact: true }).click();
  await page.getByRole("tab", { name: /^Board/ }).click();
  await page.getByRole("button", { name: "Open command input", exact: true }).click();
  for (const text of ["!link KEY_OUT CLOCK_STOP", "!order ROUND PEN DINNER KEY LIFT ALARM", "!challenge LOCKED KEY_OUT", "!solve CLERK"]) {
    await page.locator("#sc-command-input").fill(text);
    await page.locator("#sc-command-input").press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Case report", exact: true })).toBeVisible();
  await fits(page);
  await expect(page.locator(".sc-report")).toContainText("Timeline restored");
  expect(errors).toEqual([]);
});
