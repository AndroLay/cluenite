<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import CoopPage from "./CoopPage.vue";
import DashboardPage from "./DashboardPage.vue";
import GuidePage from "./GuidePage.vue";
import LandingPage from "./LandingPage.vue";
import MainMenu from "./MainMenu.vue";
import QuickSamplePage from "./QuickSamplePage.vue";
import SettingsPage from "./SettingsPage.vue";
import SetupPage from "./SetupPage.vue";

// URLs that carry a case-view parameter keep rendering the existing App, including OBS mode.
const params = new URLSearchParams(window.location.search);
// ?view=quick without a session or mode is the labeled sample page, not the live App.
const quickSample = params.get("view") === "quick" && !params.has("session") && !params.has("mode");
const usesCaseView = params.has("session") || params.has("mode") || (params.has("view") && !quickSample);
// Loaded only for case-view URLs, so the landing page does not download the game bundle.
const App = defineAsyncComponent(() => import("../App.vue"));

type PageId =
  | "landing"
  | "play"
  | "guide"
  | "settings"
  | "dashboard"
  | "setup"
  | "coop"
  | "missing";

const pagesByPath = new Map<string, PageId>([
  ["/", "landing"],
  ["/play", "play"],
  ["/guide", "guide"],
  ["/settings", "settings"],
  ["/dashboard", "dashboard"],
  ["/setup", "setup"],
  ["/coop", "coop"],
]);
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const pageId: PageId = pagesByPath.get(path) ?? "missing";

const titles: Record<PageId, string> = {
  landing: "Cluenite",
  play: "Case menu · Cluenite",
  guide: "Guide · Cluenite",
  settings: "Settings · Cluenite",
  dashboard: "Host dashboard · Cluenite",
  setup: "OBS setup · Cluenite",
  coop: "Co-op · Cluenite",
  missing: "Page not found · Cluenite",
};
if (!usesCaseView) document.title = quickSample ? "Quick Case sample · Cluenite" : titles[pageId];

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

    <header class="site-header">
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
        <QuickSamplePage v-if="quickSample" />
        <LandingPage v-else-if="pageId === 'landing'" />
        <MainMenu v-else-if="pageId === 'play'" />
        <GuidePage v-else-if="pageId === 'guide'" />
        <SettingsPage v-else-if="pageId === 'settings'" />
        <DashboardPage v-else-if="pageId === 'dashboard'" />
        <SetupPage v-else-if="pageId === 'setup'" />
        <CoopPage v-else-if="pageId === 'coop'" />
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

    <footer class="site-footer">
      <div class="site-footer-inner">
        <p>Cluenite is a prototype. Sample rounds are labeled sample data and are not connected to Twitch.</p>
        <p>Settings are saved in this browser only.</p>
      </div>
    </footer>
  </div>
</template>
