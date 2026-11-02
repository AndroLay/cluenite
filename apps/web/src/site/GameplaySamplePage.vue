<script setup lang="ts">
import PlateFrame from "./PlateFrame.vue";
import SiteIcon from "./SiteIcon.vue";

// Labeled sample layouts for the gameplay reference screens S05–S10 (Quick Case reveal and the M01 vertical slice).
// Every case, clue, theory, and person is invented. This page reads no round, no server state, and no case data,
// and it saves nothing. Controls that would need a live round are rendered disabled.
type SampleScreen = "reveal" | "stage" | "evidence" | "timeline" | "theory" | "verdict";

defineProps<{ screen: SampleScreen }>();

const SCREENS: readonly { id: SampleScreen; path: string; label: string }[] = [
  { id: "reveal", path: "/sample/reveal", label: "Reveal" },
  { id: "stage", path: "/sample/stage", label: "Mystery stage" },
  { id: "evidence", path: "/sample/evidence", label: "Evidence board" },
  { id: "timeline", path: "/sample/timeline", label: "Timeline" },
  { id: "theory", path: "/sample/theory", label: "Theories" },
  { id: "verdict", path: "/sample/verdict", label: "Verdict" },
];

const TIMELINE = [
  { time: "18:47", title: "Trophy on display", detail: "CCTV image", art: "img-gallery" },
  { time: "18:56", title: "Heat warning", detail: "Thermal sensor", art: "img-document" },
  { time: "18:57", title: "Authorized move", detail: "Maintenance report", art: "img-board" },
  { time: "19:01", title: "Power outage", detail: "Electricity log", art: "img-manor" },
  { time: "?", title: "Where did it go?", detail: "Find the missing event", art: "" },
] as const;

const HYPOTHESES: readonly {
  title: string;
  detail: string;
  state: string;
  tone: "error" | "success" | "subtle" | "";
  selected: boolean;
}[] = [
  {
    title: "Stolen during the blackout",
    detail: "Someone removed the trophy after the lights failed.",
    state: "CONTRADICTED",
    tone: "error",
    selected: false,
  },
  {
    title: "Moved before the blackout",
    detail: "Maintenance relocated the object because the display was overheating.",
    state: "SUPPORTED · NOT YET FINAL",
    tone: "success",
    selected: true,
  },
  {
    title: "The trophy never left the hall",
    detail: "It was concealed inside the original display structure.",
    state: "UNCONFIRMED",
    tone: "subtle",
    selected: false,
  },
];

const RECONSTRUCTION = [
  { time: "18:47", event: "Trophy visible" },
  { time: "18:56", event: "Heat alarm" },
  { time: "18:57–18:59", event: "Relocation" },
  { time: "19:01", event: "Power outage" },
  { time: "19:02", event: "Disappearance noticed" },
];

// Invented chat lines for layout only. They are not received from Twitch and are labelled as not live.
const CHAT = [
  { name: "Viewer_A", message: "The timestamps do not match." },
  { name: "Viewer_B", message: "Check the maintenance log!" },
  { name: "Viewer_C", message: "Maybe the cooling room?" },
  { name: "Streamer", message: "Let's verify the record." },
] as const;

const CHECKLIST = [
  "CCTV confirms initial location",
  "Heat warning occurred at 18:56",
  "Maintenance authorized relocation",
  "Trolley moved trophy to B4",
  "Blackout occurred afterward",
];
</script>

