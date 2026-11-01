import { computed, reactive, ref, watch } from "vue";

export type TextSize = "standard" | "large";

export interface SiteSettings {
  /** Shared with the case view. When false, room tone and case sounds stay silent. */
  soundOn: boolean;
  /** null follows the operating system's reduced-motion preference. */
  reduceMotion: boolean | null;
  textSize: TextSize;
}

export const SETTINGS_STORAGE_KEY = "cluenite.settings.v1";

export const DEFAULT_SETTINGS: SiteSettings = {
  soundOn: true,
  reduceMotion: null,
  textSize: "standard",
};

// The OBS overlay is a transparent browser source. It keeps its own look and never applies these settings.
const isObsRoute = new URLSearchParams(window.location.search).get("mode") === "obs";

const systemQuery =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
const systemPrefersReducedMotion = ref(systemQuery?.matches ?? false);
systemQuery?.addEventListener("change", (event) => {
  systemPrefersReducedMotion.value = event.matches;
});

function readStored(): SiteSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return { ...DEFAULT_SETTINGS };
    const stored = value as Record<string, unknown>;
    return {
      soundOn: typeof stored.soundOn === "boolean" ? stored.soundOn : DEFAULT_SETTINGS.soundOn,
      reduceMotion: typeof stored.reduceMotion === "boolean" ? stored.reduceMotion : null,
      textSize: stored.textSize === "large" ? "large" : "standard",
    };
  } catch {
    // Unreadable or blocked storage falls back to the defaults for this visit.
    return { ...DEFAULT_SETTINGS };
  }
}

export const siteSettings = reactive<SiteSettings>(readStored());

/** The effective reduced-motion value: the explicit choice, or the system preference when unset. */
export const reduceMotion = computed(
  () => siteSettings.reduceMotion ?? systemPrefersReducedMotion.value,
);

function persist(): void {
  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        soundOn: siteSettings.soundOn,
        reduceMotion: siteSettings.reduceMotion,
        textSize: siteSettings.textSize,
      }),
    );
  } catch {
    // Storage can be full or blocked. The settings still apply until the page closes.
  }
}

function applyToDocument(): void {
  if (isObsRoute) return;
  const root = document.documentElement;
  root.dataset.motion = reduceMotion.value ? "reduced" : "full";
  root.dataset.textSize = siteSettings.textSize;
}

let started = false;

/** Call once at startup. Applies the saved settings to the page and keeps storage in sync. */
export function startSiteSettings(): void {
  if (started) return;
  started = true;
  watch([reduceMotion, () => siteSettings.textSize], applyToDocument, { immediate: true });
  watch(siteSettings, persist, { deep: true });
}

export function resetSiteSettings(): void {
  Object.assign(siteSettings, { ...DEFAULT_SETTINGS });
}
