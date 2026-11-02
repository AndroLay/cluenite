<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import SessionList from "./SessionList.vue";
import GameShell from "./GameShell.vue";
import SiteIcon from "./SiteIcon.vue";
import type { SiteIconName } from "./icons";
import { account, checkAccount, CHAT_LABELS, TWITCH_START } from "./account";
import { playUi } from "./uiSound";

// The main menu: a game title screen instead of a dashboard. One list of big choices on the left, the living
// scene behind, and a "Your channel" card that always names the next step. Account state comes from GET /api/me
// only; the menu never claims a connection the server has not confirmed.

interface MenuItem {
  id: string;
  label: string;
  detail: string;
  href: string;
  icon: SiteIconName;
  primary?: boolean;
}

const ITEMS: readonly MenuItem[] = [
  { id: "play", label: "Play a case", detail: "Pick a case and run it live with your chat.", href: "/play", icon: "play", primary: true },
  { id: "practice", label: "Practice cases", detail: "Three cases to play now. No Twitch needed.", href: "/play#practice", icon: "gamepad" },
  { id: "setup", label: "Stream setup", detail: "Connect Twitch and add the overlay to OBS.", href: "/setup", icon: "broadcast" },
  { id: "guide", label: "How to play", detail: "The rules and chat commands, with pictures.", href: "/guide", icon: "book" },
  { id: "coop", label: "Co-op", detail: "Solve one case with another streamer.", href: "/coop", icon: "people" },
  { id: "settings", label: "Settings", detail: "Sound, motion, and text size.", href: "/settings", icon: "settings" },
];

const listEl = ref<HTMLElement | null>(null);

// Arrow keys move through the menu like a game menu; Enter follows the link.
function onKey(event: globalThis.KeyboardEvent, index: number): void {
  const links = listEl.value ? Array.from(listEl.value.querySelectorAll<globalThis.HTMLAnchorElement>("a.mm-item")) : [];
  let next = -1;
  if (event.key === "ArrowDown") next = (index + 1) % links.length;
  else if (event.key === "ArrowUp") next = (index - 1 + links.length) % links.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = links.length - 1;
  if (next < 0) return;
  event.preventDefault();
  links[next]?.focus();
}

const channel = computed(() => {
  const state = account.state;
  switch (state.kind) {
    case "checking":
      return { tone: "wait", name: "Checking…", line: "Asking the server about this browser.", initial: "?" };
    case "unreachable":
      return { tone: "error", name: "Server not reachable", line: state.detail, initial: "!" };
    case "signed-out":
      return { tone: "off", name: "Not connected", line: "Practice works without Twitch.", initial: "?" };
    case "signed-in":
      return {
        tone: state.connected && state.chat === "listening" ? "on" : "wait",
        name: state.name,
        line: state.connected ? CHAT_LABELS[state.chat] : "Twitch is not connected.",
        initial: state.name.charAt(0).toUpperCase() || "?",
      };
  }
  return { tone: "wait", name: "", line: "", initial: "?" };
});

const twitchReady = computed(() => account.state.kind === "signed-in" && account.state.connected);

const steps = computed(() => [
  { label: "Connect Twitch", done: twitchReady.value, href: twitchReady.value ? "/connect" : TWITCH_START },
  { label: "Add the overlay to OBS", done: false, href: "/setup" },
  { label: "Play a case with chat", done: false, href: "/play" },
]);

onMounted(() => {
  void checkAccount();
});
</script>

