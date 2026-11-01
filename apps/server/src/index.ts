import { config as loadDotEnv } from "dotenv";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { Pool } from "pg";
import { Server as SocketServer } from "socket.io";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { parseServerConfig } from "./config.js";
import {
  attachRealtime,
  CONNECTION_STATUS_EVENT,
  hostPrincipalRoom,
  overlayPrincipalRoom,
  startOutboxPublisher,
} from "./realtime.js";
import { migrate } from "./db/migrate.js";
import { PostgresRoundRepository } from "./db/roundRepository.js";
import { SessionStore } from "./auth/sessionStore.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { TwitchApi } from "./twitch/twitchApi.js";
import { TwitchConnectionManager } from "./twitch/connectionManager.js";
import { EventSubLeader } from "./ops/eventSubLeader.js";

// The root .env is found from this file, not from the working directory. `npm --prefix apps/server`
// runs with apps/server as cwd, so a bare `dotenv/config` import would miss DATABASE_URL.
loadDotEnv({
  path: resolve(fileURLToPath(new URL("../../../.env", import.meta.url))),
});

const config = parseServerConfig(process.env);
const app = Fastify({
  logger: {
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.url",
        "req.query",
        "res.headers.set-cookie",
      ],
      censor: "[REDACTED]",
    },
  },
});
const database = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  query_timeout: 15_000,
});
const rounds = new PostgresRoundRepository(database);
const sockets = new SocketServer(app.server, { path: "/socket.io" });
const authConfigured = Boolean(
  config.sessionHashKey && config.dataEncryptionKey && config.overlayHashKey,
);
const sessions = authConfigured
  ? new SessionStore(
      database,
      config.sessionHashKey!,
      config.dataEncryptionKey!,
      config.overlayHashKey!,
    )
  : null;
const twitchApi =
  config.twitch && config.twitchAdapter === "twitch"
    ? new TwitchApi(config.twitch)
    : null;
let eventsubLeader: EventSubLeader | null = null;
let twitchConnections: TwitchConnectionManager | null = null;
const handleAccountRevoked = async (userId: string): Promise<void> => {
  sockets.in(hostPrincipalRoom(userId)).disconnectSockets(true);
  const sessionIds =
    (await sessions?.listSessionIdsForParticipant(userId)) ?? [];
  for (const sessionId of sessionIds) {
    sockets.in(overlayPrincipalRoom(sessionId)).disconnectSockets(true);
  }
  await rounds.pauseActiveSessionsForHost(userId);
};

if (sessions && twitchApi) {
  twitchConnections = new TwitchConnectionManager(
    twitchApi,
    sessions,
    rounds,
    undefined,
    Date.now,
    handleAccountRevoked,
    () => eventsubLeader?.identity() ?? null,
    (userId, status) => {
      sockets
        .in(hostPrincipalRoom(userId))
        .emit(CONNECTION_STATUS_EVENT, status);
      void sessions
        .listSessionIdsForParticipant(userId)
        .then((sessionIds) => {
          for (const sessionId of sessionIds)
            sockets
              .in(overlayPrincipalRoom(sessionId))
              .emit(CONNECTION_STATUS_EVENT, status);
        })
        .catch(() => undefined);
    },
  );
}
if (twitchConnections) {
  eventsubLeader = new EventSubLeader(database, {
    onAcquired: () => twitchConnections.startAll(),
    onLost: () => twitchConnections.stopAll(),
    reconcile: () => twitchConnections.startAll(),
  });
}

await migrate(database);
app.log.info("Database migrations are current.");

const realtime = attachRealtime(sockets, {
  config,
  sessions,
  rounds,
  connectionStatusForSession: async (sessionId, principal) => {
    const twitchUserId =
      principal.role === "host"
        ? principal.twitchUserId
        : await rounds.hostTwitchUserIdForSession(sessionId);
    return twitchUserId
      ? (twitchConnections?.connectionStatusForUser(twitchUserId) ?? {
          provider: "twitch",
          state: "OFFLINE",
          since: null,
        })
      : null;
  },
});
const outboxPublisher = startOutboxPublisher(sockets, rounds, app.log);

