<script setup lang="ts">
import { computed } from "vue";
import type { ConnectionStatus } from "@cluenite/contracts";

const props = defineProps<{
  status: ConnectionStatus | null;
  pending: boolean;
}>();

const state = computed(() => props.status?.state ?? "PENDING");
const label = computed(() => {
  if (!props.status) return "Checking Twitch status";
  switch (props.status.state) {
    case "ONLINE":
      return "Twitch connected";
    case "RECONNECTING":
      return "Twitch reconnecting";
    case "REVOKED":
      return "Reconnect your Twitch account";
    case "OFFLINE":
      return "Twitch disconnected";
    default:
      return "Twitch status unknown";
  }
});
</script>

<template>
  <p
    class="connection-status"
    :data-state="state.toLowerCase()"
    role="status"
    aria-live="polite"
  >
    <span class="connection-status__dot" aria-hidden="true" />
    <span>{{ label }}<span v-if="pending">…</span></span>
  </p>
</template>

<style scoped>
.connection-status {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: rgba(33, 24, 17, 0.78);
  color: var(--case-paper-dim);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.4;
}

.connection-status__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--case-amber);
}

.connection-status[data-state="online"] {
  border-color: rgba(199, 154, 98, 0.62);
  color: var(--case-thread);
}

.connection-status[data-state="online"] .connection-status__dot {
  background: var(--case-thread);
}

.connection-status[data-state="reconnecting"],
.connection-status[data-state="pending"] {
  border-color: rgba(217, 182, 129, 0.55);
  color: var(--case-amber);
}

.connection-status[data-state="offline"],
.connection-status[data-state="revoked"] {
  border-color: rgba(217, 154, 136, 0.55);
  color: var(--case-alert);
}

.connection-status[data-state="offline"] .connection-status__dot,
.connection-status[data-state="revoked"] .connection-status__dot {
  background: var(--case-alert);
}
</style>
