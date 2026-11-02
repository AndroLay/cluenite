<script setup lang="ts">
import PlateFrame from "./PlateFrame.vue";
import SiteIcon from "./SiteIcon.vue";

// Sample preview of the three co-op stations (S12–S14). It is not connected to a live session and imports no case data.
// In a live co-op session the server sends each crew only its own station's clues and references.
type Station = "field" | "records" | "shared";

const props = defineProps<{ station: Station }>();

const titles: Record<Station, string> = {
  field: "The Lighthouse Field Station",
  records: "The Harbor Records Room",
  shared: "The Shared Breakthrough",
};

const eyebrows: Record<Station, string> = {
  field: "C01 · STREAMER A / FIELD INVESTIGATION",
  records: "C01 · STREAMER B / RECORDS INVESTIGATION",
  shared: "C01 · TWO COMMUNITIES / ONE PROOF",
};

const crewTags: Record<Station, string> = {
  field: "YOUR CREW · FIELD",
  records: "YOUR CREW · RECORDS",
  shared: "CROSS-COMMUNITY EVIDENCE",
};

const links: Record<Station, string> = {
  field: "/coop/field",
  records: "/coop/records",
  shared: "/coop/shared",
};

const names: Record<Station, string> = {
  field: "Field workstation",
  records: "Records workstation",
  shared: "Shared board",
};

const otherStations = (["field", "records", "shared"] as const).filter((id) => id !== props.station);

// Hotspot positions are percentages of the scene panel, matched to the reference layout.
const hotspots = [
  { label: "beacon", top: "29%", left: "66.2%" },
  { label: "signal lamp", top: "63%", left: "32.3%" },
  { label: "buoy marker", top: "74%", left: "80.2%" },
];
</script>

