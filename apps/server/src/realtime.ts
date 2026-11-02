import { randomUUID } from "node:crypto";
import {
  joinSessionSchema,
  sessionResyncRequestSchema,
  sessionControlSchema,
  submitCommandSchema,
  type CommandResult,
  type ConnectionStatus,
  type RoundDelta,
  type ResultCode,
  type RoundSnapshot,
} from "@cluenite/contracts";
import type { FastifyBaseLogger } from "fastify";
import type { Server, Socket } from "socket.io";
import type { ServerConfig } from "./config.js";
import type {
  PostgresRoundRepository,
  OutboxMessage,
} from "./db/roundRepository.js";
import { readCookie } from "./auth/authorization.js";
import type { SessionStore } from "./auth/sessionStore.js";
import { createRateLimiter } from "./rounds.js";
import { createWorkBudget } from "./ops/workBudget.js";

export const SNAPSHOT_EVENT = "session:snapshot";
export const DELTA_EVENT = "session:delta";
export const RESYNC_REQUIRED_EVENT = "session:resync-required";
export const CONNECTION_STATUS_EVENT = "connection:status";
const COMMAND_LIMIT = 5;
const COMMAND_WINDOW_MS = 5_000;

type Principal =
  | {
      readonly role: "host";
      readonly twitchUserId: string;
      readonly sessionTokenHash: string;
    }
  | {
      readonly role: "overlay";
      readonly sessionId: string;
      readonly tokenHash: string;
    };

type JoinAck =
  { ok: true; snapshot: RoundSnapshot } | { ok: false; code: ResultCode };
type Ack<T> = (response: T) => void;

function roomFor(sessionId: string, team: "A" | "B"): string {
  return `session:${sessionId}:team:${team}`;
}

function hasTrustedSocketOrigin(socket: Socket, publicOrigin: string): boolean {
  const origin = socket.handshake.headers.origin;
  if (origin !== undefined) {
    try {
      return new URL(origin).origin === publicOrigin;
    } catch {
      return false;
    }
  }

  // Same-origin browser polling omits the Origin header on ordinary GET/POST
  // requests, but sends Referer. Accept that exact-origin fallback only when
  // Origin is absent; a present but invalid Origin must never be overridden.
  const referer = socket.handshake.headers.referer;
  if (!referer) return false;
  try {
    const parsed = new URL(referer);
    return (
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.origin === publicOrigin
    );
  } catch {
    return false;
  }
}

export function hostPrincipalRoom(twitchUserId: string): string {
  return `principal:host:${twitchUserId}`;
}

export function overlayPrincipalRoom(sessionId: string): string {
  return `principal:overlay:${sessionId}`;
}

async function principalIsActive(
  principal: Principal,
  sessions: SessionStore,
): Promise<boolean> {
  return principal.role === "host"
    ? sessions.isHostSessionActive(
        principal.sessionTokenHash,
        principal.twitchUserId,
      )
    : sessions.isOverlayCredentialActive(
        principal.tokenHash,
        principal.sessionId,
      );
}

function rejected(
  code: ResultCode,
  message: string,
  revision = 0,
): CommandResult {
  return { code, reason: null, message, missing: [], revision };
}

function getPrincipal(socket: Socket): Principal | null {
  const value: unknown = socket.data.principal;
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<Principal>;
  return candidate.role === "host" || candidate.role === "overlay"
    ? (candidate as Principal)
    : null;
}

async function authorizedSnapshot(
  principal: Principal,
  sessionId: string,
  rounds: PostgresRoundRepository,
): Promise<RoundSnapshot | null> {
  if (principal.role === "host")
    return rounds.snapshotForParticipant(sessionId, principal.twitchUserId);
  if (principal.sessionId !== sessionId) return null;
  return rounds.snapshotForOverlay(sessionId, principal.tokenHash);
}

export interface RealtimeOptions {
  readonly config: ServerConfig;
  readonly sessions: SessionStore | null;
  readonly rounds: PostgresRoundRepository;
  readonly connectionStatusForSession?: (
    sessionId: string,
    principal: Principal,
  ) => Promise<ConnectionStatus | null>;
}

