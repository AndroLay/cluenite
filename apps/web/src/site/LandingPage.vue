<script setup lang="ts">
/* global IntersectionObserver */
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import "./plates.css";
import { reduceMotion } from "./settings";
import type { HeroScene } from "../scene/heroScene";
import heroScene from "./plates/case_board.jpg";
import offshoreScene from "../assets/investigation/offshore-observatory-v1.png";
import GuideArt from "./GuideArt.vue";
import iconChat from "./landing/icon-chat.png";
import iconPeople from "./landing/icon-people.png";
import iconScales from "./landing/icon-scales.png";
import iconSearch from "./landing/icon-search.png";
import iconTwitch from "./landing/icon-twitch.png";
import modeMic from "../assets/mystery-live/museum-gallery.png";
import modeQuick from "../assets/mystery-live/museum-gallery.png";
import typewriter from "./plates/game_writing.jpg";
import ctaPapers from "./plates/case_board.jpg";

// Landing screen (S00). The page draws its own navigation and footer, so SiteRoot skips the shared chrome here.
// Sample rounds are labeled SAMPLE. Live rounds come only from the server.
//
// The hero is a living PixiJS scene (scene/heroScene.ts): a detective at an evidence board that answers a short,
// scripted sample chat. The case board below replays the first minute of the sample case: viewers call cells, the
// finds land on the board, chat raises a theory, and a poll shows how many believe it. Both are labeled samples and
// give away nothing past the first minute of the case.

const heroEl = ref<HTMLElement | null>(null);
const heroHost = ref<HTMLDivElement | null>(null);
const heroFailed = ref(false);
let hero: HeroScene | null = null;
let disposed = false;

interface HeroLine {
  user: string;
  text: string;
  pulse?: number;
  link?: readonly [number, number];
}
// Scripted sample chat for the hero. Each line makes the board answer: a pulse or a new thread.
const HERO_SCRIPT: readonly HeroLine[] = [
  { user: "ledger_lou", text: "!look H3", pulse: 3 },
  { user: "inkwell_ivy", text: "check the fingerprint card", pulse: 2 },
  { user: "tick_tock_tess", text: "string the portrait to the clock", link: [0, 3] },
  { user: "marlowe_fan", text: "the gardener's cap, look", pulse: 5 },
  { user: "velvet_glove", text: "who was at the manor at nine?", pulse: 1 },
  { user: "mudlark", text: "map + manor = the route in", link: [1, 4] },
];
const heroChat = ref<{ id: number; user: string; text: string }[]>([]);
let heroStep = 0;
let heroSeq = 0;
let heroTimer: number | null = null;

function heroTick(): void {
  const line = HERO_SCRIPT[heroStep % HERO_SCRIPT.length];
  heroStep += 1;
  if (!line) return;
  heroChat.value = [...heroChat.value.slice(-2), { id: (heroSeq += 1), user: line.user, text: line.text }];
  if (line.link) hero?.connect(line.link[0], line.link[1]);
  else if (line.pulse !== undefined) hero?.pulse(line.pulse);
}

// The case board demo: the first minute of the sample case, on a loop while the board is on screen.
type CardId = "LATCH" | "CLOCK" | "NOTE" | "THEORY";
const DEMO_CARDS: readonly { id: CardId; label: string; text: string; cell: string; spot: string }[] = [
  { id: "LATCH", label: "LATCH · B3", text: "Mud on the inside latch", cell: "B3", spot: "spot-latch" },
  { id: "CLOCK", label: "CLOCK · H3", text: "Stopped at 20:52", cell: "H3", spot: "spot-clock" },
  { id: "NOTE", label: "NOTE · E4", text: "“Meet at nine. Bring it.”", cell: "E4", spot: "spot-note" },
];
type DemoStep =
  | { kind: "look"; user: string; card: CardId; cell: string }
  | { kind: "say"; user: string; text: string; theory?: number };
const DEMO: readonly DemoStep[] = [
  { kind: "look", user: "ledger_lou", card: "LATCH", cell: "B3" },
  { kind: "look", user: "tick_tock_tess", card: "CLOCK", cell: "H3" },
  { kind: "say", user: "mudlark", text: "MUD on the latch. it's the gardener", theory: 58 },
  { kind: "look", user: "inkwell_ivy", card: "NOTE", cell: "E4" },
  { kind: "say", user: "velvet_glove", text: "oxblood ink... that's Celeste's colour", theory: 41 },
];
const demo = reactive({
  shown: [] as CardId[],
  chat: [] as { id: number; user: string; text: string; command: boolean }[],
  belief: 0,
  closed: false,
});
const monitorEl = ref<HTMLElement | null>(null);
let demoStep = 0;
let demoSeq = 0;
let demoTimer: number | null = null;
let monitorVisible = false;

function demoFinal(): void {
  demo.shown = ["LATCH", "CLOCK", "NOTE", "THEORY"];
  demo.chat = DEMO.map((step) => ({
    id: (demoSeq += 1),
    user: step.user,
    text: step.kind === "look" ? `!look ${step.cell}` : step.text,
    command: step.kind === "look",
  }));
  demo.belief = 41;
  demo.closed = true;
}

function demoReset(): void {
  demo.shown = [];
  demo.chat = [];
  demo.belief = 0;
  demo.closed = false;
  demoStep = 0;
}

