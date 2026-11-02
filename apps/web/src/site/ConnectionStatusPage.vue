<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { clearInvite, pendingInviteHref } from "./inviteContinuation";
import { api, ApiError, apiMessage } from "../net/api";
import GameShell from "./GameShell.vue";
import SiteIcon from "./SiteIcon.vue";
import { account, checkAccount, CHAT_LABELS, TWITCH_START } from "./account";
import { playUi } from "./uiSound";

// Twitch connection (S01). Without a result parameter, the page shows what GET /api/me reports for this browser.
// With one (set by the server after the Twitch callback, REQ-FE-005), it shows that outcome. "Connected" is shown
// only after GET /api/me confirms it; the result parameter alone never proves a connection. The revoked state
// comes only from the chat listener status, which the server reports for a signed-in host.

type Outcome = "connected" | "denied" | "invalid" | "state_rejected" | "unavailable" | "exchange_failed";
type Tone = "ok" | "warn" | "error" | "neutral";
interface OutcomeView {
  tone: Tone;
  heading: string;
  body: string;
  action?: { label: string; href: string };
}

const OUTCOMES: readonly string[] = ["connected", "denied", "invalid", "state_rejected", "unavailable", "exchange_failed"];
const rawResult = new URLSearchParams(window.location.search).get("result");
const outcome: Outcome | null = rawResult !== null && OUTCOMES.includes(rawResult) ? (rawResult as Outcome) : null;

const FAILURES: Record<Exclude<Outcome, "connected">, OutcomeView> = {
  denied: {
    tone: "warn",
    heading: "You declined on Twitch",
    body: "This authorization attempt was declined. Any existing connection is shown below. You can try again whenever you are ready.",
    action: { label: "Try again", href: TWITCH_START },
  },
  invalid: {
    tone: "error",
    heading: "That sign-in link expired",
    body: "The request was incomplete or too old. Start the connection again from here.",
    action: { label: "Start again", href: TWITCH_START },
  },
  state_rejected: {
    tone: "error",
    heading: "The sign-in did not match this browser",
    body: "Start again in the same browser window you use for Cluenite.",
    action: { label: "Start again", href: TWITCH_START },
  },
  unavailable: {
    tone: "warn",
    heading: "Twitch could not be reached",
    body: "Twitch or the server was busy. Wait a moment and try again.",
    action: { label: "Try again", href: TWITCH_START },
  },
  exchange_failed: {
    tone: "error",
    heading: "Twitch did not finish the sign-in",
    body: "Twitch rejected the last step. Try again.",
    action: { label: "Try again", href: TWITCH_START },
  },
};

const inviteHref = ref(pendingInviteHref());
const signingOut = ref(false);
const signOutNote = ref("");
async function signOut(): Promise<void> {
  if (signingOut.value || account.state.kind !== "signed-in") return;
  signingOut.value = true;
  // Explicit sign-out intent clears the same-tab bearer even if the server response is lost.
  clearInvite();
  inviteHref.value = null;
  try {
    await api("/api/auth/logout", { method: "POST", csrf: account.state.csrf });
    clearInvite();
    window.location.assign("/dashboard");
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 401) { clearInvite(); await checkAccount(true); }
    else signOutNote.value = apiMessage(cause);
  } finally { signingOut.value = false; }
}

const connected = computed(() => account.state.kind === "signed-in" && account.state.connected);

const view = computed<OutcomeView>(() => {
  if (outcome !== null && outcome !== "connected") return FAILURES[outcome];
  const state = account.state;
  if (state.kind === "signed-in" && state.connected) {
    if (state.chat === "revoked") {
      return {
        tone: "error",
        heading: "Twitch access was revoked",
        body: "Cluenite can no longer read your chat. Connect Twitch again to restore it.",
        action: { label: "Reconnect Twitch", href: TWITCH_START },
      };
    }
    if (state.chat === "connecting") {
      return {
        tone: "warn",
        heading: "Reconnecting Twitch chat",
        body: "You are signed in, but chat is not listening yet. Cluenite retries automatically. Use Check again to refresh this status, or reconnect your Twitch account.",
        action: { label: "Reconnect Twitch", href: TWITCH_START },
      };
    }
    if (state.chat !== "listening") {
      return {
        tone: state.chat === "error" ? "error" : "warn",
        heading: state.chat === "unknown" ? "Twitch chat status is unknown" : "Twitch chat is not connected",
        body: "You are signed in, but Cluenite has not confirmed that chat is listening. Your saved cases are kept. Reconnect Twitch, then check again before playing.",
        action: { label: "Reconnect Twitch", href: TWITCH_START },
      };
    }
    return {
      tone: "ok",
      heading: "You're connected",
      body: `Signed in as ${state.name}. Your chat can play as soon as you start a case.`,
      action: { label: "Pick a case", href: "/play" },
    };
  }
  if (state.kind === "checking") {
    return {
      tone: "neutral",
      heading: outcome === null ? "Checking your connection" : "Finishing the sign-in",
      body: "Asking the server about this browser. This takes a second.",
    };
  }
  if (state.kind === "unreachable") {
    return {
      tone: "error",
      heading: "The server is not answering",
      body: "Cluenite could not check your connection. Make sure the server is running, then check again.",
    };
  }
  if (outcome === "connected") {
    return {
      tone: "warn",
      heading: "Almost there",
      body: "Twitch sent you back, but the server does not confirm a connection for this browser yet. Check again, or connect once more.",
      action: { label: "Connect Twitch", href: TWITCH_START },
    };
  }
  return {
    tone: "warn",
    heading: "Connect your Twitch channel",
    body: "Cluenite reads the commands your chat types during a case. Connecting takes about ten seconds.",
    action: { label: "Connect Twitch", href: TWITCH_START },
  };
});

