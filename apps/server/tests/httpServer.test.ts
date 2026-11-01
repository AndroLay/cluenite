import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createIsolatedDatabase } from "./testDatabase.js";

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;
const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);

describeWithDatabase("built application HTTP runtime", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>> | undefined;
  let serverProcess: ChildProcess | undefined;
  let origin: string;

  beforeAll(async () => {
    if (!existsSync(resolve(projectRoot, "apps/web/dist/index.html"))) {
      throw new Error(
        "Run npm run build before the HTTP runtime integration test.",
      );
    }
    database = await createIsolatedDatabase();
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const address = reservation.address();
    if (!address || typeof address === "string")
      throw new Error("No test port.");
    const port = address.port;
    await new Promise<void>((done) => reservation.close(() => done()));
    origin = `http://127.0.0.1:${port}`;
    const databaseUrl = new URL(globalThis.process.env.DATABASE_URL!);
    databaseUrl.searchParams.set(
      "options",
      String(database.pool.options.options),
    );
    serverProcess = spawn(
      globalThis.process.execPath,
      [
        "--import",
        pathToFileURL(require.resolve("tsx")).href,
        resolve(projectRoot, "apps/server/src/index.ts"),
      ],
      {
        cwd: projectRoot,
        stdio: "ignore",
        env: {
          ...globalThis.process.env,
          NODE_ENV: "test",
          PORT: String(port),
          PUBLIC_ORIGIN: origin,
          DATABASE_URL: databaseUrl.href,
          SESSION_SIGNING_SECRET: randomBytes(32).toString("base64"),
          DATA_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
          OVERLAY_TOKEN_SIGNING_KEY: randomBytes(32).toString("base64"),
          TWITCH_CLIENT_ID: "",
          TWITCH_CLIENT_SECRET: "",
          TWITCH_REDIRECT_URI: "",
          TWITCH_ADAPTER: "simulation",
        },
      },
    );
    for (let attempt = 0; attempt < 100; attempt++) {
      if (serverProcess.exitCode !== null) {
        throw new Error(
          `Isolated HTTP fixture exited with code ${serverProcess.exitCode}.`,
        );
      }
      try {
        const response = await fetch(`${origin}/health/ready`, {
          signal: AbortSignal.timeout(300),
        });
        if (response.ok) return;
      } catch {
        // The owned child has not started listening yet.
      }
      await delay(100);
    }
    throw new Error("Isolated HTTP fixture did not become ready.");
  }, 30_000);

  afterAll(async () => {
    try {
      if (
        serverProcess &&
        serverProcess.exitCode === null &&
        serverProcess.signalCode === null
      ) {
        const exited = once(serverProcess, "exit");
        serverProcess.kill("SIGTERM");
        await exited;
        await expect(
          fetch(`${origin}/health/live`, {
            headers: { Connection: "close" },
            signal: AbortSignal.timeout(1_000),
          }),
          "The owned fixture must stop listening before its schema is dropped.",
        ).rejects.toThrow();
      }
    } finally {
      await database?.close();
    }
  }, 15_000);

  it("reports live database readiness without authenticating a host", async () => {
    const response = await fetch(`${origin}/health/ready`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
    expect((await fetch(`${origin}/api/me`)).status).toBe(401);
  });

  it("serves built English client pages at their deep links", async () => {
    for (const path of [
      "/",
      "/play",
      "/guide",
      "/settings",
      "/dashboard",
      "/setup",
      "/coop",
    ]) {
      const response = await fetch(`${origin}${path}`);
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toContain("text/html");
      expect(await response.text(), path).toContain('lang="en"');
    }
  });

  it("keeps missing API, health, and asset paths out of the SPA fallback", async () => {
    for (const path of [
      "/api",
      "/api/missing",
      "/health/missing",
      "/assets/missing.css",
    ]) {
      const response = await fetch(`${origin}${path}`);
      expect(response.status, path).toBe(404);
      expect(response.headers.get("content-type"), path).toContain(
        "application/json",
      );
    }
  });

  it("serves every stylesheet referenced by the current built application", async () => {
    const html = await (await fetch(origin)).text();
    const stylesheets = [...html.matchAll(/href="([^"]+\.css)"/g)].map(
      (match) => match[1]!,
    );
    expect(stylesheets.length).toBeGreaterThan(0);
    for (const stylesheet of stylesheets) {
      const response = await fetch(new URL(stylesheet, origin));
      expect(response.status, stylesheet).toBe(200);
      expect(response.headers.get("content-type"), stylesheet).toContain(
        "text/css",
      );
    }
  });
});