if (sessions) {
  registerAuthRoutes({
    app,
    config,
    sessions,
    rounds,
    twitchApi,
    onAccountAuthorized: (userId) => twitchConnections?.startUser(userId),
    onTwitchDisconnected: async (userId) => {
      await handleAccountRevoked(userId);
      await twitchConnections?.stopUser(userId);
    },
    onHostLogout: async (userId) => {
      sockets.in(hostPrincipalRoom(userId)).disconnectSockets(true);
      await twitchConnections?.handleHostLogout(userId);
    },
    onOverlayCredentialRotated: (sessionId) => {
      sockets.in(overlayPrincipalRoom(sessionId)).disconnectSockets(true);
    },
    connectionStatus: (userId) =>
      twitchConnections?.statusForUser(userId) ?? "not_configured",
    connectionDiagnostics: (userId) =>
      twitchConnections?.diagnosticsForUser(userId) ?? {
        status: "not_configured",
        activeSubscriptions: 0,
        lastNotificationAt: null,
      },
  });
} else {
  const unavailable = async (
    _request: unknown,
    reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  ) => reply.code(503).send({ error: "authentication_not_configured" });
  app.get("/api/auth/twitch/start", unavailable);
  app.get("/api/auth/twitch/callback", unavailable);
  app.get("/api/me", unavailable);
  app.post("/api/auth/logout", unavailable);
  app.post("/api/auth/twitch/disconnect", unavailable);
  app.post("/api/coops/sessions/:sessionId/rejoin", unavailable);
  app.all("/api/coops/invitations", unavailable);
  app.all("/api/coops/invitations/:inviteId/accept", unavailable);
  app.all("/api/coops/invitations/:inviteId/decline", unavailable);
  app.all("/api/ops/diagnostics", unavailable);
  app.all("/api/sessions", unavailable);
  app.all("/api/sessions/:sessionId/snapshot", unavailable);
  app.all("/api/sessions/:sessionId/overlay-credential", unavailable);
  app.all("/api/sessions/:sessionId/:action", unavailable);
  app.log.warn(
    "Auth endpoints are disabled until session and encryption keys are configured.",
  );
}

const webRoot = resolve(
  fileURLToPath(new URL("../../web/dist", import.meta.url)),
);
app.get("/health/live", async () => ({ status: "ok" }));

app.get("/health/ready", async (_request, reply) => {
  try {
    await database.query("select 1");
    return { status: "ready" };
  } catch (error) {
    const code =
      error instanceof Error && "code" in error
        ? String(error.code)
        : "unknown";
    app.log.warn({ code }, "database readiness check failed");
    return reply.code(503).send({ status: "not-ready" });
  }
});

if (existsSync(resolve(webRoot, "index.html"))) {
  await app.register(fastifyStatic, { root: webRoot, wildcard: false });
  // Deep links such as /play or /dashboard are client-side routes, so they get the app shell.
  // API and health paths and requests for missing files keep a JSON 404.
  app.setNotFoundHandler(async (request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    const isClientRoute =
      request.method === "GET" &&
      path !== "/api" &&
      !path.startsWith("/api/") &&
      !path.startsWith("/health") &&
      !/\.[a-z0-9]+$/i.test(path);
    if (isClientRoute) {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send({
      message: `Route ${request.method}:${request.url} not found`,
      error: "Not Found",
      statusCode: 404,
    });
  });
}

app.addHook("onClose", async () => {
  await outboxPublisher.close();
  await eventsubLeader?.close();
  await twitchConnections?.shutdown();
  realtime.close();
  sockets.close();
  await database.end();
});

await app.listen({ host: "0.0.0.0", port: config.port });
app.log.info(
  { port: config.port, twitchConfigured: Boolean(config.twitch) },
  "Cluenite server ready",
);
if (eventsubLeader) {
  void eventsubLeader.start().catch((error: unknown) => {
    const code =
      error instanceof Error && "code" in error
        ? String(error.code)
        : "unknown";
    app.log.warn({ code }, "EventSub leadership could not start");
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close();
  });
}
