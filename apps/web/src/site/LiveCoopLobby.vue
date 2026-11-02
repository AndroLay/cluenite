<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { SessionSummary } from "@cluenite/contracts";
import SessionList from "./SessionList.vue";
import CaseSwitchNotice from "./CaseSwitchNotice.vue";
import { account, checkAccount, TWITCH_START } from "./account";
import { api, ApiError, apiMessage } from "../net/api";
import { newIdempotencyKey } from "../net/idempotency";
import { listSessions } from "./sessions";
import { launchSession, newSessionLaunch, type SessionLaunchAttempt } from "./sessionLaunch";

const props = withDefaults(defineProps<{ caseId: string; caseTitle?: string }>(), { caseTitle: "this co-op case" });
const session = ref("");
const sessions = ref<SessionSummary[]>([]);
const createdSession = ref<SessionSummary | null>(null);
const picker = ref<InstanceType<typeof SessionList> | null>(null);
const login = ref("");
const busy = ref(false);
const note = ref("");
const shared = ref(false);
const lost = ref(false);
const expires = ref("");
const selected = computed(() => (sessions.value.find(row => row.sessionId === session.value) ?? (createdSession.value?.sessionId === session.value ? createdSession.value : undefined)));
const canInvite = computed(() => selected.value?.role === "host" && !selected.value.needsRejoin && selected.value.phase === "COOP_WAITING");
const createAttempt = ref<SessionLaunchAttempt | null>(null);
const pendingSwitch = ref<SessionSummary | null>(null);
let invitation: { signature: string; key: string } | null = null;
let link: string | null = null;
const invitee = ref("");
function loaded(rows: SessionSummary[]): void { sessions.value = rows; }
function choose(id: string): void {
  session.value = id;
  link = null; shared.value = false; lost.value = false; note.value = ""; invitation = null;
}
async function create(): Promise<void> {
  if (pendingSwitch.value && createAttempt.value?.previousSessionId) return;
  await createLobby(false);
}
async function switchCase(): Promise<void> { await createLobby(true); }
async function createLobby(replace: boolean): Promise<void> {
  if (busy.value || account.state.kind !== "signed-in") return;
  if (replace && !pendingSwitch.value) return;
  busy.value = true; note.value = "";
  try {
    if (!replace) {
      const current = (await listSessions()).find(row => row.role === "host" && !row.needsRejoin);
      if (current && current.caseId !== props.caseId) { pendingSwitch.value = current; createAttempt.value = null; return; }
      if (current) {
        createdSession.value = current;
        createAttempt.value = null; pendingSwitch.value = null;
        choose(current.sessionId);
        return;
      }
    }
    if (replace && createAttempt.value?.previousSessionId !== pendingSwitch.value?.sessionId) {
      createAttempt.value = newSessionLaunch(props.caseId, pendingSwitch.value?.sessionId);
    }
    createAttempt.value ??= newSessionLaunch(props.caseId);
    const snapshot = await launchSession(createAttempt.value, account.state.csrf);
    createAttempt.value = null; pendingSwitch.value = null;
    createdSession.value = { sessionId: snapshot.sessionId, caseId: snapshot.caseId, title: snapshot.title, phase: snapshot.phase, revision: snapshot.revision, team: "A", role: "host", needsRejoin: false, updatedAt: new Date().toISOString() };
    await picker.value?.reload();
    choose(snapshot.sessionId);
    note.value = "Co-op lobby created. Invite your partner before starting the round.";
  } catch (cause) {
    if (createAttempt.value?.stopConfirmed) void picker.value?.reload();
    if (cause instanceof ApiError && cause.code === "case_launch_ended") { createAttempt.value = null; pendingSwitch.value = null; }
    if (cause instanceof ApiError && cause.code === "idempotency_conflict") {
      try {
        const current = (await listSessions()).find(row => row.role === "host" && !row.needsRejoin);
        if (current && current.caseId !== props.caseId) { pendingSwitch.value = current; createAttempt.value = null; }
      } catch { /* Keep the retained action for retry if discovery is unavailable. */ }
    }
    note.value = cause instanceof ApiError && cause.code === "case_stop_not_accepted"
      ? "The current case could not be stopped. No new lobby was created. Retry switching, or continue it."
      : cause instanceof ApiError && cause.code === "case_launch_ended"
      ? "That lobby has already ended. Choose Create co-op lobby to start a new one."
      : apiMessage(cause);
    if (cause instanceof ApiError && (cause.status === 401 || cause.code === "csrf_rejected")) void checkAccount(true);
  }
  finally { busy.value = false; }
}
async function invite(): Promise<void> {
  if (busy.value || !canInvite.value || account.state.kind !== "signed-in") return;
  const normalized = login.value.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,25}$/.test(normalized)) { note.value = "Enter your partner's Twitch username (4–25 letters, numbers, or underscores)."; return; }
  if ((shared.value || lost.value) && !window.confirm("Create a replacement invitation? Share the new link with your partner.")) return;
  const signature = `${session.value}:${normalized}`;
  if (lost.value) invitation = null;
  invitation = invitation?.signature === signature ? invitation : { signature, key: newIdempotencyKey() };
  busy.value = true; note.value = "";
  try {
    const body = await api("/api/coops/invitations", { method: "POST", csrf: account.state.csrf, key: invitation.key, body: { sessionId: session.value, inviteeLogin: normalized } });
    if (typeof body.url !== "string" || typeof body.expiresAt !== "string") throw new ApiError(0, "response_incomplete");
    const parsed = new window.URL(body.url);
    if (parsed.origin !== window.location.origin || parsed.pathname !== '/coop/invite' || !parsed.hash) throw new ApiError(0, "response_incomplete");
    invitation = null;
    link = body.url; shared.value = true; lost.value = false; expires.value = body.expiresAt;
    const identity = typeof body.invitee === "object" && body.invitee !== null && "login" in body.invitee ? body.invitee.login : normalized;
    invitee.value = typeof identity === "string" ? identity : normalized;
    note.value = `Invitation ready for ${invitee.value}. Copy it and send it to your partner. Cluenite does not send it automatically.`;
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "invite_idempotency_replay") { lost.value = true; note.value = "The invitation was created, but the link response was lost. Create a replacement explicitly to get a new link."; }
    else note.value = apiMessage(cause);
    if (cause instanceof ApiError && (cause.status === 401 || cause.code === "csrf_rejected")) void checkAccount(true);
  } finally { busy.value = false; }
}
async function copy(): Promise<void> {
  if (!link) return;
  try { await window.navigator.clipboard.writeText(link); note.value = "Invitation copied. Send it privately to your partner."; }
  catch { note.value = "Allow clipboard access, then copy the invitation again."; }
}
onBeforeUnmount(() => { link = null; invitation = null; });
</script>