<template>
  <GameShell :back="false" :focus-x="0.94" :focus-y="0.3" dim="soft">
    <div class="mm">
      <section class="mm-left" aria-labelledby="mm-title">
        <p class="gs-eyebrow" data-enter style="--i: 0">Main menu</p>
        <h1 id="mm-title" class="mm-title" data-enter style="--i: 1">Cluenite</h1>
        <p class="mm-tag" data-enter style="--i: 2">Solve mysteries with your Twitch chat.</p>

        <nav aria-label="Main menu">
          <ul ref="listEl" class="mm-list">
            <li v-for="(item, index) in ITEMS" :key="item.id" data-enter :style="{ '--i': index + 3 }">
              <a
                :href="item.href"
                class="mm-item"
                :class="{ 'is-primary': item.primary }"
                @mouseenter="playUi('hover')"
                @focus="playUi('hover')"
                @click="playUi('select')"
                @keydown="onKey($event, index)"
              >
                <span class="mm-icon"><SiteIcon :name="item.icon" size="22px" /></span>
                <span class="mm-text">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.detail }}</small>
                </span>
                <SiteIcon class="mm-chev" name="chevron-right" size="20px" />
              </a>
            </li>
          </ul>
        </nav>
      </section>

      <aside class="mm-side gs-card" data-enter style="--i: 5" aria-labelledby="mm-channel-title">
        <h2 id="mm-channel-title" class="mm-side-title">Your channel</h2>
        <div class="mm-who" :data-tone="channel.tone">
          <span class="mm-avatar" aria-hidden="true">{{ channel.initial }}</span>
          <span class="mm-who-text">
            <strong>{{ channel.name }}</strong>
            <small><span class="mm-dot" aria-hidden="true"></span>{{ channel.line }}</small>
          </span>
        </div>

        <ol class="mm-steps" aria-label="Get ready to stream">
          <li v-for="(step, index) in steps" :key="step.label" :class="{ 'is-done': step.done }">
            <span class="mm-step-mark" aria-hidden="true">
              <SiteIcon v-if="step.done" name="check" :stroke="2.4" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <a :href="step.href">{{ step.label }}</a>
            <span v-if="step.done" class="visually-hidden">, done</span>
          </li>
        </ol>

        <a v-if="account.state.kind === 'signed-out'" class="gs-btn gs-btn--gold mm-cta" :href="TWITCH_START">
          <SiteIcon name="plug" /> Connect Twitch
        </a>
        <button
          v-else-if="account.state.kind === 'unreachable'"
          type="button"
          class="gs-btn gs-btn--ghost mm-cta"
          @click="checkAccount(true)"
        >
          <SiteIcon name="restart" /> Check again
        </button>
        <a v-else-if="twitchReady" class="gs-btn gs-btn--gold mm-cta" href="/play">
          <SiteIcon name="play" /> Play a case
        </a>
        <p class="mm-note">Sample rounds are labeled. Live rounds come only from the server.</p>
      </aside>
    </div>

    <SessionList />

    <footer class="mm-foot" data-enter style="--i: 9">
      <a href="/">About Cluenite</a>
      <span aria-hidden="true">·</span>
      <span>Prototype. Settings stay in this browser.</span>
    </footer>
  </GameShell>
</template>

