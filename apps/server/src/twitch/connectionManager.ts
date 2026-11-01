import type { ChatActionEnvelope } from "@cluenite/contracts";
import { createRateLimiter } from "../rounds.js";
import type { ConnectionStatus as RealtimeConnectionStatus } from "@cluenite/contracts";
import type {
  SessionStore,
  DecryptedTwitchAccount,
  TwitchTokenSet,
} from "../auth/sessionStore.js";
import type { PostgresRoundRepository } from "../db/roundRepository.js";
import {
  normalizeChatNotification,
  parseEventSubMessage,
} from "./chatEnvelope.js";
import { TwitchApi, TwitchAuthorizationExpiredError } from "./twitchApi.js";

const EVENTSUB_URL = "wss://eventsub.wss.twitch.tv/ws";
const MAX_RECONNECT_ATTEMPTS = 8;

export interface EventSubSocket {
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: EventSubEvent) => void,
  ): void;
  close(code?: number, reason?: string): void;
}

export interface EventSubEvent {
  readonly data?: unknown;
  readonly code?: number;
}

export type EventSubSocketFactory = (url: string) => EventSubSocket;

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "revoked"
  | "error";

export interface TwitchConnectionDiagnostics {
  readonly status: ConnectionStatus;
  readonly activeSubscriptions: number;
  readonly lastNotificationAt: string | null;
}

export type TwitchConnectionStatusListener = (
  twitchUserId: string,
  status: RealtimeConnectionStatus,
) => void;

interface WorkerState {
  status: ConnectionStatus;
  statusSince: string;
  socket: EventSubSocket | null;
  handoffSocket: EventSubSocket | null;
  handoffTimer: ReturnType<typeof setTimeout> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  validationTimer: ReturnType<typeof setTimeout> | null;
  retries: number;
  subscriptionActive: boolean;
  lastNotificationAt: string | null;
  leaderOwnerId: string | null;
  leaderEpoch: number | null;
  stopped: boolean;
}

export interface EventSubLeaderIdentity {
  readonly ownerId: string;
  readonly epoch: number;
}

function defaultSocketFactory(url: string): EventSubSocket {
  return new WebSocket(url) as unknown as EventSubSocket;
}

