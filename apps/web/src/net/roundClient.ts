// Socket client for one Cluenite round session. The server owns all state. This client
// only renders the latest snapshot it accepts, and sends commands with acks.
import { io, type Socket } from "socket.io-client";
import type {
  CommandResult,
  ConnectionStatus,
  RoundDelta,
  RoundSnapshot,
  SessionControl,
} from "@cluenite/contracts";
import { roundSnapshotSchema } from "@cluenite/contracts";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export interface RoundClientHandlers {
  onSnapshot: (snapshot: RoundSnapshot) => void;
  onConnection: (state: ConnectionState) => void;
  onConnectionStatus?: (status: ConnectionStatus) => void;
}

export interface RoundClient {
  submit: (text: string) => Promise<CommandResult | null>;
  control: (action: SessionControl["action"]) => Promise<CommandResult | null>;
  close: () => void;
}

interface JoinAck {
  ok: boolean;
  snapshot?: RoundSnapshot;
}

const COMMAND_TIMEOUT_MS = 5000;

export function connectRound(
  sessionId: string,
  handlers: RoundClientHandlers,
  options: { readonly requireOverlay?: boolean } = {},
): RoundClient {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const overlayToken = fragment.get("overlay");
  const auth =
    overlayToken !== null
      ? { overlayToken }
      : options.requireOverlay
        ? { overlayToken: "" }
        : undefined;
  const socket: Socket = io({ path: "/socket.io", ...(auth ? { auth } : {}) });
  let resyncPending = false;
  // Revision of the last snapshot applied to the view. Broadcasts must arrive
  // contiguously; a gap means a missed update, so the client fetches a full snapshot.
  let applied = -1;
  let lastSnapshot: RoundSnapshot | null = null;

  const apply = (snapshot: RoundSnapshot): void => {
    applied = snapshot.revision;
    lastSnapshot = snapshot;
    resyncPending = false;
    handlers.onSnapshot(snapshot);
  };

  const fetchSnapshot = async (): Promise<void> => {
    const response = await fetch(
      `/api/sessions/${encodeURIComponent(sessionId)}/snapshot`,
      {
        cache: "no-store",
        credentials: "same-origin",
        ...(overlayToken
          ? { headers: { Authorization: `Bearer ${overlayToken}` } }
          : {}),
      },
    );
    if (!response.ok) throw new Error("snapshot_unavailable");
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("snapshot" in body))
      throw new Error("snapshot_invalid");
    const parsed = roundSnapshotSchema.safeParse(body.snapshot);
    if (!parsed.success) throw new Error("snapshot_invalid");
    if (parsed.data.revision >= applied) apply(parsed.data);
  };

  // A join ack is a full snapshot and is authoritative, even when its revision is lower
  // than before (for example after the server restarted and its state was reset).
  const join = (): void => {
    socket.emit("session:join", { sessionId }, (ack: JoinAck) => {
      if (ack.ok && ack.snapshot) apply(ack.snapshot);
      void fetchSnapshot().catch(() => undefined);
    });
  };

  socket.on("connect", () => {
    handlers.onConnection("connected");
    join();
  });
  socket.on("disconnect", () => handlers.onConnection("disconnected"));
  socket.on("connect_error", () => handlers.onConnection("disconnected"));
  socket.on("connection:status", (status: ConnectionStatus) => {
    handlers.onConnectionStatus?.(status);
  });

  socket.on("session:delta", (delta: RoundDelta) => {
    if (delta.sessionId !== sessionId || delta.revision <= applied) return;
    if (delta.previousRevision !== applied || !lastSnapshot) {
      if (!resyncPending && socket.connected) {
        resyncPending = true;
        socket.emit("session:resync", {
          sessionId,
          currentRevision: Math.max(0, applied),
        });
      }
      return;
    }

    const merged: Record<string, unknown> = { ...lastSnapshot };
    for (const change of delta.changes) {
      if (change.operation === "remove") delete merged[change.field];
      else merged[change.field] = change.value;
    }
    const parsed = roundSnapshotSchema.safeParse(merged);
    if (parsed.success) apply(parsed.data);
    else if (!resyncPending && socket.connected) {
      resyncPending = true;
      socket.emit("session:resync", {
        sessionId,
        currentRevision: Math.max(0, applied),
      });
    }
  });

  socket.on("session:resync-required", (payload: { sessionId?: string }) => {
    if (payload.sessionId === sessionId)
      void fetchSnapshot().catch(() => {
        resyncPending = false;
      });
  });

  socket.on("session:snapshot", (snapshot: RoundSnapshot) => {
    if (snapshot.revision <= applied) return;
    if (applied >= 0 && snapshot.revision !== applied + 1) {
      if (!resyncPending && socket.connected) {
        resyncPending = true;
        socket.emit("session:resync", {
          sessionId,
          currentRevision: Math.max(0, applied),
        });
      }
      return;
    }
    apply(snapshot);
  });

  const send = (
    event: string,
    payload: unknown,
  ): Promise<CommandResult | null> => {
    if (!socket.connected) return Promise.resolve(null);
    return new Promise((resolve) => {
      socket
        .timeout(COMMAND_TIMEOUT_MS)
        .emit(event, payload, (err: Error | null, result: CommandResult) => {
          resolve(err ? null : result);
        });
    });
  };

  return {
    submit: (text) => send("session:command", { sessionId, text }),
    control: (action) => send("session:control", { sessionId, action }),
    close: () => socket.close(),
  };
}
