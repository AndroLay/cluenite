// One authoritative round projection. Reconnects rejoin; gaps coalesce into one bounded snapshot read.
import { io, type Socket } from "socket.io-client";
import type { CommandResult, ConnectionStatus, RoundDelta, RoundSnapshot, SessionControl } from "@cluenite/contracts";
import { commandResultSchema, roundSnapshotSchema } from "@cluenite/contracts";
import { newIdempotencyKey } from "./idempotency";

export type ConnectionState = "connecting" | "connected" | "disconnected";
export interface RoundClientHandlers {
  onSnapshot: (snapshot: RoundSnapshot) => void;
  onConnection: (state: ConnectionState) => void;
  onConnectionStatus?: (status: ConnectionStatus) => void;
  onAccessError?: (message: string) => void;
  onRestartAccepted?: (revision: number) => void;
}
export interface RoundClient {
  submit: (text: string) => Promise<CommandResult | null>;
  control: (action: SessionControl["action"]) => Promise<CommandResult | null>;
  retryPending: () => Promise<CommandResult | null>;
  hasPending: () => boolean;
  close: () => void;
}
const TIMEOUT_MS = 5000;

export function connectRound(sessionId: string, handlers: RoundClientHandlers, options: { readonly requireOverlay?: boolean } = {}): RoundClient {
  const overlayToken = new URLSearchParams(window.location.hash.slice(1)).get("overlay");
  const overlay = overlayToken !== null || options.requireOverlay;
  const socket: Socket = io({ path: "/socket.io", ...(overlay ? { auth: { overlayToken: overlayToken ?? "" } } : {}) });
  let applied = -1;
  let lastSnapshot: RoundSnapshot | null = null;
  let closed = false;
  let joined = false;
  let joining = false;
  let joinAttempts = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let resyncTimer: ReturnType<typeof setTimeout> | undefined;
  let snapshotPending = false;
  let wantedRevision = -1;
  let forcedRead = false;
  let readFailures = 0;
  let lastRead = 0;
  let snapshotAbort: AbortController | null = null;
  let uncertain: { signature: string; key: string; event: string; value: { text: string } | { action: SessionControl["action"] } } | null = null;
  let sending: Promise<CommandResult | null> | null = null;

  function apply(value: unknown): boolean {
    const parsed = roundSnapshotSchema.safeParse(value);
    if (closed || !parsed.success || parsed.data.sessionId !== sessionId) return false;
    if (lastSnapshot && parsed.data.revision <= applied) return true;
    applied = parsed.data.revision;
    lastSnapshot = parsed.data;
    handlers.onSnapshot(parsed.data);
    return true;
  }
  function accessError(): void {
    joined = false;
    handlers.onConnection("disconnected");
    handlers.onAccessError?.(overlay
      ? "This overlay credential is unavailable, expired, or replaced. Ask the participant to create a new link."
      : "This session is unavailable for this account. Open saved sessions to sign in or explicitly rejoin.");
    socket.disconnect();
  }
  async function fetchSnapshot(): Promise<void> {
    if (closed || !joined || snapshotPending) return;
    if (!forcedRead && applied >= wantedRevision) return;
    const delay = Math.max(0, 2000 - (Date.now() - lastRead));
    if (delay > 0) {
      resyncTimer ??= setTimeout(() => { resyncTimer = undefined; void fetchSnapshot(); }, delay);
      return;
    }
    const wasForced = forcedRead;
    snapshotPending = true; lastRead = Date.now(); forcedRead = false;
    const before = applied;
    let succeeded = false;
    const controller = new AbortController();
    snapshotAbort = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/snapshot`, {
        cache: "no-store",
        // HTTP prefers a host cookie to a bearer. Omit cookies to preserve the overlay's scoped team.
        credentials: overlay ? "omit" : "same-origin",
        signal: controller.signal,
        ...(overlay ? { headers: { Authorization: `Bearer ${overlayToken ?? ""}` } } : {}),
      });
      const body: unknown = await response.json().catch(() => null);
      if ([401, 403, 404].includes(response.status)) { if (!closed) accessError(); return; }
      if (response.ok && typeof body === "object" && body !== null && "snapshot" in body) succeeded = apply(body.snapshot);
    } catch { /* The next gap or reconnect retries; no polling loop. */ }
    finally {
      clearTimeout(timer); snapshotPending = false;
      if (snapshotAbort === controller) snapshotAbort = null;
      readFailures = applied > before ? 0 : readFailures + 1;
      if (!succeeded && wasForced) forcedRead = true;
      // A later gap may arrive while this read is in flight. Preserve that target and
      // perform a bounded follow-up instead of silently remaining at an older revision.
      if (!closed && joined && (forcedRead || applied < wantedRevision) && readFailures < 3) void fetchSnapshot();
    }
  }
  function requestSnapshot(revision?: number): void {
    if (revision === undefined) { forcedRead = true; if (!snapshotPending) readFailures = 0; }
    else {
      if (revision > wantedRevision) readFailures = 0;
      wantedRevision = Math.max(wantedRevision, revision);
    }
    void fetchSnapshot();
  }
  function join(): void {
    if (closed || !socket.connected || joining || joined) return;
    joining = true; joinAttempts++;
    socket.timeout(TIMEOUT_MS).emit("session:join", { sessionId }, (err: Error | null, ack: { ok?: boolean; snapshot?: unknown; code?: string } | undefined) => {
      joining = false;
      if (closed || !socket.connected) return;
      if (!err && ack?.ok && apply(ack.snapshot)) {
        clearTimeout(retryTimer); retryTimer = undefined;
        joined = true; joinAttempts = 0;
        handlers.onConnection("connected");
        return;
      }
      if (ack?.code === "NOT_AUTHORIZED" || ack?.code === "NOT_AVAILABLE" || ack?.code === "SESSION_NOT_FOUND") { accessError(); return; }
      if (joinAttempts < 3) retryTimer = setTimeout(join, 1500);
      else {
        handlers.onConnection("disconnected");
        handlers.onAccessError?.("The session could not be joined. Wait a moment, then reload or open saved sessions.");
        socket.disconnect();
      }
    });
  }
  socket.on("connect", () => { clearTimeout(retryTimer); retryTimer = undefined; joined = false; joining = false; joinAttempts = 0; handlers.onConnection("connecting"); join(); });
  socket.on("disconnect", () => { joined = false; handlers.onConnection("disconnected"); });
  socket.on("connect_error", () => handlers.onConnection("disconnected"));
  socket.on("connection:status", (status: ConnectionStatus) => handlers.onConnectionStatus?.(status));
  socket.on("session:delta", (delta: RoundDelta) => {
    if (closed || delta.sessionId !== sessionId || delta.revision <= applied) return;
    if (!lastSnapshot || delta.previousRevision !== applied) { requestSnapshot(delta.revision); return; }
    const merged: Record<string, unknown> = { ...lastSnapshot };
    for (const change of delta.changes) {
      if (change.operation === "remove") delete merged[change.field];
      else merged[change.field] = change.value;
    }
    if (!apply(merged)) requestSnapshot(delta.revision);
  });
  socket.on("session:resync-required", (payload: { sessionId?: string }) => { if (payload.sessionId === sessionId) requestSnapshot(); });
  socket.on("session:snapshot", (snapshot: unknown) => { apply(snapshot); });

  function send(event: string, value: { text: string } | { action: SessionControl["action"] }): Promise<CommandResult | null> {
    if (closed || !joined || !socket.connected || overlay) return Promise.resolve(null);
    const signature = `${event}:${JSON.stringify(value)}`;
    if (uncertain && uncertain.signature !== signature) return Promise.resolve(null);
    if (sending) return sending;
    uncertain ??= { signature, key: newIdempotencyKey(), event, value };
    sending = new Promise<CommandResult | null>((resolve) => {
      socket.timeout(TIMEOUT_MS).emit(event, { sessionId, ...value, idempotencyKey: uncertain!.key }, (err: Error | null, result: unknown) => {
        const parsed = commandResultSchema.safeParse(result);
        if (err || !parsed.success) { resolve(null); return; }
        uncertain = null;
        if (!closed && event === "session:control" && "action" in value && value.action === "restart" && parsed.data.code === "ACCEPTED_NEW") {
          handlers.onRestartAccepted?.(parsed.data.revision);
        }
        resolve(parsed.data);
      });
    }).finally(() => { sending = null; });
    return sending;
  }
  return {
    submit: text => send("session:command", { text }),
    control: action => send("session:control", { action }),
    retryPending: () => uncertain ? send(uncertain.event, uncertain.value) : Promise.resolve(null),
    hasPending: () => uncertain !== null,
    close: () => {
      closed = true; joined = false;
      clearTimeout(retryTimer); clearTimeout(resyncTimer); snapshotAbort?.abort();
      socket.removeAllListeners(); socket.close();
    },
  };
}