function asText(value: unknown): Promise<string | null> {
  if (typeof value === "string") return Promise.resolve(value);
  if (value instanceof ArrayBuffer)
    return Promise.resolve(Buffer.from(value).toString("utf8"));
  if (ArrayBuffer.isView(value))
    return Promise.resolve(
      Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString(
        "utf8",
      ),
    );
  if (typeof Blob !== "undefined" && value instanceof Blob) return value.text();
  return Promise.resolve(null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeReconnectUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "wss:" ||
      url.hostname !== "eventsub.wss.twitch.tv" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== ""
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export class TwitchConnectionManager {
  private readonly workers = new Map<string, WorkerState>();
  private readonly actorLimiter = createRateLimiter(5, 5_000);
  private readonly socketFactory: EventSubSocketFactory;
  private shutdownStarted = false;

  constructor(
    private readonly api: TwitchApi,
    private readonly sessions: SessionStore,
    private readonly rounds: PostgresRoundRepository,
    socketFactory: EventSubSocketFactory = defaultSocketFactory,
    private readonly now: () => number = Date.now,
    private readonly onAccountRevoked?: (
      twitchUserId: string,
    ) => void | Promise<void>,
    private readonly leaderIdentity?: () => EventSubLeaderIdentity | null,
    private readonly onStatusChange?: TwitchConnectionStatusListener,
  ) {
    this.socketFactory = socketFactory;
  }

  statusForUser(twitchUserId: string): ConnectionStatus {
    return this.workers.get(twitchUserId)?.status ?? "disconnected";
  }

  diagnosticsForUser(twitchUserId: string): TwitchConnectionDiagnostics {
    const state = this.workers.get(twitchUserId);
    return {
      status: state?.status ?? "disconnected",
      activeSubscriptions: state?.subscriptionActive ? 1 : 0,
      lastNotificationAt: state?.lastNotificationAt ?? null,
    };
  }

  connectionStatusForUser(twitchUserId: string): RealtimeConnectionStatus {
    const state = this.workers.get(twitchUserId);
    return {
      provider: "twitch",
      state: this.toRealtimeStatus(state?.status ?? "disconnected"),
      since: state?.statusSince ?? null,
    };
  }

  async startAll(): Promise<void> {
    const userIds = await this.sessions.listActiveTwitchUserIds();
    await Promise.all(userIds.map((userId) => this.startUser(userId)));
  }

  async startUser(twitchUserId: string): Promise<void> {
    if (this.shutdownStarted) return;
    const leader = this.leaderIdentity?.() ?? null;
    if (this.leaderIdentity && !leader) return;
    let state = this.workers.get(twitchUserId);
    if (!state) {
      state = {
        status: "disconnected",
        statusSince: new Date(this.now()).toISOString(),
        socket: null,
        handoffSocket: null,
        handoffTimer: null,
        reconnectTimer: null,
        validationTimer: null,
        retries: 0,
        subscriptionActive: false,
        lastNotificationAt: null,
        leaderOwnerId: null,
        leaderEpoch: null,
        stopped: false,
      };
      this.workers.set(twitchUserId, state);
    } else if (state.status === "connected" || state.status === "connecting") {
      return;
    }
    state.stopped = false;
    state.retries = 0;
    state.subscriptionActive = false;
    state.leaderOwnerId = leader?.ownerId ?? null;
    state.leaderEpoch = leader?.epoch ?? null;
    this.clearTimer(state.reconnectTimer);
    state.reconnectTimer = null;
    this.setStatus(twitchUserId, state, "connecting");
    try {
      const account = await this.ensureValidAccount(twitchUserId);
      this.scheduleValidation(twitchUserId, account);
      this.openSocket(
        twitchUserId,
        state,
        account,
        EVENTSUB_URL,
        "primary",
        null,
      );
    } catch {
      if (this.statusForUser(twitchUserId) === "revoked") return;
      this.setStatus(twitchUserId, state, "error");
      this.scheduleReconnect(twitchUserId, state);
    }
  }

  async stopUser(twitchUserId: string): Promise<void> {
    const state = this.workers.get(twitchUserId);
    if (!state) return;
    state.stopped = true;
    this.setStatus(twitchUserId, state, "disconnected");
    state.subscriptionActive = false;
    this.clearTimer(state.reconnectTimer);
    this.clearTimer(state.validationTimer);
    this.clearTimer(state.handoffTimer);
    state.reconnectTimer = null;
    state.validationTimer = null;
    state.handoffTimer = null;
    const sockets = [state.socket, state.handoffSocket];
    state.socket = null;
    state.handoffSocket = null;
    for (const socket of sockets) socket?.close(1000, "worker stopped");
  }

  async handleHostLogout(twitchUserId: string): Promise<void> {
    if (!(await this.sessions.hasActiveHostSession(twitchUserId)))
      await this.stopUser(twitchUserId);
  }

  async shutdown(): Promise<void> {
    this.shutdownStarted = true;
    await this.stopAll();
  }

  async stopAll(): Promise<void> {
    await Promise.all(
      [...this.workers.keys()].map((userId) => this.stopUser(userId)),
    );
  }

  private async ensureValidAccount(
    twitchUserId: string,
  ): Promise<DecryptedTwitchAccount> {
    let account = await this.sessions.loadTwitchAccount(twitchUserId);
    if (!account) throw new Error("Twitch account is unavailable.");
    let validation: Awaited<ReturnType<TwitchApi["validateToken"]>>;
    let needsRefresh: boolean;
    try {
      validation = await this.api.validateToken(account.accessToken);
      if (
        validation.user_id !== twitchUserId ||
        !validation.scopes.includes("user:read:chat")
      ) {
        await this.sessions.markTwitchRevoked(twitchUserId);
        const state = this.workers.get(twitchUserId);
        if (state) this.setStatus(twitchUserId, state, "revoked");
        await this.onAccountRevoked?.(twitchUserId);
        throw new Error(
          "Stored Twitch authorization does not match the connected broadcaster.",
        );
      }
      needsRefresh =
        validation.expires_in < 300 ||
        account.tokenExpiresAt.getTime() - this.now() < 300_000;
    } catch (error) {
      if (error instanceof TwitchAuthorizationExpiredError) needsRefresh = true;
      else throw error;
    }

    if (needsRefresh) {
      let rotated: TwitchTokenSet;
      try {
        rotated = await this.api.refreshToken(account.refreshToken);
      } catch (error) {
        if (error instanceof TwitchAuthorizationExpiredError) {
          await this.sessions.markTwitchRevoked(twitchUserId);
          const state = this.workers.get(twitchUserId);
          if (state) this.setStatus(twitchUserId, state, "revoked");
          await this.onAccountRevoked?.(twitchUserId);
        }
        throw error;
      }
      if (!rotated.scopes.includes("user:read:chat")) {
        await this.sessions.markTwitchRevoked(twitchUserId);
        const state = this.workers.get(twitchUserId);
        if (state) this.setStatus(twitchUserId, state, "revoked");
        await this.onAccountRevoked?.(twitchUserId);
        throw new Error("Refreshed Twitch token is missing chat scope.");
      }
      await this.sessions.saveTwitchAccount(account.identity, rotated);
      account = await this.sessions.loadTwitchAccount(twitchUserId);
      if (!account)
        throw new Error("Refreshed Twitch authorization could not be loaded.");
      validation = await this.api.validateToken(account.accessToken);
      if (
        validation.user_id !== twitchUserId ||
        !validation.scopes.includes("user:read:chat")
      ) {
        await this.sessions.markTwitchRevoked(twitchUserId);
        const state = this.workers.get(twitchUserId);
        if (state) this.setStatus(twitchUserId, state, "revoked");
        await this.onAccountRevoked?.(twitchUserId);
        throw new Error("Refreshed Twitch authorization did not validate.");
      }
    }
    await this.sessions.markTokenValidated(twitchUserId);
    return account;
  }

  private scheduleValidation(
    twitchUserId: string,
    account: DecryptedTwitchAccount,
  ): void {
    const state = this.workers.get(twitchUserId);
    if (!state) return;
    this.clearTimer(state.validationTimer);
    const untilExpiry = account.tokenExpiresAt.getTime() - this.now() - 300_000;
    const delay = Math.max(60_000, Math.min(60 * 60_000, untilExpiry));
    state.validationTimer = setTimeout(() => {
      void this.validateAndRefresh(twitchUserId, state);
    }, delay);
  }

  private async validateAndRefresh(
    twitchUserId: string,
    state: WorkerState,
  ): Promise<void> {
    if (state.stopped) return;
    try {
      const account = await this.ensureValidAccount(twitchUserId);
      if (state.status === "connected") {
        const old = state.socket;
        state.socket = null;
        state.subscriptionActive = false;
        old?.close(1000, "token lifecycle refresh");
        this.setStatus(twitchUserId, state, "connecting");
        this.openSocket(
          twitchUserId,
          state,
          account,
          EVENTSUB_URL,
          "primary",
          null,
        );
      }
      this.scheduleValidation(twitchUserId, account);
    } catch {
      if (state.status !== "revoked") {
        this.setStatus(twitchUserId, state, "error");
        this.scheduleReconnect(twitchUserId, state);
      }
    }
  }

  private openSocket(
    twitchUserId: string,
    state: WorkerState,
    account: DecryptedTwitchAccount,
    url: string,
    mode: "primary" | "handoff",
    oldSocket: EventSubSocket | null,
  ): void {
    let socket: EventSubSocket;
    try {
      socket = this.socketFactory(url);
    } catch {
      this.setStatus(twitchUserId, state, "error");
      if (mode === "handoff") state.handoffSocket = null;
      else this.scheduleReconnect(twitchUserId, state);
      return;
    }
    if (mode === "primary") state.socket = socket;
    else {
      state.handoffSocket = socket;
      this.clearTimer(state.handoffTimer);
      state.handoffTimer = setTimeout(() => {
        if (state.handoffSocket !== socket) return;
        state.handoffSocket = null;
        state.handoffTimer = null;
        socket.close(4000, "reconnect handoff timeout");
        if (state.socket) this.setStatus(twitchUserId, state, "connected");
        else this.scheduleReconnect(twitchUserId, state);
      }, 10_000);
    }
    let welcomed = false;
    let keepAliveDelayMs = 10_000;
    let keepAliveTimer: ReturnType<typeof setTimeout> | null = null;
    const clearKeepAlive = (): void => {
      this.clearTimer(keepAliveTimer);
      keepAliveTimer = null;
    };

    socket.addEventListener("message", (event) => {
      void (async () => {
        const data = await asText(event.data);
        if (data === null) return;
        const message = parseEventSubMessage(data);
        if (!message) return;
        const messageType = message.metadata.message_type;
        if (messageType === "session_welcome") {
          const session = message.payload.session;
          if (!isRecord(session) || typeof session.id !== "string") {
            socket.close(1002, "invalid welcome");
            return;
          }
          welcomed = true;
          clearKeepAlive();
          const timeoutSeconds =
            typeof session.keepalive_timeout_seconds === "number"
              ? Math.max(10, Math.min(600, session.keepalive_timeout_seconds))
              : 10;
          keepAliveDelayMs = timeoutSeconds * 1000;
          keepAliveTimer = setTimeout(
            () => socket.close(4000, "keepalive timeout"),
            keepAliveDelayMs + 1_000,
          );

          if (mode === "handoff") {
            if (state.handoffSocket !== socket) return;
            this.clearTimer(state.handoffTimer);
            state.handoffTimer = null;
            state.socket = socket;
            state.handoffSocket = null;
            this.setStatus(twitchUserId, state, "connected");
            state.retries = 0;
            oldSocket?.close(1000, "connection migrated");
            return;
          }
          if (state.socket !== socket || state.stopped) return;
          try {
            await this.api.subscribeChat(
              account.accessToken,
              twitchUserId,
              session.id,
            );
            state.subscriptionActive = true;
            this.setStatus(twitchUserId, state, "connected");
            state.retries = 0;
          } catch {
            state.subscriptionActive = false;
            this.setStatus(twitchUserId, state, "error");
            socket.close(1011, "subscription failed");
          }
          return;
        }
        if (messageType === "session_keepalive") {
          if (welcomed) {
            clearKeepAlive();
            keepAliveTimer = setTimeout(
              () => socket.close(4000, "keepalive timeout"),
              keepAliveDelayMs + 1_000,
            );
          }
          return;
        }
        if (messageType === "session_reconnect") {
          if (mode !== "primary" || state.socket !== socket) return;
          const payloadSession = message.payload.session;
          const reconnectUrl = isRecord(payloadSession)
            ? safeReconnectUrl(payloadSession.reconnect_url)
            : null;
          if (!reconnectUrl || state.handoffSocket) {
            socket.close(1011, "invalid reconnect handoff");
            return;
          }
          this.openSocket(
            twitchUserId,
            state,
            account,
            reconnectUrl,
            "handoff",
            socket,
          );
          return;
        }
        if (messageType === "revocation") {
          await this.sessions.markTwitchRevoked(twitchUserId);
          state.subscriptionActive = false;
          this.setStatus(twitchUserId, state, "revoked");
          state.stopped = true;
          await this.onAccountRevoked?.(twitchUserId);
          socket.close(1000, "authorization revoked");
          return;
        }
        if (messageType === "notification") {
          const envelope = normalizeChatNotification(message, twitchUserId);
          if (envelope) {
            state.lastNotificationAt = new Date(this.now()).toISOString();
            await this.processChat(envelope, state);
          }
        }
      })().catch(() => {
        this.setStatus(twitchUserId, state, "error");
      });
    });

    socket.addEventListener("close", () => {
      clearKeepAlive();
      if (state.stopped) return;
      if (state.handoffSocket === socket) {
        state.handoffSocket = null;
        this.clearTimer(state.handoffTimer);
        state.handoffTimer = null;
        if (state.socket) this.setStatus(twitchUserId, state, "connected");
        return;
      }
      if (state.socket !== socket) return;
      state.socket = null;
      state.subscriptionActive = false;
      if (state.handoffSocket) {
        const pendingHandoff = state.handoffSocket;
        state.handoffSocket = null;
        this.clearTimer(state.handoffTimer);
        state.handoffTimer = null;
        pendingHandoff.close(4000, "old connection ended before handoff");
      }
      this.setStatus(twitchUserId, state, "reconnecting");
      this.scheduleReconnect(twitchUserId, state);
    });
    socket.addEventListener("error", () => {
      if (state.socket === socket || state.handoffSocket === socket)
        this.setStatus(twitchUserId, state, "reconnecting");
    });
  }

  private async processChat(
    envelope: ChatActionEnvelope,
    state: WorkerState,
  ): Promise<void> {
    if (!this.actorLimiter.take(envelope.actorTwitchId)) return;
    const membership = await this.rounds.findActiveSessionForBroadcaster(
      envelope.originBroadcasterId,
    );
    if (!membership) return;
    const canonicalMessageId =
      envelope.sourceMessageId ?? envelope.twitchMessageId;
    await this.rounds.applyInput({
      sessionId: membership.sessionId,
      inputId: `twitch:${envelope.originBroadcasterId}:${canonicalMessageId}`,
      eventSubMessageId: envelope.eventSubMessageId,
      actorTwitchId: envelope.actorTwitchId,
      text: envelope.text,
      source: "twitch",
      channelId: envelope.originBroadcasterId,
      ...(state.leaderOwnerId && state.leaderEpoch !== null
        ? {
            leaderOwnerId: state.leaderOwnerId,
            leaderEpoch: state.leaderEpoch,
          }
        : {}),
      originBroadcasterId: envelope.originBroadcasterId,
      sourceMessageId: canonicalMessageId,
    });
  }

  private scheduleReconnect(twitchUserId: string, state: WorkerState): void {
    if (state.stopped || this.shutdownStarted || state.reconnectTimer) return;
    if (state.retries >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus(twitchUserId, state, "error");
      return;
    }
    const attempt = state.retries++;
    const delay = Math.min(30_000, 1_000 * 2 ** attempt);
    this.setStatus(twitchUserId, state, "reconnecting");
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      if (state.stopped) return;
      void this.reconnect(twitchUserId, state);
    }, delay);
  }

  private async reconnect(
    twitchUserId: string,
    state: WorkerState,
  ): Promise<void> {
    try {
      const account = await this.ensureValidAccount(twitchUserId);
      this.scheduleValidation(twitchUserId, account);
      if (state.socket) {
        state.socket.close(1012, "reconnecting");
        state.socket = null;
      }
      this.openSocket(
        twitchUserId,
        state,
        account,
        EVENTSUB_URL,
        "primary",
        null,
      );
    } catch {
      if (state.status !== "revoked") {
        this.setStatus(twitchUserId, state, "error");
        this.scheduleReconnect(twitchUserId, state);
      }
    }
  }

  private setStatus(
    twitchUserId: string,
    state: WorkerState,
    status: ConnectionStatus,
  ): void {
    if (state.status === status) return;
    state.status = status;
    state.statusSince = new Date(this.now()).toISOString();
    try {
      this.onStatusChange?.(twitchUserId, {
        provider: "twitch",
        state: this.toRealtimeStatus(status),
        since: state.statusSince,
      });
    } catch {
      // A status observer must not interrupt EventSub lifecycle management.
    }
  }

  private toRealtimeStatus(
    status: ConnectionStatus,
  ): RealtimeConnectionStatus["state"] {
    if (status === "connected") return "ONLINE";
    if (status === "revoked") return "REVOKED";
    if (status === "connecting" || status === "reconnecting")
      return "RECONNECTING";
    return "OFFLINE";
  }

  private clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
    if (timer) clearTimeout(timer);
  }
}