<style scoped>
.mm {
  display: grid;
  grid-template-columns: minmax(0, 560px) minmax(0, 1fr) 340px;
  grid-template-areas: "menu . side";
  align-items: end;
  gap: 32px;
  min-height: calc(100vh - 64px - 150px);
}
.mm-left {
  grid-area: menu;
}
.mm-side {
  grid-area: side;
  padding: 22px 22px 18px;
}
.mm-title {
  margin: 4px 0 0;
  color: #f8eedc;
  font-family: var(--gs-serif);
  font-size: clamp(64px, 8vw, 104px);
  font-weight: 500;
  line-height: 0.95;
  letter-spacing: -0.02em;
  text-shadow:
    0 6px 40px #000,
    0 0 60px #d9aa6222;
}
.mm-tag {
  margin: 10px 0 26px;
  color: #e3d3b8;
  font-size: 18px;
  text-shadow: 0 2px 14px #000;
}
.mm-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mm-item {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 68px;
  padding: 10px 16px 10px 12px;
  border: 1px solid #ffffff12;
  border-radius: 14px;
  background: linear-gradient(90deg, #160f0bcc, #160f0b66);
  text-decoration: none;
  overflow: hidden;
  transition:
    transform 260ms var(--gs-ease),
    border-color 200ms ease-out,
    background-color 200ms ease-out;
}
.mm-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 3px;
  background: var(--gs-gold);
  transform: scaleY(0);
  transition: transform 260ms var(--gs-ease);
}
.mm-item:hover,
.mm-item:focus-visible {
  transform: translateX(8px);
  border-color: #e7bf7c66;
  background: linear-gradient(90deg, #2a1b11e6, #2a1b1180);
}
.mm-item:hover::before,
.mm-item:focus-visible::before {
  transform: scaleY(1);
}
.mm-item.is-primary {
  border-color: #e7bf7c77;
  background: linear-gradient(90deg, #3a2615f0, #2a1b1199);
  box-shadow: 0 14px 34px #00000080;
}
.mm-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid #a77a4899;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3e2a19, #1a110b);
  color: var(--gs-gold);
}
.mm-item.is-primary .mm-icon {
  background: radial-gradient(circle at 35% 30%, #f2d199, #b88543);
  color: #1a1008;
}
.mm-text {
  display: grid;
  gap: 2px;
}
.mm-text strong {
  color: #f7ecd9;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.2;
}
.mm-text small {
  color: #cdbca1;
  font-size: 14px;
}
.mm-chev {
  color: #e7bf7c;
  opacity: 0.5;
  transition:
    opacity 200ms ease-out,
    transform 260ms var(--gs-ease);
}
.mm-item:hover .mm-chev,
.mm-item:focus-visible .mm-chev {
  opacity: 1;
  transform: translateX(3px);
}

.mm-side-title {
  margin: 0 0 14px;
  color: #f4e6cf;
  font-family: var(--gs-serif);
  font-size: 26px;
  font-weight: 500;
}
.mm-who {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #ffffff08;
}
.mm-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border: 2px solid #a77a48;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a3220, #1a110b);
  color: #f2d199;
  font-family: var(--gs-serif);
  font-size: 22px;
}
.mm-who-text {
  display: grid;
  min-width: 0;
}
.mm-who-text strong {
  overflow: hidden;
  color: #f7ecd9;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-who-text small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #cdbca1;
  font-size: 13px;
}
.mm-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e7bf7c;
}
.mm-who[data-tone="on"] .mm-dot {
  background: #9fd49a;
  box-shadow: 0 0 8px #9fd49a;
}
.mm-who[data-tone="error"] .mm-dot {
  background: #e59a8a;
}
.mm-steps {
  display: grid;
  gap: 6px;
  margin: 16px 0;
  padding: 0;
  list-style: none;
}
.mm-steps li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.mm-steps a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: #eadfca;
  text-decoration: none;
}
.mm-steps a:hover {
  color: var(--gs-gold-hi);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.mm-step-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border: 1px solid #a77a48;
  border-radius: 50%;
  color: #f0cd92;
  font-size: 12px;
  font-weight: 700;
}
.mm-steps li.is-done .mm-step-mark {
  border-color: #9fd49a;
  background: #9fd49a22;
  color: #c9ecc4;
}
.mm-steps li.is-done a {
  color: #c9bca6;
}
.mm-cta {
  width: 100%;
}
.mm-note {
  margin: 12px 0 0;
  color: #bfae94;
  font-size: 12px;
}
.mm-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
  color: #b9a88f;
  font-size: 13px;
}
.mm-foot a {
  color: #e7bf7c;
}

@media (max-width: 1100px) {
  .mm {
    grid-template-columns: minmax(0, 1fr) 320px;
    grid-template-areas: "menu side";
  }
}
@media (max-width: 760px) {
  .mm {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "menu"
      "side";
    min-height: 0;
    padding-top: 120px;
  }
  .mm-title {
    font-size: 64px;
  }
  .mm-item:hover,
  .mm-item:focus-visible {
    transform: none;
  }
}
</style>