<template>
  <PlateFrame class="ws-plate">
    <header class="row between">
      <div>
        <div class="eyebrow">{{ eyebrows[station] }}</div>
        <h1 :id="`ws-${station}-title`" class="page-title mt8">{{ titles[station] }}</h1>
        <p v-if="station === 'shared'" class="mt8">
          A conclusion becomes possible only after two independent discoveries align.
        </p>
      </div>
      <span class="tag" :class="{ success: station === 'shared' }">{{ crewTags[station] }}</span>
      <a v-if="station !== 'shared'" class="btn sm" href="/coop/shared">Shared board</a>
    </header>

    <!-- S12 · Field station -->
    <div v-if="station === 'field'" class="ws-split ws-split--field">
      <section class="panel" aria-label="Field scene">
        <div class="image img-harbor ws-scene" role="img" aria-label="Sample harbor scene with a lighthouse beacon">
          <div class="panel ws-objective">
            <div class="panel-body">
              <div class="eyebrow">FIELD OBJECTIVE</div>
              <h2 class="mt8">Follow the strange signal.</h2>
              <p class="small mt8">Inspect the beacon and confirm the light sequence seen at 02:17.</p>
            </div>
          </div>
          <button
            v-for="spot in hotspots"
            :key="spot.label"
            class="scene-hotspot"
            type="button"
            disabled
            :style="{ top: spot.top, left: spot.left }"
            :aria-label="`Inspect ${spot.label}: not connected in this preview`"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" />
            </svg>
          </button>
          <span class="tag subtle ws-corner-left">LOOK / INSPECT</span>
          <span class="tag subtle ws-corner-right">Shared board: not joined</span>
        </div>
      </section>

      <section class="panel ws-notebook" aria-labelledby="ws-notebook-title">
        <div class="panel-head">
          <h2 id="ws-notebook-title" class="panel-title">Field notebook</h2>
          <span class="tag subtle">A</span>
        </div>
        <div class="panel-body">
          <div class="eyebrow">OBSERVATIONS</div>
          <div class="ws-kvlist">
            <div class="kvrow">
              <span>Beacon flashes</span>
              <strong>2–1–2</strong>
            </div>
            <div class="kvrow">
              <span>Station position</span>
              <strong>Pier P4</strong>
            </div>
            <div class="kvrow">
              <span>Conditions</span>
              <strong>Night / fog</strong>
            </div>
          </div>

          <h3 class="ws-evidence-title">Evidence collected</h3>
          <div class="row ws-evidence-row">
            <div class="image img-harbor ws-thumb" role="img" aria-label="Sample evidence thumbnail"></div>
            <div class="col">
              <strong>Beacon burst</strong>
              <span class="small">Visually observed at 02:17</span>
              <span class="tag success ws-verified">VERIFIED</span>
            </div>
          </div>

          <div class="divider mt24"></div>
          <h3 class="ws-team-title">Team B is investigating</h3>
          <p class="small mt8">Harbor records and buoy maintenance references.</p>
          <button class="btn gold mt18" type="button" disabled>Share verified clue <SiteIcon name="arrow-right" /></button>
        </div>
      </section>
    </div>

    <!-- S13 · Records station -->
    <div v-else-if="station === 'records'" class="ws-split ws-split--records">
      <section class="panel ws-archive" aria-labelledby="ws-archive-title">
        <div class="panel-head">
          <h2 id="ws-archive-title" class="panel-title">Archive · Signal Reference B-17</h2>
          <span class="tag">DOCUMENT VIEWER</span>
        </div>
        <div class="ws-doc-stage">
          <div class="paper ws-paper">
            <div class="ws-paper-title">HARBOR AUTHORITY<br />BEACON SERVICE LOG</div>
            <div class="ws-paper-log">
              REF: B-17 / PIER SECTOR P4<br />
              DATE: 18 OCT / 02:17<br />
              DEVICE: OFFSHORE TEST BUOY<br />
              BEACON CODE: 2 - 1 - 2<br />
              STATUS: NOT DEACTIVATED
            </div>
            <blockquote class="ws-quote">A signal can mimic a vessel on the horizon without any ship present.</blockquote>
            <div class="ws-stamp">Stamped: archive copy — inspect alongside field findings.</div>
          </div>
        </div>
      </section>

      <div class="col">
        <section class="panel" aria-labelledby="ws-desk-title">
          <div class="panel-head">
            <h2 id="ws-desk-title" class="panel-title">Analysis desk</h2>
          </div>
          <div class="panel-body">
            <div class="eyebrow">DOCUMENTS ON RECORD</div>
            <div class="mt8">
              <div class="kvrow">
                <span>Maintenance reference</span>
                <strong>B-17</strong>
              </div>
              <div class="kvrow">
                <span>Signal frequency</span>
                <strong>Test beacon</strong>
              </div>
              <div class="kvrow">
                <span>Coordinates</span>
                <strong>Sector P4</strong>
              </div>
              <div class="kvrow">
                <span>Verification</span>
                <strong>Awaiting Crew A</strong>
              </div>
            </div>
            <div class="divider"></div>
            <h4>Observed signal</h4>
            <div class="wave mt18" aria-hidden="true"></div>
            <div class="row between mt18">
              <span class="tag subtle">2 — 1 — 2</span>
              <button class="btn gold sm" type="button" disabled>Match field sequence</button>
            </div>
          </div>
        </section>

        <section class="panel" aria-labelledby="ws-crew-title">
          <div class="panel-head">
            <h2 id="ws-crew-title" class="panel-title">Records Crew</h2>
            <span class="tag subtle">SAMPLE</span>
          </div>
          <div class="panel-body">
            <div class="chatline">
              <span class="user">Viewer_B</span>
              <span class="msg">The manual specifies B-17.</span>
            </div>
            <div class="chatline">
              <span class="user">Viewer_D</span>
              <span class="msg">It matches the pattern.</span>
            </div>
            <p class="small mt18">Validated records can be sent to the shared reasoning board.</p>
          </div>
        </section>
      </div>
    </div>

    <!-- S14 · Shared breakthrough -->
    <section v-else class="ws-shared" aria-labelledby="ws-join-title">
      <div class="ws-shared-stage">
        <article class="panel" aria-labelledby="ws-field-title">
          <div class="panel-body">
            <div class="eyebrow">CREW A · FIELD</div>
            <div class="image img-harbor ws-join-art" role="img" aria-label="Sample field reading art"></div>
            <h4 id="ws-field-title" class="mt18">Beacon flashes · 02:17</h4>
            <p class="small mt8">Pattern 2–1–2 observed at P4.</p>
            <span class="tag subtle mt8">SAMPLE · FIELD READING</span>
          </div>
        </article>

        <div class="ws-join-center">
          <span class="ws-diamond" aria-hidden="true"></span>
          <h2 id="ws-join-title" class="panel-title">Join state</h2>
          <p class="small">Not joined. A join needs both readings to be shared and verified by the server.</p>
          <span class="tag">NOT JOINED</span>
        </div>

        <article class="panel" aria-labelledby="ws-records-title">
          <div class="panel-body">
            <div class="eyebrow">CREW B · RECORDS</div>
            <div class="image img-document ws-join-art" role="img" aria-label="Sample maintenance record image"></div>
            <h4 id="ws-records-title" class="mt18">Maintenance record · B-17</h4>
            <p class="small mt8">Offshore buoy test code 2–1–2.</p>
            <span class="tag subtle mt8">SAMPLE · RECORDS REFERENCE</span>
          </div>
        </article>
      </div>

      <div class="ws-cells">
        <div class="panel ws-cell">
          <div class="panel-body">
            <div class="eyebrow">TEAM A CONTRIBUTION</div>
            <h4 class="mt12">Observed the signal</h4>
            <p class="small mt8">Physical confirmation</p>
          </div>
        </div>
        <div class="panel ws-cell ws-cell-focus">
          <div class="panel-body">
            <div class="eyebrow">SHARED CONCLUSION</div>
            <h3 class="mt12">The signal came from buoy B-17.</h3>
            <p class="small mt8">Sample conclusion. Not verified.</p>
          </div>
        </div>
        <div class="panel ws-cell">
          <div class="panel-body">
            <div class="eyebrow">TEAM B CONTRIBUTION</div>
            <h4 class="mt12">Verified the reference</h4>
            <p class="small mt8">Records corroboration</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Sample community feed for the field crew; labelled as not live. -->
    <section v-if="station === 'field'" class="panel mt18 ws-community" aria-labelledby="ws-community-title">
      <div class="panel-head">
        <h2 id="ws-community-title" class="panel-title">Community activity · Field Crew</h2>
        <span class="tag subtle">SAMPLE · NOT LIVE</span>
      </div>
      <div class="ws-community-row">
        <span class="ws-viewer">Viewer_A</span>
        <span class="ws-message">I see a 2–1–2 pattern.</span>
        <span class="ws-note">One solid observation can help both communities.</span>
        <a class="btn sm" href="/coop/shared">Open shared reasoning</a>
      </div>
    </section>

    <section class="panel mt24" aria-labelledby="ws-stations-title">
      <div class="panel-head">
        <h2 id="ws-stations-title" class="panel-title">Co-op stations</h2>
      </div>
      <div class="panel-body row">
        <a class="btn ghost sm" href="/coop">Back to co-op lobby</a>
        <a v-for="id in otherStations" :key="id" class="btn ghost sm" :href="links[id]">{{ names[id] }}</a>
      </div>
    </section>
  </PlateFrame>
