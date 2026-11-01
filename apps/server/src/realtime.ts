import {
  joinSessionSchema,
  sessionControlSchema,
  submitCommandSchema,
  type CommandResult,
  type ResultCode,
  type RoundSnapshot,
} from "@cluenite/contracts";
import type { Server, Socket } from "socket.io";
import { createRateLimiter, type RoundStore } from "./rounds.js";

export const SNAPSHOT_EVENT = "session:snapshot";
const COMMAND_LIMIT = 5;
const COMMAND_WINDOW_MS = 5_000;

export interface RealtimeOptions {
  // Dev gate only. Real Twitch/dashboard auth is not implemented yet.
  readonly devControls: boolean;
}

type JoinAck = { ok: true; snapshot: RoundSnapshot } | { ok: false; code: ResultCode };
type Ack<T> = (response: T) => void;

function roomFor(sessionId: string): string {
  return `session:${sessionId}`;
}

function rejected(code: ResultCode, message: string): CommandResult {
  return { code, reason: null, message, missing: [], revision: 0 };
}

export function attachRealtime(io: Server, store: RoundStore, options: RealtimeOptions): void {
  const limiter = createRateLimiter(COMMAND_LIMIT, COMMAND_WINDOW_MS);

  // Only the server decides state; clients receive the full snapshot after every accepted change.
  const broadcast = (sessionId: string): void => {
    const snapshot = store.snapshot(sessionId);
    if (snapshot) io.to(roomFor(sessionId)).emit(SNAPSHOT_EVENT, snapshot);
  };

  const guard = (socket: Socket): CommandResult | null => {
    if (!options.devControls) {
      return rejected("NOT_AUTHORIZED", "Controls are disabled on this server.");
    }
    if (!limiter.take(socket.id)) {
      return rejected("RATE_LIMITED", "Too many commands. Wait a moment.");
    }
    return null;
  };

  io.on("connection", (socket) => {
    socket.on("session:join", (payload: unknown, ack?: Ack<JoinAck>) => {
      const parsed = joinSessionSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, code: "CONTENT_ERROR" });
        return;
      }
      const snapshot = store.snapshot(parsed.data.sessionId);
      if (!snapshot) {
        ack?.({ ok: false, code: "NOT_AVAILABLE" });
        return;
      }
      void socket.join(roomFor(parsed.data.sessionId));
      ack?.({ ok: true, snapshot });
    });

    socket.on("session:command", (payload: unknown, ack?: Ack<CommandResult>) => {
      const denied = guard(socket);
      if (denied) {
        ack?.(denied);
        return;
      }
      const parsed = submitCommandSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.(rejected("CONTENT_ERROR", "Invalid command payload."));
        return;
      }
      const outcome = store.command(parsed.data.sessionId, parsed.data.text);
      if (outcome.changed) broadcast(parsed.data.sessionId);
      ack?.(outcome.result);
    });

    socket.on("session:control", (payload: unknown, ack?: Ack<CommandResult>) => {
      const denied = guard(socket);
      if (denied) {
        ack?.(denied);
        return;
      }
      const parsed = sessionControlSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.(rejected("CONTENT_ERROR", "Invalid control payload."));
        return;
      }
      const outcome = store.control(parsed.data.sessionId, parsed.data.action);
      if (outcome.changed) broadcast(parsed.data.sessionId);
      ack?.(outcome.result);
    });

    socket.on("disconnect", () => {
      limiter.forget(socket.id);
    });
  });
}