function demoTick(): void {
  demoTimer = null;
  if (!monitorVisible || disposed) return;
  const step = DEMO[demoStep];
  if (step) {
    demoStep += 1;
    const command = step.kind === "look";
    demo.chat = [
      ...demo.chat.slice(-4),
      { id: (demoSeq += 1), user: step.user, text: command ? `!look ${step.cell}` : step.text, command },
    ];
    if (step.kind === "look") window.setTimeout(() => demo.shown.push(step.card), 650);
    else if (step.theory !== undefined) {
      if (!demo.shown.includes("THEORY")) demo.shown.push("THEORY");
      demo.belief = step.theory;
    }
    demoTimer = window.setTimeout(demoTick, 2100);
    return;
  }
  if (!demo.closed) {
    demo.closed = true;
    demoTimer = window.setTimeout(demoTick, 5200);
    return;
  }
  demoReset();
  demoTimer = window.setTimeout(demoTick, 900);
}

function stopLoops(): void {
  if (heroTimer !== null) window.clearInterval(heroTimer);
  heroTimer = null;
  if (demoTimer !== null) window.clearTimeout(demoTimer);
  demoTimer = null;
}

function startLoops(): void {
  stopLoops();
  if (reduceMotion.value) {
    demoFinal();
    heroChat.value = HERO_SCRIPT.slice(0, 3).map((line, index) => ({ id: index + 1, user: line.user, text: line.text }));
    return;
  }
  heroChat.value = [];
  heroTimer = window.setInterval(heroTick, 2800);
  heroTick();
  demoReset();
  if (monitorVisible) demoTimer = window.setTimeout(demoTick, 600);
}

let monitorObserver: IntersectionObserver | null = null;

onMounted(async () => {
  startLoops();
  const board = monitorEl.value;
  if (board) {
    monitorObserver = new IntersectionObserver((entries) => {
      const was = monitorVisible;
      monitorVisible = entries.some((entry) => entry.isIntersecting);
      if (reduceMotion.value) return;
      if (monitorVisible && !was && demoTimer === null) demoTimer = window.setTimeout(demoTick, 500);
    });
    monitorObserver.observe(board);
  }
  const host = heroHost.value;
  if (!host) return;
  try {
    const { createHeroScene } = await import("../scene/heroScene");
    const narrow = window.matchMedia("(max-width: 760px)").matches;
    const created = await createHeroScene(host, {
      reduced: reduceMotion.value,
      focusX: narrow ? 0.62 : 0.85,
      focusY: 0.3,
      ...(heroEl.value ? { pointerTarget: heroEl.value } : {}),
    });
    if (disposed) {
      created.destroy();
      return;
    }
    hero = created;
  } catch (error) {
    heroFailed.value = true;
    console.warn("The hero scene could not start", error);
  }
});

watch(reduceMotion, (value) => {
  hero?.setReducedMotion(value);
  startLoops();
});

onBeforeUnmount(() => {
  disposed = true;
  stopLoops();
  monitorObserver?.disconnect();
  hero?.destroy();
  hero = null;
});

const stripCards = [
  { title: "Quick Case", body: "A focused mystery in 45–90 seconds.", icon: iconSearch },
  { title: "Mystery Live", body: "A live round that runs with your stream.", icon: iconChat },
  { title: "Co-op Mystery", body: "Two streamers. Two perspectives. One proof.", icon: iconPeople },
];

// What the crew can do, as shown in the sample case today.
const crewFeatures = [
  {
    title: "Calls light up the room",
    body: "Viewers call grid cells such as !look H3. Each call appears in the room with the viewer’s name. Follow it, and the find is theirs.",
    art: "calls",
  },
  {
    title: "Credit where it’s due",
    body: "A crew board ranks who found what, and chat energy rises with every good find. The case report names an MVP.",
    art: "board",
  },
  {
    title: "Chat votes, evidence decides",
    body: "Polls show how much of chat believes each theory. Break one with the right record and watch the vote collapse.",
    art: "poll",
  },
  {
    title: "Two stations, one proof",
    body: "In co-op, a partner station holds part of the room. Trade records when they ask; the key deduction needs both.",
    art: "coop",
  },
] as const;

const steps = [
  {
    title: "The case opens",
    body: "The streamer picks a case from the menu. The board shows the premise, the question, and the clues on file.",
    art: "open",
  },
  {
    title: "Viewers inspect the evidence",
    body: "Clues are examined from chat or the host panel. Each look adds to what the team knows so far.",
    art: "search",
  },
  {
    title: "The team links clues",
    body: "Two clues that explain each other can be linked. Hints stay available while the round still has them.",
    art: "link",
  },
  {
    title: "A verdict closes the round",
    body: "A verdict needs a complete proof. The server accepts or rejects it, and the reveal shows the accepted verdict.",
    art: "close",
  },
 ] as const;

const modes = [
  {
    title: "Quick Case",
    pill: "45–90 SECONDS",
    body: "One short case on the board, with a fixed set of clues. Perfect for variety during stream breaks.",
    art: modeQuick,
    icon: iconSearch,
  },
  {
    title: "Mystery Live",
    pill: "LIVE ROUND",
    body: "The streamer runs a live round. Chat and the host panel send commands, examine clues, and build the proof together.",
    art: modeMic,
    icon: iconChat,
  },
  {
    title: "Co-op Mystery",
    pill: "TWO STREAMERS",
    body: "Two broadcasters share one case through an invitation. Two perspectives. One proof.",
    art: offshoreScene,
    icon: iconPeople,
  },
];

