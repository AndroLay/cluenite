<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { SessionSummary } from "@cluenite/contracts";
import SessionList from "./SessionList.vue";
import OverlayControls from "../components/OverlayControls.vue";
import GameShell from "./GameShell.vue";
import SiteIcon from "./SiteIcon.vue";
import type { SiteIconName } from "./icons";
import { account, checkAccount, CHAT_LABELS, TWITCH_START } from "./account";
import { playUi } from "./uiSound";

// Setup reads real account/session state and creates a scoped overlay only after an explicit click.

interface Step {
  id: string;
  title: string;
  short: string;
  icon: SiteIconName;
}

const STEPS: readonly Step[] = [
  { id: "twitch", title: "Connect Twitch", short: "So Cluenite can read chat commands.", icon: "plug" },
  { id: "case", title: "Choose a session", short: "Continue an open session or create one.", icon: "play" },
  { id: "link", title: "Copy the overlay link", short: "A private link for your selected session.", icon: "copy" },
  { id: "obs", title: "Add it to OBS", short: "One browser source.", icon: "monitor" },
  { id: "check", title: "Check it on stream", short: "What you should see.", icon: "eye" },
];

const current = ref(0);
const selectedSession = ref("");
const copied = ref(false);
function loadedSessions(rows: SessionSummary[]): void {
  const requested = new URLSearchParams(window.location.search).get("round");
  if (!selectedSession.value && requested && rows.some(row => row.sessionId === requested && !row.needsRejoin)) selectedSession.value = requested;
}
const twitchReady = computed(() => account.state.kind === "signed-in" && account.state.connected);
const done = computed(() => [twitchReady.value, !!selectedSession.value, copied.value, current.value > 3, false]);
const chatLine = computed(() => (account.state.kind === "signed-in" ? CHAT_LABELS[account.state.chat] : ""));

function go(index: number): void {
  if (index < 0 || index >= STEPS.length) return;
  playUi(index > current.value ? "select" : "back");
  current.value = index;
  document.getElementById("su-step-title")?.focus({ preventScroll: true });
}

// Copies the address template only, never a real link. Both placeholders stay literal.
const template = `${window.location.origin}/?mode=obs&session=<session-id>#overlay=<overlay-token>`;
const copyNote = ref("");
async function copyTemplate(): Promise<void> {
  try {
    await window.navigator.clipboard.writeText(template);
    copyNote.value = "Template copied. Replace both placeholders before you use it.";
  } catch {
    copyNote.value = "The browser blocked copying. Select the address and copy it by hand.";
  }
}

onMounted(() => {
  void checkAccount().then(() => {
    if (twitchReady.value && current.value === 0) current.value = 1;
  });
});
</script>

