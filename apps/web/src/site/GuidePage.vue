<script setup lang="ts">
/* global navigator */
import { ref } from "vue";
import GameShell from "./GameShell.vue";
import GuideArt from "./GuideArt.vue";
import SiteIcon from "./SiteIcon.vue";
import { playUi } from "./uiSound";

// How to play: the case in five animated steps, the chat commands with copy buttons, and fixes for common
// problems. Examples use placeholders, never the IDs of a real case, so the guide gives no answer away.

type Audience = "streamer" | "viewer";
const audience = ref<Audience>("streamer");

const STEPS = [
  { art: "open", title: "Start a case", body: "Pick a case in Play. The board shows the question and the first clues." },
  { art: "search", title: "Chat searches", body: "Viewers type commands. Each look turns up a clue and puts records on the board." },
  { art: "link", title: "Connect the evidence", body: "Link two records that explain each other. A good link moves the case on." },
  { art: "theory", title: "Break the wrong theories", body: "Chat will guess. Test a guess with the one record it cannot survive." },
  { art: "close", title: "Name the culprit", body: "When the proof is complete, the verdict opens, and the reveal shows what happened." },
] as const;

const COMMANDS = [
  { code: "!look <clue-id>", what: "Look at one clue on the board. !inspect works too." },
  { code: "!link <evidence-id> <evidence-id>", what: "Link two records that explain each other." },
  { code: "!hint", what: "Ask for a hint while the case still has some." },
  { code: "!solve <verdict-id>", what: "Name the answer once the proof is complete." },
  { code: "!help", what: "Lists the commands that work right now." },
] as const;

const VIEWER_STEPS = [
  { icon: "eye", title: "Watch the board", body: "The case is on stream: the question, the clues, and the records found so far." },
  { icon: "chat", title: "Type a command", body: "Commands start with ! and use the IDs shown on the board, one command per message." },
  { icon: "check-circle", title: "See it land", body: "The server checks every command. A good find shows up on the board for everyone." },
] as const;

const copied = ref("");
async function copy(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    copied.value = code;
    playUi("select");
    window.setTimeout(() => {
      if (copied.value === code) copied.value = "";
    }, 1600);
  } catch {
    copied.value = "";
  }
}

function pick(next: Audience): void {
  audience.value = next;
  playUi("hover");
}
</script>

