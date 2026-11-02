<script setup lang="ts">
import { defineAsyncComponent, type Component } from "vue";
import PageLoading from "./PageLoading.vue";

// Every page is its own chunk, so a visit downloads only the page it shows. A spinner appears only when a page
// takes longer than a moment to arrive.
function page(loader: () => Promise<Component | { default: Component }>): Component {
  return defineAsyncComponent({ loader, loadingComponent: PageLoading, delay: 160 });
}
const CasePreviewPage = page(() => import("./CasePreviewPage.vue"));
const BoardCasePage = page(() => import("./BoardCasePage.vue"));
const ConnectionStatusPage = page(() => import("./ConnectionStatusPage.vue"));
const CoopPage = page(() => import("./CoopPage.vue"));
const CoopInvitePage = page(() => import("./CoopInvitePage.vue"));
const CoopWorkstationPage = page(() => import("./CoopWorkstationPage.vue"));
const DashboardPage = page(() => import("./DashboardPage.vue"));
const GameplaySamplePage = page(() => import("./GameplaySamplePage.vue"));
const GuidePage = page(() => import("./GuidePage.vue"));
const LandingPage = page(() => import("./LandingPage.vue"));
const LibraryPage = page(() => import("./LibraryPage.vue"));
const MainMenu = page(() => import("./MainMenu.vue"));
const OfflinePage = page(() => import("./OfflinePage.vue"));
const SettingsPage = page(() => import("./SettingsPage.vue"));
const SetupPage = page(() => import("./SetupPage.vue"));

// URLs that carry a case-view parameter keep rendering the existing App, including OBS mode.
const params = new URLSearchParams(window.location.search);
// ?view=quick without a session or mode is the labeled sample page, not the live App.
const quickSample = params.get("view") === "quick" && !params.has("session") && !params.has("mode");
const usesCaseView = params.has("session") || params.has("mode") || (params.has("view") && !quickSample);
// Loaded only for case-view URLs, so the landing page does not download the game bundle.
const App = defineAsyncComponent(() => import("../App.vue"));
// The playable sample case (A Missing Manuscript). It replaces the earlier static Quick Case sample on ?view=quick;
// QuickSamplePage.vue is kept on disk, unrouted, for the owner to retire.
const SampleCasePage = page(() => import("./SampleCasePage.vue"));

type PageId =
  | "preview-gallery"
  | "preview-festival"
  | "preview-signal"
  | "landing"
  | "play"
  | "guide"
  | "settings"
  | "dashboard"
  | "setup"
  | "coop"
  | "coop-invite"
  | "connect"
  | "coop-field"
  | "coop-records"
  | "coop-shared"
  | "offline"
  | "library"
  | "practice-express"
  | "practice-lighthouse"
  | "sample-reveal"
  | "sample-stage"
  | "sample-evidence"
  | "sample-timeline"
  | "sample-theory"
  | "sample-verdict"
  | "missing";

const pagesByPath = new Map<string, PageId>([
  ["/", "landing"],
  ["/preview/gallery", "preview-gallery"],
  ["/preview/festival", "preview-festival"],
  ["/preview/signal", "preview-signal"],
  ["/play", "play"],
  ["/guide", "guide"],
  ["/settings", "settings"],
  ["/dashboard", "dashboard"],
  ["/menu", "dashboard"],
  ["/setup", "setup"],
  ["/coop", "coop"],
  ["/coop/invite", "coop-invite"],
  ["/connect", "connect"],
  ["/coop/field", "coop-field"],
  ["/coop/records", "coop-records"],
  ["/coop/shared", "coop-shared"],
  ["/offline", "offline"],
  ["/library", "library"],
  ["/practice/express", "practice-express"],
  ["/practice/lighthouse", "practice-lighthouse"],
  ["/sample/reveal", "sample-reveal"],
  ["/sample/stage", "sample-stage"],
  ["/sample/evidence", "sample-evidence"],
  ["/sample/timeline", "sample-timeline"],
  ["/sample/theory", "sample-theory"],
  ["/sample/verdict", "sample-verdict"],
]);
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const pageId: PageId = pagesByPath.get(path) ?? "missing";

const titles: Record<PageId, string> = {
  "preview-gallery": "The Gallery Shadow (preview) ? Cluenite",
  "preview-festival": "The Missing Festival Trophy (preview) ? Cluenite",
  "preview-signal": "Signal of the Invisible Ship (preview) ? Cluenite",
  landing: "Cluenite",
  play: "Choose a case · Cluenite",
  guide: "How to play · Cluenite",
  settings: "Settings · Cluenite",
  dashboard: "Main menu · Cluenite",
  setup: "Stream setup · Cluenite",
  coop: "Co-op · Cluenite",
  "coop-invite": "Co-op invitation · Cluenite",
  connect: "Twitch connection · Cluenite",
  "coop-field": "Field workstation (sample) · Cluenite",
  "coop-records": "Records workstation (sample) · Cluenite",
  "coop-shared": "Shared board (sample) · Cluenite",
  offline: "Round not responding · Cluenite",
  library: "Case library · Cluenite",
  "practice-express": "Pearls on the Night Express (practice case) · Cluenite",
  "practice-lighthouse": "The Lighthouse Went Dark (co-op practice case) · Cluenite",
  "sample-reveal": "Reveal (sample) · Cluenite",
  "sample-stage": "Mystery stage (sample) · Cluenite",
  "sample-evidence": "Evidence board (sample) · Cluenite",
  "sample-timeline": "Timeline challenge (sample) · Cluenite",
  "sample-theory": "Theory challenge (sample) · Cluenite",
  "sample-verdict": "Verdict and result (sample) · Cluenite",
  missing: "Page not found · Cluenite",
};
if (!usesCaseView) document.title = quickSample ? "A Missing Manuscript (sample case) · Cluenite" : titles[pageId];