<template>
  <GameShell :focus-x="0.95" :focus-y="0.3" dim="strong">
    <header class="su-head">
      <p class="gs-eyebrow" data-enter style="--i: 0">Stream setup</p>
      <h1 class="gs-h1" data-enter style="--i: 1">Get on stream in five steps</h1>
      <p class="gs-lede" data-enter style="--i: 2">Connect your channel, choose a session, and add its private link to OBS. Create a new link for each session.</p>
    </header>

    <div class="su" data-enter style="--i: 3">
      <ol class="su-rail" aria-label="Setup steps">
        <li v-for="(step, index) in STEPS" :key="step.id">
          <button
            type="button"
            class="su-rail-btn"
            :class="{ 'is-current': index === current, 'is-done': done[index] }"
            :aria-current="index === current ? 'step' : undefined"
            @click="go(index)"
          >
            <span class="su-rail-mark" aria-hidden="true">
              <SiteIcon v-if="done[index] && index !== current" name="check" :stroke="2.6" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="su-rail-text"
              ><strong>{{ step.title }}</strong><small>{{ step.short }}</small></span
            >
            <span v-if="done[index]" class="visually-hidden">, done</span>
          </button>
        </li>
      </ol>

      <section class="su-panel gs-card" aria-labelledby="su-step-title">
        <p class="su-count">Step {{ current + 1 }} of {{ STEPS.length }}</p>
        <h2 id="su-step-title" class="gs-h2" tabindex="-1">{{ STEPS[current]?.title }}</h2>

        <!-- 1. Twitch -->
        <div v-if="current === 0" class="su-body">
          <div class="su-status" :data-ok="twitchReady">
            <SiteIcon :name="twitchReady ? 'check-circle' : 'plug'" size="28px" />
            <div>
              <strong>{{
                account.state.kind === "checking"
                  ? "Checking…"
                  : twitchReady
                    ? `Connected as ${account.state.kind === "signed-in" ? account.state.name : ""}`
                    : "Not connected yet"
              }}</strong>
              <small>{{ twitchReady ? chatLine : "Twitch asks you to approve Cluenite, then sends you back." }}</small>
            </div>
          </div>
          <div class="su-actions">
            <a v-if="!twitchReady" class="gs-btn gs-btn--gold gs-btn--lg" :href="TWITCH_START"
              ><SiteIcon name="plug" /> Connect Twitch</a
            >
            <button v-else type="button" class="gs-btn gs-btn--gold gs-btn--lg" @click="go(1)">
              Next step <SiteIcon name="arrow-right" />
            </button>
            <a class="gs-btn gs-btn--ghost gs-btn--lg" href="/connect">Connection details</a>
          </div>
        </div>

        <!-- 2. Choose a real session -->
        <div v-else-if="current === 1" class="su-body">
          <p class="su-text">Choose the session you want to show in OBS. Creating a case opens it ready for the host to start.</p>
          <SessionList v-model="selectedSession" selectable @loaded="loadedSessions" @update:model-value="copied = false" />
          <div class="su-actions">
            <a class="gs-btn gs-btn--ghost gs-btn--lg" href="/play">Create a case</a>
            <button type="button" class="gs-btn gs-btn--gold gs-btn--lg" :disabled="!selectedSession" @click="go(2)">Next step <SiteIcon name="arrow-right" /></button>
          </div>
        </div>

        <!-- 3. Overlay link -->
        <div v-else-if="current === 2" class="su-body">
          <OverlayControls v-if="selectedSession" :session-id="selectedSession" @copied="copied = true" />
          <p v-else class="su-text">Choose a session first. A private link can only be created for a session you can access.</p>
          <button v-if="!selectedSession" type="button" class="gs-btn gs-btn--ghost" @click="go(1)">Choose a session</button>
          <ul class="su-facts">
            <li><SiteIcon name="lock" /> The link is private. It is copied, never shown on screen.</li>
            <li><SiteIcon name="clock" /> It belongs to this case and expires on its own.</li>
            <li><SiteIcon name="restart" /> If it leaks, press <b>Revoke link</b> and make a new one.</li>
          </ul>
          <div class="su-actions">
            <button type="button" class="gs-btn gs-btn--gold gs-btn--lg" :disabled="!copied" @click="go(3)">
              Continue to OBS <SiteIcon name="arrow-right" />
            </button>
          </div>
        </div>

        <!-- 4. OBS -->
        <div v-else-if="current === 3" class="su-body">
          <ol class="su-obs-steps">
            <li>In OBS, under <b>Sources</b>, press <b>+</b> and pick <b>Browser</b>.</li>
            <li>Paste the link into <b>URL</b>.</li>
            <li>Set <b>Width 1920</b> and <b>Height 1080</b>, then press <b>OK</b>.</li>
          </ol>
          <div class="su-mock su-mock--obs" aria-hidden="true">
            <span class="su-obs-title">Properties for “Cluenite”</span>
            <span class="su-obs-row"><b>URL</b><span class="su-obs-field su-obs-url">Paste the copied link</span></span>
            <span class="su-obs-row"><b>Width</b><span class="su-obs-field">1920</span></span>
            <span class="su-obs-row"><b>Height</b><span class="su-obs-field">1080</span></span>
            <span class="su-obs-ok">OK</span>
          </div>
          <div class="su-actions">
            <button type="button" class="gs-btn gs-btn--gold gs-btn--lg" @click="go(4)">
              Added it <SiteIcon name="arrow-right" />
            </button>
          </div>
        </div>

        <!-- 5. Check -->
        <div v-else class="su-body">
          <p class="su-text">
            The case card appears over your scene and updates as chat plays. The background stays see-through, and
            the overlay has no buttons.
          </p>
          <ul class="su-facts">
            <li><SiteIcon name="check" /> You see the case title and the clues on your stream.</li>
            <li><SiteIcon name="chat" /> A chat command such as <code>!look</code> changes the board within moments.</li>
            <li>
              <SiteIcon name="alert" /> Blank source? Press <b>Refresh</b> in the browser source, or make a new link
              in the host controls.
            </li>
          </ul>
          <div class="su-actions">
            <a class="gs-btn gs-btn--gold gs-btn--lg" href="/play" @click="playUi('success')"
              ><SiteIcon name="play" /> Play a case</a
            >
            <a class="gs-btn gs-btn--ghost gs-btn--lg" href="/guide">How to play</a>
          </div>
          <p class="su-small">The overlay has not been tested in OBS Studio yet. These steps describe the intended setup.</p>
        </div>

        <div class="su-nav">
          <button type="button" class="gs-btn gs-btn--ghost" :disabled="current === 0" @click="go(current - 1)">
            <SiteIcon name="arrow-left" /> Back
          </button>
          <span class="su-dots" aria-hidden="true"
            ><i v-for="(step, index) in STEPS" :key="step.id" :class="{ on: index === current }"></i
          ></span>
          <button
            type="button"
            class="gs-btn gs-btn--ghost"
            :disabled="current === STEPS.length - 1"
            @click="go(current + 1)"
          >
            Next <SiteIcon name="arrow-right" />
          </button>
        </div>
      </section>
    </div>

    <details class="su-advanced" data-enter style="--i: 5">
      <summary>Advanced: the overlay address format</summary>
      <p>The host controls build this address for you. It is shown here only for troubleshooting.</p>
      <div class="su-template">
        <code>{{ template }}</code>
        <button type="button" class="gs-btn gs-btn--ghost" @click="copyTemplate"><SiteIcon name="copy" /> Copy</button>
      </div>
      <p class="su-small" role="status">{{ copyNote }}</p>
      <p class="su-small">Canvas 1920 × 1080. The compact Quick Case card is 545 × 228 px.</p>
    </details>
  </GameShell>
