<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { RoundSnapshot, SessionControl } from "@cluenite/contracts";
import GameWorkspace from "../site/GameWorkspace.vue";
import EvidenceDialog from "../site/EvidenceDialog.vue";
import GameNotification from "../site/GameNotification.vue";
import CaseAtmosphere from "./CaseAtmosphere.vue";
import SiteIcon from "../site/SiteIcon.vue";
import type { ScenePoint } from "../scene/caseStage";
import { formatElapsed } from "../quickCase/viewModel";
import gallery from "../assets/mystery-live/museum-gallery.png";
import observatory from "../assets/investigation/offshore-observatory-v1.png";
import recordsRoom from "../site/plates/game_writing.jpg";
import trophyPhoto from "../assets/mystery-live/trophy-photo.png";
import heatWarning from "../assets/mystery-live/heat-warning.png";
import accessLog from "../assets/mystery-live/access-log.png";
import trolleyCctv from "../assets/mystery-live/trolley-cctv.png";

// Presentation consumes the authenticated public projection. Only accepted server updates reveal facts.
const props = withDefaults(defineProps<{
  snapshot: RoundSnapshot;
  interactive?: boolean;
  preview?: boolean;
  hosting?: boolean;
  initialHostPanel?: boolean;
  restartRevision?: number;
  muted?: boolean;
  notice?: { tone: "ok" | "warn"; text: string } | null;
}>(), { interactive: false, preview: false, hosting: false, initialHostPanel: false, restartRevision: 0, muted: true, notice: null });
const emit = defineEmits<{ command: [text: string]; control: [action: SessionControl["action"]]; "toggle-mute": [] }>();
type Surface = "scene" | "board" | "timeline" | "theories" | "verdict";
const surface = ref<Surface>("scene");
const panel = ref<"activity" | "briefing" | "host" | null>(props.initialHostPanel ? "host" : null);
const inspection = ref<{ kind: "clue" | "evidence"; id: string } | null>(null);
const selected = ref<string[]>([]);
const theoryId = ref(props.snapshot.theories[0]?.id ?? "");
const challengeEvidence = ref("");
const verdictId = ref<string | null>(null);
const timelineOrder = ref<string[]>(props.snapshot.sequences[0]?.events?.map(event => event.id) ?? []);
const activity = ref<{ id: number; text: string }[]>([]);
const discoveryNotice = ref<{ id: number; title: string; text: string; code: string } | null>(null);
const sceneCue = ref<{ id: number; label: string; kind: "clue" | "share" | "proof"; point?: ScenePoint } | null>(null);
const crewNotice = computed(() => activity.value[0] ? { id: activity.value[0].id, title: coop.value ? 'Station activity' : 'Investigation activity', text: activity.value[0].text } : null);
let activityId = 0;
let lastResetRevision = 0;
let receivedAt = Date.now();
const now = ref(receivedAt);
let ticker: number | undefined;
const phoneQuery = window.matchMedia("(max-width: 760px)");
const shortQuery = window.matchMedia("(max-height: 560px)");
const phone = ref(phoneQuery.matches);
const short = ref(shortQuery.matches);
function viewportChanged(): void { phone.value = phoneQuery.matches; short.value = shortQuery.matches; }
onMounted(() => { phoneQuery.addEventListener("change", viewportChanged); shortQuery.addEventListener("change", viewportChanged); });
onBeforeUnmount(() => { phoneQuery.removeEventListener("change", viewportChanged); shortQuery.removeEventListener("change", viewportChanged); });
onMounted(() => { ticker = window.setInterval(() => { now.value = Date.now(); }, 500); });
onBeforeUnmount(() => window.clearInterval(ticker));

const actions = computed(() => new Set(props.snapshot.availableActions));
const active = computed(() => props.interactive && !props.preview && props.snapshot.phase === "ACTIVE" && !props.snapshot.paused);
const coop = computed(() => props.snapshot.caseMode === "coop");
const station = computed(() => props.snapshot.team === "A" ? "Field station" : props.snapshot.team === "B" ? "Records station" : "Two stations");
const stationCommand = computed(() => props.snapshot.team === "B" ? "!verify B17" : "!scan P4");
const elapsed = computed(() => formatElapsed(props.snapshot.timer.elapsedMs + (props.snapshot.timer.running && !props.snapshot.paused && !props.preview ? Math.max(0, now.value - receivedAt) : 0)));
const inspectedClue = computed(() => inspection.value?.kind === "clue" ? props.snapshot.clues.find(clue => clue.id === inspection.value?.id) : null);
const inspectedEvidence = computed(() => inspection.value?.kind === "evidence" ? props.snapshot.evidence.find(item => item.id === inspection.value?.id) : null);
const observed = computed(() => props.snapshot.clues.filter(clue => clue.status !== "locked").length);
const timeline = computed(() => props.snapshot.sequences[0] ?? null);
const orderedEvents = computed(() => timelineOrder.value.flatMap(id => timeline.value?.events?.find(event => event.id === id) ?? []));
const theory = computed(() => props.snapshot.theories.find(item => item.id === theoryId.value) ?? props.snapshot.theories[0]);
const chosen = computed(() => props.snapshot.verdicts.find(item => item.id === props.snapshot.chosenVerdictId));
const verdict = computed(() => props.snapshot.verdicts.find(item => item.id === verdictId.value));
const panelTitle = computed(() => panel.value === "activity" ? "Session activity" : panel.value === "host" ? props.hosting ? "Host controls" : "Session tools" : "Case briefing");
const modeLabel = computed(() => coop.value ? `Co-op · ${station.value}` : props.snapshot.caseMode === "quick" ? "Quick Case" : "Mystery Live");
const inspectionText = computed(() => inspectedClue.value ? inspectedClue.value.observation ?? inspectedClue.value.teaser : inspectedEvidence.value?.label ?? "");
const canInspect = computed(() => active.value && (actions.value.has("look") || actions.value.has("inspect")));
const inspectionAction = computed(() => inspectedClue.value?.status === "locked" && canInspect.value ? "Inspect this clue" : "");
const inspectionArt = computed(() => {
  if (!inspectedClue.value || inspectedClue.value.status === "locked") return null;
  return ({ PHOTO: trophyPhoto, CASE: heatWarning, ACCESS: accessLog, TROLLEY: trolleyCctv, WORK_ORDER: accessLog } as Record<string, string>)[inspectedClue.value.id] ?? null;
});
const nextStep = computed(() => {
  if (props.snapshot.stage === "reveal") return "The server has closed this investigation.";
  if (coop.value) return "Both Twitch chats investigate their stations, then share the findings.";
  if (observed.value < props.snapshot.clues.length) return "Inspect the room. Every detail can change the story.";
  if (timeline.value && !timeline.value.complete) return "All clues found. Reconstruct the incident on the timeline.";
  if (props.snapshot.theories.some(item => item.status === "UNVERIFIED")) return "Test a theory against a record on your board.";
  return "Review the evidence and make your case.";
});
const sceneArt = computed(() => coop.value ? props.snapshot.team === "B" ? recordsRoom : observatory : gallery);

