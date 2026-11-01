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
const canSend = computed(() => connected.value && draft.value.trim().length > 0);
const connectionLabel = computed(() => {
  if (props.connection === "connected") return "Terhubung";
  if (props.connection === "connecting") return "Menghubungkan";
  return "Terputus";
});

function submit(): void {
  if (!canSend.value) return;
  emit("command", draft.value.trim());
}

function restart(): void {
  if (window.confirm("Mulai ulang ronde dari awal? Progres saat ini akan hilang.")) {
    emit("control", "restart");
  }
}
</script>

<template>
  <section class="dash" aria-labelledby="dash-title">
    <header class="dash-head">
      <h2 id="dash-title" class="dash-title">Panel host</h2>
      <span class="dash-conn" :data-state="connection">{{ connectionLabel }}</span>
      <span v-if="paused" class="dash-paused">Dijeda</span>
      <span class="dash-session">Sesi {{ sessionId }}</span>
    </header>

    <form class="dash-form" @submit.prevent="submit">
      <label class="dash-label" for="dash-command">Perintah</label>
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
        <button type="submit" class="dash-button" :disabled="!canSend">Kirim</button>
      </div>
      <p class="dash-hint">
        Contoh: <code>!inspect CAM</code>, <code>!link CAM SCHEDULE</code>, <code>!solve ROBOT</code>.
        {{ draft.length }}/{{ MAX_COMMAND_LENGTH }} karakter.
      </p>
    </form>

    <div class="dash-controls" role="group" aria-label="Kontrol ronde">
      <button
        type="button"
        class="dash-button"
        :disabled="!connected || paused"
        @click="emit('control', 'pause')"
      >
        Jeda
      </button>
      <button
        type="button"
        class="dash-button"
        :disabled="!connected || !paused"
        @click="emit('control', 'resume')"
      >
        Lanjutkan
      </button>
      <button type="button" class="dash-button dash-danger" :disabled="!connected" @click="restart">
        Mulai ulang
      </button>
    </div>

    <p v-if="notice" class="dash-notice" :data-tone="notice.tone" role="status">{{ notice.text }}</p>
  </section>
</template>

<style scoped>
.dash {
  box-sizing: border-box;
  width: min(600px, 100%);
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--ink-700);
  border-radius: var(--radius-md);
  background: var(--ink-800);
  color: var(--paper-100);
  font-family: var(--font-sans);
  text-align: left;
}

.dash-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
}

.dash-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.dash-conn,
.dash-paused,
.dash-session {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}

.dash-conn[data-state="connected"] {
  color: var(--clue-gold);
}
.dash-conn[data-state="disconnected"] {
  color: var(--warning-coral);
}

.dash-paused {
  color: var(--clue-gold);
  font-weight: 700;
}

.dash-session {
  margin-left: auto;
  opacity: 0.7;
}

.dash-form {
  display: grid;
  gap: 6px;
}

.dash-label {
  font-size: 0.8125rem;
  font-weight: 700;
}

.dash-row {
  display: flex;
  gap: 8px;
}

.dash-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--ink-700);
  border-radius: var(--radius-sm);
  background: var(--ink-900);
  color: var(--paper-100);
  font: inherit;
  font-family: var(--font-mono, ui-monospace, monospace);
}

.dash-hint {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.75;
}

.dash-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dash-button {
  padding: 8px 12px;
  border: 1px solid var(--ink-700);
  border-radius: var(--radius-sm);
  background: var(--ink-900);
  color: var(--paper-100);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}
.dash-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dash-button:focus-visible,
.dash-input:focus-visible {
  outline: 2px solid var(--clue-gold);
  outline-offset: 2px;
}
.dash-danger {
  border-color: var(--warning-coral);
  color: var(--warning-coral);
}

.dash-notice {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}
.dash-notice[data-tone="ok"] {
  border: 1px solid var(--clue-gold);
  color: var(--clue-gold);
}
.dash-notice[data-tone="warn"] {
  border: 1px solid var(--warning-coral);
  color: var(--warning-coral);
}
</style>
