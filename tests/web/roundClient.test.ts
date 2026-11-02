import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Q01_GALLERY_SHADOW } from "../../packages/cases/src/index.js";
import {
  createRound,
  toRoundSnapshot,
} from "../../packages/engine/src/index.js";
import type { RoundSnapshot } from "../../packages/contracts/src/index.js";

const socketFixture = vi.hoisted(() => {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const calls: { event: string; args: unknown[] }[] = [];
  const socket = {
    connected: false,
    on(event: string, handler: (...args: unknown[]) => void) {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
      return socket;
    },
    emit(event: string, ...args: unknown[]) {
      calls.push({ event, args });
      return socket;
    },
    timeout() {
      return socket;
    },
    disconnect() {
      socket.connected = false;
      return socket;
    },
    removeAllListeners() {
      listeners.clear();
      return socket;
    },
    close() {
      socket.connected = false;
      return socket;
    },
  };
  return { socket, listeners, calls };
});

vi.mock("../../apps/web/node_modules/socket.io-client", () => ({
  io: () => socketFixture.socket,
}));

function emitToClient(event: string, ...args: unknown[]): void {
  for (const listener of socketFixture.listeners.get(event) ?? [])
    listener(...args);
}

function baseSnapshot(): RoundSnapshot {
  const state = createRound(Q01_GALLERY_SHADOW, {
    sessionId: "round-client-test",
    source: "simulation",
  });
  return toRoundSnapshot(state, 1_000);
}

describe("round client realtime recovery", () => {
  let closeClient: (() => void) | undefined;
  beforeEach(() => {
    socketFixture.listeners.clear();
    socketFixture.calls.length = 0;
    socketFixture.socket.connected = true;
    vi.stubGlobal("window", { location: { hash: "" } });
  });

  afterEach(() => {
    closeClient?.();
    closeClient = undefined;
    vi.unstubAllGlobals();
  });

  it("applies contiguous deltas and fetches an authorized snapshot after a revision gap", async () => {
    const { connectRound } =
      await import("../../apps/web/src/net/roundClient.js");
    const initial = baseSnapshot();
    const onSnapshot = vi.fn();
    const onConnectionStatus = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ snapshot: initial }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const client = connectRound("round-client-test", {
      onSnapshot,
      onConnection: vi.fn(),
      onConnectionStatus,
    });
    closeClient = client.close;

    expect(socketFixture.listeners.has("connect")).toBe(true);
    emitToClient("connect");
    const join = socketFixture.calls.findLast(
      (call) => call.event === "session:join",
    );
    expect(join).toBeDefined();
    const acknowledgeJoin = join?.args[1] as
      | ((
          error: Error | null,
          ack: { ok: boolean; snapshot?: RoundSnapshot },
        ) => void)
      | undefined;
    acknowledgeJoin?.(null, { ok: true, snapshot: initial });
    expect(onSnapshot).toHaveBeenLastCalledWith(initial);
    expect(fetchMock).not.toHaveBeenCalled();

    emitToClient("connection:status", {
      provider: "twitch",
      state: "ONLINE",
      since: "2026-11-01T00:00:00.000Z",
    });
    expect(onConnectionStatus).toHaveBeenCalledWith({
      provider: "twitch",
      state: "ONLINE",
      since: "2026-11-01T00:00:00.000Z",
    });

    emitToClient("session:delta", {
      sessionId: initial.sessionId,
      previousRevision: 0,
      revision: 1,
      changes: [
        { field: "revision", operation: "set", value: 1 },
        { field: "stage", operation: "set", value: "connect" },
      ],
      cues: [],
      eventId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(onSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 1, stage: "connect" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();

    const latest = { ...initial, revision: 4 };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ snapshot: latest }),
    });

    emitToClient("session:delta", {
      sessionId: initial.sessionId,
      previousRevision: 3,
      revision: 4,
      changes: [],
      cues: [],
      eventId: "550e8400-e29b-41d4-a716-446655440001",
    });
    await vi.waitFor(() =>
      expect(onSnapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ revision: 4 }),
      ),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions/round-client-test/snapshot",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});