function addActivity(text: string): void {
  activity.value.unshift({ id: ++activityId, text });
  activity.value = activity.value.slice(0, 30);
}
function resetDrafts(snapshot: RoundSnapshot, revision: number): void {
  lastResetRevision = Math.max(lastResetRevision, revision);
    surface.value = "scene"; selected.value = []; inspection.value = null; activity.value = []; discoveryNotice.value = null; sceneCue.value = null;
  timelineOrder.value = snapshot.sequences[0]?.events?.map(event => event.id) ?? [];
  theoryId.value = snapshot.theories[0]?.id ?? ""; challengeEvidence.value = ""; verdictId.value = null;
}
watch(() => props.restartRevision, revision => {
  if (revision > lastResetRevision) resetDrafts(props.snapshot, revision);
});
watch(() => props.snapshot, (next, previous) => {
  receivedAt = Date.now();
  now.value = receivedAt;
  // A remote restart can remove accepted progress. An idle clock alone also occurs on resume, so it is not a reset signal.
  const progressRemoved = next.timer.elapsedMs < previous.timer.elapsedMs || next.hintLevel < previous.hintLevel
    || (previous.stage !== "observe" && next.stage === "observe")
    || previous.clues.some(clue => clue.status !== "locked" && next.clues.find(item => item.id === clue.id)?.status === "locked")
    || previous.evidence.some(record => !next.evidence.some(item => item.id === record.id));
  if (next.sessionId !== previous.sessionId || next.caseId !== previous.caseId) {
    lastResetRevision = 0;
    resetDrafts(next, next.revision);
  } else if (next.revision > lastResetRevision && next.phase === "ACTIVE" && progressRemoved) {
    resetDrafts(next, next.revision);
  }
  selected.value = selected.value.filter(id => next.evidence.some(item => item.id === id));
  for (const item of next.evidence) {
    const old = previous.evidence.find(record => record.id === item.id);
    if (!old || (item.shared && !old.shared)) {
      addActivity(`${item.shared ? 'Shared record received' : 'Record received'}: ${item.label}`);
      sceneCue.value = { id: activityId, label: item.label, kind: item.shared ? "share" : "clue" };
      discoveryNotice.value = { id: activityId, title: item.label, text: item.shared ? "This finding is now available to both stations. Open your evidence board to connect it." : "Added to your evidence board from the accepted investigation.", code: item.id };
    }
  }
  for (const clue of next.clues) if (clue.status !== "locked" && previous.clues.find(old => old.id === clue.id)?.status === "locked") {
    addActivity(`Clue inspected: ${clue.label}`);
    discoveryNotice.value = { id: activityId, title: clue.label, text: clue.observation ?? clue.teaser, code: clue.id };
    sceneCue.value = { id: activityId, label: clue.label, kind: "clue", point: pointOf(props.snapshot.clues.indexOf(clue)) };
    if (inspection.value?.kind === "clue" && inspection.value.id === clue.id) inspection.value = null;
  }
  for (const sequence of next.sequences) if (sequence.complete && !previous.sequences.find(item => item.id === sequence.id)?.complete) {
    addActivity("Timeline verified by the investigation.");
    sceneCue.value = { id: activityId, label: "Timeline verified", kind: "proof" };
  }
  if (next.phase !== previous.phase) addActivity(`Round ${next.phase.toLowerCase().replaceAll("_", " ")}.`);
  for (const theory of next.theories) if (theory.status !== "UNVERIFIED" && previous.theories.find(item => item.id === theory.id)?.status !== theory.status) {
    addActivity(`Theory ${theory.status.toLowerCase()}: ${theory.label}`);
    sceneCue.value = { id: activityId, label: theory.label, kind: "proof" };
  }
  if (next.stage !== previous.stage && ["solve", "theory", "reconstruct"].includes(next.stage)) sceneCue.value = { id: ++activityId, label: "Investigation advanced", kind: "proof" };
  if (next.stage === "reveal") { surface.value = "verdict"; inspection.value = null; verdictId.value = null; }
});
watch(() => props.snapshot.sequences[0]?.events?.map(event => event.id).join("|"), ids => { timelineOrder.value = ids?.split("|").filter(Boolean) ?? []; });
watch(() => props.notice, value => { if (value) addActivity(value.text); });

