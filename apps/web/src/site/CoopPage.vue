<script setup lang="ts">
import { onMounted, ref } from "vue";

// Both reads are real API data. No invitation code or second account is shown, because none exists yet.
type Load<T> = { kind: "loading" } | { kind: "ready"; value: T } | { kind: "failed"; detail: string };

type CoopCase = {
  id: string;
  title: string;
  premise: string;
  question: string;
  clues: { id: string }[];
  verdicts: { id: string }[];
};

type HostAccount = { displayName: string; login: string };

const coopCase = ref<Load<CoopCase | null>>({ kind: "loading" });
const host = ref<Load<HostAccount | null>>({ kind: "loading" });

async function loadCoopCase(): Promise<void> {
  coopCase.value = { kind: "loading" };
  try {
    const response = await fetch("/api/cases", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      coopCase.value = {
        kind: "failed",
        detail: `The case list did not load (server responded ${response.status}).`,
      };
      return;
    }
    const body = (await response.json()) as { cases?: (CoopCase & { mode: string })[] };
    const found = (body.cases ?? []).find((item) => item.mode === "coop") ?? null;
    coopCase.value = { kind: "ready", value: found };
  } catch {
    coopCase.value = { kind: "failed", detail: "The case list could not be reached." };
  }
}

async function loadHost(): Promise<void> {
  host.value = { kind: "loading" };
  try {
    const response = await fetch("/api/me", { headers: { Accept: "application/json" } });
    if (response.status === 401) {
      host.value = { kind: "ready", value: null };
      return;
    }
    if (!response.ok) {
      host.value = {
        kind: "failed",
        detail: `The sign-in check did not complete (server responded ${response.status}).`,
      };
      return;
    }
    const body = (await response.json()) as { profile?: { displayName?: string; login?: string } };
    host.value = {
      kind: "ready",
      value: {
        displayName: body.profile?.displayName ?? "",
        login: body.profile?.login ?? "",
      },
    };
  } catch {
    host.value = { kind: "failed", detail: "The sign-in check could not reach the server." };
  }
}

onMounted(() => {
  void loadCoopCase();
  void loadHost();
});
</script>

<template>
  <article class="coop-page" aria-labelledby="coop-title">
    <header class="site-section-head">
      <h1 id="coop-title">Invite another investigator.</h1>
      <p class="site-prose">
        Co-op puts two broadcasters on one case. An invitation is tied to a session that a host has already
        started.
      </p>
    </header>

    <section class="site-section" aria-labelledby="coop-players-title">
      <div class="site-section-head">
        <h2 id="coop-players-title">Investigators</h2>
      </div>
      <ul class="coop-players">
        <li class="coop-player">
          <p class="coop-role">Host</p>
          <p v-if="host.kind === 'loading'" role="status">Checking sign-in.</p>
          <p v-else-if="host.kind === 'failed'">{{ host.detail }}</p>
          <template v-else-if="host.value === null">
            <p class="coop-name">Not signed in</p>
            <a class="site-button site-button--quiet" href="/api/auth/twitch/start">Sign in with Twitch</a>
          </template>
          <template v-else>
            <p class="coop-name">{{ host.value.displayName || host.value.login }}</p>
            <p v-if="host.value.login" class="coop-meta">@{{ host.value.login }}</p>
          </template>
        </li>
        <li class="coop-player">
          <p class="coop-role">Second investigator</p>
          <p class="coop-name">No invitation sent</p>
          <p class="coop-meta">
            An invitation names a Twitch account. Sending one from this page is not available yet.
          </p>
        </li>
      </ul>
    </section>

    <section class="site-section" aria-labelledby="coop-case-title">
      <div class="site-section-head">
        <h2 id="coop-case-title">Co-op case</h2>
      </div>
      <p v-if="coopCase.kind === 'loading'" class="site-prose" role="status">Loading the case list.</p>
      <p v-else-if="coopCase.kind === 'failed'" class="site-prose">{{ coopCase.detail }}</p>
      <p v-else-if="coopCase.value === null" class="site-prose">The server lists no co-op case.</p>
      <article v-else class="coop-case">
        <h3>{{ coopCase.value.title }}</h3>
        <p class="site-prose">{{ coopCase.value.premise }}</p>
        <p class="coop-question"><span>Question</span> {{ coopCase.value.question }}</p>
        <p class="coop-meta">
          {{ coopCase.value.clues.length }} clues · {{ coopCase.value.verdicts.length }} verdicts
        </p>
      </article>
    </section>

    <section class="site-section" aria-labelledby="coop-status-title">
      <div class="site-section-head">
        <h2 id="coop-status-title">Status</h2>
      </div>
      <div class="site-notice" data-tone="warn">
        <p>
          Co-op is not available from the case menu yet. It has been tested locally with a mock Twitch
          provider and has not been played live with two Twitch accounts.
        </p>
      </div>
      <ol class="steps">
        <li>
          <h3>The host starts a round</h3>
          <p>A host starts a case first. The invitation is created for that existing session.</p>
        </li>
        <li>
          <h3>The invitation names a Twitch account</h3>
          <p>The server stores the invitation for the Twitch account the host names.</p>
        </li>
        <li>
          <h3>The second broadcaster joins</h3>
          <p>Joining from the browser has not been verified with two live Twitch accounts.</p>
        </li>
      </ol>
    </section>

    <div class="site-actions">
      <a class="site-button" href="/play">Open the case menu</a>
      <a class="site-button site-button--quiet" href="/guide">Read the guide</a>
    </div>
  </article>
</template>

<style scoped>
.coop-page .site-notice + .steps {
  margin-top: 24px;
}

.coop-players {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.coop-player {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 18px 20px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.coop-role {
  color: var(--case-gold);
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.coop-name {
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
}

.coop-meta {
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.coop-case {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 24px;
  border: 1px solid var(--case-rule);
  border-radius: 4px;
  background: var(--case-raised);
}

.coop-case h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--case-paper);
}

.coop-question {
  color: var(--case-paper);
}

.coop-question span {
  color: var(--case-gold);
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .coop-players {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
