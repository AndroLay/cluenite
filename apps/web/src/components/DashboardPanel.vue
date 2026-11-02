<script setup lang="ts">
import { computed, ref } from "vue";
import type { SessionControl, SessionPhase } from "@cluenite/contracts";
import type { ConnectionState } from "../net/roundClient";
import OverlayControls from "./OverlayControls.vue";

// Host-only panel. The server enforces every rule (length, grammar, rate limit, dev gate);
// this panel only sends text and shows the ack it gets back.
const MAX_COMMAND_LENGTH = 120;

const props = defineProps<{
  sessionId: string;
  busy?: boolean;
  host?: boolean;
  connection: ConnectionState;
  paused: boolean;
  phase: SessionPhase | null;
  notice: { tone: "ok" | "warn"; text: string } | null;
}>();

const emit = defineEmits<{
  command: [text: string];
  control: [action: SessionControl["action"]];
}>();

const draft = ref("");
const connected = computed(() => props.connection === "connected" && !props.busy);
const canSend = computed(
  () => props.host !== false && connected.value && draft.value.trim().length > 0,
);
const connectionLabel = computed(() => {
  if (props.connection === "connected") return props.busy ? "Sending…" : "Connected";
  if (props.connection === "connecting") return "Connecting";
  return "Disconnected";
});

function submit(): void {
  if (!canSend.value) return;
  emit("command", draft.value.trim());
}

function restart(): void {
  if (!canRestart.value || props.host === false) return;
  if (
    window.confirm(
      "Restart the round from the beginning? Current progress will be lost.",
    )
  ) {
    emit("control", "restart");
  }
}

// Start is accepted only from READY. Stop is accepted from every non-terminal phase (server: rounds in
// CANCELLED, PARTIAL, or RESOLVED are already stopped).
const PHASE_LABELS: Record<SessionPhase, string> = {
  COOP_WAITING: "Waiting for team",
  READY: "Ready",
  ACTIVE: "Active",
  PAUSED: "Paused",
  RESOLVED: "Resolved",
  PARTIAL: "Ended early",
  CANCELLED: "Cancelled",
};
const STOPPABLE_PHASES: readonly SessionPhase[] = ["COOP_WAITING", "READY", "ACTIVE", "PAUSED"];
const phaseLabel = computed(() => (props.phase === null ? "" : PHASE_LABELS[props.phase]));
const canStart = computed(() => connected.value && props.phase === "READY");
const canStop = computed(
  () => connected.value && props.phase !== null && STOPPABLE_PHASES.includes(props.phase),
);
// Pause is accepted only from ACTIVE and resume only from PAUSED. Restart requires an open, joined round.
// Without a phase (older snapshots), fall back to the paused flag alone.
const canPause = computed(
  () => connected.value && !props.paused && (props.phase === null || props.phase === "ACTIVE"),
);
const canResume = computed(
  () => connected.value && props.paused && (props.phase === null || props.phase === "PAUSED"),
);
const canRestart = computed(
  () => connected.value && (props.phase === "READY" || props.phase === "ACTIVE" || props.phase === "PAUSED"),
);

function stop(): void {
  if (
    window.confirm(
      "Stop this round? A stopped round cannot be started again.",
    )
  ) {
    emit("control", "stop");
  }
}

</script>

<template>
  <section class="dash" aria-labelledby="dash-title">
    <header class="dash-head">
      <h2 id="dash-title" class="dash-title">{{ host === false ? 'Session tools' : 'Host panel' }}</h2>
      <span class="dash-conn" :data-state="connection">{{
        connectionLabel
      }}</span>
      <span v-if="phase !== null" class="dash-phase" :data-phase="phase">{{ phaseLabel }}</span>
      <span v-else-if="paused" class="dash-paused">Paused</span>
      <span class="dash-session">Session {{ sessionId }}</span>
    </header>

    <form v-if="host !== false" class="dash-form" @submit.prevent="submit">
      <label class="dash-label" for="dash-command">Command</label>
      <div class="dash-row">
        <input
          id="dash-command"
          v-model="draft"
          class="dash-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="!inspect CAM"
          :maxlength="MAX_COMMAND_LENGTH"
          :disabled="!connected"
        />
        <button type="submit" class="dash-button" :disabled="!canSend">
          Send
        </button>
      </div>
      <p class="dash-hint">
        Examples: <code>!inspect CAM</code>,
        <code>!link CAM_R07 SCHEDULE_R07</code>,
        <code>!solve &lt;verdict-id&gt;</code>. {{ draft.length }}/{{
          MAX_COMMAND_LENGTH
        }}
        characters.
      </p>
    </form>

    <div v-if="host !== false" class="dash-controls" role="group" aria-label="Round controls">
      <button
        type="button"
        class="dash-button"
        :disabled="!canStart"
        @click="emit('control', 'start')"
      >
        Start
      </button>
      <button
        type="button"
        class="dash-button"
        :disabled="!canPause"
        @click="emit('control', 'pause')"
      >
        Pause
      </button>
      <button
        type="button"
        class="dash-button"
        :disabled="!canResume"
        @click="emit('control', 'resume')"
      >
        Resume
      </button>
      <button
        type="button"
        class="dash-button dash-danger"
        :disabled="!canRestart"
        @click="restart"
      >
        Restart
      </button>
      <button
        type="button"
        class="dash-button dash-danger"
        :disabled="!canStop"
        @click="stop"
      >
        Stop
      </button>
    </div>

    <p v-if="notice" class="dash-notice" :data-tone="notice.tone" role="status">
      {{ notice.text }}
    </p>

    <a :href="`/setup?round=${encodeURIComponent(sessionId)}`">Stream setup for this session</a>
    <OverlayControls :session-id="sessionId" />
  </section>
