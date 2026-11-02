<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import LiveCoopLobby from "./LiveCoopLobby.vue";
import GameShell from "./GameShell.vue";
import GuideArt from "./GuideArt.vue";
import SiteIcon from "./SiteIcon.vue";
import { account, checkAccount } from "./account";
import { playUi } from "./uiSound";

// Co-op (S11): how two streams solve one case, what is ready today, and a way to try it now. Both status rows come
// from real reads (GET /api/me and GET /api/cases). The live lobby uses authenticated session and invite APIs.
// Practice remains a separate, explicitly scripted experience.

type Load<T> = { kind: "loading" } | { kind: "ready"; value: T } | { kind: "failed" };
interface CoopCase {
  id: string;
  title: string;
  premise: string;
}

const coopCase = ref<Load<CoopCase | null>>({ kind: "loading" });

async function loadCoopCase(): Promise<void> {
  coopCase.value = { kind: "loading" };
  try {
    const response = await fetch("/api/cases", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      coopCase.value = { kind: "failed" };
      return;
    }
    const body = (await response.json()) as { cases?: (CoopCase & { mode: string })[] };
    coopCase.value = { kind: "ready", value: (body.cases ?? []).find((item) => item.mode === "coop") ?? null };
  } catch {
    coopCase.value = { kind: "failed" };
  }
}

const STEPS = [
  { icon: "send", title: "Invite a partner", body: "One streamer invites another. The partner accepts with their own Twitch account." },
  { icon: "search", title: "Search your half", body: "Each stream holds different clues, and each chat helps its own streamer." },
  { icon: "link", title: "Trade and solve", body: "Send records across when your partner asks. The key deduction needs both halves." },
] as const;

const twitchRow = computed(() => {
  const state = account.state;
  if (state.kind === "checking") return { tone: "wait", text: "Checking…" };
  if (state.kind === "signed-in") return { tone: "on", text: `Signed in as ${state.name}` };
  if (state.kind === "unreachable") return { tone: "error", text: "Server not reachable" };
  return { tone: "off", text: "Not connected" };
});
const caseRow = computed(() => {
  const value = coopCase.value;
  if (value.kind === "loading") return { tone: "wait", text: "Checking…" };
  if (value.kind === "failed") return { tone: "error", text: "Case list did not load" };
  return value.value ? { tone: "on", text: value.value.title } : { tone: "off", text: "No co-op case on this server" };
});

onMounted(() => {
  void checkAccount();
  void loadCoopCase();
});
</script>

<template>
  <GameShell :focus-x="0.97" :focus-y="0.3" dim="strong">
    <header class="co-head">
      <p class="gs-eyebrow" data-enter style="--i: 0">Co-op</p>
      <h1 class="gs-h1" data-enter style="--i: 1">Two streamers, one case</h1>
      <p class="gs-lede" data-enter style="--i: 2">
        Each stream holds part of the evidence. Trade records with your partner to finish the proof together.
      </p>
    </header>

    <div class="co-top">
      <section class="co-try gs-card" aria-labelledby="co-try-title" data-enter style="--i: 3">
        <GuideArt kind="link" />
        <div class="co-try-body">
          <h2 id="co-try-title" class="gs-h3">Try it now: The Lighthouse Went Dark</h2>
          <p class="gs-muted">
            You hold the lighthouse; Harbourmaster Ines Vale holds the harbour files with her own scripted chat. Answer
            her requests, ask for her cards, and prove together who wrecked the Marigold.
          </p>
          <div class="co-try-actions">
            <a class="gs-btn gs-btn--gold gs-btn--lg" href="/practice/lighthouse" @click="playUi('select')">
              <SiteIcon name="people" /> Play co-op practice
            </a>
            <a class="co-try-alt" href="/?view=quick&play=coop">Or search the manuscript study with Inspector Hale</a>
          </div>
        </div>
      </section>

      <section class="co-status gs-card" aria-labelledby="co-status-title" data-enter style="--i: 4">
        <h2 id="co-status-title" class="gs-h3">Live co-op</h2>
        <ul class="co-rows">
          <li :data-tone="twitchRow.tone"><span>Your Twitch</span><strong><i aria-hidden="true"></i>{{ twitchRow.text }}</strong></li>
          <li :data-tone="caseRow.tone"><span>Co-op case</span><strong><i aria-hidden="true"></i>{{ caseRow.text }}</strong></li>
          <li data-tone="on"><span>Invitations</span><strong><i aria-hidden="true"></i>Invite by Twitch username below</strong></li>
        </ul>
        <p class="co-note">
          Create a lobby below, copy the private invitation, and send it to your partner. They must accept before the host starts.
        </p>
        <a class="gs-btn gs-btn--ghost" href="/coop/field">Preview the co-op stations</a>
      </section>
    </div>

    <LiveCoopLobby v-if="coopCase.kind === 'ready' && coopCase.value" :case-id="coopCase.value.id" />

    <section class="co-how" aria-labelledby="co-how-title">
      <h2 id="co-how-title" class="gs-h2">How co-op works</h2>
      <ol class="co-steps">
        <li v-for="(step, index) in STEPS" :key="step.title" class="gs-card" data-enter :style="{ '--i': index + 5 }">
          <span class="co-step-icon"><SiteIcon :name="step.icon" size="24px" /></span>
          <span class="co-step-num" aria-hidden="true">{{ index + 1 }}</span>
          <h3 class="gs-h3">{{ step.title }}</h3>
          <p>{{ step.body }}</p>
        </li>
      </ol>
    </section>
  </GameShell>
</template>

<style scoped>
.co-head {
  margin-bottom: 24px;
}
.co-top {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
}
.co-try {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  align-items: center;
  gap: 20px;
  padding: 20px;
}
.co-try-body p {
  margin: 8px 0 18px;
}
.co-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 22px;
}
.co-rows {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.co-rows li {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.co-rows span {
  color: #bfae94;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.co-rows strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #f1e2c8;
}
.co-rows i {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #e7bf7c;
}
.co-rows li[data-tone="on"] i {
  background: #9fd49a;
}
.co-rows li[data-tone="error"] i {
  background: #e59a8a;
}
.co-rows li[data-tone="wait"] i {
  background: #f0b45e;
}
.co-note {
  margin: 0;
  color: #cdbca1;
  font-size: 14px;
}
.co-status .gs-btn {
  align-self: flex-start;
}
.co-how {
  margin-top: 40px;
}
.co-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.co-steps li {
  position: relative;
  padding: 20px;
}
.co-steps p {
  margin: 6px 0 0;
  color: #dccdb3;
  font-size: 14px;
}
.co-step-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 12px;
  border: 1px solid #a77a48;
  border-radius: 50%;
  color: var(--gs-gold);
}
.co-step-num {
  position: absolute;
  top: 18px;
  right: 18px;
  color: #a77a4899;
  font-family: var(--gs-serif);
  font-size: 34px;
  line-height: 1;
}
@media (max-width: 1000px) {
  .co-top,
  .co-try,
  .co-steps {
    grid-template-columns: minmax(0, 1fr);
  }
}
.co-try-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
}
.co-try-alt {
  color: var(--gs-muted);
  font-size: 14px;
}
.co-try-alt:hover {
  color: var(--gs-gold-hi);
}
</style>
