<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { api, ApiError, apiMessage } from "../net/api";
import { newIdempotencyKey } from "../net/idempotency";
import { account, checkAccount, TWITCH_START } from "../site/account";

const props = defineProps<{ sessionId: string }>();
const emit = defineEmits<{ copied: []; invalidated: [] }>();
const busy = ref(false);
const hasLink = ref(false);
const lost = ref(false);
const expires = ref("");
const note = ref("");
let url: string | null = null;
let issueKey: string | null = null;
let revokeKey: string | null = null;
let generation = 0;
const expiry = computed(() => expires.value ? new Date(expires.value).toLocaleString() : "");
const endpoint = () => `/api/sessions/${encodeURIComponent(props.sessionId)}/overlay-credential`;
function reset(): void {
  generation++;
  url = null; issueKey = null; revokeKey = null;
  hasLink.value = false; lost.value = false; busy.value = false; expires.value = ""; note.value = "";
}
async function issue(): Promise<void> {
  if (busy.value || account.state.kind !== "signed-in" || !account.state.csrf) return;
  if ((hasLink.value || lost.value) && !window.confirm("Replace the overlay link? Any OBS source using the previous link will disconnect.")) return;
  emit("invalidated");
  if (lost.value) issueKey = null; // Explicit replacement after a lost response, never an automatic retry.
  issueKey ??= newIdempotencyKey();
  busy.value = true;
  const run = generation;
  try {
    const body = await api(endpoint(), { method: "POST", csrf: account.state.csrf, key: issueKey });
    if (run !== generation) return;
    if (typeof body.url !== "string" || typeof body.expiresAt !== "string") throw new ApiError(0, "response_incomplete");
    const parsed = new window.URL(body.url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.searchParams.get('mode') !== 'obs'
      || parsed.searchParams.get('session') !== props.sessionId || !/^[A-Za-z0-9_-]{43}$/.test(new URLSearchParams(parsed.hash.slice(1)).get('overlay') ?? '')) throw new ApiError(0, "response_incomplete");
    url = body.url;
    hasLink.value = true; lost.value = false; expires.value = body.expiresAt;
    issueKey = null;
    note.value = "Link ready. Copy it into your OBS browser source.";
  } catch (cause) {
    if (run !== generation) return;
    if (cause instanceof ApiError && cause.code === "overlay_credential_already_issued") {
      lost.value = true;
      note.value = "The link was created but its response was lost. It cannot be recovered. Replace it explicitly to get a new link.";
    } else { note.value = apiMessage(cause); }
    if (cause instanceof ApiError && (cause.status === 401 || cause.code === "csrf_rejected")) await checkAccount(true);
  } finally { if (run === generation) busy.value = false; }
}
async function copy(): Promise<void> {
  if (!url || busy.value) return;
  const run = generation;
  const link = url;
  busy.value = true;
  try {
    await window.navigator.clipboard.writeText(link);
    if (run !== generation || url !== link) return;
    note.value = "Overlay link copied."; emit("copied");
  } catch {
    if (run === generation) note.value = "Allow clipboard access in your browser, then copy again.";
  } finally { if (run === generation) busy.value = false; }
}
async function revoke(): Promise<void> {
  if (busy.value || account.state.kind !== "signed-in") return;
  if (!window.confirm("Revoke this team's overlay link? Its OBS browser source will disconnect.")) return;
  emit("invalidated");
  busy.value = true;
  const run = generation;
  revokeKey ??= newIdempotencyKey();
  try {
    await api(endpoint(), { method: "DELETE", csrf: account.state.csrf, key: revokeKey });
    if (run !== generation) return;
    reset();
    note.value = "Overlay link revoked.";
  } catch (cause) { if (run === generation) note.value = apiMessage(cause); }
  finally { if (run === generation) busy.value = false; }
}
watch(() => props.sessionId, reset);
onMounted(() => { void checkAccount(); });
onBeforeUnmount(reset);
</script>

<template>
  <section class="overlay-controls" aria-label="OBS overlay" :aria-busy="busy">
    <h3>OBS overlay</h3>
    <p>A private, read-only link for this session and team. Creating a link replaces any existing link for this team. The credential is copied, never shown.</p>
    <p v-if="account.state.kind === 'checking'" role="status">Checking your sign-in…</p>
    <a v-else-if="account.state.kind === 'signed-out'" :href="TWITCH_START">Connect Twitch to create a link</a>
    <button v-else-if="account.state.kind === 'unreachable'" type="button" @click="checkAccount(true)">Check connection again</button>
    <div v-else class="overlay-buttons">
      <button type="button" :disabled="busy || !sessionId || !account.state.csrf" @click="issue">{{ busy ? 'Please wait…' : lost ? 'Replace lost link' : hasLink ? 'Replace overlay link' : issueKey ? 'Retry link request' : 'Create overlay link' }}</button>
      <button v-if="hasLink" type="button" :disabled="busy" @click="copy">Copy link</button>
      <button type="button" :disabled="busy || !sessionId" @click="revoke">Revoke link</button>
    </div>
    <p v-if="expiry">Expires {{ expiry }}.</p>
    <p v-if="note" role="status">{{ note }}</p>
  </section>
</template>

<style scoped>
.overlay-controls { border-top: 1px solid var(--case-rule, #70583d); margin-top: 16px; padding-top: 16px; font-size: 14px; color: var(--case-paper, #f1e2c8); }
h3 { margin: 0; font: 600 20px var(--font-display, Georgia, serif); }
p { line-height: 1.6; overflow-wrap: anywhere; }
.overlay-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
button { min-height: 44px; padding: 9px 14px; font: inherit; color: inherit; background: var(--case-panel, #241f19); border: 1px solid var(--case-rule, #9a774b); border-radius: 4px; cursor: pointer; }
button:disabled { opacity: .55; cursor: default; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--case-amber, #efc780); outline-offset: 3px; }
</style>