</template>

<style scoped>
.su-head {
  margin-bottom: 24px;
}
.su {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}
.su-rail {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.su-rail-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 14px;
  border: 1px solid #ffffff14;
  border-radius: 14px;
  background: #140d09cc;
  color: var(--gs-text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 200ms ease-out,
    background-color 200ms ease-out,
    transform 220ms var(--gs-ease);
}
.su-rail-btn:hover {
  transform: translateX(4px);
  border-color: #e7bf7c55;
}
.su-rail-btn.is-current {
  border-color: var(--gs-gold);
  background: linear-gradient(90deg, #3a2615f0, #24170ee6);
}
.su-rail-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 1px solid #a77a48;
  border-radius: 50%;
  color: #f0cd92;
  font-weight: 700;
}
.su-rail-btn.is-done .su-rail-mark {
  border-color: #9fd49a;
  background: #9fd49a22;
  color: #c9ecc4;
}
.su-rail-btn.is-current .su-rail-mark {
  border-color: var(--gs-gold);
  background: linear-gradient(180deg, #f2d199, #c99a52);
  color: #1a1008;
}
.su-rail-text {
  display: grid;
}
.su-rail-text strong {
  font-size: 15px;
}
.su-rail-text small {
  color: #cdbca1;
  font-size: 12px;
}

.su-panel {
  padding: 26px 28px 20px;
}
.su-count {
  margin: 0 0 4px;
  color: #d9aa62;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.su-panel h2:focus {
  outline: none;
}
.su-body {
  min-height: 300px;
  margin-top: 16px;
}
.su-text {
  max-width: 620px;
  margin: 0;
  color: #e3d3b8;
  font-size: 17px;
}
.su-text b,
.su-facts b,
.su-obs-steps b {
  color: #f6dcae;
}
.su-status {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #f0b45e55;
  border-radius: 14px;
  background: #2a1b1199;
  color: #f0cd92;
}
.su-status[data-ok="true"] {
  border-color: #9fd49a66;
  background: #1c2416aa;
  color: #c9ecc4;
}
.su-status strong {
  display: block;
  color: #f7ecd9;
  font-size: 17px;
}
.su-status small {
  color: #cdbca1;
  font-size: 14px;
}
.su-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}
.su-facts {
  display: grid;
  gap: 10px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}
.su-facts li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #e0d1b7;
}
.su-facts li > .site-icon {
  flex: none;
  margin-top: 3px;
  color: var(--gs-gold);
}
.su-facts code,
.su-text code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #ffffff12;
}
.su-obs-steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 22px;
  color: #e3d3b8;
  font-size: 16px;
}
.su-small {
  margin: 14px 0 0;
  color: #bfae94;
  font-size: 13px;
}
.su-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #ffffff12;
}
.su-dots {
  display: flex;
  gap: 6px;
}
.su-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffffff26;
  transition:
    width 260ms var(--gs-ease),
    background-color 200ms ease-out;
}
.su-dots i.on {
  width: 22px;
  border-radius: 6px;
  background: var(--gs-gold);
}

