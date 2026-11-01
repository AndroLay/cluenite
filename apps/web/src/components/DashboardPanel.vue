<script setup lang="ts">
import { computed, ref } from "vue";
import type { SessionControl } from "@cluenite/contracts";
import type { ConnectionState } from "../net/roundClient";

// Host-only panel. The server enforces every rule (length, grammar, rate limit, dev gate);
// this panel only sends text and shows the ack it gets back.
const MAX_COMMAND_LENGTH = 120;

const props = defineProps<{
  sessionId: string;
  connection: ConnectionState;
  paused: boolean;
  notice: { tone: "ok" | "warn"; text: string } | null;
}>();

const emit = defineEmits<{
  command: [text: string];
  control: [action: SessionControl["action"]];
}>();

const draft = ref("");
const connected = computed(() => props.connection === "connected");
const canSend = computed(
  () => connected.value && draft.value.trim().length > 0,
);
const connectionLabel = computed(() => {
  if (props.connection === "connected") return "Connected";
  if (props.connection === "connecting") return "Connecting";
  return "Disconnected";
});

function submit(): void {
  if (!canSend.value) return;
  emit("command", draft.value.trim());
}

function restart(): void {
  if (
    window.confirm(
      "Restart the round from the beginning? Current progress will be lost.",
    )
  ) {
    emit("control", "restart");
  }
}
</script>

<template>
  <section class="dash" aria-labelledby="dash-title">
    <header class="dash-head">
      <h2 id="dash-title" class="dash-title">Host panel</h2>
      <span class="dash-conn" :data-state="connection">{{
        connectionLabel
      }}</span>
      <span v-if="paused" class="dash-paused">Paused</span>
      <span class="dash-session">Session {{ sessionId }}</span>
    </header>

    <form class="dash-form" @submit.prevent="submit">
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

    <div class="dash-controls" role="group" aria-label="Round controls">
      <button
        type="button"
        class="dash-button"
        :disabled="!connected || paused"
        @click="emit('control', 'pause')"
      >
        Pause
      </button>
      <button
        type="button"
        class="dash-button"
        :disabled="!connected || !paused"
        @click="emit('control', 'resume')"
      >
        Resume
      </button>
      <button
        type="button"
        class="dash-button dash-danger"
        :disabled="!connected"
        @click="restart"
      >
        Restart
      </button>
    </div>

    <p v-if="notice" class="dash-notice" :data-tone="notice.tone" role="status">
      {{ notice.text }}
    </p>
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
