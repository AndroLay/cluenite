import { config as loadDotEnv } from "dotenv";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { createDatabasePool } from "./db/pool.js";
import { Server as SocketServer } from "socket.io";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  HTTP_BODY_LIMIT,
  registerHttpAdmission,
  safeLoggerOptions,
} from "./ops/httpPolicy.js";
import {
  clearCookieHeader,
  OAUTH_STATE_COOKIE_NAME,
} from "./auth/authorization.js";
import { parseServerConfig } from "./config.js";
import { sendOAuthOutcome } from "./auth/oauthOutcome.js";
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
import { registerShutdown } from "./ops/shutdown.js";

// The root .env is found from this file, not from the working directory. `npm --prefix apps/server`
// runs with apps/server as cwd, so a bare `dotenv/config` import would miss DATABASE_URL.
loadDotEnv({
  path: resolve(fileURLToPath(new URL("../../../.env", import.meta.url))),
});

const config = parseServerConfig(process.env);
const app = Fastify({
  logger: safeLoggerOptions,
  bodyLimit: HTTP_BODY_LIMIT,
  trustProxy: false,
  disableRequestLogging: true,
  requestTimeout: 15_000,
  keepAliveTimeout: 5_000,
  maxRequestsPerSocket: 1_000,
});
app.server.headersTimeout = 10_000;
app.server.maxConnections = 512;
registerHttpAdmission(app);
const database = createDatabasePool(config.databaseUrl, app.log);
const rounds = new PostgresRoundRepository(
  database,
  Date.now,
  config.twitchAdapter === "twitch"
    ? (userId) => twitchConnections?.statusForUser(userId) === "connected"
    : undefined,
);
const sockets: SocketServer = new SocketServer(app.server, {
  path: "/socket.io",
  maxHttpBufferSize: HTTP_BODY_LIMIT,
  connectTimeout: 10_000,
  allowRequest: (_request, done) =>
    done(null, sockets.engine.clientsCount < 256),
});
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
    onAccountAuthorized: async (userId) => {
      await twitchConnections?.stopUser(userId);
      await twitchConnections?.startUser(userId);
    },
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
  for (const path of ["/api/auth/twitch/start", "/api/auth/twitch/callback"]) {
    app.get(path, (request, reply) => {
      reply.header(
        "set-cookie",
        clearCookieHeader(
          OAUTH_STATE_COOKIE_NAME,
          config.nodeEnv === "production" ||
            config.publicOrigin.protocol === "https:",
          "/api/auth/twitch",
        ),
      );
      return sendOAuthOutcome(
        request,
        reply,
        config,
        "unavailable",
        503,
        "authentication_not_configured",
      );
    });
  }
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
  // Resolve rebuilt asset hashes at request time instead of only at startup.
  await app.register(fastifyStatic, { root: webRoot, wildcard: true });
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

registerShutdown(app, sockets, {
  stopBackground: async () => {
    await eventsubLeader?.close();
    await twitchConnections?.shutdown();
    realtime.close();
    await outboxPublisher.close();
  },
  closeDatabase: () => database.end(),
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