// Screens that draw their own navigation and footer skip the shared chrome: the landing, the game-shell pages
// (menu, play, guide, settings, setup, connect), and the plate screens.
const platePages = new Set<PageId>([
  "play",
  "preview-gallery",
  "preview-festival",
  "preview-signal",
  "guide",
  "connect",
  "coop",
  "coop-invite",
  "coop-field",
  "coop-records",
  "coop-shared",
  "library",
  "practice-express",
  "practice-lighthouse",
  "setup",
  "dashboard",
  "settings",
  "offline",
  "sample-reveal",
  "sample-stage",
  "sample-evidence",
  "sample-timeline",
  "sample-theory",
  "sample-verdict",
]);
// The sample case draws the plate frame itself, so it owns its chrome too.
const ownsChrome = quickSample || pageId === "landing" || platePages.has(pageId);

const navItems = [
  { id: "play", href: "/play", label: "Case Menu" },
  { id: "guide", href: "/guide", label: "Guide" },
  { id: "settings", href: "/settings", label: "Settings" },
] as const;
</script>

<template>
  <App v-if="usesCaseView" />

  <div v-else class="site">
    <a class="skip-link" href="#main">Skip to content</a>

    <header v-if="!ownsChrome" class="site-header">
      <div class="site-header-inner">
        <a class="site-wordmark" href="/">
          <img src="./landing/icon-search.png" alt="" width="30" height="28" />
          Cluenite
        </a>
        <span class="site-header-diamond" aria-hidden="true"></span>
        <nav class="site-nav" aria-label="Site">
          <a
            v-for="item in navItems"
            :key="item.id"
            :href="item.href"
            :aria-current="item.id === pageId ? 'page' : undefined"
            >{{ item.label }}</a
          >
        </nav>
      </div>
    </header>

    <main id="main" class="site-main" tabindex="-1">
      <div class="site-page">
        <SampleCasePage v-if="quickSample" />
        <LandingPage v-else-if="pageId === 'landing'" />
        <MainMenu v-else-if="pageId === 'play'" />
        <GuidePage v-else-if="pageId === 'guide'" />
        <SettingsPage v-else-if="pageId === 'settings'" />
        <DashboardPage v-else-if="pageId === 'dashboard'" />
        <SetupPage v-else-if="pageId === 'setup'" />
        <CoopPage v-else-if="pageId === 'coop'" />
        <CoopInvitePage v-else-if="pageId === 'coop-invite'" />
        <ConnectionStatusPage v-else-if="pageId === 'connect'" />
        <CoopWorkstationPage v-else-if="pageId === 'coop-field'" station="field" />
        <CoopWorkstationPage v-else-if="pageId === 'coop-records'" station="records" />
        <CoopWorkstationPage v-else-if="pageId === 'coop-shared'" station="shared" />
        <OfflinePage v-else-if="pageId === 'offline'" />
        <LibraryPage v-else-if="pageId === 'library'" />
        <CasePreviewPage v-else-if="pageId === 'preview-gallery'" case-id="Q01_GALLERY_SHADOW" />
        <CasePreviewPage v-else-if="pageId === 'preview-festival'" case-id="M01_MISSING_TROPHY" />
        <CasePreviewPage v-else-if="pageId === 'preview-signal'" case-id="C01_HARBOR_SIGNAL" />
        <BoardCasePage v-else-if="pageId === 'practice-express'" case-id="express" />
        <BoardCasePage v-else-if="pageId === 'practice-lighthouse'" case-id="lighthouse" />
        <GameplaySamplePage v-else-if="pageId === 'sample-reveal'" screen="reveal" />
        <GameplaySamplePage v-else-if="pageId === 'sample-stage'" screen="stage" />
        <GameplaySamplePage v-else-if="pageId === 'sample-evidence'" screen="evidence" />
        <GameplaySamplePage v-else-if="pageId === 'sample-timeline'" screen="timeline" />
        <GameplaySamplePage v-else-if="pageId === 'sample-theory'" screen="theory" />
        <GameplaySamplePage v-else-if="pageId === 'sample-verdict'" screen="verdict" />
        <section v-else class="site-section" aria-labelledby="missing-title">
          <div class="site-section-head">
            <h1 id="missing-title">Page not found</h1>
            <p class="site-prose">
              This address is not part of Cluenite. Go to the start page or open the case menu.
            </p>
          </div>
          <div class="site-actions">
            <a class="site-button" href="/">Go to the start page</a>
            <a class="site-button site-button--quiet" href="/play">Open the case menu</a>
          </div>
        </section>
      </div>
    </main>

    <footer v-if="!ownsChrome" class="site-footer">
      <div class="site-footer-inner">
        <p>Cluenite is a prototype. Sample rounds are labeled sample data and are not connected to Twitch.</p>
        <p>Settings are saved in this browser only.</p>
      </div>
    </footer>
  </div>
</template>