const statusLines = [
  "Live cases use Twitch sign-in and server-checked actions. Try a clearly labeled preview before creating a session.",
  "The OBS browser source is read-only. Stream setup keeps overlay access separate from host controls.",
  "Sample rounds are labeled SAMPLE. Live rounds come only from the server.",
];
</script>

<template>
  <div class="plate landing">
    <header class="landing-nav">
      <div class="page-wrap nav-row">
        <a class="lp-brand" href="/" aria-label="Cluenite home">
          <img :src="iconSearch" alt="" width="26" height="24" />
          <span>Cluenite</span>
        </a>
        <span class="nav-rule" aria-hidden="true"><span class="diamond"></span></span>
        <nav class="lp-links" aria-label="Site">
          <a href="/play">Cases</a>
          <a href="/guide">Guide</a>
          <a href="#community">Community</a>
          <a href="/settings">Settings</a>
        </nav>
        <a class="gold-btn nav-cta" href="/connect">
          <img class="twitch-ico" :src="iconTwitch" alt="" width="16" height="16" />
          Sign in with Twitch
        </a>
      </div>
    </header>

    <section ref="heroEl" class="hero">
      <div ref="heroHost" class="hero-scene" aria-hidden="true">
        <img v-if="heroFailed" class="hero-fallback" :src="heroScene" alt="" />
      </div>
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="hero-chat" aria-hidden="true">
        <span class="hero-chat-label">Sample chat</span>
        <TransitionGroup name="hero-line" tag="ol">
          <li v-for="line in heroChat" :key="line.id">
            <b>{{ line.user }}</b> <span :class="{ cmd: line.text.startsWith('!') }">{{ line.text }}</span>
          </li>
        </TransitionGroup>
      </div>
      <div class="page-wrap hero-copy">
        <h1>Solve the case<br />with your chat.</h1>
        <p class="lead">
          Turn live streams into collaborative detective cases. Investigate clues, connect the evidence, and reach the
          truth together with your viewers.
        </p>
        <div class="hero-actions">
          <a class="gold-btn cta-lg" href="/dashboard">
            <img class="twitch-ico" :src="iconTwitch" alt="" width="20" height="20" />
            Start playing
            <svg class="btn-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
          <a class="ghost-btn cta-lg" href="/?view=quick">Play a sample case</a>
        </div>
      </div>
    </section>

    <section class="page-wrap strip" aria-label="Play modes at a glance">
      <article v-for="card in stripCards" :key="card.title" class="strip-card">
        <span class="strip-icon" aria-hidden="true"><img :src="card.icon" alt="" /></span>
        <div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.body }}</p>
        </div>
      </article>
    </section>

    <section class="page-wrap monitor-wrap" aria-labelledby="board-title">
      <div ref="monitorEl" class="monitor">
        <div class="board">
          <header class="mon-head">
            <h2 id="board-title" class="head-title">
              <img :src="iconSearch" alt="" width="20" height="20" />The Case Board
            </h2>
            <span class="tag">SAMPLE · A MISSING MANUSCRIPT</span>
          </header>
          <div class="board-surface">
            <p class="visually-hidden">
              A replay of the sample case's first minute: viewers call grid cells, the finds are pinned to the
              board, and chat raises a theory.
            </p>
            <svg class="board-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <template v-if="demo.shown.includes('THEORY') && demo.shown.includes('LATCH')">
                <line class="board-thread thread-wide" x1="22" y1="10" x2="79" y2="52" pathLength="100" />
                <line class="board-thread thread-narrow" x1="27" y1="6" x2="73" y2="48" pathLength="100" />
              </template>
            </svg>
            <div
              v-for="card in DEMO_CARDS"
              :key="card.id"
              class="pin-card"
              :class="[card.spot, { 'is-in': demo.shown.includes(card.id) }]"
              aria-hidden="true"
            >
              <span class="pin" aria-hidden="true"></span>
              <b>{{ card.label }}</b>
              <p>{{ card.text }}</p>
            </div>
            <div class="pin-card theory-card spot-theory" :class="{ 'is-in': demo.shown.includes('THEORY') }" aria-hidden="true">
              <span class="pin" aria-hidden="true"></span>
              <b>CHAT SAYS</b>
              <p>The gardener climbed in.</p>
              <span class="poll"><span class="poll-bar"><span :style="{ width: `${demo.belief}%` }"></span></span>{{ demo.belief }}% believe it</span>
            </div>
          </div>
        </div>
        <aside class="chat-panel" aria-label="Sample chat activity">
          <header class="mon-head">
            <span class="head-title"><img :src="iconChat" alt="" width="20" height="20" />Chat Activity</span>
            <span class="tag subtle">SCRIPTED</span>
          </header>
          <TransitionGroup name="chat-line" tag="ul" class="chat-list" aria-hidden="true">
            <li v-for="line in demo.chat" :key="line.id">
              <span class="chat-user">{{ line.user }}</span>
              <code v-if="line.command">{{ line.text }}</code>
              <span v-else class="chat-say">{{ line.text }}</span>
            </li>
          </TransitionGroup>
          <div class="verdict" :class="{ 'is-closed': demo.closed }">
            <div class="verdict-head">
              <span class="head-title"><img :src="iconScales" alt="" width="20" height="20" />Verdict</span>
              <span class="tag">PROOF 0 / 3</span>
            </div>
            <p>Stays closed until the proof is complete. Three finds and a theory are not proof yet.</p>
            <a class="verdict-link" href="/?view=quick">
              Finish the case
              <svg class="btn-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
        </aside>
      </div>
      <div class="desk" aria-hidden="true">
        <svg class="desk-lens" viewBox="0 0 120 60" aria-hidden="true" focusable="false">
          <line x1="70" y1="38" x2="112" y2="54" />
          <circle cx="44" cy="26" r="22" />
        </svg>
      </div>
    </section>

    <section id="community" class="page-wrap block" aria-labelledby="community-title">
      <div class="section-head">
        <h2 id="community-title">Your chat is the crew</h2>
        <p>Every viewer can help, and the case remembers who did.</p>
      </div>
      <div class="crew-grid">
        <article v-for="feature in crewFeatures" :key="feature.title" class="crew-card">
          <div class="crew-art" :class="`crew-art--${feature.art}`" aria-hidden="true">
            <template v-if="feature.art === 'calls'">
              <span v-for="n in 12" :key="n" class="cell" :class="{ hot: n === 7 }"></span>
              <span class="call-tag"><b>H3</b> ledger_lou</span>
            </template>
            <template v-else-if="feature.art === 'board'">
              <span class="row"><i>ledger_lou</i><span class="bar" style="--w: 92%"></span><b>9</b></span>
              <span class="row"><i>tick_tock_tess</i><span class="bar" style="--w: 64%"></span><b>6</b></span>
              <span class="row"><i>inkwell_ivy</i><span class="bar" style="--w: 34%"></span><b>3</b></span>
            </template>
            <template v-else-if="feature.art === 'poll'">
              <span class="row"><i>INTRUDER</i><span class="bar falling"></span></span>
              <span class="row"><i>LOCKED</i><span class="bar steady" style="--w: 71%"></span></span>
            </template>
            <template v-else>
              <span class="station">A</span>
              <span class="record">CLOCK_STOP</span>
              <span class="station">B</span>
            </template>
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.body }}</p>
        </article>
      </div>
      <div class="crew-foot">
        <p>
          All four run in the sample case today, with scripted viewers. Live rounds take the same commands from Twitch
          chat; crew credit and partner stations still need server support before they run live.
        </p>
        <a class="gold-btn cta-lg" href="/?view=quick">
          Try it in the sample case
          <svg class="btn-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    </section>

    <section class="page-wrap block" aria-labelledby="rounds-title">
      <div class="section-head">
        <h2 id="rounds-title">How a round runs</h2>
        <p>A simple, collaborative flow that turns your stream into a detective case.</p>
      </div>
      <div class="flow">
        <article v-for="(step, index) in steps" :key="step.title" class="flow-step">
          <div class="step-art">
            <GuideArt :kind="step.art" />
            <span class="step-num">{{ index + 1 }}</span>
          </div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.body }}</p>
          <svg
            v-if="index < steps.length - 1"
            class="step-arrow"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </article>
      </div>
    </section>

    <section class="page-wrap block" aria-labelledby="modes-title">
      <div class="section-head">
        <h2 id="modes-title">Modes</h2>
        <p>Different ways to play Cluenite, for different kinds of streams.</p>
      </div>
      <div class="mode-grid">
        <article v-for="mode in modes" :key="mode.title" class="mode-card">
          <img v-if="mode.art" class="mode-art" :src="mode.art" alt="" aria-hidden="true" />

          <div class="mode-body">
            <span class="mode-icon"><img :src="mode.icon" alt="" /></span>
            <h3>{{ mode.title }}</h3>
            <span class="pill">{{ mode.pill }}</span>
            <p>{{ mode.body }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="page-wrap block" aria-labelledby="status-title">
      <div class="status">
        <img class="status-art" :src="typewriter" alt="" aria-hidden="true" />
        <div class="status-body">
          <div class="status-head">
            <h2 id="status-title">Current Build Status</h2>
            <span class="pill">PROTOTYPE</span>
          </div>
          <p v-for="line in statusLines" :key="line">{{ line }}</p>
        </div>
      </div>
    </section>

    <section class="closing" aria-labelledby="closing-title">
      <img class="closing-art" :src="ctaPapers" alt="" aria-hidden="true" />
      <div class="page-wrap closing-body">
        <span class="ornament" aria-hidden="true"></span>
        <h2 id="closing-title">Your next round starts in the case menu.</h2>
        <a class="gold-btn cta-lg" href="/play">
          Open the case menu
          <svg class="btn-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="page-wrap foot-row">
        <span>Cluenite is a prototype. Sample rounds are labeled SAMPLE.</span>
        <span>Settings are saved in this browser only.</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  --landing-serif: var(--site-serif, "Cluenite EB Garamond", Georgia, "Times New Roman", serif);
  --landing-line: #50361f;
  --landing-text: #d8c6aa;
  --landing-muted: #b9a58d;
  --landing-gold: #d5a65e;
  --landing-gold-hi: #f0c98a;
  display: block;
  min-height: 0;
  height: auto;
  overflow: visible;
  background: var(--bg);
  color: var(--landing-text);
  font-family: var(--plate-sans);
  font-size: 15px;
  line-height: 1.5;
}
.landing :focus-visible {
  outline: 2px solid var(--landing-gold-hi);
  outline-offset: 3px;
}
.landing h1,
.landing h2,
.landing h3 {
  font-family: var(--landing-serif);
  font-weight: 500;
  color: var(--pale);
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.landing p {
  margin: 0;
}
.page-wrap {
  width: min(1280px, 100% - 48px);
  margin-inline: auto;
}

/* Navigation */
.landing-nav {
  border-bottom: 1px solid var(--landing-line);
}
.nav-row {
  display: flex;
  align-items: center;
  gap: 28px;
  height: 72px;
}
.lp-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--pale);
  text-decoration: none;
  font-family: var(--landing-serif);
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.lp-brand img {
  width: 26px;
  height: 24px;
}
.nav-rule {
  position: relative;
  flex: 1;
  height: 1px;
  max-width: 340px;
  background: linear-gradient(to right, transparent, var(--landing-gold) 50%, transparent);
  opacity: 0.7;
}
.diamond {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 9px;
  height: 9px;
  border: 1px solid var(--landing-gold);
  background: var(--bg);
  transform: translate(-50%, -50%) rotate(45deg);
}
.lp-links {
  display: flex;
  gap: 26px;
}
.lp-links a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: var(--landing-muted);
  text-decoration: none;
  font-size: 14px;
  transition: color 160ms ease-out;
}
.lp-links a:hover {
  color: var(--pale);
}