<template>
  <GameShell :focus-x="0.97" :focus-y="0.3" dim="strong">
    <header class="gd-head">
      <p class="gs-eyebrow" data-enter style="--i: 0">Guide</p>
      <h1 class="gs-h1" data-enter style="--i: 1">How to play</h1>
      <p class="gs-lede" data-enter style="--i: 2">
        A case is a short mystery your stream solves together. Here is the whole game in five steps.
      </p>
      <div class="gd-switch" role="group" aria-label="Show the guide for" data-enter style="--i: 3">
        <button type="button" :aria-pressed="audience === 'streamer'" @click="pick('streamer')">
          <SiteIcon name="broadcast" /> I'm streaming
        </button>
        <button type="button" :aria-pressed="audience === 'viewer'" @click="pick('viewer')">
          <SiteIcon name="chat" /> I'm in chat
        </button>
      </div>
    </header>

    <section v-if="audience === 'streamer'" aria-labelledby="gd-steps-title">
      <h2 id="gd-steps-title" class="visually-hidden">The five steps</h2>
      <ol class="gd-steps">
        <li v-for="(step, index) in STEPS" :key="step.title" class="gd-step gs-card" data-enter :style="{ '--i': index + 4 }">
          <GuideArt :kind="step.art" />
          <div class="gd-step-text">
            <span class="gd-num" aria-hidden="true">{{ index + 1 }}</span>
            <h3 class="gs-h3">{{ step.title }}</h3>
            <p>{{ step.body }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section v-else aria-labelledby="gd-viewer-title">
      <h2 id="gd-viewer-title" class="visually-hidden">How chat joins in</h2>
      <ol class="gd-viewer">
        <li v-for="(step, index) in VIEWER_STEPS" :key="step.title" class="gs-card" data-enter :style="{ '--i': index + 4 }">
          <span class="gd-viewer-icon"><SiteIcon :name="step.icon" size="26px" /></span>
          <h3 class="gs-h3">{{ step.title }}</h3>
          <p>{{ step.body }}</p>
        </li>
      </ol>
      <div class="gd-art-row">
        <GuideArt kind="search" />
        <GuideArt kind="link" />
      </div>
    </section>

    <section class="gd-block" aria-labelledby="gd-commands-title">
      <h2 id="gd-commands-title" class="gs-h2">Chat commands</h2>
      <p class="gs-muted gd-sub">Replace the parts in &lt;brackets&gt; with the IDs shown on the board.</p>
      <ul class="gd-commands">
        <li v-for="command in COMMANDS" :key="command.code" class="gs-card">
          <code>{{ command.code }}</code>
          <p>{{ command.what }}</p>
          <button type="button" class="gd-copy" :aria-label="`Copy ${command.code}`" @click="copy(command.code)">
            <SiteIcon :name="copied === command.code ? 'check' : 'copy'" />
            {{ copied === command.code ? "Copied" : "Copy" }}
          </button>
        </li>
      </ul>
      <p class="gd-callout">
        <SiteIcon name="gamepad" />
        <span
          >In the <a href="/?view=quick">practice case</a>, chat searches the room by grid cell, for example
          <code>!look H3</code>. Live cases look at a clue by its ID.</span
        >
      </p>
    </section>

    <section class="gd-block" aria-labelledby="gd-help-title">
      <h2 id="gd-help-title" class="gs-h2">If something goes wrong</h2>
      <div class="gd-faq">
        <details class="gs-card">
          <summary>“Start case” is not available</summary>
          <p>Connect Twitch first. The pill at the top right shows your status. Then open Play again.</p>
        </details>
        <details class="gs-card">
          <summary>The case list is empty or does not load</summary>
          <p>The server is not running, or it has no cases yet. Start it, then press Retry on the Play page.</p>
        </details>
        <details class="gs-card">
          <summary>Chat commands do nothing</summary>
          <p>
            Open the <a href="/connect">connection page</a>. It should say “Chat is listening”. You can also send the
            same command from the host controls.
          </p>
        </details>
        <details class="gs-card">
          <summary>The OBS source is blank</summary>
          <p>
            In the host controls, press Create overlay link, then Copy link, and paste it into the browser source
            again. A link belongs to one case and expires on its own.
          </p>
        </details>
        <details class="gs-card">
          <summary>There is no sound</summary>
          <p>Press the speaker button at the top, or turn sound on in <a href="/settings">Settings</a>.</p>
        </details>
      </div>
    </section>

    <div class="gd-cta gs-card">
      <div>
        <h2 class="gs-h3">Ready?</h2>
        <p class="gs-muted">Practice alone first, or start a case with your chat.</p>
      </div>
      <div class="gd-cta-actions">
        <a class="gs-btn gs-btn--ghost gs-btn--lg" href="/?view=quick"><SiteIcon name="gamepad" /> Practice case</a>
        <a class="gs-btn gs-btn--gold gs-btn--lg" href="/play"><SiteIcon name="play" /> Play a case</a>
      </div>
    </div>
  </GameShell>
</template>

<style scoped>
.gd-head {
  margin-bottom: 26px;
}
.gd-switch {
  display: inline-flex;
  gap: 6px;
  margin-top: 20px;
  padding: 5px;
  border: 1px solid #ffffff1f;
  border-radius: 999px;
  background: #120c08cc;
}
.gd-switch button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--gs-text);
  font: 600 15px/1 var(--gs-sans);
  cursor: pointer;
}
.gd-switch button[aria-pressed="true"] {
  background: linear-gradient(180deg, #f2d199, #c99a52);
  color: #1a1008;
}
.gd-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gd-step {
  overflow: hidden;
}
.gd-step-text {
  position: relative;
  padding: 14px 16px 18px;
}
.gd-num {
  position: absolute;
  right: 14px;
  top: -18px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 2px solid #120c08;
  border-radius: 50%;
  background: linear-gradient(180deg, #f2d199, #c99a52);
  color: #1a1008;
  font-weight: 800;
}
.gd-step-text p,
.gd-viewer p {
  margin: 6px 0 0;
  color: #dccdb3;
  font-size: 14px;
}
.gd-viewer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gd-viewer li {
  padding: 18px;
}
.gd-viewer-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 10px;
  border: 1px solid #a77a48;
  border-radius: 50%;
  color: var(--gs-gold);
}
.gd-art-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  max-width: 760px;
  margin-top: 14px;
}
.gd-block {
  margin-top: 46px;
}
.gd-sub {
  margin: 6px 0 16px;
}
.gd-commands {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gd-commands li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "code copy"
    "what copy";
  align-items: center;
  gap: 4px 12px;
  padding: 14px 16px;
}
.gd-commands code {
  grid-area: code;
  padding: 0;
  background: none;
  color: #f6dcae;
  font: 600 16px/1.3 Consolas, "Courier New", monospace;
}
.gd-commands p {
  grid-area: what;
  margin: 0;
  color: #cdbca1;
  font-size: 14px;
}
.gd-copy {
  grid-area: copy;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #ffffff26;
  border-radius: 999px;
  background: #ffffff0a;
  color: var(--gs-text);
  font: 600 13px/1 var(--gs-sans);
  cursor: pointer;
}
.gd-copy:hover {
  border-color: var(--gs-gold);
  color: var(--gs-gold-hi);
}
.gd-callout {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0 0;
  padding: 12px 16px;
  border-left: 3px solid var(--gs-gold);
  border-radius: 8px;
  background: #2a1b1199;
  color: #e3d3b8;
}
.gd-callout code,
.gd-faq code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #ffffff12;
}
.gd-callout a,
.gd-faq a {
  color: var(--gs-gold-hi);
}
.gd-faq {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.gd-faq details {
  padding: 4px 18px;
}
.gd-faq summary {
  display: flex;
  align-items: center;
  min-height: 52px;
  color: #f4e6cf;
  font-weight: 600;
  cursor: pointer;
}
.gd-faq p {
  margin: 0 0 14px;
  color: #dccdb3;
}
.gd-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 46px;
  padding: 22px 24px;
}
.gd-cta p {
  margin: 4px 0 0;
}
.gd-cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 1100px) {
  .gd-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .gd-steps,
  .gd-viewer,
  .gd-art-row {
    grid-template-columns: minmax(0, 1fr);
  }
  .gd-commands {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
