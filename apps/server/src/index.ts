import "dotenv/config";

import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { Pool } from "pg";
import { Server as SocketServer } from "socket.io";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { attachRealtime } from "./realtime.js";
import { createRoundStore } from "./rounds.js";

const app = Fastify({ logger: true });
const database = new Pool(
  process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {},
);
const sockets = new SocketServer(app.server, { path: "/socket.io" });
const devControls = process.env.CLUENITE_DEV_CONTROLS === "1";
attachRealtime(sockets, createRoundStore(), { devControls });
if (devControls) app.log.warn("CLUENITE_DEV_CONTROLS=1: session controls are open (dev only).");
// Resolved from this file, not from the working directory: src/ and dist/ sit at the same depth,
// and `npm --prefix apps/server` runs with apps/server as cwd.
const webRoot = resolve(fileURLToPath(new URL("../../web/dist", import.meta.url)));

app.get("/health/live", async () => ({ status: "ok" }));

app.get("/health/ready", async (_request, reply) => {
  try {
    await database.query("select 1");
    return { status: "ready" };
  } catch {
    return reply.code(503).send({ status: "not-ready" });
  }
});

if (existsSync(resolve(webRoot, "index.html"))) {
  await app.register(fastifyStatic, { root: webRoot, wildcard: false });
}

app.addHook("onClose", async () => {
  sockets.close();
  await database.end();
});

const port = Number(process.env.PORT ?? 10000);
await app.listen({ host: "0.0.0.0", port });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close();
  });
}