export function attachRealtime(
  io: Server,
  options: RealtimeOptions,
): { close: () => void } {
  const { config, sessions, rounds } = options;
  const limiter = createRateLimiter(COMMAND_LIMIT, COMMAND_WINDOW_MS);
  const resyncLimiter = createRateLimiter(3, 5_000);
  const joinLimiter = createRateLimiter(3, 5_000);
  const work = createWorkBudget(16, 2);
  const handshakes = createWorkBudget(8);

  io.use((socket, next) => {
    if (io.sockets.sockets.size >= 256) return next(new Error("server_busy"));
    const release = handshakes.acquire();
    if (!release) return next(new Error("server_busy"));
    void (async () => {
      if (!sessions) {
        next(new Error("authentication_not_configured"));
        return;
      }
      if (!hasTrustedSocketOrigin(socket, config.publicOrigin.origin)) {
        next(new Error("origin_rejected"));
        return;
      }

      const auth = socket.handshake.auth;
      const hasOverlayToken =
        typeof auth === "object" && auth !== null && "overlayToken" in auth;
      if (hasOverlayToken) {
        const token = (auth as Record<string, unknown>).overlayToken;
        if (typeof token !== "string") {
          next(new Error("unauthorized"));
          return;
        }
        const overlay = await sessions.resolveOverlay(token);
        if (!overlay) {
          next(new Error("unauthorized"));
          return;
        }
        socket.data.principal = {
          role: "overlay",
          ...overlay,
        } satisfies Principal;
        next();
        return;
      }

      const token = readCookie(
        socket.handshake.headers.cookie,
        "cluenite_session",
      );
      const host = await sessions.resolveHostSession(token);
      if (!host) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.principal = {
        role: "host",
        twitchUserId: host.twitchUserId,
        sessionTokenHash: host.sessionTokenHash,
      } satisfies Principal;
      next();
    })()
      .catch(() => next(new Error("unauthorized")))
      .finally(release);
  });

  io.on("connection", (socket) => {
    const principal = getPrincipal(socket);
    if (!principal) {
      socket.disconnect(true);
      return;
    }
    void socket.join(
      principal.role === "host"
        ? hostPrincipalRoom(principal.twitchUserId)
        : overlayPrincipalRoom(principal.sessionId),
    );

    socket.on(
      "session:join",
      (payload: unknown, suppliedAck?: Ack<JoinAck>) => {
        const ack = typeof suppliedAck === "function" ? suppliedAck : undefined;
        if (!joinLimiter.take(socket.id)) {
          ack?.({ ok: false, code: "RATE_LIMITED" });
          return;
        }
        const release = work.acquire(socket.id);
        if (!release) {
          ack?.({ ok: false, code: "RATE_LIMITED" });
          return;
        }
        void (async () => {
          if (!(await principalIsActive(principal, sessions!))) {
            ack?.({ ok: false, code: "NOT_AUTHORIZED" });
            socket.disconnect(true);
            return;
          }
          const parsed = joinSessionSchema.safeParse(payload);
          if (!parsed.success) {
            ack?.({ ok: false, code: "CONTENT_ERROR" });
            return;
          }
          const first = await authorizedSnapshot(
            principal,
            parsed.data.sessionId,
            rounds,
          );
          if (!first) {
            ack?.({ ok: false, code: "NOT_AVAILABLE" });
            return;
          }
          const room = roomFor(parsed.data.sessionId, first.team ?? "A");
          await socket.join(room);
          const current = await authorizedSnapshot(
            principal,
            parsed.data.sessionId,
            rounds,
          );
          if (
            !current ||
            current.team !== first.team ||
            !(await principalIsActive(principal, sessions!))
          ) {
            await socket.leave(room);
            ack?.({ ok: false, code: "NOT_AVAILABLE" });
            return;
          }
          ack?.({ ok: true, snapshot: current });
          if (options.connectionStatusForSession) {
            void options
              .connectionStatusForSession(parsed.data.sessionId, principal)
              .then((status) => {
                if (status) socket.emit(CONNECTION_STATUS_EVENT, status);
              })
              .catch(() => undefined);
          }
        })()
          .catch(() => ack?.({ ok: false, code: "NOT_AVAILABLE" }))
          .finally(release);
      },
    );

    socket.on("session:resync", (payload: unknown) => {
      if (!resyncLimiter.take(socket.id)) return;
      const release = work.acquire(socket.id);
      if (!release) return;
      void (async () => {
        if (!(await principalIsActive(principal, sessions!))) {
          socket.disconnect(true);
          return;
        }
        const parsed = sessionResyncRequestSchema.safeParse(payload);
        if (!parsed.success) return;
        const current = await authorizedSnapshot(
          principal,
          parsed.data.sessionId,
          rounds,
        );
        if (!current) return;
        socket.emit(RESYNC_REQUIRED_EVENT, {
          sessionId: parsed.data.sessionId,
          expectedRevision: parsed.data.currentRevision + 1,
          serverRevision: current.revision,
        });
      })()
        .catch(() => undefined)
        .finally(release);
    });

    socket.on(
      "session:command",
      (payload: unknown, suppliedAck?: Ack<CommandResult>) => {
        const ack = typeof suppliedAck === "function" ? suppliedAck : undefined;
        if (principal.role !== "host") {
          ack?.(
            rejected("NOT_AUTHORIZED", "Overlay credentials are read-only."),
          );
          return;
        }
        if (!limiter.take(socket.id)) {
          ack?.(rejected("RATE_LIMITED", "Too many commands. Wait a moment."));
          return;
        }
        const parsed = submitCommandSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(rejected("CONTENT_ERROR", "Invalid command payload."));
          return;
        }
        const release = work.acquire(socket.id);
        if (!release) {
          ack?.(
            rejected(
              "RATE_LIMITED",
              "Server is busy. Retry with the same key.",
            ),
          );
          return;
        }
        void principalIsActive(principal, sessions!)
          .then((active) => {
            if (!active) {
              ack?.(
                rejected(
                  "NOT_AUTHORIZED",
                  "Host session expired or was revoked.",
                ),
              );
              socket.disconnect(true);
              return;
            }
            return rounds
              .applyInput({
                sessionId: parsed.data.sessionId,
                inputId: `host:${parsed.data.idempotencyKey ?? randomUUID()}`,
                ...(parsed.data.idempotencyKey
                  ? { idempotencyKey: parsed.data.idempotencyKey }
                  : {}),
                actorTwitchId: principal.twitchUserId,
                text: parsed.data.text,
                source: "host",
              })
              .then((result) => ack?.(result));
          })
          .catch(() => {
            ack?.(
              rejected(
                "NOT_AVAILABLE",
                "The round could not process this command.",
              ),
            );
          })
          .finally(release);
      },
    );

    socket.on(
      "session:control",
      (payload: unknown, suppliedAck?: Ack<CommandResult>) => {
        const ack = typeof suppliedAck === "function" ? suppliedAck : undefined;
        if (principal.role !== "host") {
          ack?.(
            rejected("NOT_AUTHORIZED", "Overlay credentials are read-only."),
          );
          return;
        }
        if (!limiter.take(socket.id)) {
          ack?.(rejected("RATE_LIMITED", "Too many controls. Wait a moment."));
          return;
        }
        const parsed = sessionControlSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(rejected("CONTENT_ERROR", "Invalid control payload."));
          return;
        }
        const release = work.acquire(socket.id);
        if (!release) {
          ack?.(
            rejected(
              "RATE_LIMITED",
              "Server is busy. Retry with the same key.",
            ),
          );
          return;
        }
        void principalIsActive(principal, sessions!)
          .then((active) => {
            if (!active) {
              ack?.(
                rejected(
                  "NOT_AUTHORIZED",
                  "Host session expired or was revoked.",
                ),
              );
              socket.disconnect(true);
              return;
            }
            return rounds
              .control({
                sessionId: parsed.data.sessionId,
                hostTwitchId: principal.twitchUserId,
                action: parsed.data.action,
                idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
              })
              .then((result) => ack?.(result));
          })
          .catch(() => {
            ack?.(
              rejected(
                "NOT_AVAILABLE",
                "The round control could not be applied.",
              ),
            );
          })
          .finally(release);
      },
    );

    socket.on("disconnect", () => {
      limiter.forget(socket.id);
      resyncLimiter.forget(socket.id);
      joinLimiter.forget(socket.id);
    });
  });

  let checking = false;
  let closed = false;
  const sessionCheckTimer = setInterval(() => {
    if (checking || closed || !sessions) return;
    checking = true;
    void (async () => {
      const checked = new Map<string, Promise<boolean>>();
      const sockets = Array.from(io.sockets.sockets.values());
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(4, sockets.length) }, async () => {
          while (cursor < sockets.length && !closed) {
            const socket = sockets[cursor++]!;
            const principal = getPrincipal(socket);
            if (!principal) {
              socket.disconnect(true);
              continue;
            }
            const key =
              principal.role === "host"
                ? `host:${principal.sessionTokenHash}`
                : `overlay:${principal.tokenHash}`;
            let active = checked.get(key);
            if (!active) {
              active = principalIsActive(principal, sessions).catch(
                () => false,
              );
              checked.set(key, active);
            }
            if (!(await active) && !closed) socket.disconnect(true);
          }
        }),
      );
    })().finally(() => {
      checking = false;
    });
  }, 30_000);
  sessionCheckTimer.unref?.();
  return {
    close: () => {
      closed = true;
      clearInterval(sessionCheckTimer);
    },
  };
}