function command(text: string, action: string): void {
  if (active.value && actions.value.has(action)) emit("command", text);
}
function inspect(): void {
  if (inspectedClue.value && canInspect.value) emit("command", `!look ${inspectedClue.value.id}`);
}
function toggleRecord(id: string): void {
  selected.value = selected.value.includes(id) ? selected.value.filter(item => item !== id) : [...selected.value.slice(-1), id];
}
function link(): void { if (selected.value.length === 2) command(`!link ${selected.value.join(" ")}`, "link"); }
function move(index: number, direction: number): void {
  if (!active.value || timeline.value?.complete) return;
  const next = index + direction;
  if (next < 0 || next >= timelineOrder.value.length) return;
  const order = [...timelineOrder.value];
  [order[index], order[next]] = [order[next]!, order[index]!];
  timelineOrder.value = order;
}
function solve(): void {
  if (!active.value || !actions.value.has("solve")) return;
  if (verdictId.value) command(`!solve ${verdictId.value}`, "solve");
  verdictId.value = null;
}
function showSurface(value: Surface): void { surface.value = value; panel.value = null; }
function togglePanel(value: "activity" | "briefing" | "host"): void { panel.value = panel.value === value ? null : value; }
function position(index: number): Record<string, string> {
  const point = pointOf(index);
  return { left: `${point.x * 100}%`, top: `${point.y * 100}%`, "--arrival": `${index * 90}ms` };
}
function pointOf(index: number): ScenePoint {
  if (short.value) return { x: (index + .5) / Math.max(1, props.snapshot.clues.length), y: .5 };
  return (phone.value ? [{ x: .24, y: .39 }, { x: .74, y: .39 }, { x: .24, y: .59 }, { x: .74, y: .59 }, { x: .49, y: .71 }] : [{ x: .24, y: .44 }, { x: .63, y: .4 }, { x: .79, y: .65 }, { x: .42, y: .68 }, { x: .16, y: .74 }])[Math.max(0, index) % 5]!;
}
const focusedPoint = computed(() => inspectedClue.value ? pointOf(props.snapshot.clues.indexOf(inspectedClue.value)) : null);
</script>

