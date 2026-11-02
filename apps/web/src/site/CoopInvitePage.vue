<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import PlateFrame from "./PlateFrame.vue";
import { account, checkAccount, TWITCH_START } from "./account";
import { clearInvite, pendingInvite, rememberInvite, validInvite } from "./inviteContinuation";
import { api, ApiError, apiMessage } from "../net/api";
import { newIdempotencyKey } from "../net/idempotency";

type Stage = "checking" | "invalid-link" | "signed-out" | "unavailable" | "ready" | "busy" | "accepted" | "declined" | "closed";
type Action = "accept" | "decline" | "recheck";
interface InviteView {
  tone: "ok" | "warn" | "error" | "neutral";
  heading: string;
  body: string;
  href?: { label: string; href: string };
  buttons: { label: string; kind: Action }[];
}
const rawId = new URLSearchParams(window.location.search).get("invite") ?? "";
const rawToken = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
const saved = pendingInvite();
const fromLink = validInvite(rawId, rawToken);
const recover = !rawToken && saved && (!rawId || saved.id === rawId);
let inviteId: string | null = fromLink ? rawId : recover ? saved.id : null;
let inviteToken: string | null = fromLink ? rawToken : recover ? saved.token : null;
if (fromLink) rememberInvite(rawId, rawToken);
if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);

const stage = ref<Stage>("checking");
const accountName = ref("");
const detail = ref("");
const sessionId = ref("");
const pendingAction = ref<"accept" | "decline">("accept");
const uncertain = ref<"accept" | "decline" | null>(null);
const notice = ref<{ tone: "warn" | "error"; text: string } | null>(null);
const keys = new Map<string, string>();
function forget(): void { clearInvite(); inviteId = null; inviteToken = null; keys.clear(); uncertain.value = null; }
async function start(): Promise<void> {
  if (!inviteId || !inviteToken) { stage.value = "invalid-link"; return; }
  stage.value = "checking";
  const auth = await checkAccount(true);
  if (auth.kind === "signed-out") { stage.value = "signed-out"; return; }
  if (auth.kind !== "signed-in" || !auth.csrf) { stage.value = "unavailable"; return; }
  accountName.value = auth.name;
  stage.value = "ready";
}
async function respond(action: "accept" | "decline"): Promise<void> {
  if (stage.value !== "ready" || !inviteId || !inviteToken || account.state.kind !== "signed-in") return;
  if (uncertain.value && action !== uncertain.value) return;
  pendingAction.value = action;
  stage.value = "busy"; notice.value = null;
  const key = keys.get(action) ?? newIdempotencyKey();
  keys.set(action, key);
  try {
    const body = await api(`/api/coops/invitations/${encodeURIComponent(inviteId)}/${action}`, {
      method: "POST", csrf: account.state.csrf, key, body: { token: inviteToken },
    });
    if (action === "accept") {
      if (typeof body.sessionId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(body.sessionId)) throw new ApiError(0, "response_incomplete");
      sessionId.value = body.sessionId;
    }
    stage.value = action === "accept" ? "accepted" : "declined";
    forget();
  } catch (cause) {
    uncertain.value = action;
    if (cause instanceof ApiError && (cause.status === 401 || cause.code === "csrf_rejected")) {
      await start();
    } else if (cause instanceof ApiError && ["coop_invite_conflict", "coop_invite_expired", "coop_invite_not_available", "invalid_invite_id", "invalid_coop_invite_token"].includes(cause.code)) {
      detail.value = apiMessage(cause); stage.value = "closed"; forget();
    } else { stage.value = "ready"; }
    notice.value = { tone: "warn", text: apiMessage(cause) };
  }
}
function onButton(action: Action): void {
  if (action === "recheck") void start();
  else void respond(action);
}
const view = computed<InviteView>(() => {
  const buttons: InviteView["buttons"] = uncertain.value
    ? [{ label: `Retry ${uncertain.value === "accept" ? "acceptance" : "decline"}`, kind: uncertain.value }]
    : [{ label: "Accept invitation", kind: "accept" }, { label: "Decline invitation", kind: "decline" }];
  switch (stage.value) {
    case "checking": return { tone: "neutral", heading: "Checking your invitation.", body: "Checking this browser's Twitch sign-in.", buttons: [] };
    case "invalid-link": return { tone: "error", heading: "This invitation link is incomplete.", body: "Open the complete invitation from your host. A stored invitation expires after 20 minutes in this tab.", buttons: [] };
    case "signed-out": return { tone: "warn", heading: "Sign in to respond.", body: "Use the Twitch account named in the invitation. After signing in, choose Continue co-op invitation. If your browser blocks tab storage, reopen the original link.", href: { label: "Sign in with Twitch", href: TWITCH_START }, buttons: [] };
    case "unavailable": return { tone: "error", heading: "Your sign-in could not be checked.", body: "Check the connection, then try again. Your invitation is retained in this tab briefly.", buttons: [{ label: "Check again", kind: "recheck" }] };
    case "ready": return { tone: "neutral", heading: "Join a co-op investigation.", body: `Signed in as ${accountName.value}. Accept to join as Team B, or decline. The server checks that this invitation belongs to your account.`, buttons };
    case "busy": return { tone: "neutral", heading: "Recording your response.", body: "Keep this page open while the server confirms your choice.", buttons: [] };
    case "accepted": return { tone: "ok", heading: "Invitation accepted.", body: "Your channel has joined as Team B. Open your workstation; the host starts the round when both teams are ready.", href: { label: "Open your co-op session", href: `/?session=${encodeURIComponent(sessionId.value)}` }, buttons: [] };
    case "declined": return { tone: "warn", heading: "Invitation declined.", body: "Your choice has been saved.", href: { label: "Return to co-op", href: "/coop" }, buttons: [] };
    case "closed": return { tone: "warn", heading: "This invitation cannot be used.", body: detail.value, buttons: [] };
    default: return { tone: "error", heading: "The invitation could not be checked.", body: "Check your connection and try again.", buttons: [{ label: "Check again", kind: "recheck" }] };
  }
});
onMounted(() => { void start(); });
</script>