<template>
  <PlateFrame active="cases">
    <!-- S05: reveal, expanded and collapsed states -->
    <template v-if="screen === 'reveal'">
      <div class="row between">
        <div>
          <div class="eyebrow">QUICK CASE • TWO PRESENTATION STATES</div>
          <h1 class="page-title mt8">A reveal worth reacting to.</h1>
          <p class="mt8">Celebrate the proof, then collapse unobtrusively so the main stream continues.</p>
        </div>
        <span class="tag">END OF ROUND</span>
      </div>

      <div class="grid2 mt32 gs-reveal">
        <section class="panel gs-reveal-panel" aria-labelledby="reveal-expanded-title">
          <div class="panel-head">
            <span id="reveal-expanded-title" class="panel-title">Reveal animation · expanded</span>
            <span class="tag subtle">0–5 SECONDS</span>
          </div>
          <div class="gs-reveal-body">
            <div class="gs-star" aria-hidden="true"><SiteIcon name="sparkle" :stroke="1.2" /></div>
            <div class="eyebrow">PROOF VERIFIED</div>
            <h2 class="gs-reveal-title">Case Solved.</h2>
            <p class="gs-narrow">The sample proof passed every check. Each claim links to evidence on the board.</p>
            <div class="row">
              <span class="tag success gs-tag-icon">CLUE 1 <SiteIcon name="check" /></span>
              <span class="tag success gs-tag-icon">CLUE 2 <SiteIcon name="check" /></span>
            </div>
            <a class="btn gold" href="/sample/evidence">View the evidence <SiteIcon name="arrow-right" /></a>
          </div>
        </section>

        <section class="panel" aria-labelledby="reveal-collapsed-title">
          <div class="panel-head">
            <span id="reveal-collapsed-title" class="panel-title">Collapsed state · during stream</span>
            <span class="tag subtle">AFTER REVEAL</span>
          </div>
          <div class="gs-collapsed-body">
            <p>After the celebration the overlay becomes a small confirmation strip.</p>
            <div class="mini-card gs-strip">
              <div class="row between">
                <div class="row">
                  <span class="gs-check"><SiteIcon name="check" /></span>
                  <div>
                    <h4>Sample case · Solved</h4>
                    <div class="small">Sample proof · verified</div>
                  </div>
                </div>
                <button class="btn sm" type="button" disabled>Dismiss</button>
              </div>
            </div>
            <p class="mt32">Automatically minimizes after a short delay; streamer may dismiss immediately.</p>
          </div>
        </section>
      </div>
    </template>

    <!-- S06: mystery stage -->
    <template v-else-if="screen === 'stage'">
      <div class="row between">
        <div>
          <div class="eyebrow">M01 · MYSTERY LIVE / CHAPTER 2 OF 4</div>
          <h1 class="page-title mt8">The Missing Festival Trophy</h1>
        </div>
        <div class="row">
          <span class="tag">MYSTERY LIVE</span>
        </div>
      </div>

      <div class="row gs-stage-row">
        <div class="session-scene gs-scene">
          <div class="gs-objective">
            <div class="eyebrow">CURRENT OBJECTIVE</div>
            <h4 class="mt8">Reconstruct what happened before the blackout.</h4>
            <p class="mt8 gs-note">Find the first discrepancy in the evidence.</p>
          </div>
          <span class="scene-hotspot" style="top: 155px; left: 31%" aria-hidden="true"><SiteIcon name="search" size="18px" :stroke="2" /></span>
          <span class="scene-hotspot" style="top: 260px; left: 70%" aria-hidden="true"><SiteIcon name="search" size="18px" :stroke="2" /></span>
          <span class="scene-hotspot" style="top: 385px; left: 50%" aria-hidden="true"><SiteIcon name="search" size="18px" :stroke="2" /></span>
          <div class="row gs-scene-bar">
            <span class="tag gs-tag-icon"><SiteIcon name="search" /> Gallery Hall · Examine the display</span>
            <span class="btn sm"
              >Explore &nbsp; <SiteIcon name="document" /> Evidence &nbsp; <SiteIcon name="clock" /> Timeline</span
            >
          </div>
        </div>

        <section class="panel gs-journal" aria-labelledby="journal-title">
          <div class="panel-head"><span id="journal-title" class="panel-title">Case journal</span></div>
          <div class="panel-body">
            <div class="eyebrow">CLUES FOUND</div>
            <div class="kvrow"><span>CCTV recording</span><strong>18:47</strong></div>
            <div class="kvrow"><span>Heat warning</span><strong>18:56</strong></div>
            <div class="kvrow"><span>Maintenance</span><strong>18:57</strong></div>
            <div class="divider"></div>
            <a class="btn gold" href="/sample/evidence">Open evidence board <SiteIcon name="arrow-right" /></a>
          </div>
        </section>
      </div>

      <div class="grid3 mt18 gs-stage-cards">
        <div class="mini-card row">
          <div class="tile-icon" aria-hidden="true"><SiteIcon name="document" size="22px" /></div>
          <div><h4>5 pieces of evidence</h4><div class="small">Two unverified connections</div></div>
        </div>
        <div class="mini-card row">
          <div class="tile-icon" aria-hidden="true"><SiteIcon name="clock" size="22px" /></div>
          <div><h4>Timeline discrepancy</h4><div class="small">One event needs investigation</div></div>
        </div>
        <div class="mini-card row">
          <div class="tile-icon" aria-hidden="true"><SiteIcon name="target" size="22px" /></div>
          <div><h4>Two theories open</h4><div class="small">Theories stay open until evidence settles them</div></div>
        </div>
      </div>
    </template>

    <!-- S07: evidence board -->
    <template v-else-if="screen === 'evidence'">
      <div class="row between">
        <div>
          <div class="eyebrow">M01 / INVESTIGATION WORKSPACE</div>
          <h1 class="page-title mt8">Evidence Board</h1>
        </div>
        <div class="row">
          <span class="tag">FACTS 5</span>
          <span class="tag">THEORIES 2</span>
          <a class="btn sm" href="/sample/stage">Back to scene</a>
        </div>
      </div>

      <div class="gs-board-grid">
        <section class="panel gs-board-panel" aria-labelledby="board-title">
          <div class="panel-head">
            <span id="board-title" class="panel-title">Case files · The Missing Festival Trophy</span>
            <span class="tag subtle">STATIC SAMPLE</span>
          </div>
          <div class="gs-board-scroll">
            <div class="gs-board">
              <svg class="gs-strings" viewBox="0 0 760 570" aria-hidden="true">
                <path d="M160 160 L395 165 L560 340 M200 385 L395 165 M420 400 L560 340" stroke="#ae543d" stroke-width="3" fill="none" />
                <circle cx="395" cy="165" r="6" fill="#d8b780" />
                <circle cx="560" cy="340" r="6" fill="#d8b780" />
              </svg>
              <div class="paper" style="position: absolute; left: 35px; top: 65px; width: 190px; transform: rotate(-5deg)">
                <b>CCTV · 18:47</b>
                <p>Last verified sighting</p>
                <div class="image img-gallery mt8" style="height: 86px"></div>
              </div>
              <div class="paper" style="position: absolute; left: 295px; top: 58px; width: 192px; transform: rotate(3deg)">
                <b>HEAT WARNING</b>
                <p>18:56 / Display sensor</p>
                <div style="height: 64px; border: 1px solid #8b7656; margin-top: 12px; padding: 9px">TEMP &gt; 25.0°C</div>
              </div>
              <div class="paper" style="position: absolute; left: 545px; top: 100px; width: 184px; transform: rotate(-2deg)">
                <b>MAINTENANCE</b>
                <p>18:57 · authorized move</p>
                <div style="margin-top: 12px; text-align: center" aria-hidden="true"><SiteIcon name="document" size="36px" /></div>
              </div>
              <div class="paper" style="position: absolute; left: 90px; top: 350px; width: 190px; transform: rotate(3deg)">
                <b>STAFF ACCESS</b>
                <p>Approved staff credentials</p>
                <div style="text-align: center" aria-hidden="true"><SiteIcon name="search" size="40px" /></div>
              </div>
              <div class="paper" style="position: absolute; left: 370px; top: 369px; width: 220px; transform: rotate(-4deg)">
                <b>BLACKOUT</b>
                <p>19:01 · event occurs after relocation</p>
              </div>
            </div>
          </div>
        </section>

        <section class="panel" aria-labelledby="selected-title">
          <div class="panel-head">
            <span id="selected-title" class="panel-title">Selected evidence</span>
            <span class="tag">E03</span>
          </div>
          <div class="panel-body">
            <div class="image img-document gs-doc"></div>
            <h3 class="mt24">Maintenance log</h3>
            <p class="mt8">An authorized relocation was recorded at 18:57, before the power outage. The reason is not yet proven.</p>
            <div class="divider"></div>
            <div class="kvrow"><span>Source</span><strong>Maintenance office</strong></div>
            <div class="kvrow"><span>Timestamp</span><strong>18:57</strong></div>
            <div class="kvrow"><span>Confidence</span><strong>Verified log</strong></div>
            <div class="row mt24">
              <button class="btn gold" type="button" disabled>Compare evidence</button>
              <button class="btn ghost" type="button" disabled>Inspect</button>
            </div>
            <p class="mt18">Evidence is factual. Conclusions remain theories until proven.</p>
          </div>
        </section>
      </div>
    </template>

    <!-- S08: timeline challenge -->
    <template v-else-if="screen === 'timeline'">
      <div class="row between">
        <div>
          <div class="eyebrow">M01 · A CHALLENGE OF CAUSE AND TIME</div>
          <h1 class="page-title mt8">Reconstruct the timeline.</h1>
          <p class="mt8">Place verified events in order. A contradiction is hiding in plain sight.</p>
        </div>
        <span class="tag">SEQUENCE CHALLENGE</span>
      </div>

      <section class="panel gs-timeline-panel" aria-labelledby="timeline-title">
        <div class="panel-head">
          <span id="timeline-title" class="panel-title">Known events · drag to reorder</span>
          <button class="btn sm" type="button" disabled>Reset sequence</button>
        </div>
        <div class="panel-body">
          <div class="gs-timeline">
            <template v-for="(node, index) in TIMELINE" :key="node.time">
              <div class="timeline-node" :class="{ unknown: index === TIMELINE.length - 1 }">
                <div class="eyebrow">{{ index === TIMELINE.length - 1 ? "UNRESOLVED" : node.time }}</div>
                <div class="image gs-node-art" :class="[node.art, { 'gs-node-open': index === TIMELINE.length - 1 }]"></div>
                <h4 class="gs-node-title">{{ node.title }}</h4>
                <div class="small">{{ node.detail }}</div>
              </div>
              <span v-if="index < TIMELINE.length - 1" class="gs-arrow" aria-hidden="true"
                ><SiteIcon name="chevron-right" size="22px"
              /></span>
            </template>
          </div>
        </div>
      </section>

      <div class="gs-timeline-grid">
        <section class="panel" aria-labelledby="contradiction-title">
          <div class="panel-head"><span id="contradiction-title" class="panel-title">Contradiction detected</span></div>
          <div class="panel-body">
            <div class="row">
              <div class="tile-icon" aria-hidden="true"><SiteIcon name="alert" size="22px" /></div>
              <div>
                <h4>The blackout happened too late.</h4>
                <p class="mt8">If the trophy moved at 18:57, the power outage at 19:01 cannot explain its disappearance.</p>
              </div>
            </div>
            <div class="row mt18">
              <span class="tag success">Evidence-backed</span>
              <span class="tag">Theory still open</span>
            </div>
          </div>
        </section>

        <section class="panel" aria-labelledby="code-title">
          <div class="panel-head"><span id="code-title" class="panel-title">Code challenge · optional branch</span></div>
          <div class="panel-body">
            <p>Use the verified maintenance-room reference to open a locked storage record.</p>
            <div class="row mt18">
              <div class="input-like gs-code">_ _ _ _</div>
              <button class="btn gold" type="button" disabled>Check code</button>
            </div>
            <div class="small mt18">Hints remain optional. Invalid guesses do not erase progress.</div>
          </div>
        </section>
      </div>
    </template>

    <!-- S09: theory challenge -->
    <template v-else-if="screen === 'theory'">
      <div class="row between">
        <div>
          <div class="eyebrow">M01 · COMMUNITY DEDUCTION</div>
          <h1 class="page-title mt8">Challenge a theory.</h1>
          <p class="mt8">The loudest theory is not always the right one. Let the evidence decide.</p>
        </div>
        <span class="tag">PROOF REQUIRED</span>
      </div>

      <div class="gs-theory-grid">
        <section class="panel" aria-labelledby="hypothesis-title">
          <div class="panel-head"><span id="hypothesis-title" class="panel-title">What actually happened?</span></div>
          <div class="panel-body">
            <div class="eyebrow">CURRENT HYPOTHESES</div>
            <div class="col gs-options">
              <div
                v-for="item in HYPOTHESES"
                :key="item.title"
                class="theory-opt"
                :class="{ sel: item.selected }"
              >
                <span class="gs-radio" :class="{ on: item.selected }" aria-hidden="true"></span>
                <div>
                  <h4>{{ item.title }}</h4>
                  <p class="mt8">{{ item.detail }}</p>
                  <span class="tag" :class="item.tone">{{ item.state }}</span>
                </div>
              </div>
            </div>
            <div class="gs-test">
              <button class="btn gold" type="button" disabled>Test selected theory <SiteIcon name="arrow-right" /></button>
            </div>
          </div>
        </section>

        <section class="panel" aria-labelledby="claim-title">
          <div class="panel-head"><span id="claim-title" class="panel-title">Evidence for the claim</span></div>
          <div class="panel-body">
            <article class="gs-proof">
              <div class="image img-document gs-proof-art" aria-hidden="true"></div>
              <div class="gs-proof-head">
                <h4>Heat warning</h4>
                <span class="tag subtle">E02</span>
              </div>
              <div class="small gs-proof-meta">18:56 · sensor alarm</div>
            </article>
            <div class="gs-plus" aria-hidden="true"><SiteIcon name="plus" size="18px" /></div>
            <article class="gs-proof">
              <div class="image img-board gs-proof-art" aria-hidden="true"></div>
              <div class="gs-proof-head">
                <h4>Maintenance log</h4>
                <span class="tag subtle">E03</span>
              </div>
              <div class="small gs-proof-meta">18:57 · authorized relocation</div>
            </article>
            <div class="mini-card gs-verify">
              <div class="eyebrow">VERIFICATION RULE</div>
              <p class="mt8">Evidence must establish a meaningful relationship. Popularity alone does not prove a theory.</p>
            </div>
          </div>
        </section>

        <section class="panel" aria-labelledby="community-title">
          <div class="panel-head"><span id="community-title" class="panel-title">Community theories</span></div>
          <div class="panel-body">
            <div class="gs-chat-label">Sample chat · not live</div>
            <ul class="gs-chat">
              <li v-for="line in CHAT" :key="line.name">
                <span class="gs-chat-name">{{ line.name }}</span>
                <span class="gs-chat-message">{{ line.message }}</span>
              </li>
            </ul>
            <div class="mini-card gs-next">
              <div class="eyebrow">YOUR NEXT ACTION</div>
              <p class="mt8">Select evidence and challenge the claim. Incorrect theories can be revised.</p>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- S10: verdict and result -->
    <template v-else-if="screen === 'verdict'">
      <div class="row between">
        <div>
          <div class="eyebrow">M01 · FINAL RECONSTRUCTION</div>
          <h1 class="page-title mt8">The truth, finally brought to light.</h1>
        </div>
        <span class="tag success">CASE SOLVED</span>
      </div>

      <section class="panel mt24 gs-hero" aria-labelledby="verdict-title">
        <div class="gs-hero-art" aria-hidden="true"></div>
        <div class="gs-hero-inner">
          <div class="gs-hero-mark" aria-hidden="true"><SiteIcon name="sparkle" :stroke="1.1" /></div>
          <div>
            <div class="eyebrow">THE MISSING FESTIVAL TROPHY</div>
            <h2 id="verdict-title" class="gs-hero-title">No thief. A mistaken timeline.</h2>
            <p class="bodycopy mt18 gs-hero-copy">
              The display's heat alarm triggered an authorized relocation at 18:57. The trophy reached cooling room B4
              before the 19:01 blackout. The outage concealed the truth, but did not cause the disappearance.
            </p>
            <div class="row mt24">
              <span class="tag success">EVIDENCE VERIFIED</span>
              <span class="tag success">TIMELINE RESTORED</span>
            </div>
          </div>
        </div>
      </section>

      <div class="gs-verdict-grid mt18">
        <section class="panel" aria-labelledby="checklist-title">
          <div class="panel-head"><span id="checklist-title" class="panel-title">Proof checklist</span></div>
          <div class="panel-body">
            <div v-for="item in CHECKLIST" :key="item" class="row gs-check-row">
              <span class="gs-tick" aria-hidden="true"><SiteIcon name="check" /></span>
              <span class="gs-check-text">{{ item }}</span>
            </div>
          </div>
        </section>

        <section class="panel" aria-labelledby="reconstruction-title">
          <div class="panel-head"><span id="reconstruction-title" class="panel-title">Event reconstruction</span></div>
          <div class="panel-body">
            <div v-for="row in RECONSTRUCTION" :key="row.time" class="kvrow">
              <span>{{ row.time }}</span>
              <strong>{{ row.event }}</strong>
            </div>
          </div>
        </section>

        <section class="panel" aria-labelledby="credits-title">
          <div class="panel-head"><span id="credits-title" class="panel-title">Community credits</span></div>
          <div class="panel-body">
            <p>Sample credits only. Live credits need a connected round.</p>
            <div class="kvrow"><span>First critical clue</span><strong>Sample viewer</strong></div>
            <div class="kvrow"><span>Timeline correction</span><strong>Sample viewer</strong></div>
            <div class="kvrow"><span>Final reconstruction</span><strong>Community</strong></div>
            <div class="mt24">
              <a class="btn gold" href="/play">Return to case menu <SiteIcon name="arrow-right" /></a>
            </div>
            <p class="small mt12">Sample attribution shown for design only.</p>
          </div>
        </section>
      </div>
    </template>

    <nav class="gs-sample-nav mt32" aria-label="Sample screens">
      <a
        v-for="item in SCREENS"
        :key="item.id"
        class="btn sm"
        :class="{ ghost: item.id !== screen }"
        :href="item.path"
        :aria-current="item.id === screen ? 'page' : undefined"
      >{{ item.label }}</a>
    </nav>
    <p class="small mt12">
      Sample layouts. Cases, clues, theories, and people are invented, and nothing here is connected to a round.
      <a class="gs-play-link" href="/?view=quick">Play the full sample case <SiteIcon name="arrow-right" /></a>
    </p>
  </PlateFrame>