<template>
  <GameWorkspace class="live-case" :class="{ 'is-coop': coop }" :title="snapshot.title" :label="`${preview ? 'Visual preview' : modeLabel} · ${snapshot.phase.toLowerCase().replaceAll('_', ' ')}`" :panel="panel" :panel-title="panelTitle" @close-panel="panel = null">
    <template #actions>
      <span class="live-progress-metric"><strong>{{ snapshot.evidence.length }}</strong> records</span><span class="live-clock" aria-label="Case elapsed time"><small>Case time</small><strong>{{ elapsed }}</strong></span>
      <slot name="connection" />
      <button v-if="!preview" class="live-sound" type="button" :aria-label="muted ? 'Enable sound' : 'Mute sound'" @click="emit('toggle-mute')"><SiteIcon :name="muted ? 'sound-off' : 'sound-on'" /></button>
    </template>
    <div class="investigation">
      <div v-if="preview" class="live-preview-notice"><span>Visual preview · no live session</span><a :href="coop ? '/coop' : '/play'">{{ coop ? 'Create a co-op lobby' : 'Connect Twitch to play' }} <SiteIcon name="arrow-right" /></a></div>
      <div v-else-if="snapshot.phase !== 'ACTIVE' && snapshot.stage !== 'reveal'" class="live-phase-notice" role="status">
        <template v-if="snapshot.phase === 'READY'">The case is ready. <button v-if="hosting" type="button" :disabled="!interactive" @click="emit('control', 'start')"><SiteIcon name="play" /> Start round</button><span v-else>The host starts the round.</span></template>
        <template v-else-if="snapshot.phase === 'COOP_WAITING'">Waiting for your partner to accept. <a href="/coop">Manage co-op lobby</a></template>
        <template v-else-if="snapshot.paused">Round paused. Your findings are saved. <button v-if="hosting" type="button" :disabled="!interactive" @click="emit('control', 'resume')">Resume round</button></template>
        <template v-else>Round {{ snapshot.phase.toLowerCase() }}. <a href="/play">Back to cases</a></template>
      </div>
      <div v-if="notice" class="live-feedback" :data-tone="notice.tone" role="status">{{ notice.text }}</div>
      <div class="investigation-content">
      <CaseAtmosphere :key="`${snapshot.caseMode}-${snapshot.team}`" :mode="snapshot.caseMode" :team="snapshot.team" :image="sceneArt" :focus="focusedPoint" :running="preview || active" :overlay="surface !== 'scene'" :cue="sceneCue" />
      <section v-if="surface === 'scene'" class="investigation-scene" aria-label="Investigation scene">
        <header class="scene-caption"><span>{{ coop ? station : 'On location' }}</span><h2>{{ snapshot.question }}</h2><p>{{ nextStep }}</p></header>
        <button v-for="(clue, index) in snapshot.clues" :key="clue.id" class="scene-hotspot" :class="{ 'is-found': clue.status !== 'locked' }" :style="position(index)" type="button" :aria-label="`Examine ${clue.label}`" @click="inspection = { kind: 'clue', id: clue.id }"><span class="hotspot-mark"><SiteIcon :name="clue.status === 'locked' ? 'search' : 'check'" /></span><span class="hotspot-label">{{ clue.label }}</span></button>
        <footer class="scene-progress"><span>{{ observed }}/{{ snapshot.clues.length }} clues inspected</span><span>{{ snapshot.evidence.length }} records on your board</span><span v-if="coop && !preview">Chat: <code>{{ stationCommand }}</code></span><button type="button" @click="showSurface('board')">Open evidence board <SiteIcon name="arrow-right" /></button></footer>
      </section>

      <section v-else-if="surface === 'board'" class="case-surface evidence-surface" aria-labelledby="live-evidence-title">
        <header class="surface-heading"><div><span>The case file</span><h2 id="live-evidence-title">Follow the evidence</h2><p>{{ coop ? 'Your station records and shared findings, exactly as received.' : 'Inspect a record, then connect facts that explain each other.' }}</p></div><strong class="surface-count">{{ snapshot.evidence.length }} records</strong></header>
        <p v-if="!snapshot.evidence.length" class="live-empty"><SiteIcon name="document" />Your board starts empty. {{ coop ? 'Both chats must investigate their stations and share what they find.' : 'Return to the scene and inspect your first clue.' }}<button type="button" @click="showSurface('scene')">Explore the scene</button></p>
        <ul v-else class="live-records">
          <li v-for="(record, index) in snapshot.evidence" :key="record.id" :style="{ '--arrival': `${Math.min(index, 7) * 60}ms` }">
            <article class="live-record" :class="{ 'is-selected': selected.includes(record.id) }"><span class="record-pin" aria-hidden="true"></span><code>{{ record.id }}</code><h3>{{ record.label }}</h3><small v-if="coop">{{ record.shared ? `Shared${record.team ? ` by Team ${record.team}` : ''}` : record.team ? `Team ${record.team} record` : 'Public record' }}</small><p v-if="coop && record.team === snapshot.team && !record.shared" class="record-share">Ask chat: <code>!share {{ record.id }}</code></p><div><button type="button" :aria-label="`Inspect ${record.label}`" @click="inspection = { kind: 'evidence', id: record.id }"><SiteIcon name="search" /> Inspect</button><button v-if="actions.has('link')" type="button" :aria-pressed="selected.includes(record.id)" :disabled="!active" @click="toggleRecord(record.id)"><SiteIcon :name="selected.includes(record.id) ? 'check' : 'link'" />{{ selected.includes(record.id) ? 'Selected' : 'Connect' }}</button></div></article>
          </li>
        </ul>
        <div v-if="actions.has('link')" class="live-linkbar"><p>{{ selected.length ? selected.join(' + ') : 'Choose two records to test a connection.' }}</p><button type="button" :disabled="!active || selected.length !== 2" @click="link"><SiteIcon name="link" /> Test connection ({{ selected.length }}/2)</button><button v-if="selected.length" type="button" @click="selected = []">Clear</button></div>
        <p v-if="coop" class="surface-footnote">Only your authenticated team projection is shown. The other station's private findings stay at that station until shared.</p>
      </section>

      <section v-else-if="surface === 'timeline'" class="case-surface" aria-labelledby="live-timeline-title">
        <header class="surface-heading"><div><span>Reconstruction</span><h2 id="live-timeline-title">Put the night in order</h2><p>Move the events from first to last. The server checks the sequence.</p></div><span v-if="timeline?.complete" class="verified-state"><SiteIcon name="check" /> Verified</span></header>
        <ol class="live-timeline"><li v-for="(event, index) in orderedEvents" :key="event.id"><span class="event-number">{{ index + 1 }}</span><div><code>{{ event.id }}</code><h3>{{ event.label }}</h3></div><div class="event-moves"><button type="button" :disabled="!active || timeline?.complete || index === 0" :aria-label="`Move ${event.label} earlier`" @click="move(index, -1)"><SiteIcon name="arrow-up" /></button><button type="button" :disabled="!active || timeline?.complete || index === orderedEvents.length - 1" :aria-label="`Move ${event.label} later`" @click="move(index, 1)"><SiteIcon name="arrow-down" /></button></div></li></ol>
        <button v-if="timeline && !timeline.complete" class="live-primary" type="button" :disabled="!active || !actions.has('order') || orderedEvents.length < 2" @click="command(`!order ${timelineOrder.join(' ')}`, 'order')">Check timeline <SiteIcon name="arrow-right" /></button>
        <p v-if="!timeline" class="live-empty">This case has no timeline task.</p>
      </section>

      <section v-else-if="surface === 'theories'" class="case-surface" aria-labelledby="live-theories-title">
        <header class="surface-heading"><div><span>A story needs proof</span><h2 id="live-theories-title">Question the obvious</h2><p>Choose a theory. Test it with a record from this investigation.</p></div></header>
        <div class="live-theory-grid"><button v-for="item in snapshot.theories" :key="item.id" class="theory-card" :aria-pressed="theory?.id === item.id" type="button" @click="theoryId = item.id"><SiteIcon name="scales" /><h3>{{ item.label }}</h3><span>{{ item.status.toLowerCase().replaceAll('_', ' ') }}</span></button></div>
        <div v-if="theory" class="theory-actions"><button v-if="actions.has('theory')" type="button" :disabled="!active" @click="command(`!theory ${theory.id}`, 'theory')">Propose this theory</button><label for="live-challenge-record">Challenge with a record</label><select id="live-challenge-record" v-model="challengeEvidence"><option value="" disabled>Choose evidence</option><option v-for="item in snapshot.evidence" :key="item.id" :value="item.id">{{ item.label }}</option></select><button type="button" :disabled="!active || !actions.has('challenge') || !challengeEvidence" @click="command(`!challenge ${theory.id} ${challengeEvidence}`, 'challenge')">Test the theory <SiteIcon name="scales" /></button></div>
        <p v-else class="live-empty">Inspect more of the scene to develop your case.</p>
      </section>

      <section v-else class="case-surface verdict-surface" :class="{ 'is-revealed': snapshot.stage === 'reveal' }" aria-labelledby="live-verdict-title">
        <template v-if="snapshot.revealText"><span class="reveal-seal"><SiteIcon name="check" size="34px" /></span><p class="live-eyebrow">{{ snapshot.phase === 'RESOLVED' ? 'Case resolved' : 'Case closed' }}</p><h2 id="live-verdict-title">{{ chosen?.label ?? 'Investigation report' }}</h2><p class="live-reveal-copy">{{ snapshot.revealText }}</p><div class="reveal-facts"><span>{{ snapshot.evidence.length }} records collected</span><span>{{ elapsed }} case time</span><span>{{ snapshot.sequences.filter(item => item.complete).length }} sequences verified</span></div><a class="live-primary" href="/play">Choose another case <SiteIcon name="arrow-right" /></a></template>
        <template v-else><header class="surface-heading"><div><span>The final question</span><h2 id="live-verdict-title">{{ snapshot.question }}</h2><p>Review your findings before committing. Every verdict is checked against the server's case state.</p></div></header><div class="live-verdict-options"><button v-for="(option, index) in snapshot.verdicts" :key="option.id" type="button" :disabled="!active || !actions.has('solve')" @click="verdictId = option.id"><span>{{ String(index + 1).padStart(2, '0') }}</span><h3>{{ option.label }}</h3><SiteIcon name="arrow-right" /></button></div><p v-if="coop" class="surface-footnote">Both communities must contribute their station proof. A host verdict cannot substitute for viewer participation.</p></template>
      </section>
      </div>
      <div v-if="snapshot.currentHint" class="live-hint" role="status"><SiteIcon name="hint" /><p><strong>Hint {{ snapshot.hintLevel }}</strong> {{ snapshot.currentHint }}</p></div>
    </div>
    <template #tools>
      <button type="button" :aria-pressed="surface === 'scene'" @click="showSurface('scene')"><SiteIcon name="search" /> Scene</button>
      <button type="button" :aria-pressed="surface === 'board'" @click="showSurface('board')"><SiteIcon name="link" /> Evidence <span>{{ snapshot.evidence.length }}</span></button>
      <button v-if="timeline" type="button" :aria-pressed="surface === 'timeline'" @click="showSurface('timeline')"><SiteIcon name="clock" /> Timeline</button>
      <button v-if="snapshot.theories.length" type="button" :aria-pressed="surface === 'theories'" @click="showSurface('theories')"><SiteIcon name="scales" /> Theories</button>
      <button type="button" :aria-pressed="surface === 'verdict'" @click="showSurface('verdict')"><SiteIcon name="target" />{{ snapshot.stage === 'reveal' ? 'Report' : 'Verdict' }}</button>
      <span class="dock-divider" aria-hidden="true"></span>
      <button v-if="actions.has('hint')" type="button" :disabled="!active" @click="command('!hint', 'hint')"><SiteIcon name="hint" />Request a hint</button>
      <button type="button" :aria-pressed="panel === 'activity'" @click="togglePanel('activity')"><SiteIcon name="chat" /> Activity</button>
      <button type="button" :aria-pressed="panel === 'briefing'" @click="togglePanel('briefing')"><SiteIcon name="document" /> Briefing</button>
      <button v-if="$slots.host && !preview" type="button" :aria-pressed="panel === 'host'" @click="togglePanel('host')">{{ hosting ? 'Host controls' : 'Session tools' }}</button>
    </template>
    <template #panel>
      <slot v-if="panel === 'host'" name="host" />
      <div v-else-if="panel === 'briefing'" class="briefing-copy"><p class="live-eyebrow">{{ modeLabel }}</p><h3>{{ snapshot.title }}</h3><p>{{ snapshot.premise }}</p><h4>The question</h4><p>{{ snapshot.question }}</p><p>{{ nextStep }}</p><p v-if="preview">This is a visual preview. It does not run a case, reveal hidden evidence, or send Twitch commands. Connect Twitch from the case menu to host a live round.</p><p v-else>Clues and records update only when the server accepts an action. Your Twitch chat can send the same case commands.</p><template v-if="coop"><h4>Your station</h4><p>{{ station }} · {{ snapshot.team ? `Team ${snapshot.team}` : 'Assigned after joining' }}</p><code>{{ stationCommand }}</code><p>Viewers investigate and share in their own channel. Host controls cannot act as another community.</p></template></div>
      <div v-else class="activity-copy"><p>Updates from this session's public state. Twitch chat messages are not mirrored here.</p><ol v-if="activity.length"><li v-for="item in activity" :key="item.id"><SiteIcon name="link" />{{ item.text }}</li></ol><p v-else>No new activity since this view opened.</p></div>
    </template>
    <template #notifications>
      <GameNotification v-if="!preview" :entry="discoveryNotice" />
      <GameNotification v-if="!preview && panel !== 'activity' && active" :entry="crewNotice" kind="crew" />
    </template>
  </GameWorkspace>
  <EvidenceDialog v-if="inspection && (inspectedClue || inspectedEvidence)" :key="`${inspection.id}-${inspectedClue?.status ?? 'record'}`" :title="inspectedClue?.label ?? inspectedEvidence?.label ?? 'Evidence'" :code="inspection.id" :text="inspectionText" :action="inspectionAction" :discovered="inspectedClue?.status === 'unlocked'" @close="inspection = null" @action="inspect">
    <template v-if="inspectionArt" #art><img :src="inspectionArt" alt="Illustration of the inspected clue" /></template>
    <p v-if="inspectedClue?.status === 'locked'" class="inspection-context">{{ preview ? 'This preview shows the briefing only. Start a Twitch session to investigate.' : coop ? `Inspect the station notes here. Your viewers create station proof with ${stationCommand}.` : !active ? 'Investigation controls are available when the round is active and connected.' : 'Inspect this clue to request the observation from the server.' }}</p>
  </EvidenceDialog>
  <EvidenceDialog v-if="verdict" :title="verdict.label" code="FINAL VERDICT" text="Submit this explanation? The server checks it against the evidence collected in this round." :action="active && actions.has('solve') ? 'Submit verdict' : ''" @close="verdictId = null" @action="solve" />
