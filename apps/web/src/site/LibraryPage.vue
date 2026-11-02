<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import PlateFrame from "./PlateFrame.vue";
import SideNav from "./SideNav.vue";
import SiteIcon from "./SiteIcon.vue";

// Reduced view of GET /api/cases. Clue and verdict labels are reduced to counts and are not rendered here.
// Tags, difficulty, duration, and solved history are not in the response, so they are not shown.
interface LibraryCase {
  id: string;
  mode: string;
  title: string;
  premise: string;
  clueCount: number;
  verdictCount: number;
}

type LoadState = "loading" | "ready" | "empty" | "error";

// Sample cards are shown only when the server lists no cases. They are labelled "SAMPLE · NOT LIVE" and cannot be started.
interface SampleCase {
  id: string;
  mode: string;
  title: string;
  premise: string;
}

const SAMPLE_CASES: readonly SampleCase[] = [
  {
    id: "sample-quick-gallery-shadow",
    mode: "quick",
    title: "The Gallery Shadow",
    premise: "One false alarm. Three clues. One decisive link.",
  },
  {
    id: "sample-mystery-festival-trophy",
    mode: "mystery",
    title: "The Missing Festival Trophy",
    premise: "A trophy disappears, but the blackout might be a distraction.",
  },
  {
    id: "sample-coop-invisible-ship",
    mode: "coop",
    title: "Signal of the Invisible Ship",
    premise: "Two investigation teams must combine separate facts.",
  },
];

const MODE_ORDER: readonly string[] = ["quick", "mystery", "coop"];
const MODE_LABELS: Record<string, string> = {
  quick: "Quick Case",
  mystery: "Mystery Live",
  coop: "Co-op",
};
// Decorative artwork only. Unknown modes fall back to the case board art.
const MODE_ART: Record<string, string> = {
  quick: "img-gallery",
  mystery: "img-trophy",
  coop: "img-harbor",
};

const cases = ref<LibraryCase[]>([]);
const state = ref<LoadState>("loading");
const errorMessage = ref("");
const activeFilter = ref("all");

const filterOptions = computed(() => [
  { id: "all", label: "All cases" },
  ...MODE_ORDER.map((mode) => ({ id: mode, label: MODE_LABELS[mode] ?? mode })),
]);

// Known modes follow a fixed order; a mode the server sends that is not listed above still appears under "All cases".
const visibleCases = computed(() =>
  activeFilter.value === "all" ? cases.value : cases.value.filter((item) => item.mode === activeFilter.value),
);

const isSampleView = computed(() => state.value === "empty");

const visibleSamples = computed(() =>
  activeFilter.value === "all" ? SAMPLE_CASES : SAMPLE_CASES.filter((item) => item.mode === activeFilter.value),
);

const shownCount = computed(() => (isSampleView.value ? visibleSamples.value.length : visibleCases.value.length));

// The subtitle keeps one line in both states, so the card grid keeps its position.
const subtitle = computed(() =>
  isSampleView.value
    ? "The server lists no cases yet. The cards below are samples and cannot be started."
    : "Every case the server lists. Start a case from the case menu.",
);

function artFor(mode: string): string {
  return MODE_ART[mode] ?? "img-board";
}

function modeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function toLibraryCase(value: unknown): LibraryCase | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string" || typeof record.mode !== "string" || typeof record.title !== "string") {
    return null;
  }
  return {
    id: record.id,
    mode: record.mode,
    title: record.title,
    premise: typeof record.premise === "string" ? record.premise : "",
    clueCount: Array.isArray(record.clues) ? record.clues.length : 0,
    verdictCount: Array.isArray(record.verdicts) ? record.verdicts.length : 0,
  };
}

async function loadCases(): Promise<void> {
  state.value = "loading";
  errorMessage.value = "";
  try {
    const response = await fetch("/api/cases", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      state.value = "error";
      errorMessage.value = `The case list did not load (server responded ${response.status}).`;
      return;
    }
    const body = asRecord(await response.json());
    const list: unknown[] = Array.isArray(body?.cases) ? (body?.cases as unknown[]) : [];
    cases.value = list
      .map(toLibraryCase)
      .filter((item): item is LibraryCase => item !== null);
    state.value = cases.value.length === 0 ? "empty" : "ready";
  } catch {
    state.value = "error";
    errorMessage.value = "The case list could not be reached from this browser.";
  }
}

onMounted(() => {
  void loadCases();
});
</script>