</template>

<style scoped>
/* Quick Case reveal (S05) */
.gs-reveal {
  height: 590px;
}

.plate .panel.gs-reveal-panel {
  background: linear-gradient(#21140ce8, #21140ced), url("./plates/museum.jpg") center / cover;
}

.gs-reveal-body {
  height: 500px;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 20px;
}

.gs-star {
  font-size: 90px;
  line-height: 1;
  color: #e9c17f;
  /* The SVG mark takes the glow the text glyph used to carry. */
  filter: drop-shadow(0 0 18px #e7a64a);
}

.gs-reveal-title {
  font-size: 62px;
  line-height: 1.05;
}

.gs-narrow {
  max-width: 390px;
}

.gs-collapsed-body {
  height: 500px;
  padding: 28px;
}

.gs-strip {
  margin-top: 70px;
  border-color: #bb9051;
}

.gs-check {
  font-size: 26px;
  color: #d8b371;
}

/* Mystery stage (S06) */
.gs-stage-row {
  margin-top: 20px;
  height: 580px;
  gap: 12px;
  align-items: stretch;
}

.gs-scene {
  width: 76%;
}

.gs-objective {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 6;
  max-width: 320px;
  padding: 16px;
  background: #120b08d9;
  border: 1px solid #86603a;
  border-radius: 8px;
}

.gs-note {
  font-size: 12px;
}

.gs-scene-bar {
  position: absolute;
  bottom: 14px;
  left: 18px;
  right: 18px;
  z-index: 6;
  justify-content: space-between;
}

.gs-journal {
  width: 24%;
}

/* Evidence board (S07) */
.gs-board-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1.9fr 0.9fr;
  gap: 18px;
  height: 688px;
}

/* Case-file panel uses the reference evidence photo under a dark warm overlay. */
.plate .panel.gs-board-panel {
  background: linear-gradient(#28180fce, #2a190cda), url("./plates/evidence.jpg") center / cover;
}

.gs-board-scroll {
  overflow-x: auto;
}

.gs-board {
  position: relative;
  height: 626px;
  padding: 26px;
}

.gs-strings {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.68;
}

.gs-doc {
  height: 240px;
  border: 7px solid #d0b58c;
  border-radius: 4px;
}

/* Timeline challenge (S08) */
.gs-timeline-panel {
  margin-top: 24px;
  height: 390px;
}

.gs-timeline {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 8px;
  margin-top: 25px;
}

.gs-node-art {
  height: 78px;
  border-radius: 6px;
}

.gs-node-open {
  background: #170e09;
  border: 1px dashed #a47742;
}

.gs-node-title {
  font-size: 22px;
}

.gs-arrow {
  align-self: center;
  font-size: 23px;
  color: #d5a65e;
}

.gs-timeline-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 18px;
}

.gs-code {
  flex: 1;
  letter-spacing: 20px;
  font-size: 21px;
  text-align: center;
}

/* Theory challenge (S09) */
/* Column widths and the 17px gap match the reference panels (about 526 / 403 / 348px at 1440px). */
.gs-theory-grid {
  margin-top: 28px;
  display: grid;
  grid-template-columns: 1.24fr 0.95fr 0.82fr;
  gap: 17px;
  height: 660px;
}

/* Reference radios: a 32px ring when unselected, a 20px ring with a centred dot when selected. */
.gs-radio {
  flex: none;
  width: 32px;
  height: 32px;
  box-sizing: border-box;
  border: 2px solid #b8854a;
  border-radius: 50%;
}

.gs-radio.on {
  width: 20px;
  height: 20px;
  margin-top: 6px;
  border-color: #d8a85f;
  background: radial-gradient(circle, #d8a85f 0 4px, transparent 5px);
}

.gs-proof {
  border: 1px solid #624528;
  border-radius: 8px;
  padding: 10px;
  background: #1b110c;
}

.gs-proof-art {
  height: 110px;
  border-radius: 6px;
}

.gs-proof-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 13px;
}

.site .plate .gs-proof h4 {
  font-family: var(--plate-serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0;
}

.gs-proof-meta {
  margin-top: 7px;
}

/* The plus sits in a 36px gap between the two evidence cards (measured against the PNG). */
.gs-plus {
  height: 36px;
  box-sizing: border-box;
  padding-top: 12px;
  text-align: center;
  font-size: 20px;
  line-height: 14px;
  color: #d5a65e;
}

.gs-chat-label {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dim);
}

/* Scoped wrapping: the site-wide balance rule splits these lines differently from the reference, which wraps greedily. */
.gs-theory-grid p,
.gs-chat-message {
  text-wrap: wrap;
}

.gs-options {
  margin-top: 16px;
}

/* The reference button sits 3px higher than a 24px gap would place it, measured against the PNG. */
.gs-test {
  margin-top: 21px;
}

/* The reference evidence column starts 2px higher than the shared panel-body offset. */
.gs-proof:first-child {
  margin-top: -2px;
}

.gs-options h4 {
  line-height: 26px;
}

.gs-chat {
  list-style: none;
  margin: -2px 0 0;
  padding: 0;
}

.gs-verify {
  margin-top: 17px;
}

/* One line per message at 13px, as in the reference; the name column is 110px. */
.gs-chat li {
  display: grid;
  grid-template-columns: 110px 1fr;
  padding: 9px 6px 10px;
  border-bottom: 1px solid #4a3220;
  font-size: 13px;
  line-height: 20px;
}

.gs-chat-name {
  color: #d8a85f;
}

.gs-chat-message {
  color: #cbb89c;
}

.gs-next {
  margin-top: 24px;
}

/* Verdict (S10) */
.gs-hero {
  position: relative;
  overflow: hidden;
  height: 356px;
}

/* Same overlay and image as the reference's inline hero background; no bottom fade from .image. */
.gs-hero-art {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, #140b08d8, #1c1209aa),
    url("./plates/festival.jpg") center / cover;
}

.gs-hero-inner {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 58px;
  padding: 36px 50px;
}

.gs-hero-mark {
  font-size: 108px;
  line-height: 1;
  color: #efc179;
  filter: drop-shadow(0 0 24px #d68d36);
}

/* Scoped under .site .plate so it beats the shared h2 size rule; matches the reference's inline h1 at 63px. */
.site .plate .gs-hero-title {
  margin-top: 15px;
  font-size: 63px;
  line-height: 0.95;
  letter-spacing: -1.2px;
}

.gs-hero-copy {
  max-width: 780px;
}

.gs-verdict-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr;
  gap: 16px;
}

.gs-check-row {
  margin-bottom: 13px;
  line-height: 20px;
}

.gs-tick {
  color: #97c59a;
}

.gs-check-text {
  font-size: 12px;
}

.gs-sample-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1100px) {
  .gs-stage-row {
    flex-direction: column;
    height: auto;
  }

  .gs-scene {
    width: 100%;
    height: 420px;
  }

  .gs-journal {
    width: 100%;
  }

  .gs-board-grid,
  .gs-timeline-grid,
  .gs-theory-grid,
  .gs-verdict-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .gs-reveal {
    height: auto;
  }

  .gs-reveal-body,
  .gs-collapsed-body {
    height: auto;
    padding: 28px 22px;
  }

  .gs-timeline {
    flex-wrap: wrap;
  }

  .gs-arrow {
    display: none;
  }

  .gs-hero {
    height: auto;
  }

  .gs-hero-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    padding: 28px 22px;
  }

  .gs-hero-mark {
    font-size: 64px;
  }

  .gs-hero-title {
    font-size: 40px;
  }

  .gs-hero-art::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #140d09c7, #140d09f2);
  }

  .gs-reveal-title {
    font-size: 46px;
  }
}

