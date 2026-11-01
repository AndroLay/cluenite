// Socket client for one Cluenite round session. The server owns all state. This client
// only renders the latest snapshot it accepts, and sends commands with acks.
import { io, type Socket } from "socket.io-client";
import type { CommandResult, RoundSnapshot, SessionControl } from "@cluenite/contracts";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export interface RoundClientHandlers {
  onSnapshot: (snapshot: RoundSnapshot) => void;
  onConnection: (state: ConnectionState) => void;
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

export function connectRound(sessionId: string, handlers: RoundClientHandlers): RoundClient {
  const socket: Socket = io({ path: "/socket.io" });
  // Revision of the last snapshot applied to the view. Broadcasts must arrive
  // contiguously; a gap means a missed update, so the client re-joins for a full snapshot.
  let applied = -1;

  const apply = (snapshot: RoundSnapshot): void => {
    applied = snapshot.revision;
    handlers.onSnapshot(snapshot);
  };

  // A join ack is a full snapshot and is authoritative, even when its revision is lower
  // than before (for example after the server restarted and its state was reset).
  const join = (): void => {
    socket.emit("session:join", { sessionId }, (ack: JoinAck) => {
      if (ack.ok && ack.snapshot) apply(ack.snapshot);
    });
  };

  socket.on("connect", () => {
    handlers.onConnection("connected");
    join();
  });
  socket.on("disconnect", () => handlers.onConnection("disconnected"));
  socket.on("connect_error", () => handlers.onConnection("disconnected"));

  socket.on("session:snapshot", (snapshot: RoundSnapshot) => {
    if (snapshot.revision <= applied) return;
    if (applied >= 0 && snapshot.revision !== applied + 1) {
      join();
      return;
    }
    apply(snapshot);
  });

  const send = (event: string, payload: unknown): Promise<CommandResult | null> => {
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
