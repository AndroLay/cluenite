import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { M01_PREVIEW_SNAPSHOT } from "../src/mysteryLive/previewSnapshot";
import { connectRound } from "../src/net/roundClient";

const fake = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const emitted: { event: string; payload: Record<string, unknown> }[] = [];
  let commandTimeout = true;
  let snapshot: unknown;
  let denied = false;
  let joinTimeout = false;
  const socket = {
    connected: true,
    on(event: string, fn: (...args: unknown[]) => void) { handlers.set(event, fn); return socket; },
    timeout() { return socket; },
    emit(event: string, payload: Record<string, unknown>, ack: (...args: unknown[]) => void) {
      emitted.push({ event, payload });
      if (event === "session:join") ack(joinTimeout ? new Error("join timeout") : null, denied ? { ok: false, code: "NOT_AVAILABLE" } : { ok: true, snapshot });
      else if (commandTimeout) ack(new Error("ack lost"));
      else ack(null, { code: "ACCEPTED_NEW", reason: null, message: "Recorded", missing: [], revision: 2 });
      return socket;
    },
    disconnect() { socket.connected = false; return socket; },
    close() { socket.connected = false; return socket; },
    removeAllListeners() { handlers.clear(); return socket; },
  };
  return { socket, handlers, emitted, setJoinTimeout: (value: boolean) => { joinTimeout = value; }, setTimeout: (value: boolean) => { commandTimeout = value; }, setSnapshot: (value: unknown) => { snapshot = value; }, setDenied: (value: boolean) => { denied = value; } };
});
vi.mock("socket.io-client", () => ({ io: () => fake.socket }));
describe("round integration boundaries", () => {
  const initial = { ...M01_PREVIEW_SNAPSHOT, sessionId: "integration-round", revision: 1 };
  it("reports a confirmed restart after retrying a lost acknowledgement", async () => {
    const restarted = vi.fn();
    const client = connectRound(initial.sessionId, { onSnapshot() {}, onConnection() {}, onRestartAccepted: restarted });
    fake.handlers.get("connect")!();
    expect(await client.control("restart")).toBeNull();
    expect(restarted).not.toHaveBeenCalled();
    const key = fake.emitted.at(-1)!.payload.idempotencyKey;
    fake.setTimeout(false);
    await client.retryPending();
    expect(fake.emitted.at(-1)!.payload.idempotencyKey).toBe(key);
    expect(restarted).toHaveBeenCalledExactlyOnceWith(2);
    client.close();
  });
  beforeEach(() => {
    fake.handlers.clear(); fake.emitted.length = 0; fake.socket.connected = true; fake.setDenied(false); fake.setJoinTimeout(false); fake.setTimeout(true); fake.setSnapshot(initial);
    vi.stubGlobal("window", { location: { hash: "" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ snapshot: { ...initial, revision: 3 } })));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it("retries an unknown command with the same key and blocks a different action until resolved", async () => {
    const client = connectRound(initial.sessionId, { onSnapshot() {}, onConnection() {} });
    fake.handlers.get("connect")!();
    expect(await client.submit("!hint")).toBeNull();
    const first = fake.emitted.at(-1)!.payload.idempotencyKey;
    const count = fake.emitted.length;
    expect(await client.control("stop")).toBeNull();
    expect(fake.emitted.length).toBe(count);
    fake.setTimeout(false);
    expect(client.hasPending()).toBe(true);
    // The original clue/phase affordance may have disappeared after the server committed.
    expect((await client.retryPending())?.code).toBe("ACCEPTED_NEW");
    expect(client.hasPending()).toBe(false);
    expect(fake.emitted.at(-1)!.payload.idempotencyKey).toBe(first);
    await client.submit("!hint");
    expect(fake.emitted.at(-1)!.payload.idempotencyKey).not.toBe(first);
    client.close();
  });
  it("uses the scoped bearer without cookies and coalesces a burst of revision gaps", async () => {
    vi.stubGlobal("window", { location: { hash: `#overlay=${"t".repeat(43)}` } });
    const applied: number[] = [];
    const client = connectRound(initial.sessionId, { onSnapshot: row => applied.push(row.revision), onConnection() {} }, { requireOverlay: true });
    fake.handlers.get("connect")!();
    expect(fetch).not.toHaveBeenCalled();
    for (let i = 0; i < 12; i++) fake.handlers.get("session:delta")!({ sessionId: initial.sessionId, previousRevision: 2, revision: 3, changes: [] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ credentials: "omit", headers: { Authorization: `Bearer ${"t".repeat(43)}` } }));
    expect(applied).toEqual([1, 3]);
    expect(await client.submit("!hint")).toBeNull();
    client.close();
  });
  it("reports denied membership instead of claiming a connected session", () => {
    fake.setDenied(true);
    const state = vi.fn(); const error = vi.fn();
    const client = connectRound(initial.sessionId, { onSnapshot() {}, onConnection: state, onAccessError: error });
    fake.handlers.get("connect")!();
    expect(state).not.toHaveBeenCalledWith("connected");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("explicitly rejoin"));
    expect(fake.socket.connected).toBe(false);
    client.close();
  });
  it("follows a later gap that arrives during an older snapshot read", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-02T00:00:00Z"));
    let complete!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const applied: number[] = [];
    const client = connectRound(initial.sessionId, { onSnapshot: row => applied.push(row.revision), onConnection() {} });
    fake.handlers.get("connect")!();
    fake.handlers.get("session:delta")!({ sessionId: initial.sessionId, previousRevision: 2, revision: 3, changes: [] });
    fake.handlers.get("session:delta")!({ sessionId: initial.sessionId, previousRevision: 4, revision: 5, changes: [] });
    complete(Response.json({ snapshot: { ...initial, revision: 3 } }));
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ snapshot: { ...initial, revision: 5 } }));
    await vi.advanceTimersByTimeAsync(2001);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(applied).toEqual([1, 3, 5]);
    client.close();
  });
  it("cancels an old join retry after a successful reconnect", async () => {
    vi.useFakeTimers();
    fake.setJoinTimeout(true);
    const client = connectRound(initial.sessionId, { onSnapshot() {}, onConnection() {} });
    fake.handlers.get("connect")!();
    fake.setJoinTimeout(false);
    fake.handlers.get("connect")!();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fake.emitted.filter(row => row.event === "session:join")).toHaveLength(2);
    client.close();
  });
});