</template>

<style scoped>
.live-case { --live-paper: #eee0c4; --live-gold: #d8b16d; --live-muted: #c1aa8b; }
.investigation { height: 100%; min-height: 0; display: flex; flex-direction: column; position: relative; }
.investigation-content { position: relative; isolation: isolate; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.investigation-content > .case-surface { position: relative; z-index: 1; }
.live-clock { display: grid; gap: 4px; padding: 0 10px; border-left: 1px solid #b48c4e60; color: #f1dcba; white-space: nowrap; }
.live-clock small { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #cbae7c; }
.live-clock strong { font: 600 32px/1 var(--font-display); font-variant-numeric: tabular-nums; }
.live-progress-metric { display: flex; align-items: baseline; gap: 5px; color: #bda783; font-size: 11px; white-space: nowrap; }
.live-progress-metric strong { color: #edc781; font: 600 26px var(--font-display); }
.live-sound { display: grid; place-items: center; height: 44px; width: 44px; background: #2b1f15; color: #dec398; border: 1px solid #80603b70; border-radius: 8px; cursor: pointer; }
.live-preview-notice, .live-phase-notice { flex-shrink: 0; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 20px; padding: 8px 16px; border-bottom: 1px solid #88623d; background: #3c2918; color: #edcf9f; font-size: 12px; }
.live-preview-notice a { display: flex; align-items: center; gap: 8px; color: #f1dab3; text-decoration: underline; min-height: 28px; }
.live-phase-notice button { min-height: 44px; }
.live-feedback { flex-shrink: 0; max-height: 94px; overflow: auto; padding: 10px 20px; background: #302b1c; border-bottom: 1px solid #8c8257; font-size: 13px; line-height: 1.5; color: #e7dbb9; }
.live-feedback[data-tone=warn] { background: #40231c; border-color: #a76b51; color: #f3c4aa; }
.investigation-scene { position: relative; z-index: 1; flex: 1; min-height: 0; isolation: isolate; overflow: hidden; background: transparent; }
.live-scene-image { width: 100%; height: 100%; object-fit: cover; object-position: center; position: absolute; inset: 0; }
.investigation-scene::after { content: ""; position: absolute; inset: 0; background: linear-gradient(#100a07c9, transparent 40%, transparent 60%, #100a07e6); z-index: 0; pointer-events: none; }
.scene-caption { position: absolute; inset: 26px 30px auto; max-width: 650px; z-index: 1; pointer-events: none; }
.scene-caption > span, .live-eyebrow, .surface-heading > div > span { color: #d7b47d; font-size: 10px; text-transform: uppercase; letter-spacing: .16em; }
.scene-caption h2 { font: 600 clamp(26px, 3.1vw, 44px)/1.05 var(--font-display); margin: 8px 0; text-wrap: balance; color: #fff0d4; }
.scene-caption p { margin: 0; font-size: 13px; line-height: 1.6; color: #e2ceb0; }
.scene-hotspot { position: absolute; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 8px; z-index: 2; color: #fff0d4; padding: 8px; border: 0; background: none; cursor: pointer; animation: hotspot-arrive 500ms ease both; animation-delay: var(--arrival); }
.hotspot-mark { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; border: 1px solid #e8c586; background: #20170dd9; box-shadow: 0 0 0 5px #d4ac6440, 0 4px 20px #0007; transition: transform 180ms, background 180ms; }
.scene-hotspot:hover .hotspot-mark, .scene-hotspot:focus-visible .hotspot-mark { transform: scale(1.12); background: #8b6334; }
.scene-hotspot:focus-visible { outline: 2px solid #ffdda0; outline-offset: 4px; border-radius: 6px; }
.hotspot-label { max-width: 180px; padding: 5px 9px; background: #1a100be8; border: 1px solid #b38c5270; border-radius: 4px; font: 600 11px/1.35 var(--font-body); text-align: center; }
.is-found .hotspot-mark { color: #2b2215; background: #e2c58b; }
.scene-progress { position: absolute; inset: auto 24px 18px; z-index: 2; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 18px; font-size: 12px; color: #e8d6b7; }
.scene-progress button { margin-left: auto; }
button { font: 600 12px var(--font-body); }
.scene-progress button, .live-empty button, .live-linkbar button, .live-primary, .theory-actions button, .live-phase-notice button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 18px; border-radius: 7px; border: 1px solid #b28b53; background: #dabc83; color: #2b1b0d; text-decoration: none; cursor: pointer; }
button:disabled { opacity: .42; cursor: default; }
button:focus-visible, a:focus-visible, select:focus-visible { outline: 2px solid #edc781; outline-offset: 4px; }
.case-surface { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: clamp(20px, 3vw, 40px); background: radial-gradient(ellipse at top, #57402a30, transparent 70%), #1c140e; }
.evidence-surface { background: radial-gradient(ellipse at top, #b17a3c25, transparent 70%), repeating-linear-gradient(25deg, #34251b 0 1px, #302218 1px 4px); }
.surface-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 28px; }
.surface-heading h2, .verdict-surface > h2 { margin: 7px 0 10px; font: 600 clamp(30px, 3.5vw, 46px)/1.05 var(--font-display); text-wrap: balance; }
.surface-heading p { margin: 0; font-size: 13px; line-height: 1.65; color: var(--live-muted); max-width: 75ch; }
.surface-count { font-size: 12px; font-weight: 500; color: #d2b98e; white-space: nowrap; }
.live-records { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; list-style: none; margin: 0; padding: 0; }
.live-records > li { animation: record-arrive 450ms ease both; animation-delay: var(--arrival); }
.live-record { display: flex; flex-direction: column; height: 100%; min-height: 200px; position: relative; padding: 27px 22px 16px; color: #3a291b; background: #e9d8b6; box-shadow: 0 5px 15px #0006; border: 1px solid #a48558; border-radius: 3px; }
.live-record.is-selected { outline: 3px solid #efcb86; outline-offset: 5px; background: #fff0cf; }
.record-pin { position: absolute; left: calc(50% - 5px); top: 8px; width: 10px; height: 10px; background: #8c3e2d; border-radius: 50%; box-shadow: 1px 3px 3px #0006; }
.live-record code { color: #815234; font-size: 10px; letter-spacing: .08em; overflow-wrap: anywhere; }
.live-record h3 { font: 600 25px/1.15 var(--font-display); margin: 12px 0 20px; }
.record-share { font-size: 11px; line-height: 1.5; margin: 0 0 10px; overflow-wrap: anywhere; }
.live-record small { font-size: 11px; margin: auto 0 10px; color: #6c5336; }
.live-record > div { display: flex; gap: 8px; margin-top: auto; flex-wrap: wrap; }
.live-record button { display: inline-flex; align-items: center; justify-content: center; flex: 1; gap: 5px; min-height: 44px; padding: 8px; background: transparent; border: 1px solid #8d714b80; border-radius: 5px; color: #57371f; cursor: pointer; }
.live-record button[aria-pressed=true] { background: #5b3c23; color: #fff0cc; }
.live-record button:focus-visible { outline-color: #75431e; }
.live-linkbar { position: sticky; bottom: -20px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 26px; padding: 14px; border: 1px solid #8a663d; background: #24180ff5; box-shadow: 0 -5px 20px #0003; }
.live-linkbar p { flex: 1; margin: 0; font-size: 12px; color: #dbc59e; overflow-wrap: anywhere; }
.live-empty { min-height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px; max-width: 600px; margin: 0 auto; color: #cdb898; text-align: center; line-height: 1.7; }
.surface-footnote { margin: 26px 0 0; color: #c5ad89; font-size: 12px; line-height: 1.7; }
.live-timeline { padding: 0; margin: 0 0 24px; list-style: none; display: grid; gap: 12px; max-width: 900px; }
.live-timeline li { position: relative; display: flex; align-items: center; gap: 20px; padding: 16px 20px; background: #302218; border: 1px solid #7a563350; border-radius: 6px; }
.event-number { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 40px; background: #4d3520; color: #ddbc82; border-radius: 50%; font: 600 22px var(--font-display); }
.live-timeline code { color: #b89765; font-size: 10px; }
.live-timeline h3 { font: 600 24px/1.15 var(--font-display); margin: 6px 0 0; }
.event-moves { display: flex; gap: 8px; margin-left: auto; }
.event-moves button { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; background: #4a3220; color: #e4c58e; border: 1px solid #90683f; border-radius: 5px; cursor: pointer; }
.verified-state { display: flex; gap: 8px; color: #dbcf9e; font-size: 12px; }
.live-theory-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
.theory-card { min-height: 160px; text-align: left; color: #ead5b1; background: #35251a; border: 1px solid #805b38; border-radius: 8px; padding: 22px; cursor: pointer; }
.theory-card[aria-pressed=true] { border-color: #e5bd79; background: #4a3120; }
.theory-card h3 { font: 600 29px/1.15 var(--font-display); margin: 12px 0; }
.theory-card > span { font-size: 11px; color: #bda27b; }
.theory-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; margin-top: 24px; font-size: 12px; }
.theory-actions select { width: min(360px, 100%); min-height: 44px; padding: 10px; border: 1px solid #926b43; border-radius: 5px; color: #e6cfaa; background: #2b1e14; font: inherit; }
.live-verdict-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
.live-verdict-options > button { min-height: 220px; display: flex; align-items: flex-start; flex-direction: column; padding: 26px; border: 1px solid #9e7547; border-radius: 7px; background: linear-gradient(140deg, #4b3321, #281b12); color: #efddbc; text-align: left; cursor: pointer; }
.live-verdict-options > button > span { color: #bd985e; font: 600 28px var(--font-display); }
.live-verdict-options h3 { font: 600 32px/1.1 var(--font-display); margin: 20px 0; }
.live-verdict-options .site-icon { margin-top: auto; align-self: flex-end; }
.is-revealed { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: safe center; animation: record-arrive 650ms ease both; }
.reveal-seal { display: grid; place-items: center; width: 80px; height: 80px; border: 1px solid #d1ac6f; border-radius: 50%; color: #e6c48e; box-shadow: 0 0 0 7px #d1ac6f15; margin: 0 0 20px; }
.live-reveal-copy { font: 400 21px/1.65 var(--font-display); max-width: 65ch; color: #e1cda9; margin: 14px auto 24px; }
.reveal-facts { display: flex; justify-content: center; gap: 12px 26px; flex-wrap: wrap; font-size: 12px; color: #bda37d; margin-bottom: 32px; }
.live-hint { flex-shrink: 0; display: flex; align-items: center; gap: 12px; max-height: 100px; overflow: auto; padding: 10px 20px; background: #35291b; color: #e2cc9e; border-top: 1px solid #90713e; font-size: 12px; line-height: 1.6; }
.live-hint p { margin: 0; }
.live-hint strong { margin-right: 8px; }
.dock-divider { width: 1px; background: #87613b70; margin: 8px 4px; flex-shrink: 0; }
.briefing-copy, .activity-copy { font-size: 13px; line-height: 1.8; color: #cfba99; }
.briefing-copy h3 { font: 600 32px/1.1 var(--font-display); color: #f1dfbd; }
.briefing-copy h4 { color: #e0c493; }
.activity-copy ol { list-style: none; padding: 0; }
.activity-copy li { display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid #82603b70; overflow-wrap: anywhere; }
.activity-copy li:first-child { animation: activity-arrive 380ms cubic-bezier(.16,1,.3,1) both; }
.activity-copy li .site-icon { flex-shrink: 0; margin-top: 5px; color: #ddba7a; }
@keyframes activity-arrive { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
.inspection-context { margin-top: 18px; font-size: 13px; color: #805d37; }
.station-instructions { position: absolute; z-index: 2; left: 30px; bottom: 88px; display: flex; gap: 12px; max-width: 430px; padding: 16px 20px; border: 1px solid #b58c5570; background: #20150de8; border-radius: 6px; font-size: 12px; line-height: 1.6; }
.station-instructions p { margin: 6px 0 0; color: #d4bd98; }
.station-instructions code { color: #ffdaa0; }
.live-atmosphere { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.live-atmosphere i { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #f5d292; box-shadow: 0 0 15px #ffe4b5; opacity: 0; animation: dust-drift 12s linear infinite; left: 30%; top: 70%; }
.live-atmosphere i:nth-child(2) { left: 60%; animation-delay: -4s; }
.live-atmosphere i:nth-child(3) { left: 80%; animation-delay: -8s; }
.offshore-pulse { position: absolute; top: 37%; left: 46%; width: 8px; height: 8px; pointer-events: none; border-radius: 50%; background: #f8d79f; animation: offshore-signal 6s ease infinite; }
@keyframes dust-drift { 0%, 100% { opacity: 0; transform: translate(0, 0); } 25%, 70% { opacity: .5; } 90% { transform: translate(70px, -220px); } }
@keyframes offshore-signal { 0%, 14%, 30%, 100% { opacity: .2; box-shadow: 0 0 0 #fff4c5; } 7%, 23% { opacity: 1; box-shadow: 0 0 30px 8px #ffdda780; } }
@keyframes hotspot-arrive { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } }
@keyframes record-arrive { from { opacity: 0; transform: translateY(18px) rotate(-1deg); } to { opacity: 1; transform: none; } }
@media(max-width: 760px) { .live-case :deep(.workspace-identity h1) { font-size: 20px; } .live-case :deep(.workspace-identity span) { font-size: 9px; } .live-case :deep(.workspace-actions) { gap: 2px; } .live-clock { display: none; } .live-sound { width: 34px; border: 0; background: transparent; } .live-case :deep(.twitch-status) { max-width: 84px; } .scene-caption { inset: 18px 18px auto; } .scene-caption h2 { font-size: 28px; } .scene-caption p { font-size: 11px; max-width: 40ch; } .hotspot-label { max-width: 110px; font-size: 10px; } .hotspot-mark { width: 40px; height: 40px; } .scene-progress { inset: auto 14px 12px; gap: 5px 12px; font-size: 10px; } .scene-progress button { width: 100%; margin-top: 4px; } .station-instructions { inset: auto 14px 115px; max-width: none; padding: 10px 12px; font-size: 11px; } .case-surface { padding: 20px 16px; } .surface-heading { gap: 8px; margin-bottom: 20px; } .surface-count { display: none; } .surface-heading h2 { font-size: 32px; } .live-records { grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 18px; } .live-record { padding: 25px 14px 12px; min-height: 190px; } .live-record h3 { font-size: 23px; } .live-record > div { flex-direction: column; } .live-timeline li { gap: 12px; padding: 12px; } .live-timeline h3 { font-size: 21px; } .event-number { width: 30px; height: 30px; flex-basis: 30px; } .event-moves { flex-direction: column; gap: 4px; } .live-verdict-options { grid-template-columns: minmax(0, 1fr); gap: 16px; } .live-verdict-options > button { min-height: 170px; } .live-verdict-options h3 { font-size: 29px; margin: 12px 0; } .live-preview-notice { gap: 0 12px; font-size: 10px; padding-block: 5px; } .live-hint { padding: 8px 14px; font-size: 11px; } }
@media(max-width: 760px) { .live-clock { display: grid; padding: 0 6px; } .live-clock strong { font-size: 26px; } .live-clock small { font-size: 8px; } .live-progress-metric { display: none; } }
@media(max-width: 760px) { .live-case :deep(.workspace-header) { position: relative; flex-wrap: wrap; padding: 8px 12px; } .live-case :deep(.workspace-identity) { padding-right: 50px; } .live-case :deep(.workspace-actions) { width: 100%; justify-content: space-between; margin: 0; padding-top: 2px; } .live-case :deep(.workspace-fullscreen) { position: absolute; top: 8px; right: 12px; } .live-clock { padding-left: 0; border-left: 0; } }
@media(max-width: 760px) { .scene-caption h2 { font-size: 26px; } .scene-caption p { max-width: none; } .scene-hotspot { display: flex; align-items: center; gap: 6px; padding: 5px; } .hotspot-label { max-width: 100px; } .hotspot-mark { flex-shrink: 0; width: 34px; height: 34px; } }
@media(max-height: 560px) { .scene-caption { inset: 10px 20px auto; max-width: calc(100% - 40px); } .scene-caption h2 { font-size: 21px; margin: 5px 0; } .scene-caption p { display: none; } .scene-hotspot { display: flex; align-items: center; gap: 5px; padding: 4px; } .hotspot-mark { width: 30px; height: 30px; flex-shrink: 0; } .hotspot-label { max-width: 95px; padding: 4px 6px; font-size: 9px; } .scene-progress { inset: auto 16px 8px; gap: 6px 12px; font-size: 10px; } .scene-progress button { width: auto; margin: 0 0 0 auto; } }
@media(max-width: 1080px) { .live-case :deep(.workspace-dock) { display: grid; grid-template-columns: repeat(auto-fit, minmax(76px, 1fr)); gap: 6px; overflow: visible; } .live-case :deep(.workspace-dock button) { min-width: 0; min-height: 48px; flex-direction: column; justify-content: center; gap: 3px; padding: 6px; font-size: 10.5px; line-height: 1.1; white-space: normal; text-align: center; } .dock-divider { display: none; } }
@media(max-width: 760px) { .live-case :deep(.workspace-dock) { grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 8px 12px max(8px, env(safe-area-inset-bottom)); } }
@media(max-width: 760px) {
  .live-case :deep(.workspace-header) { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 8px; }
  .live-case :deep(.workspace-actions) { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; min-width: 0; margin-left: 0; }
  .live-case :deep(.connection-status) { max-width: calc(100% - 90px); min-width: 0; padding: 6px 8px; font-size: 11px; }
}
@media(prefers-reduced-motion: reduce) { .live-case *, .live-case *::before, .live-case *::after { animation: none !important; transition: none !important; } }
:global(html[data-motion="reduced"]) .live-case * { animation: none !important; transition: none !important; }
</style>
