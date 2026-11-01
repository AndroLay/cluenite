<script setup lang="ts">
import { onMounted, ref } from "vue";

// Account state comes from GET /api/me only. The page lists no sessions because the server has no list endpoint yet.
type AccountState =
  | { kind: "checking" }
  | { kind: "signed-out" }
  | { kind: "unreachable"; detail: string }
  | { kind: "signed-in"; displayName: string; login: string; connected: boolean };

const account = ref<AccountState>({ kind: "checking" });

async function checkAccount(): Promise<void> {
  account.value = { kind: "checking" };
  try {
    const response = await fetch("/api/me", { headers: { Accept: "application/json" } });
    if (response.status === 401) {
      account.value = { kind: "signed-out" };
      return;
    }
    if (!response.ok) {
      account.value = {
        kind: "unreachable",
        detail: `The sign-in check did not complete (server responded ${response.status}).`,
      };
      return;
    }
    const body = (await response.json()) as {
      profile?: { displayName?: string; login?: string };
      twitch?: { connected?: boolean };
    };
    account.value = {
      kind: "signed-in",
      displayName: body.profile?.displayName ?? "Signed-in host",
      login: body.profile?.login ?? "",
      connected: body.twitch?.connected === true,
    };
  } catch {
    account.value = {
      kind: "unreachable",
      detail: "The sign-in check could not reach the server.",
    };
  }
}

onMounted(checkAccount);
</script>

<template>
  <article class="dash" aria-labelledby="dashboard-title">
    <header class="dash-hero">
      <div class="dash-hero-copy">
        <p class="dash-eyebrow">Streamer dashboard</p>
        <h1 id="dashboard-title">Run your next case.</h1>
        <p class="dash-lede">
          Pick a mode and start a round from the case menu. Each round opens its own host panel, and the
          address of that panel is the one to keep.
        </p>
      </div>
      <img class="dash-hero-photo" src="./landing/hero-scene.jpg" alt="" aria-hidden="true" decoding="async" />
    </header>

    <section class="dash-account" aria-labelledby="account-title">
      <div class="dash-account-main">
        <h2 id="account-title">Twitch account</h2>
        <p v-if="account.kind === 'checking'" role="status">Checking sign-in.</p>
        <template v-else-if="account.kind === 'signed-out'">
          <p class="dash-strong">Not signed in</p>
          <p>Sign in with Twitch before you start a round.</p>
        </template>
        <template v-else-if="account.kind === 'unreachable'">
          <p class="dash-strong">Sign-in status unknown</p>
          <p>{{ account.detail }}</p>
        </template>
        <template v-else-if="account.connected">
          <p class="dash-strong">Connected to Twitch</p>
          <p>Signed in as {{ account.displayName }}{{ account.login ? `, channel @${account.login}` : "" }}.</p>
        </template>
        <template v-else>
          <p class="dash-strong">Signed in, Twitch not connected</p>
          <p>Connect Twitch before a round can read chat.</p>
        </template>
      </div>
      <div class="dash-account-action">
        <a
          v-if="account.kind === 'signed-out' || (account.kind === 'signed-in' && !account.connected)"
          class="site-button"
          href="/api/auth/twitch/start"
          >Sign in with Twitch</a
        >
        <button
          v-else-if="account.kind === 'unreachable'"
          class="site-button site-button--quiet"
          type="button"
          @click="checkAccount"
        >
          Retry sign-in check
        </button>
      </div>
    </section>

    <section class="dash-start" aria-labelledby="start-title">
      <img class="dash-start-art" src="./landing/step-map.jpg" alt="" aria-hidden="true" decoding="async" />
      <div class="dash-start-body">
        <h2 id="start-title">Start a session</h2>
        <ul class="dash-steps">
          <li>
            <h3>Choose a mode</h3>
            <p>Quick Case, Mystery Live, or Co-op.</p>
          </li>
          <li>
            <h3>Pick a case</h3>
            <p>Each mode lists its own cases in the case menu.</p>
          </li>
          <li>
            <h3>Go live</h3>
            <p>The round opens its host panel. Keep that address for OBS.</p>
          </li>
        </ul>
        <a class="site-button" href="/play">Open the case menu</a>
      </div>
    </section>

    <section class="dash-block dash-block--plain" aria-labelledby="modes-title">
      <div class="dash-block-head">
        <h2 id="modes-title">Choose a mode</h2>
        <p>Cases for each mode are listed in the case menu.</p>
      </div>
      <ul class="mode-cards">
        <li class="mode-card">
          <img src="./landing/mode-quick.jpg" alt="" width="640" height="360" decoding="async" />
          <div class="mode-card-body">
            <h3>Quick Case</h3>
            <p>One short case on the board, with a fixed set of clues.</p>
            <p class="mode-card-status">The case menu shows the cases for this mode.</p>
            <a class="site-button" href="/play">Open the case menu</a>
          </div>
        </li>
        <li class="mode-card">
          <img src="./landing/mode-mic.jpg" alt="" width="640" height="360" decoding="async" />
          <div class="mode-card-body">
            <h3>Mystery Live</h3>
            <p>The streamer runs a live round. Chat and the host panel send commands.</p>
            <p class="mode-card-status">Starts from the case menu after Twitch sign-in.</p>
            <a class="site-button" href="/play">Open the case menu</a>
          </div>
        </li>
        <li class="mode-card">
          <img src="./landing/mode-coop.jpg" alt="" width="640" height="360" decoding="async" />
          <div class="mode-card-body">
            <h3>Co-op</h3>
            <p>Two broadcasters share one case through an invitation.</p>
            <p class="mode-card-status">Not available from the case menu yet.</p>
            <a class="site-button site-button--quiet" href="/coop">Read about co-op</a>
          </div>
        </li>
      </ul>
    </section>

    <div class="dash-split">
      <section class="dash-block" aria-labelledby="sessions-title">
        <div class="dash-block-head">
          <h2 id="sessions-title">Recent sessions</h2>
        </div>
        <p>
          This page does not list running or past sessions yet, because the server has no list endpoint. Keep
          the address of each host panel to return to a round.
        </p>
      </section>

      <section class="dash-block" aria-labelledby="obs-title">
        <div class="dash-block-head">
          <h2 id="obs-title">OBS setup</h2>
        </div>
        <p>Add the round to OBS Studio as a read-only browser source, at 1920 × 1080.</p>
        <a class="site-button site-button--quiet" href="/setup">Open OBS setup</a>
      </section>
    </div>
  </article>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: 40px;
  color: var(--case-paper);
}