</template>

<style scoped>
/* Host console: a quieter ledger under the case board. Uses the same --case tokens as the overlay. */
.dash {
  box-sizing: border-box;
  width: min(600px, 100%);
  display: grid;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--case-rule);
  border-radius: 4px;
  background: var(--case-panel);
  color: var(--case-paper);
  font-family: var(--font-body);
  text-align: left;
}

.dash-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.dash-title {
  margin: 0 auto 0 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.dash-conn,
.dash-paused,
.dash-phase,
.dash-session {
  padding: 3px 8px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.02em;
  color: var(--case-paper-dim);
  white-space: nowrap;
}

.dash-conn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dash-conn::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.dash-conn[data-state="connected"] {
  color: var(--case-confirm);
  border-color: rgba(191, 177, 154, 0.45);
}
.dash-conn[data-state="connecting"] {
  color: var(--case-amber);
  border-color: rgba(217, 182, 129, 0.45);
}
.dash-conn[data-state="disconnected"] {
  color: var(--case-alert);
  border-color: rgba(217, 154, 136, 0.55);
}

.dash-paused {
  border-color: var(--case-amber);
  color: var(--case-amber);
}

.dash-phase[data-phase="ACTIVE"],
.dash-phase[data-phase="RESOLVED"] {
  color: var(--case-confirm);
  border-color: rgba(191, 177, 154, 0.45);
}
.dash-phase[data-phase="COOP_WAITING"],
.dash-phase[data-phase="READY"],
.dash-phase[data-phase="PAUSED"] {
  color: var(--case-amber);
  border-color: rgba(217, 182, 129, 0.45);
}
.dash-phase[data-phase="PARTIAL"],
.dash-phase[data-phase="CANCELLED"] {
  color: var(--case-alert);
  border-color: rgba(217, 154, 136, 0.55);
}

.dash-session {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dash-form {
  display: grid;
  gap: 8px;
  margin: 0;
}

.dash-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--case-paper-dim);
}

.dash-row {
  display: flex;
  gap: 8px;
}

.dash-input {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  padding: 9px 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: var(--case-bg);
  color: var(--case-paper);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  caret-color: var(--case-amber);
  transition: border-color var(--dur-state) ease;
}
.dash-input::placeholder {
  color: color-mix(in srgb, var(--case-paper-dim) 70%, var(--case-bg));
}
.dash-input:focus-visible {
  outline: 2px solid var(--case-amber);
  outline-offset: 1px;
  border-color: var(--case-amber);
}
.dash-input:disabled {
  opacity: 0.5;
}

.dash-button {
  flex: 0 0 auto;
  appearance: none;
  padding: 9px 14px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: var(--case-raised);
  color: var(--case-paper);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--dur-state) ease,
    border-color var(--dur-state) ease;
}
.dash-button:hover:not(:disabled) {
  border-color: var(--case-paper-dim);
  background: color-mix(in srgb, var(--case-raised) 85%, var(--case-paper));
}
.dash-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dash-button:focus-visible,
.dash-input:focus-visible {
  outline: 2px solid var(--case-amber);
  outline-offset: 2px;
}

.dash-row .dash-button {
  border-color: var(--case-amber);
  background: var(--case-amber);
  color: var(--case-slip-ink);
}
.dash-row .dash-button:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--case-amber) 88%, var(--case-paper));
  background: color-mix(in srgb, var(--case-amber) 88%, var(--case-paper));
}

.dash-hint {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--case-paper-dim);
}
.dash-hint code {
  padding: 1px 5px;
  border-radius: 2px;
  background: var(--case-raised);
  color: var(--case-paper);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.dash-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--case-rule);
}

.dash-danger {
  border-color: rgba(217, 154, 136, 0.55);
  background: transparent;
  color: var(--case-alert);
}
.dash-danger:hover:not(:disabled) {
  border-color: var(--case-alert);
  background: rgba(217, 154, 136, 0.08);
}

.dash-subtitle {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--case-paper);
}

.dash-overlay {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-top: 16px;
  border-top: 1px solid var(--case-rule);
}
.dash-overlay .dash-controls {
  padding-top: 0;
  border-top: 0;
}

.dash-notice {
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  font-size: 0.8125rem;
  line-height: 1.5;
}
.dash-notice[data-tone="ok"] {
  border-color: rgba(199, 154, 98, 0.5);
  background: rgba(199, 154, 98, 0.08);
  color: var(--case-confirm);
}
.dash-notice[data-tone="warn"] {
  border-color: rgba(217, 154, 136, 0.55);
  background: rgba(217, 154, 136, 0.08);
  color: var(--case-alert);
}

@media (max-width: 480px) {
  .dash {
    padding: 14px 14px;
  }
  .dash-row {
    flex-wrap: wrap;
  }
  .dash-row .dash-input {
    flex: 1 1 100%;
  }
  .dash-row .dash-button {
    flex: 1 1 100%;
  }
}
</style>
