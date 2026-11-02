<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import SiteIcon from "./SiteIcon.vue";
import type { SiteIconName } from "./icons";

// Side rail for the dashboard-style plate screens. The footer reads the account from GET /api/me only.
// The icons are the same line set DashboardPage.vue draws, so both rails match.
defineProps<{ current: string }>();

const navItems: readonly { label: string; icon: SiteIconName; href: string }[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Case Library", icon: "library", href: "/library" },
  { label: "Live Session", icon: "live", href: "/play" },
  { label: "Co-op", icon: "people", href: "/coop" },
  { label: "OBS Setup", icon: "monitor", href: "/setup" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

type Identity =
  | { kind: "checking" }
  | { kind: "signed-out" }
  | { kind: "unknown" }
  | { kind: "signed-in"; displayName: string; login: string; connected: boolean };

const identity = ref<Identity>({ kind: "checking" });

onMounted(async () => {
  try {
    const response = await fetch("/api/me", { headers: { Accept: "application/json" } });
    if (response.status === 401) {
      identity.value = { kind: "signed-out" };
      return;
    }
    if (!response.ok) {
      identity.value = { kind: "unknown" };
      return;
    }
    const body = (await response.json()) as {
      profile?: { displayName?: string; login?: string };
      twitch?: { connected?: boolean };
    };
    identity.value = {
      kind: "signed-in",
      displayName: body.profile?.displayName ?? "Signed-in host",
      login: body.profile?.login ?? "",
      connected: body.twitch?.connected === true,
    };
  } catch {
    identity.value = { kind: "unknown" };
  }
});

const accountName = computed(() => {
  const state = identity.value;
  if (state.kind === "signed-in") return state.displayName;
  if (state.kind === "signed-out") return "Not signed in";
  if (state.kind === "unknown") return "Status unknown";
  return "Checking sign-in";
});

const accountNote = computed(() => {
  const state = identity.value;
  if (state.kind === "signed-in") {
    const handle = state.login ? `@${state.login} · ` : "";
    return `${handle}${state.connected ? "Twitch connected" : "Twitch not connected"}`;
  }
  if (state.kind === "signed-out") return "Twitch not connected";
  return "";
});

const accountInitial = computed(() => {
  const state = identity.value;
  if (state.kind !== "signed-in") return "?";
  return state.displayName.charAt(0).toUpperCase() || "?";
});
</script>

<template>
  <aside class="navside" aria-label="Dashboard">
    <div class="eyebrow" style="padding: 0 14px 15px">YOUR INVESTIGATION</div>
    <a
      v-for="item in navItems"
      :key="item.label"
      class="navitem"
      :class="{ sel: item.label === current }"
      :href="item.href"
      :aria-current="item.label === current ? 'page' : undefined"
    >
      <SiteIcon :name="item.icon" size="15px" :stroke="1.6" /> &nbsp; {{ item.label }}
    </a>
    <div style="margin-top: auto; padding: 20px 14px; border-top: 1px solid #5e3d22">
      <div class="small">STREAMER ACCOUNT</div>
      <div class="row mt12">
        <div class="profile-dot" aria-hidden="true">{{ accountInitial }}</div>
        <div>
          <strong>{{ accountName }}</strong>
          <div v-if="accountNote" class="small">{{ accountNote }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>