.dash-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 40px;
  align-items: center;
}

.dash-hero h1 {
  max-width: 14ch;
}

.dash-eyebrow {
  margin: 0 0 14px;
  color: var(--case-gold);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.dash-lede {
  margin: 28px 0 0;
  max-width: 60ch;
  color: var(--case-paper-dim);
}

.dash-hero-photo {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
}

.dash h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--case-paper);
}

.dash p {
  margin: 0;
}

.dash-account {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  padding: 20px 24px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.dash-account-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.dash-account-main p:not(.dash-strong),
.dash-account-main p[role="status"] {
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.dash-strong {
  color: var(--case-paper);
  font-weight: 600;
}

.dash-start {
  position: relative;
  overflow: hidden;
  padding: 28px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.dash-start-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.28;
  pointer-events: none;
}

.dash-start::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(16, 13, 10, 0.97) 35%, rgba(16, 13, 10, 0.72));
  pointer-events: none;
}

.dash-start-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
  align-items: flex-start;
}

.dash-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dash-steps li {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px solid var(--case-gold);
}

.dash-steps h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--case-paper);
}

.dash-steps p {
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.dash-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: flex-start;
  padding: 20px 24px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.dash-block > p {
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
  max-width: 60ch;
}

.dash-block-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: stretch;
}

.dash-block-head p {
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.dash-block--plain {
  padding: 0;
  border: 0;
  background: none;
  align-items: stretch;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mode-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.mode-card img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.mode-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 18px 18px;
}

.mode-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--case-paper);
}

.mode-card-body > p {
  color: var(--case-paper-dim);
  font-size: 0.875rem;
}

.mode-card-body > .mode-card-status {
  color: var(--case-gold);
  font-size: 0.8125rem;
}

.mode-card-body .site-button {
  margin-top: auto;
}

.dash-split {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
}

@media (max-width: 860px) {
  .dash-hero,
  .dash-steps {
    grid-template-columns: minmax(0, 1fr);
  }

  .dash-hero-photo {
    aspect-ratio: 16 / 9;
  }
}

@media (max-width: 760px) {
  .mode-cards,
  .dash-split {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