<template>
  <section class="live-lobby gs-card" aria-labelledby="live-lobby-title">
    <h2 id="live-lobby-title" class="gs-h2">Start a live co-op case</h2>
    <p>Choose your open co-op session, or create a lobby. Your partner joins with their own Twitch account.</p>
    <SessionList ref="picker" :case-id="caseId" :model-value="session" selectable @update:model-value="choose" @loaded="loaded" />
    <a v-if="account.state.kind === 'signed-out'" class="gs-btn gs-btn--gold" :href="TWITCH_START">Connect Twitch</a>
    <button v-else type="button" class="gs-btn gs-btn--gold" :disabled="busy || account.state.kind !== 'signed-in' || !!createAttempt?.previousSessionId" @click="create">{{ busy ? 'Please wait…' : createAttempt ? 'Retry lobby creation' : 'Create co-op lobby' }}</button>
    <CaseSwitchNotice v-if="pendingSwitch" :key="pendingSwitch.sessionId" :current="pendingSwitch" :next-title="caseTitle" :busy="busy" :stopped="createAttempt?.stopConfirmed ?? false" @confirm="switchCase" />
    <form v-if="selected && selected.role === 'host' && !selected.needsRejoin" class="invite-form" @submit.prevent="invite">
      <p>Selected: <b>{{ selected.title }}</b> · {{ selected.phase.replaceAll('_', ' ').toLowerCase() }}</p>
      <template v-if="canInvite">
        <label for="partner-login">Partner's Twitch username</label>
        <input id="partner-login" v-model="login" type="text" autocomplete="off" spellcheck="false" maxlength="26" placeholder="partner_username" :disabled="busy" required />
        <div class="lobby-actions"><button type="submit" class="gs-btn gs-btn--gold" :disabled="busy">{{ lost ? 'Create replacement invitation' : shared ? 'Replace invitation' : invitation ? 'Retry invitation request' : 'Create invitation' }}</button><button v-if="shared" type="button" class="gs-btn gs-btn--ghost" :disabled="busy" @click="copy">Copy invitation</button></div>
        <p v-if="shared">For {{ invitee }}. Expires {{ new Date(expires).toLocaleString() }}. The private link is never displayed.</p>
      </template>
      <p v-else>Your partner has joined. Open the host controls to start or continue.</p>
      <a class="gs-btn gs-btn--ghost" :href="`/?session=${encodeURIComponent(session)}&view=dashboard`">Open co-op host controls</a>
    </form>
    <p v-else-if="session">This is a partner session. Continue it from Saved sessions; only the host creates invitations.</p>
    <p v-if="note" class="gs-notice" role="status">{{ note }}</p>
  </section>
</template>

<style scoped>
.live-lobby { padding: 24px; margin-block: 24px; }
.invite-form { display: grid; gap: 12px; margin-top: 20px; }
input { width: min(100%, 340px); box-sizing: border-box; min-height: 44px; padding: 10px; border: 1px solid var(--gs-rule, #9a774b); border-radius: 4px; background: #1d1915; color: #f1e2c8; font: inherit; }
input:focus-visible { outline: 2px solid var(--gs-gold, #efc780); outline-offset: 3px; }
.lobby-actions { display: flex; gap: 10px; flex-wrap: wrap; }
p { overflow-wrap: anywhere; }
</style>