const linkState = computed(() => {
  if (account.state.kind === "checking") return "wait";
  if (connected.value && account.state.kind === "signed-in") {
    if (account.state.chat === "listening") return "on";
    if (account.state.chat === "connecting") return "wait";
    return account.state.chat === "revoked" || account.state.chat === "error" ? "error" : "off";
  }
  if (view.value.tone === "ok") return "on";
  if (view.value.tone === "error") return "error";
  return "off";
});

const chatLine = computed(() =>
  account.state.kind === "signed-in" ? CHAT_LABELS[account.state.chat] : CHAT_LABELS.unknown,
);
const chatTone = computed(() => {
  if (account.state.kind !== "signed-in") return "off";
  const chat = account.state.chat;
  if (chat === "listening") return "on";
  if (chat === "revoked" || chat === "error") return "error";
  return "wait";
});

const liveText = computed(() => `${view.value.heading}. ${view.value.body}`);

function recheck(): void {
  playUi("select");
  void checkAccount(true);
}

onMounted(() => {
  // After a Twitch callback the shared check may be stale, so ask again.
  void checkAccount(outcome !== null);
});
</script>

<template>
  <GameShell :focus-x="0.92" :focus-y="0.3" dim="strong">
    <section class="cx gs-card" :data-tone="view.tone" aria-labelledby="cx-title" data-enter style="--i: 0">
      <div class="cx-link" :data-state="linkState" aria-hidden="true">
        <span class="cx-node">
          <SiteIcon name="search" size="30px" :stroke="2" />
          <small>Cluenite</small>
        </span>
        <span class="cx-wire">
          <i></i><i></i><i></i>
          <span class="cx-badge">
            <SiteIcon v-if="linkState === 'on'" name="check" :stroke="2.6" />
            <SiteIcon v-else-if="linkState === 'wait'" name="spinner" class="gs-spin" />
            <SiteIcon v-else-if="linkState === 'error'" name="close" :stroke="2.4" />
            <SiteIcon v-else name="plug" />
          </span>
        </span>
        <span class="cx-node">
          <SiteIcon name="chat" size="30px" :stroke="2" />
          <small>Twitch</small>
        </span>
      </div>

      <h1 id="cx-title" class="cx-title">{{ view.heading }}</h1>
      <p class="cx-body">{{ view.body }}</p>

      <div class="cx-actions">
        <a v-if="account.state.kind === 'signed-in' && inviteHref" class="gs-btn gs-btn--gold gs-btn--lg" :href="inviteHref">Continue co-op invitation</a>
        <a v-if="view.action" class="gs-btn gs-btn--gold gs-btn--lg" :href="view.action.href" @click="playUi('select')">
          <SiteIcon :name="view.tone === 'ok' ? 'play' : 'plug'" />
          {{ view.action.label }}
        </a>
        <button
          v-if="account.state.kind !== 'checking'"
          type="button"
          class="gs-btn gs-btn--ghost gs-btn--lg"
          @click="recheck"
        >
          <SiteIcon name="restart" /> Check again
        </button>
      </div>

      <button v-if="account.state.kind === 'signed-in'" type="button" class="gs-btn gs-btn--ghost" :disabled="signingOut" @click="signOut">{{ signingOut ? 'Signing out…' : 'Sign out of this browser' }}</button>
      <p v-if="signOutNote" role="status">{{ signOutNote }}</p>
      <ul v-if="connected" class="cx-facts">
        <li>
          <span>Account</span>
          <strong>{{ account.state.kind === "signed-in" ? account.state.name : "" }}</strong>
        </li>
        <li>
          <span>Chat</span>
          <strong class="cx-chat" :data-tone="chatTone"><i aria-hidden="true"></i>{{ chatLine }}</strong>
        </li>
        <li>
          <span>Next</span>
          <a href="/setup">Add the overlay to OBS <SiteIcon name="arrow-right" /></a>
        </li>
      </ul>
      <ol v-else class="cx-how" aria-label="How connecting works">
        <li><b>1</b> Twitch asks you to approve Cluenite.</li>
        <li><b>2</b> You come back here on your own.</li>
        <li><b>3</b> Pick a case, and your chat can play.</li>
      </ol>

      <p class="visually-hidden" role="status" aria-live="polite">{{ liveText }}</p>
    </section>

    <p class="cx-foot" data-enter style="--i: 2">
      Just want to try it? <a href="/?view=quick">Play the sample case</a>. It needs no Twitch account.
    </p>
  </GameShell>