/* Mock screens: small drawings of the real controls, animated in full motion. */
.su-mock {
  position: relative;
  max-width: 460px;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid #ffffff1f;
  border-radius: 12px;
  background: #0d0907e6;
  box-shadow: 0 16px 34px #000a;
}
.su-mock--menu {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.su-mock-card {
  display: grid;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #1d140e;
}
.su-mock-card i {
  height: 54px;
  border-radius: 6px;
  background: linear-gradient(135deg, #4a3220, #1a110b);
}
.su-mock-card b {
  padding: 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f2d199, #c99a52);
  color: #1a1008;
  font-size: 12px;
  text-align: center;
}
.su-mock--host {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.su-mock-title {
  width: 100%;
  color: #f4e6cf;
  font-family: var(--gs-serif);
  font-size: 20px;
}
.su-mock-btn {
  padding: 9px 14px;
  border: 1px solid #a77a48;
  border-radius: 8px;
  background: #2a1b11;
  color: #f3e6cf;
  font-size: 13px;
  font-weight: 600;
}
.su-mock-toast {
  padding: 4px 10px;
  border-radius: 999px;
  background: #1f2a17;
  color: #c9ecc4;
  font-size: 12px;
  opacity: 0;
}
.su-mock--obs {
  display: grid;
  gap: 10px;
  max-width: 480px;
  background: #1e1e22;
  border-color: #3a3a40;
  color: #e6e6e6;
  font-size: 13px;
}
.su-obs-title {
  padding-bottom: 8px;
  border-bottom: 1px solid #3a3a40;
  color: #d0d0d4;
}
.su-obs-row {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}
.su-obs-row b {
  color: #c8c8cc;
  font-weight: 600;
  text-align: right;
}
.su-obs-field {
  overflow: hidden;
  padding: 6px 10px;
  border: 1px solid #4a4a52;
  border-radius: 4px;
  background: #2a2a30;
  white-space: nowrap;
}
.su-obs-url {
  color: #9a9aa2;
  font-style: italic;
}
.su-obs-ok {
  justify-self: end;
  padding: 6px 22px;
  border-radius: 4px;
  background: #3c3c44;
  color: #f0f0f0;
}
.su-cursor {
  position: absolute;
  left: 30%;
  top: 70%;
  width: 18px;
  height: 18px;
  background: #fff;
  clip-path: polygon(0 0, 0 100%, 30% 72%, 52% 100%, 66% 92%, 44% 66%, 80% 66%);
  filter: drop-shadow(0 2px 2px #0009);
  opacity: 0;
}
html[data-motion="full"] .su-mock--menu .su-cursor {
  animation: su-cursor-menu 3200ms var(--gs-ease) infinite;
}
html[data-motion="full"] .su-mock--host .su-cursor {
  animation: su-cursor-host 4200ms var(--gs-ease) infinite;
}
html[data-motion="full"] .su-mock--host .su-mock-btn--a {
  animation: su-press 4200ms infinite;
}
html[data-motion="full"] .su-mock--host .su-mock-btn--b {
  animation: su-press-b 4200ms infinite;
}
html[data-motion="full"] .su-mock--host .su-mock-toast {
  animation: su-toast 4200ms infinite;
}
html[data-motion="full"] .su-obs-url {
  animation: su-paste 4000ms steps(1) infinite;
}
html[data-motion="full"] .su-obs-ok {
  animation: su-ok 4000ms infinite;
}
html:not([data-motion="full"]) .su-mock-toast {
  opacity: 1;
}
@keyframes su-cursor-menu {
  0% {
    opacity: 0;
    left: 70%;
    top: 90%;
  }
  20% {
    opacity: 1;
  }
  55%,
  70% {
    opacity: 1;
    left: 22%;
    top: 78%;
  }
  100% {
    opacity: 0;
    left: 22%;
    top: 78%;
  }
}
@keyframes su-cursor-host {
  0% {
    opacity: 0;
    left: 80%;
    top: 100%;
  }
  15% {
    opacity: 1;
  }
  30%,
  38% {
    left: 22%;
    top: 62%;
  }
  60%,
  70% {
    opacity: 1;
    left: 56%;
    top: 62%;
  }
  100% {
    opacity: 0;
    left: 56%;
    top: 62%;
  }
}
@keyframes su-press {
  32%,
  36% {
    transform: scale(0.95);
    background: #4a3220;
  }
}
@keyframes su-press-b {
  64%,
  68% {
    transform: scale(0.95);
    background: #4a3220;
  }
}
@keyframes su-toast {
  0%,
  66% {
    opacity: 0;
  }
  72%,
  92% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
@keyframes su-paste {
  0%,
  35% {
    color: #9a9aa2;
  }
  36%,
  100% {
    color: #f0f0f0;
  }
}
@keyframes su-ok {
  70%,
  76% {
    background: #5a5a66;
    transform: scale(0.96);
  }
}

.su-advanced {
  margin-top: 22px;
  padding: 14px 18px;
  border: 1px solid #ffffff14;
  border-radius: 12px;
  background: #120c08cc;
}
.su-advanced summary {
  min-height: 32px;
  color: #f0cd92;
  font-weight: 600;
  cursor: pointer;
}
.su-advanced p {
  margin: 8px 0 0;
  color: #cdbca1;
}
.su-template {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.su-template code {
  flex: 1 1 320px;
  padding: 10px 12px;
  border: 1px solid #ffffff1f;
  border-radius: 8px;
  background: #0b0705;
  overflow-wrap: anywhere;
  font-size: 13px;
}

@media (max-width: 900px) {
  .su {
    grid-template-columns: minmax(0, 1fr);
  }
  .su-rail {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  .su-rail-btn {
    justify-content: center;
    min-height: 52px;
    padding: 8px;
  }
  .su-rail-text {
    display: none;
  }
  .su-panel {
    padding: 20px 18px 16px;
  }
}
</style>