<template>
  <PlateFrame active="cases" :wrap="false">
    <div class="dashboard-grid">
      <SideNav current="Case Library" />

      <div class="dashboard-main">
        <header class="row between">
          <div>
            <div class="eyebrow">FILE CABINET</div>
            <h1 id="library-title" class="page-title mt8">Choose your next mystery.</h1>
            <p class="mt8">{{ subtitle }}</p>
          </div>
          <div class="row" role="group" aria-label="Filter cases by mode">
            <button
              v-for="option in filterOptions"
              :key="option.id"
              class="btn sm"
              :class="{ gold: activeFilter === option.id }"
              type="button"
              :aria-pressed="activeFilter === option.id"
              @click="activeFilter = option.id"
            >
              {{ option.label }}
            </button>
          </div>
        </header>

        <p v-if="state === 'loading'" class="small mt24" role="status">Loading the case list.</p>

        <section v-else-if="state === 'error'" class="panel mt24" aria-label="Case list error">
          <div class="panel-body">
            <p class="small" role="alert">{{ errorMessage }}</p>
            <button class="btn ghost sm mt12" type="button" @click="loadCases">Try again</button>
          </div>
        </section>

        <template v-else>
          <p v-if="shownCount === 0" class="small mt24" role="status">No case in this mode is listed.</p>

          <div v-else class="library-grid mt24">
            <template v-if="isSampleView">
              <article v-for="item in visibleSamples" :key="item.id" class="panel library-card">
                <div class="image library-art" :class="artFor(item.mode)" aria-hidden="true"></div>
                <div class="library-card-body">
                  <div class="eyebrow">{{ modeLabel(item.mode) }}</div>
                  <h2 class="library-title mt8">{{ item.title }}</h2>
                  <p class="mt12 library-premise">{{ item.premise }}</p>
                  <div class="library-card-foot row between">
                    <span class="tag subtle">SAMPLE · NOT LIVE</span>
                    <button class="btn gold sm" type="button" disabled>View case <SiteIcon name="arrow-right" /></button>
                  </div>
                </div>
              </article>
            </template>
            <template v-else>
              <article v-for="item in visibleCases" :key="item.id" class="panel library-card">
                <div class="image library-art" :class="artFor(item.mode)" aria-hidden="true"></div>
                <div class="library-card-body">
                  <div class="eyebrow">{{ modeLabel(item.mode) }}</div>
                  <h2 class="library-title mt8">{{ item.title }}</h2>
                  <p v-if="item.premise" class="mt12 library-premise">{{ item.premise }}</p>
                  <div class="library-card-foot row between">
                    <span class="tag subtle">{{ item.clueCount }} clues · {{ item.verdictCount }} verdicts</span>
                    <a class="btn gold sm" href="/play">Open in case menu <SiteIcon name="arrow-right" /></a>
                  </div>
                </div>
              </article>
            </template>
          </div>
        </template>

        <section class="panel mt18" aria-labelledby="library-profile-title">
          <div class="panel-head">
            <h2 id="library-profile-title" class="panel-title">Investigator profile · sample</h2>
            <span class="tag subtle">PROFILE PREVIEW</span>
          </div>
          <div class="panel-body row between">
            <div class="row library-who">
              <span class="step" aria-hidden="true">D</span>
              <div>
                <h4>Detective · Example Profile</h4>
                <p class="small mt8">Your completed cases and community contributions will appear here.</p>
              </div>
            </div>
            <div class="row library-stats">
              <div class="center">
                <strong class="serif">—</strong>
                <span class="small">Cases completed</span>
              </div>
              <div class="center">
                <strong class="serif">—</strong>
                <span class="small">Verified connections</span>
              </div>
              <div class="center">
                <strong class="serif">—</strong>
                <span class="small">Shared breakthroughs</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </PlateFrame>
</template>

<style scoped>
.library-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 17px;
}
/* Card height and footer offset follow the reference: a 465px card whose premise block reserves two lines. */
.library-card {
  display: flex;
  flex-direction: column;
  min-height: 465px;
  overflow: hidden;
}
.library-premise {
  min-height: 44px;
}
.library-art {
  height: 210px;
  flex: none;
}
.library-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 20px 20px 18px;
}
/* Card titles use the reference h3 size (29px, no letter-spacing). The plate h2 rule is wider, so this selector is more specific.
   text-wrap: wrap fills each line greedily, as the reference does; the site-wide balance rule would split the title differently. */
.plate .library-title {
  font-size: 29px;
  line-height: 1.1;
  letter-spacing: 0;
  text-wrap: wrap;
}
.library-card-foot {
  margin-top: 40px;
}
.library-stats {
  gap: 45px;
}
.library-who {
  flex: 1;
  min-width: 0;
}
.library-who > div {
  min-width: 0;
}
.library-stats {
  flex: none;
}
.library-stats > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
@media (max-width: 1100px) {
  .library-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .library-grid {
    grid-template-columns: 1fr;
  }
  .library-stats {
    gap: 24px;
    flex-wrap: wrap;
  }
}
</style>