</template>

<style scoped>
.cx {
  width: min(640px, 100%);
  margin: 4vh auto 0;
  padding: 34px 34px 28px;
  text-align: center;
}
.cx-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 22px;
}
.cx-node {
  display: grid;
  place-items: center;
  gap: 2px;
  width: 92px;
  height: 92px;
  border: 2px solid #a77a48;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a3220, #160f0a);
  color: var(--gs-gold);
  box-shadow: 0 12px 28px #000a;
}
.cx-node small {
  color: #dccdb3;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cx-wire {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: min(200px, 34vw);
  height: 4px;
  margin: 0 -2px;
  background: repeating-linear-gradient(90deg, #a77a48 0 10px, transparent 10px 18px);
}
.cx-wire i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
}
.cx-badge {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 2px solid #a77a48;
  border-radius: 50%;
  background: #1a110b;
  color: #f0cd92;
  translate: -50% -50%;
  font-size: 18px;
}
.cx-link[data-state="on"] .cx-wire {
  background: linear-gradient(90deg, #9fd49a, #e7bf7c);
}
.cx-link[data-state="on"] .cx-badge {
  border-color: #9fd49a;
  background: #1f2a17;
  color: #c9ecc4;
}
.cx-link[data-state="on"] .cx-wire i {
  background: #fff3d6;
  box-shadow: 0 0 10px #fff3d6;
}
.cx-link[data-state="error"] .cx-badge {
  border-color: #e59a8a;
  color: #f0b4a4;
}
.cx-link[data-state="off"] .cx-wire {
  background: repeating-linear-gradient(90deg, #6b4a2c 0 10px, transparent 10px 18px);
}
html[data-motion="full"] .cx-link[data-state="on"] .cx-wire i {
  animation: cx-flow 1600ms linear infinite;
}
html[data-motion="full"] .cx-link[data-state="on"] .cx-wire i:nth-child(2) {
  animation-delay: 530ms;
}
html[data-motion="full"] .cx-link[data-state="on"] .cx-wire i:nth-child(3) {
  animation-delay: 1060ms;
}
html[data-motion="full"] .cx-link[data-state="wait"] .cx-wire {
  animation: cx-pulse 1200ms ease-in-out infinite;
}
@keyframes cx-flow {
  from {
    transform: translateX(-70px);
    opacity: 0;
  }
  30%,
  70% {
    opacity: 1;
  }
  to {
    transform: translateX(70px);
    opacity: 0;
  }
}
@keyframes cx-pulse {
  50% {
    opacity: 0.4;
  }
}
.cx-title {
  margin: 0;
  color: #f8eedc;
  font-family: var(--gs-serif);
  font-size: clamp(34px, 4vw, 46px);
  font-weight: 500;
  line-height: 1.08;
}
.cx-body {
  max-width: 480px;
  margin: 12px auto 0;
  color: #e0d1b7;
  font-size: 17px;
}
.cx-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}
.cx-facts,
.cx-how {
  display: grid;
  gap: 8px;
  margin: 26px 0 0;
  padding: 16px 0 0;
  border-top: 1px solid #ffffff14;
  list-style: none;
  text-align: left;
}
.cx-facts li {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  font-size: 15px;
}
.cx-facts span {
  color: #bfae94;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cx-facts a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--gs-gold-hi);
  font-weight: 600;
}
.cx-chat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.cx-chat i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #f0b45e;
}
.cx-chat[data-tone="on"] i {
  background: #9fd49a;
  box-shadow: 0 0 8px #9fd49a;
}
.cx-chat[data-tone="error"] i {
  background: #e59a8a;
}
.cx-how li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #e0d1b7;
}
.cx-how b {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border: 1px solid #a77a48;
  border-radius: 50%;
  color: #f0cd92;
  font-size: 13px;
}
.cx-foot {
  margin: 18px auto 0;
  color: #cdbca1;
  text-align: center;
}
.cx-foot a {
  color: var(--gs-gold-hi);
  font-weight: 600;
}
@media (max-width: 760px) {
  .cx {
    padding: 26px 18px 22px;
  }
  .cx-node {
    width: 72px;
    height: 72px;
  }
}
</style>
