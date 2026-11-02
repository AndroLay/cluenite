import { reactive } from "vue";
import { api, ApiError, record } from "../net/api";

// One shared answer to "who is signed in, and is chat listening?" for every site page. GET /api/me is asked once
// per page load (or again on request), so the menu, the status pill, and the page body never disagree.
//
// Contract (BACKEND_CONTRACTS.md): 200 {authenticated:true, profile:{login,displayName}, twitch:{connected,
// chatStatus}, csrfToken, expiresAt}; 401 when this browser has no host session. chatStatus is the server's chat
// worker status, not proof that a message has arrived.

/** The chat listener's state, in plain terms. */
export type ChatState = "listening" | "connecting" | "offline" | "revoked" | "error" | "unknown";

export type AccountState =
  | { kind: "checking" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; name: string; login: string; connected: boolean; chat: ChatState; csrf: string }
  | { kind: "unreachable"; detail: string };

export const account = reactive<{ state: AccountState }>({ state: { kind: "checking" } });

let pending: Promise<AccountState> | null = null;

export function chatStateOf(raw: unknown): ChatState {
  switch (raw) {
    case "connected":
      return "listening";
    case "connecting":
    case "reconnecting":
    case "starting":
      return "connecting";
    case "disconnected":
      return "offline";
    case "revoked":
      return "revoked";
    case "error":
      return "error";
    default:
      return "unknown";
  }
}

export const CHAT_LABELS: Record<ChatState, string> = {
  listening: "Chat is listening",
  connecting: "Connecting to chat",
  offline: "Chat is not connected",
  revoked: "Twitch access was revoked",
  error: "Chat connection error",
  unknown: "Chat status unknown",
};

async function ask(): Promise<AccountState> {
  try {
    const body = await api("/api/me");
    if (body?.authenticated !== true) return { kind: "signed-out" };
    const profile = record(body.profile);
    const twitch = record(body.twitch);
    const login = typeof profile?.login === "string" ? profile.login : "";
    const display = typeof profile?.displayName === "string" ? profile.displayName : "";
    return {
      kind: "signed-in",
      name: display || login || "your channel",
      login,
      connected: twitch?.connected === true,
      chat: chatStateOf(twitch?.chatStatus),
      csrf: typeof body.csrfToken === "string" ? body.csrfToken : "",
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { kind: "signed-out" };
    return { kind: "unreachable", detail: "The server could not be reached from this browser." };
  }
}

/** Coalesces concurrent checks; explicit refreshes run again after a completed check. */
export function checkAccount(force = false): Promise<AccountState> {
  if (pending) return pending;
  if (!force && account.state.kind !== "checking") return Promise.resolve(account.state);
  account.state = { kind: "checking" };
  pending = ask().then((state) => {
    account.state = state;
    return state;
  }).finally(() => { pending = null; });
  return pending;
}

export const TWITCH_START = "/api/auth/twitch/start";