export function startOutboxPublisher(
  io: Server,
  rounds: PostgresRoundRepository,
  logger: FastifyBaseLogger,
  intervalMs = 250,
): { close: () => Promise<void> } {
  let closed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let resolveCurrent: (() => void) | null = null;
  let pollDelay = intervalMs;

  const publish = (message: OutboxMessage): void => {
    const publishTeam = (
      team: "A" | "B",
      snapshot: RoundSnapshot,
      previous: RoundSnapshot | null,
    ): void => {
      const fields = Object.keys(snapshot) as (keyof RoundSnapshot)[];
      const changes: RoundDelta["changes"] = fields.flatMap((field) => {
        const hasCurrent = Object.hasOwn(snapshot, field);
        const hasPrevious = previous ? Object.hasOwn(previous, field) : false;
        if (
          previous &&
          hasCurrent === hasPrevious &&
          JSON.stringify(snapshot[field]) === JSON.stringify(previous[field])
        )
          return [];
        return [
          hasCurrent
            ? { field, operation: "set" as const, value: snapshot[field] }
            : { field, operation: "remove" as const },
        ];
      });
      const delta: RoundDelta = {
        sessionId: message.sessionId,
        previousRevision: message.revision - 1,
        revision: message.revision,
        changes,
        cues: [],
        eventId: message.eventId,
      };
      const room = roomFor(message.sessionId, team);
      if (message.revision > 0) io.to(room).emit(DELTA_EVENT, delta);
      // Keep the existing full-snapshot event during the client migration.
      io.to(room).emit(SNAPSHOT_EVENT, snapshot);
    };

    publishTeam("A", message.snapshotA, message.previousSnapshotA);
    publishTeam("B", message.snapshotB, message.previousSnapshotB);
  };

  const tick = async (): Promise<void> => {
    if (closed || running) return;
    running = true;
    try {
      const batch = await rounds.claimOutboxBatch(50);
      pollDelay = batch.length ? intervalMs : Math.min(1_000, pollDelay * 2);
      for (const message of batch) {
        try {
          publish(message);
          await rounds.markOutboxPublished(message.id);
        } catch {
          await rounds.deferOutbox(message.id).catch(() => undefined);
        }
      }
    } catch (error) {
      pollDelay = Math.min(1_000, Math.max(intervalMs, pollDelay * 2));
      const code =
        error instanceof Error && "code" in error
          ? String(error.code)
          : "unknown";
      logger.warn({ code }, "Realtime outbox poll failed");
    } finally {
      running = false;
      resolveCurrent?.();
      resolveCurrent = null;
      if (!closed) timer = setTimeout(() => void tick(), pollDelay);
    }
  };

  void tick();
  return {
    async close() {
      closed = true;
      if (timer) clearTimeout(timer);
      if (running)
        await new Promise<void>((resolve) => {
          resolveCurrent = resolve;
        });
    },
  };
}