<template>
  <PlateFrame :wrap="false">
    <div class="auth-ambient" aria-hidden="true"></div>

    <div class="inner">
      <section class="auth-card panel" aria-labelledby="invite-title">
        <div class="auth-head">
          <h1 id="invite-title" class="auth-title">Co-op invitation.</h1>
          <p class="auth-sub">Accept or decline a co-op invitation from the host.</p>
        </div>

        <div class="auth-states auth-states--single">
          <article
            class="mini-card auth-state"
            aria-live="polite"
            :aria-busy="stage === 'busy' ? 'true' : undefined"
          >
            <div v-if="view.tone !== 'neutral'" class="tile-icon" :class="`tile-${view.tone}`" aria-hidden="true">
              <svg v-if="view.tone === 'ok'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3.5 12.6 9.3 18.2 20.5 6.2" />
              </svg>
              <svg v-else-if="view.tone === 'warn'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.2 12a7.8 7.8 0 1 0 2.4-5.6" />
                <path d="M4 3.8v4.6h4.6" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 5v9.5" />
                <path d="M12 18.6h.01" />
              </svg>
            </div>
            <h3>{{ view.heading }}</h3>
            <p>{{ view.body }}</p>
            <a v-if="view.href" class="btn gold" :href="view.href.href">{{ view.href.label }}</a>
            <div v-if="view.buttons.length" class="auth-actions">
              <button
                v-for="button in view.buttons"
                :key="button.kind"
                class="btn"
                :class="button.kind === 'accept' ? 'gold' : 'ghost'"
                type="button"
                @click="onButton(button.kind)"
              >
                {{ button.label }}
              </button>
            </div>
            <p v-if="notice" class="auth-notice" :class="`is-${notice.tone}`">{{ notice.text }}</p>
          </article>
        </div>
      </section>
    </div>
  </PlateFrame>
</template>

<style scoped>
.auth-head {
  text-align: center;
}
/* Matches the S01 title measurement against the reference. */
/* The page title is the page's h1; these values keep the h2 look it had before. */
.site .plate .auth-title {
  text-align: center;
  font-size: 45px;
  line-height: 1.04;
  letter-spacing: 0;
  margin-top: 10px;
}
.auth-sub {
  margin: 10px auto 0;
  max-width: 620px;
}
.site .plate .auth-states {
  margin-top: 32px;
}
/* One live card is centered at the width of one reference card. */
.site .plate .auth-states.auth-states--single {
  grid-template-columns: minmax(0, 1fr);
  max-width: 460px;
  margin-left: auto;
  margin-right: auto;
}
.site .plate .auth-state {
  padding: 35px 22px 26px;
}
.site .plate .auth-state h3,
.site .plate .auth-state p {
  text-wrap: wrap;
}
.auth-state > .btn,
.auth-actions {
  margin-top: auto;
}
.auth-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.auth-notice {
  margin: 14px 0 0;
  font-size: 14px;
}
.auth-notice.is-warn {
  color: #e7bd80;
}
.auth-notice.is-error {
  color: #e5a394;
}
.tile-ok {
  border-color: #5f8a5b;
  color: #a7cc9a;
}
.tile-warn {
  border-color: #986737;
  color: #e7bd80;
}
.tile-error {
  border-color: #7e3f38;
  color: #e5a394;
}
</style>
