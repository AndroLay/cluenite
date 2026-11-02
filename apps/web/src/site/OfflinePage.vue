<script setup lang="ts">
import { computed, ref } from "vue";
import PlateFrame from "./PlateFrame.vue";

// The four cards are the interruption states this page is designed to show. Only the connection check runs live:
// the server does not report paused or expired rounds to this page, so those cards are not live status.
// The only request made is the health check.
type ServerCheck =
  | { kind: "idle" }
  | { kind: "answered" }
  | { kind: "down"; detail: string }
  | { kind: "unreachable" };

const check = ref<ServerCheck>({ kind: "idle" });
const checking = ref(false);

async function checkServer(): Promise<void> {
  checking.value = true;
  try {
    const response = await fetch("/health/live", { headers: { Accept: "application/json" } });
    check.value = response.ok
      ? { kind: "answered" }
      : { kind: "down", detail: `The server answered with status ${response.status}.` };
  } catch {
    check.value = { kind: "unreachable" };
  } finally {
    checking.value = false;
  }
}

const statusText = computed(() => {
  switch (check.value.kind) {
    case "answered":
      return "The server answered. Reopen the host panel to load the round.";
    case "down":
      return check.value.detail;
    case "unreachable":
      return "The server could not be reached from this browser.";
    default:
      return "";
  }
});
</script>

<template>
  <PlateFrame>
    <div class="center">
      <div class="eyebrow">SYSTEM AND SESSION STATES</div>
      <h1 class="page-title mt8">When an investigation is interrupted.</h1>
      <p class="mt8">Keep the player informed, preserve valid progress, and offer a safe next action.</p>
    </div>

    <div class="state-grid">
      <section class="status-card" aria-labelledby="state-offline">
        <div class="eyebrow">NETWORK · OFFLINE</div>
        <div class="state-icon" aria-hidden="true">
          <svg width="26" height="22" viewBox="0 0 26 22" fill="#e7bd80">
            <path d="M15 0 L3 12 H11 L7 22 L23 8 H14 Z" />
          </svg>
        </div>
        <h3 id="state-offline">Connection lost</h3>
        <p>Unable to reach the case server. Round state is unknown until it returns.</p>
        <button class="btn gold" type="button" :disabled="checking" @click="checkServer">Reconnect</button>
      </section>

      <section class="status-card" aria-labelledby="state-auth">
        <div class="eyebrow">AUTH · EXPIRED</div>
        <div class="state-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#e7bd80" stroke-width="2" stroke-linecap="round">
            <circle cx="20" cy="20" r="17" />
            <path d="M20 20 V9 M20 20 H29" />
          </svg>
        </div>
        <h3 id="state-auth">Session expired</h3>
        <p>This host session is no longer valid. Sign in again to resume safely.</p>
        <a class="btn gold" href="/api/auth/twitch/start">Sign in again</a>
      </section>

      <section class="status-card" aria-labelledby="state-paused">
        <div class="eyebrow">SESSION · PAUSED</div>
        <div class="state-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="#e7bd80">
            <rect x="13.5" y="6" width="3" height="28" />
            <rect x="23.5" y="6" width="3" height="28" />
          </svg>
        </div>
        <h3 id="state-paused">Investigation paused</h3>
        <p>The host has paused this round. Viewers can continue reading known evidence.</p>
        <button class="btn muted" type="button" disabled>Wait for host</button>
      </section>

      <section class="status-card" aria-labelledby="state-error">
        <div class="eyebrow">ERROR · RECOVERABLE</div>
        <div class="state-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="#e7bd80">
            <rect x="18" y="6" width="4" height="24" rx="1" />
            <circle cx="20" cy="35" r="2.5" />
          </svg>
        </div>
        <h3 id="state-error">Something went wrong</h3>
        <p>A command could not be completed. No unverified change was applied.</p>
        <a class="btn gold" href="/dashboard">Return to dashboard</a>
      </section>
    </div>

    <div class="state-status">
      <p class="small">
        Design states. Only the connection check runs on this page; the server does not report paused or expired rounds here yet.
      </p>
      <p v-if="statusText" class="small mt8" role="status">{{ statusText }}</p>
    </div>

    <section class="panel state-principle">
      <div>
        <h3>Reliable mystery sessions</h3>
        <p>Status messages must be tied to real server conditions, not inferred from the UI alone.</p>
      </div>
      <span class="tag">SERVER-AUTHORITATIVE STATES</span>
    </section>
  </PlateFrame>
</template>

<style scoped>
.state-grid {
  display: grid;
  grid-template-columns: repeat(4, 316px);
  gap: 16px;
  justify-content: center;
  margin-top: 32px;
}
.state-grid > .status-card {
  height: 369px;
  padding: 17px 16px;
  gap: 0;
  border-radius: 8px;
  justify-content: flex-start;
}
.state-grid > .status-card > .eyebrow {
  line-height: 16px;
}
.state-grid > .status-card > .state-icon {
  margin-top: 21px;
  width: 85px;
  height: 61px;
  border: 1px solid #bd8647;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.state-grid > .status-card > h3 {
  margin-top: 20px;
  font-size: 29.5px;
  font-weight: 400;
  line-height: 34px;
}
.state-grid > .status-card > p {
  margin-top: 22px;
  font-size: 14px;
  line-height: 22px;
}
.state-grid > .status-card > .btn {
  margin-top: auto;
}
.state-status {
  margin-top: 16px;
  min-height: 20px;
  text-align: center;
}
.state-principle.panel {
  margin-top: 119px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 23px 27px;
}
.state-principle h3 {
  font-family: var(--plate-sans);
  font-size: 22px;
  font-weight: 700;
  line-height: 28px;
}
.state-principle p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 18px;
}
</style>