@media (max-width: 760px) {
  .gs-board {
    min-width: 760px;
  }

  .gs-board-grid {
    height: auto;
  }
}

/* Icons inside tags sit on the text line. */
.gs-tag-icon {
  gap: 6px;
}

.gs-play-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 6px;
  color: var(--gold);
  text-decoration: underline;
  text-underline-offset: 4px;
}

/*
 * Motion, full-motion only (html[data-motion="full"]); reduced motion keeps every layout still.
 * Entrances use backwards fill so a finished animation never holds a transform over hover or layout.
 */
@keyframes gs-rise {
  from {
    opacity: 0;
    translate: 0 14px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}
@keyframes gs-twinkle {
  0%,
  100% {
    opacity: 0.85;
    scale: 1;
    rotate: 0deg;
  }
  50% {
    opacity: 1;
    scale: 1.08;
    rotate: 8deg;
  }
}
@keyframes gs-draw {
  from {
    stroke-dashoffset: 900;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes gs-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 5px #20120966,
      0 0 28px #f3b3548c;
  }
  50% {
    box-shadow:
      0 0 0 9px #20120933,
      0 0 40px #f3b354cc;
  }
}
@keyframes gs-sway {
  0%,
  100% {
    rotate: var(--gs-tilt, 0deg);
  }
  50% {
    rotate: calc(var(--gs-tilt, 0deg) + 0.8deg);
  }
}
@keyframes gs-pan {
  from {
    background-position: 46% 50%;
  }
  to {
    background-position: 54% 46%;
  }
}

html[data-motion="full"] .panel,
html[data-motion="full"] .mini-card,
html[data-motion="full"] .timeline-node,
html[data-motion="full"] .theory-opt,
html[data-motion="full"] .gs-check-row,
html[data-motion="full"] .gs-chat li {
  animation: gs-rise 620ms var(--ease-out-expo) backwards;
}
html[data-motion="full"] .grid2 > :nth-child(2),
html[data-motion="full"] .grid3 > :nth-child(2),
html[data-motion="full"] .gs-timeline > :nth-child(3),
html[data-motion="full"] .gs-options > :nth-child(2),
html[data-motion="full"] .gs-check-row:nth-child(2),
html[data-motion="full"] .gs-chat li:nth-child(2) {
  animation-delay: 90ms;
}
html[data-motion="full"] .grid3 > :nth-child(3),
html[data-motion="full"] .gs-timeline > :nth-child(5),
html[data-motion="full"] .gs-options > :nth-child(3),
html[data-motion="full"] .gs-check-row:nth-child(3),
html[data-motion="full"] .gs-chat li:nth-child(3) {
  animation-delay: 180ms;
}
html[data-motion="full"] .gs-timeline > :nth-child(7),
html[data-motion="full"] .gs-check-row:nth-child(4),
html[data-motion="full"] .gs-chat li:nth-child(4) {
  animation-delay: 270ms;
}
html[data-motion="full"] .gs-timeline > :nth-child(9),
html[data-motion="full"] .gs-check-row:nth-child(5) {
  animation-delay: 360ms;
}
html[data-motion="full"] .gs-star,
html[data-motion="full"] .gs-hero-mark {
  animation: gs-twinkle 3.2s ease-in-out infinite;
}
html[data-motion="full"] .gs-strings path {
  stroke-dasharray: 900;
  animation: gs-draw 1600ms var(--ease-out-expo) 300ms backwards;
}
html[data-motion="full"] .scene-hotspot {
  animation: gs-pulse 2.4s ease-in-out infinite;
}
html[data-motion="full"] .gs-board .paper {
  animation:
    gs-rise 620ms var(--ease-out-expo) backwards,
    gs-sway 7s ease-in-out 700ms infinite;
}
html[data-motion="full"] .gs-scene,
html[data-motion="full"] .gs-hero-art {
  animation: gs-pan 26s ease-in-out infinite alternate;
}
</style>