</template>

<style scoped>
.ws-split {
  display: grid;
  grid-template-columns: minmax(0, 1.94fr) minmax(0, 1fr);
  gap: 17px;
  margin-top: 24px;
  align-items: stretch;
}
.ws-split--records {
  grid-template-columns: minmax(0, 1.38fr) minmax(0, 1fr);
  grid-template-rows: 710px;
  gap: 16px;
  margin-top: 22px;
  align-items: stretch;
}
.ws-archive {
  background:
    linear-gradient(#1c100bc9, #20130bb9),
    url("./plates/case_board.jpg") center / cover;
}
/* Reference edge falloff: the page background darkens toward the right and bottom edges (measured on S12: ours 6–8 brighter in those bands). The layer sits behind the content. */
.plate.ws-plate {
  position: relative;
  isolation: isolate;
}
.plate.ws-plate::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(to left, #05030299 0, #05030000 130px),
    radial-gradient(ellipse 900px 700px at 100% 100%, #05030280 0%, #05030000 100%);
}
/* Reference community panel: its empty field reads about 4 darker than ours (measured 18.0 vs 22.4). A 20% scrim sits behind the panel content. */
.plate.ws-plate .ws-community {
  background-image: linear-gradient(#05030333, #05030333), linear-gradient(135deg, #291b12ee, #160f0cfa 75%);
}
.plate.ws-plate .ws-community .panel-head {
  background-image: linear-gradient(#05030333, #05030333), linear-gradient(90deg, #312013, #20140c);
}
.ws-scene {
  position: relative;
  height: 588px;
}
/* Measured against the reference: the photo sits about 0.2 darker at the top, 0.34 across the title band, and 0.25 at the caption edge. */
.plate .ws-scene:after {
  background: linear-gradient(
    180deg,
    rgba(17, 11, 9, 0.2) 0%,
    rgba(17, 11, 9, 0.34) 55%,
    rgba(17, 11, 9, 0.36) 84%,
    rgba(17, 11, 9, 0.25) 100%
  );
}
/* Hotspot percentages mark the centre of each control, as in the reference. */
.ws-scene .scene-hotspot {
  transform: translate(-50%, -50%);
}
.ws-objective {
  position: absolute;
  left: 24px;
  top: 24px;
  width: 340px;
}
/* Reference widths: the title wraps after "strange" at 32px; the body line "Inspect the beacon and confirm the light" is 268px at 14px. */
.plate .ws-objective h2 {
  font-size: 32px;
  line-height: 32px;
}
.plate .ws-objective p {
  font-size: 14px;
  line-height: 22px;
}
/* The pills sit on the photo, so they carry their own dark ground and light text. */
.plate .ws-corner-left,
.plate .ws-corner-right {
  bottom: 22px;
  background: #1a0f08d9;
  border: 1px solid #9a6d3d;
  color: #ead2a4;
}
.ws-corner-left {
  position: absolute;
  left: 24px;
}
.ws-corner-right {
  position: absolute;
  right: 24px;
}
.ws-thumb {
  width: 90px;
  height: 90px;
  flex: none;
}
/* Notebook measures from the reference: sans sub-heads at 22px, 14px notes, and the list starts 7px higher. */
.plate .ws-notebook h3 {
  font-family: var(--plate-sans);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
}
.plate .ws-notebook .small {
  font-size: 14px;
}
.ws-kvlist {
  margin-top: 1px;
}
.ws-evidence-title {
  margin-top: 34px;
}
.ws-evidence-row {
  margin-top: 15px;
}
.ws-team-title {
  margin-top: 12px;
}
/* Probe against the reference: the field split starts 2px high in the reference; records keeps its own offset. */
.ws-split--field {
  margin-top: 22px;
}
.ws-verified {
  align-self: flex-start;
}
/* Community feed row: name, message, note and action sit on the reference's column starts (91, 201, 623, right edge 1354). */
.ws-community-row {
  display: grid;
  grid-template-columns: 110px 422px minmax(0, 1fr) auto;
  align-items: center;
  padding: 25px 20px 25px 26px;
  font-size: 13px;
  color: var(--muted);
}
.ws-viewer {
  color: var(--pale);
}
.ws-doc-stage {
  height: 590px;
  display: grid;
  place-items: center;
  padding: 26px;
}
.ws-paper {
  width: min(100%, 500px);
  height: 490px;
  padding: 26px 35px;
  transform: rotate(-1deg);
}
.ws-paper-title {
  padding-bottom: 15px;
  border-bottom: 2px solid #957953;
  font-family: var(--plate-serif);
  font-size: 30px;
  color: #4c321d;
  text-align: center;
}
.ws-paper-log {
  margin-top: 30px;
  font-family: "Cascadia Mono", monospace;
  font-size: 15px;
  line-height: 2.1;
  color: #53391f;
}
.ws-quote {
  margin: 28px 0 0;
  padding: 20px;
  border: 2px solid #9e7549;
  font-family: var(--plate-serif);
  font-size: 23px;
}
.ws-stamp {
  margin-top: 18px;
  font-size: 12px;
  color: #6a4931;
}
.ws-shared {
  margin-top: 24px;
}
.ws-shared-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px minmax(0, 1fr);
  align-items: center;
  height: 500px;
  padding: 0 38px;
  border: 1px solid #8d6134;
  border-radius: 6px;
  background: radial-gradient(ellipse at 52% 48%, #5e381a, #1b100b 58%);
}
.ws-shared-stage > .panel {
  background: #24170e;
}
.ws-shared-stage > .panel::before {
  box-shadow: none;
}
.ws-shared-stage > .panel > .panel-body {
  padding: 16px;
}
.ws-join-center {
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
}
.ws-join-center h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 400;
  line-height: 1.2;
}
.ws-join-center p {
  max-width: 200px;
  margin: 0 auto;
  font-size: 15px;
  line-height: 22px;
}
.ws-diamond {
  display: block;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  margin: 9px auto 10px;
  border: 3px solid #e7bd80;
  transform: rotate(45deg);
  box-shadow: 0 0 28px rgba(231, 189, 128, 0.4);
}
.ws-join-art {
  height: 148px;
  margin-top: 12px;
}
.ws-cells {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 19px;
}
.ws-cell {
  height: 121px;
  box-sizing: border-box;
  text-align: center;
}
.ws-cell > .panel-body {
  padding: 16px;
}
.ws-cell-focus h3 {
  font-size: 29px;
  line-height: 1.2;
}
.ws-cell-focus {
  border-color: #bd8647;
}
@media (max-width: 1100px) {
  .ws-split,
  .ws-shared-stage,
  .ws-cells {
    grid-template-columns: 1fr;
  }
  .ws-shared-stage {
    height: auto;
    padding: 24px;
  }
  .ws-scene {
    height: 460px;
  }
  .ws-objective {
    position: relative;
    left: auto;
    top: auto;
    width: auto;
    margin: 16px;
  }
  .ws-split--records {
    grid-template-rows: auto;
  }
  .ws-doc-stage {
    height: auto;
  }
  .ws-paper {
    height: auto;
  }
}
</style>