/* Buttons */
.gold-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 6px;
  font-family: var(--plate-sans);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color 160ms ease-out,
    border-color 160ms ease-out,
    color 160ms ease-out;
}
.gold-btn {
  height: 38px;
  padding: 0 16px;
  font-size: 14px;
  color: #1a1008;
  background: linear-gradient(#e6bd7e, #c99a52);
  border: 1px solid #f0c98a;
  box-shadow: 0 8px 22px #0008;
}
.gold-btn:hover {
  background: linear-gradient(#f0cd92, #d7a862);
}
.ghost-btn {
  color: var(--pale);
  background: transparent;
  border: 1px solid #8a6a40;
}
.ghost-btn:hover {
  border-color: var(--landing-gold-hi);
  color: var(--landing-gold-hi);
}
.cta-lg {
  height: 54px;
  padding: 0 26px;
  font-size: 16px;
}
.twitch-ico {
  flex: none;
  filter: brightness(0);
}
.btn-arrow {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Hero: the living scene fills the section; the copy sits on a shaded left side. */
.hero {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: clamp(560px, 46vw, 700px);
  overflow: hidden;
}
.hero-scene {
  position: absolute;
  inset: 0;
  z-index: -2;
  background:
    radial-gradient(60% 70% at 72% 40%, #3a2414 0%, transparent 70%),
    #0d0806;
}
.hero-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.hero-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 70% 35%;
}
.hero-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(90deg, #0b0705 0%, #0b0705e6 26%, #0b070599 44%, #0b070500 62%),
    linear-gradient(0deg, var(--bg) 0%, #0d080600 26%),
    linear-gradient(180deg, #0b0705aa 0%, #0b070500 18%);
}
.hero-copy {
  position: relative;
  padding-block: 64px 120px;
}
.hero-copy h1 {
  max-width: 620px;
  font-size: clamp(46px, 5.2vw, 76px);
  line-height: 1.02;
  text-shadow: 0 4px 30px #000c;
}
/* `.landing p` resets margins, so the lead needs the extra class to keep its gap below the headline. */
.hero-copy .lead {
  max-width: 520px;
  margin-top: 30px;
  font-size: 18px;
  line-height: 1.6;
  color: #e3d3b8;
  text-shadow: 0 2px 16px #000;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 32px;
}
.hero-chat {
  position: absolute;
  right: max(24px, calc((100% - 1280px) / 2));
  bottom: 118px;
  width: 280px;
  padding: 12px 14px 10px;
  border: 1px solid #6a4a28cc;
  border-radius: 8px;
  background: #120b08d9;
  box-shadow: 0 18px 40px #000a;
  backdrop-filter: blur(3px);
  font-size: 13px;
}
.hero-chat-label {
  display: block;
  margin-bottom: 6px;
  color: #bfa98b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.hero-chat ol {
  display: grid;
  gap: 4px;
  min-height: 66px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.hero-chat li {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #dccbb0;
}
.hero-chat b {
  color: var(--landing-gold-hi);
  font-weight: 600;
}
.hero-chat .cmd {
  font-family: Consolas, "Courier New", monospace;
  color: var(--pale);
}
.hero-line-enter-active,
.chat-line-enter-active {
  transition:
    opacity 380ms ease-out,
    transform 380ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
.hero-line-leave-active,
.chat-line-leave-active {
  display: none;
}
.hero-line-enter-from,
.chat-line-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* Mode strip: rides up over the bottom of the hero. */
.strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  position: relative;
  z-index: 1;
  margin-top: -76px;
}
.strip-card {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 22px 24px;
  border: 1px solid #5a3d22;
  border-radius: 4px;
  background: linear-gradient(180deg, #1d140ef2, #140d09f2);
  box-shadow: 0 16px 34px #000a;
  transition:
    transform 260ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
    border-color 200ms ease-out;
}
.strip-card:hover {
  transform: translateY(-3px);
  border-color: #8a6a40;
}
.strip-card h3 {
  font-size: 22px;
  line-height: 1.15;
}
.strip-card p {
  margin-top: 6px;
  font-size: 14px;
  color: var(--landing-muted);
}
.strip-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid #7a5630;
  border-radius: 4px;
  background: #211710;
}
.strip-icon img {
  width: 26px;
  height: 26px;
}

/* Framed monitor: case board and chat activity */
.monitor-wrap {
  padding-top: 56px;
}
.monitor {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  border: 1px solid #6a4a28;
  border-radius: 4px;
  background: #140d09;
  box-shadow: 0 24px 60px #000a;
  overflow: hidden;
}
.board {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid #4a321c;
}
.board .board-surface {
  flex: 1;
}
.chat-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.mon-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px;
  border-bottom: 1px solid #4a321c;
  background: #1a120c;
}
.head-title,
.landing .mon-head .head-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: var(--landing-serif);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0;
  color: var(--pale);
}
.head-title img {
  width: 20px;
  height: 20px;
}
/* A cork board drawn in CSS: warm flecks, a dark rim, and the lamp's glow from above. */
.board-surface {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  background:
    radial-gradient(70% 60% at 55% 0%, #f0b45e2e, transparent 70%),
    radial-gradient(circle at 20% 30%, #00000033 0 1px, transparent 1.6px) 0 0 / 7px 9px,
    radial-gradient(circle at 70% 60%, #c79a6226 0 1px, transparent 1.8px) 0 0 / 11px 8px,
    linear-gradient(180deg, #5d3f25, #4a3120);
  box-shadow: inset 0 0 80px #000c;
}
.board-threads {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.board-thread {
  stroke: #c24a35;
  stroke-width: 2.2;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 2px 2px #0008);
}
.thread-narrow {
  display: none;
}
@media (max-width: 760px) {
  .thread-wide {
    display: none;
  }
  .thread-narrow {
    display: inline;
  }
}
.pin-card {
  position: absolute;
  width: 32%;
  padding: 18px 16px 14px;
  background: #ecdfc6;
  color: #2a1d12;
  border-radius: 2px;
  box-shadow:
    0 14px 26px #000a,
    0 1px 0 #fff6 inset;
  opacity: 0;
  transform: translateY(-10px) rotate(var(--tilt, 0deg)) scale(0.96);
  transition:
    opacity 420ms ease-out,
    transform 520ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
.pin-card.is-in {
  opacity: 1;
  transform: translateY(0) rotate(var(--tilt, 0deg)) scale(1);
}
.pin-card b {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #6a4420;
}
.pin-card p {
  margin-top: 6px;
  font-family: var(--landing-serif);
  font-size: 19px;
  line-height: 1.25;
  color: #20150c;
}
.pin {
  position: absolute;
  top: 6px;
  left: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ff9f8a, #b8402f 45%, #6e1f15);
  box-shadow: 1px 3px 4px #0009;
}
.spot-latch {
  left: 6%;
  top: 8%;
  --tilt: -2deg;
}
.spot-clock {
  left: 56%;
  top: 7%;
  width: 28%;
  --tilt: 1.6deg;
}
.spot-note {
  left: 22%;
  top: 55%;
  --tilt: -1deg;
}
.spot-theory {
  left: 62%;
  top: 50%;
  width: 34%;
  --tilt: 2.2deg;
}
.theory-card {
  background: #e3cdb2;
  border-top: 3px solid #b8402f;
}
.poll {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: #5a3a22;
  font-size: 12px;
  font-weight: 600;
}
.poll-bar {
  position: relative;
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #c4ab8b;
  overflow: hidden;
}
.poll-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #8d3a28, #c24a35);
  transition: width 900ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
.chat-list {
  flex: 1;
  min-height: 250px;
  margin: 0;
  padding: 6px 0;
  list-style: none;
}
.chat-say {
  color: #dccbb0;
  font-size: 14px;
}
.verdict-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: var(--landing-gold-hi);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
}
.verdict-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.verdict {
  transition: background-color 400ms ease-out;
}
.verdict.is-closed {
  background: linear-gradient(180deg, #2a1b11, #1a110b);
}
.chat-list li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 22px;
  border-bottom: 1px solid #3a2818;
}
.chat-user {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--landing-gold);
}
.chat-list code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 14px;
  color: var(--pale);
  background: none;
}
.verdict {
  padding: 18px 22px 22px;
}
.verdict-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.verdict p {
  font-size: 14px;
  color: var(--landing-muted);
}
.desk {
  position: relative;
  height: 26px;
  margin: 0 -40px;
  border-radius: 0 0 4px 4px;
  background: linear-gradient(#2a1a10, #120b07);
  border-top: 1px solid #5a3d22;
}
.desk-lens {
  position: absolute;
  left: 5%;
  top: -34px;
  width: 120px;
  height: 60px;
  fill: #e9decb14;
  stroke: #a77a48;
  stroke-width: 4;
  stroke-linecap: round;
  filter: drop-shadow(0 6px 6px #000b);
}

/* Community */
.crew-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
.crew-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 18px 20px;
  border: 1px solid #5a3d22;
  border-radius: 6px;
  background: linear-gradient(180deg, #1c130d, #140d09);
  box-shadow: 0 14px 30px #0008;
  transition:
    transform 260ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
    border-color 200ms ease-out;
}
.crew-card:hover {
  transform: translateY(-3px);
  border-color: #8a6a40;
}
.crew-card h3 {
  font-size: 22px;
  line-height: 1.15;
}
.crew-card p {
  color: var(--landing-muted);
  font-size: 14px;
}
.crew-art {
  position: relative;
  height: 120px;
  margin-bottom: 4px;
  overflow: hidden;
  border: 1px solid #3c2817;
  border-radius: 4px;
  background: radial-gradient(80% 90% at 50% 0%, #3a2414aa, #120b08);
}
.crew-art--calls {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
}
.crew-art--calls .cell {
  border: 1px solid #d9b68122;
}
.crew-art--calls .cell.hot {
  position: relative;
  border-color: #f0c98a;
  background: #f0c98a1f;
  box-shadow: inset 0 0 18px #f0b45e55;
}
.call-tag {
  position: absolute;
  left: 50%;
  top: 10px;
  translate: -50% 0;
  padding: 2px 10px;
  border: 1px solid #f0c98a;
  border-radius: 999px;
  background: #120b08e6;
  color: #f0c98a;
  font-size: 12px;
  white-space: nowrap;
}
.call-tag b {
  color: var(--pale);
  font-family: Consolas, "Courier New", monospace;
}
.crew-art--board,
.crew-art--poll {
  display: grid;
  align-content: center;
  gap: 10px;
  padding: 12px 14px;
}
.crew-art .row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px;
  color: #dccbb0;
  font-size: 12px;
}
.crew-art--poll .row {
  grid-template-columns: 74px minmax(0, 1fr);
}
.crew-art .row i {
  overflow: hidden;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crew-art .row b {
  color: var(--landing-gold-hi);
  text-align: right;
}
.crew-art .bar {
  position: relative;
  height: 7px;
  border-radius: 999px;
  background: #2b1d13;
  overflow: hidden;
}
.crew-art .bar::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--w, 50%);
  border-radius: inherit;
  background: linear-gradient(90deg, #8d6134, #e0b56f);
}
.crew-art .bar.falling::after {
  width: 6%;
  background: linear-gradient(90deg, #8d3a28, #c24a35);
}
.crew-art--coop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
}
.crew-art--coop .station {
  display: grid;
  place-items: center;
  width: 48px;
  height: 56px;
  border: 1px solid #a77a48;
  border-radius: 6px;
  background: #241810;
  color: var(--pale);
  font-family: var(--landing-serif);
  font-size: 24px;
}
.crew-art--coop .record {
  padding: 4px 8px;
  border-radius: 3px;
  background: #ecdfc6;
  color: #2a1d12;
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
  box-shadow: 0 6px 12px #0009;
}
.crew-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px 32px;
  margin-top: 26px;
}
.crew-foot p {
  max-width: 720px;
  color: var(--landing-muted);
  font-size: 14px;
}

/* Living details, full motion only. */
html[data-motion="full"] .crew-art--calls .cell.hot {
  animation: lp-glow 1800ms ease-in-out infinite;
}
html[data-motion="full"] .crew-art .bar.falling::after {
  animation: lp-fall 5200ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) infinite;
}
html[data-motion="full"] .crew-art--coop .record {
  animation: lp-trade 4200ms ease-in-out infinite;
}
html[data-motion="full"] .board-thread {
  animation: lp-draw 900ms ease-out both;
}
html[data-motion="full"] .step-art img,
html[data-motion="full"] .mode-art {
  transition: transform 1200ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
html[data-motion="full"] .flow-step:hover .step-art img,
html[data-motion="full"] .mode-card:hover .mode-art {
  transform: scale(1.05);
}
@keyframes lp-glow {
  0%,
  100% {
    box-shadow: inset 0 0 12px #f0b45e33;
  }
  50% {
    box-shadow: inset 0 0 28px #f0b45e88;
  }
}
@keyframes lp-fall {
  0%,
  20% {
    width: 58%;
  }
  60%,
  100% {
    width: 6%;
  }
}
@keyframes lp-trade {
  0%,
  10% {
    transform: translateX(-34px);
  }
  45%,
  55% {
    transform: translateX(34px);
  }
  90%,
  100% {
    transform: translateX(-34px);
  }
}
@keyframes lp-draw {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Section scaffolding */
.block {
  padding-top: 96px;
}
.section-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.section-head::before {
  content: "";
  width: 120px;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--landing-gold), transparent);
}
.section-head h2 {
  font-size: clamp(34px, 3.6vw, 46px);
  line-height: 1.1;
}
.section-head p {
  max-width: 620px;
  font-size: 17px;
  color: var(--landing-muted);
}

/* How a round runs */
.flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
  margin-top: 44px;
}
.flow-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
.step-art {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
  border: 1px solid #5a3d22;
  border-radius: 4px;
  background: #120c08;
}
.step-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.step-art :deep(svg) { width: 100%; height: 100%; }
.mode-art--scene :deep(svg) { display: block; width: 100%; height: 100%; }
.step-num {
  position: absolute;
  left: 12px;
  top: 12px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--landing-gold);
  border-radius: 50%;
  background: #0d0907;
  font-family: var(--landing-serif);
  font-size: 16px;
  color: var(--landing-gold-hi);
}
.flow-step h3 {
  margin-top: 20px;
  font-size: 22px;
  line-height: 1.2;
}
.flow-step p {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--landing-muted);
}
.step-arrow {
  position: absolute;
  top: 90px;
  right: -22px;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--landing-gold);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Modes */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  margin-top: 44px;
}
.mode-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #5a3d22;
  border-radius: 4px;
  background: #17100b;
}
.mode-art {
  display: block;
  width: 100%;
  height: 190px;
  object-fit: cover;
  border-bottom: 1px solid #5a3d22;
}
.mode-body {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 24px 26px;
}
.mode-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-top: -28px;
  border: 1px solid #7a5630;
  border-radius: 4px;
  background: #211710;
}
.mode-icon img {
  width: 28px;
  height: 28px;
}
.mode-body h3 {
  margin-top: 16px;
  font-size: 26px;
  line-height: 1.15;
}
.pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  margin-top: 12px;
  padding: 0 10px;
  border: 1px solid #8a6a40;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--landing-gold-hi);
}
.mode-body p {
  margin-top: 14px;
  font-size: 15px;
  line-height: 1.55;
  color: var(--landing-muted);
}

/* Build status */
.status {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
  overflow: hidden;
  border: 1px solid #5a3d22;
  border-radius: 4px;
  background: #17100b;
}
.status-art {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 260px;
  object-fit: cover;
}
.status-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 34px 40px;
}
.status-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}
.status-head h2 {
  font-size: 32px;
}
.status-body > p {
  font-size: 16px;
  line-height: 1.6;
  color: var(--landing-text);
}

/* Closing call to action */
.closing {
  position: relative;
  overflow: hidden;
  margin-top: 96px;
  padding: 96px 0;
  border-top: 1px solid #4a321c;
}
.closing-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.22;
  pointer-events: none;
}
.closing-body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  text-align: center;
}
.ornament {
  width: 14px;
  height: 14px;
  border: 1px solid var(--landing-gold);
  transform: rotate(45deg);
}
.closing-body h2 {
  max-width: 760px;
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.1;
}

/* Footer */
.landing-footer {
  padding: 22px 0 28px;
  border-top: 1px solid var(--landing-line);
}
.foot-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--landing-muted);
}

/* Responsive: 2 columns at 1100px, 1 column at 760px */
@media (max-width: 1100px) {
  .nav-rule {
    display: none;
  }
  .strip {
    grid-template-columns: 1fr;
  }
  .flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 40px;
  }
  .step-arrow {
    display: none;
  }
  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .monitor {
    grid-template-columns: 1fr;
  }
  .board {
    border-right: 0;
    border-bottom: 1px solid #4a321c;
  }
  .status {
    grid-template-columns: 1fr;
  }
  .status-art {
    height: 200px;
    min-height: 0;
  }
  .crew-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .strip {
    margin-top: -48px;
  }
  .hero-chat {
    bottom: 96px;
    width: 250px;
  }
}
@media (max-width: 900px) {
  .hero-chat {
    display: none;
  }
}
@media (max-width: 760px) {
  .nav-row {
    flex-wrap: wrap;
    row-gap: 12px;
    height: auto;
    padding: 14px 0;
  }
  .lp-links {
    order: 3;
    width: 100%;
    gap: 22px;
  }
  .lp-links a {
    min-height: 44px;
  }
  .nav-cta {
    margin-left: auto;
  }
  .hero {
    min-height: 0;
    align-items: flex-end;
  }
  .hero-shade {
    background:
      linear-gradient(0deg, var(--bg) 4%, #0b0705e0 44%, #0b070570 72%, #0b070533 100%),
      linear-gradient(90deg, #0b0705aa 0%, #0b070500 70%);
  }
  .hero-copy {
    padding-block: 220px 84px;
  }
  .hero-copy h1 {
    font-size: 44px;
  }
  .hero-copy .lead {
    font-size: 16px;
  }
  .strip {
    margin-top: -40px;
  }
  .crew-grid {
    grid-template-columns: 1fr;
  }
  .hero-actions .gold-btn,
  .hero-actions .ghost-btn {
    flex: 1 1 100%;
  }
  .strip-card {
    padding: 18px;
  }
  .mode-grid,
  .flow {
    grid-template-columns: 1fr;
  }
  .board-surface {
    min-height: 470px;
  }
  .pin-card {
    width: 46%;
    padding: 16px 12px 12px;
  }
  .pin-card p {
    font-size: 16px;
  }
  .spot-latch {
    left: 4%;
    top: 4%;
  }
  .spot-clock {
    left: 52%;
    top: 6%;
    width: 44%;
  }
  .spot-note {
    left: 4%;
    top: 52%;
  }
  .spot-theory {
    left: 50%;
    top: 46%;
    width: 46%;
  }
  .status-body {
    padding: 26px 24px;
  }
  .closing {
    padding: 64px 0;
  }
  .foot-row {
    flex-direction: column;
  }
}
</style>
