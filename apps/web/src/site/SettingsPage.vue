<script setup lang="ts">
import { computed, ref } from "vue";
import { reduceMotion, resetSiteSettings, siteSettings } from "./settings";

type MotionChoice = "system" | "reduced" | "full";

// One radio group instead of a switch: "follow the system" is a third state, not an on/off value.
const motionChoice = computed<MotionChoice>({
  get() {
    if (siteSettings.reduceMotion === null) return "system";
    return siteSettings.reduceMotion ? "reduced" : "full";
  },
  set(value) {
    siteSettings.reduceMotion = value === "system" ? null : value === "reduced";
  },
});

const restoreNote = ref("");

function toggleSound(): void {
  siteSettings.soundOn = !siteSettings.soundOn;
}

function restoreDefaults(): void {
  resetSiteSettings();
  restoreNote.value = "Defaults restored: sound on, motion follows your system, standard text.";
}
</script>

<template>
  <div class="settings">
    <header class="site-section-head">
      <h1 id="settings-title">Settings</h1>
      <p class="site-prose">
        Settings are saved in this browser only. Changes apply to the site pages right away.
      </p>
    </header>

    <section class="site-section settings-block" aria-labelledby="sound-title">
      <div class="settings-row">
        <div class="settings-copy">
          <h2 id="sound-title">Sound</h2>
          <p>
            Room tone and case sounds. The case view reads this setting when it opens, so reopen it
            after you change the switch.
          </p>
        </div>
        <button
          type="button"
          class="switch"
          role="switch"
          aria-labelledby="sound-title"
          :aria-checked="siteSettings.soundOn ? 'true' : 'false'"
          @click="toggleSound"
        >
          <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
          <span class="switch-label">{{ siteSettings.soundOn ? "On" : "Off" }}</span>
        </button>
      </div>
    </section>

    <section class="site-section settings-block" aria-labelledby="motion-title">
      <h2 id="motion-title">Motion</h2>
      <p class="site-prose settings-note">
        Controls transitions on the site pages. The case view is not changed by this setting yet.
      </p>
      <p class="settings-current" role="status">
        Right now: {{ reduceMotion ? "reduced" : "full" }} motion.
      </p>
      <div class="settings-options" role="radiogroup" aria-labelledby="motion-title">
        <label class="settings-option">
          <input v-model="motionChoice" type="radio" name="motion" value="system" />
          <span class="settings-option-text">
            <span class="settings-option-title">Follow my system</span>
            <span class="settings-option-note">Uses the reduced-motion setting from the operating system.</span>
          </span>
        </label>
        <label class="settings-option">
          <input v-model="motionChoice" type="radio" name="motion" value="reduced" />
          <span class="settings-option-text">
            <span class="settings-option-title">Reduce motion</span>
            <span class="settings-option-note">Turns off transitions on the site pages.</span>
          </span>
        </label>
        <label class="settings-option">
          <input v-model="motionChoice" type="radio" name="motion" value="full" />
          <span class="settings-option-text">
            <span class="settings-option-title">Full motion</span>
            <span class="settings-option-note">Keeps transitions on the site pages, even when the system asks for less.</span>
          </span>
        </label>
      </div>
    </section>

    <section class="site-section settings-block" aria-labelledby="text-title">
      <h2 id="text-title">Text size</h2>
      <p class="site-prose settings-note">Sets the base text size on the site pages.</p>
      <div class="settings-options" role="radiogroup" aria-labelledby="text-title">
        <label class="settings-option">
          <input v-model="siteSettings.textSize" type="radio" name="text-size" value="standard" />
          <span class="settings-option-text">
            <span class="settings-option-title">Standard</span>
            <span class="settings-option-note">The default size used across the site.</span>
          </span>
        </label>
        <label class="settings-option">
          <input v-model="siteSettings.textSize" type="radio" name="text-size" value="large" />
          <span class="settings-option-text">
            <span class="settings-option-title">Large</span>
            <span class="settings-option-note">Makes text on the site pages 12.5% bigger.</span>
          </span>
        </label>
      </div>
    </section>

    <section class="site-section settings-block" aria-labelledby="defaults-title">
      <h2 id="defaults-title">Defaults</h2>
      <p class="site-prose settings-note">Sound on, motion follows your system, standard text.</p>
      <div class="settings-actions">
        <button type="button" class="site-button site-button--quiet" @click="restoreDefaults">
          Restore defaults
        </button>
        <p v-if="restoreNote" class="settings-current" role="status">{{ restoreNote }}</p>
      </div>
    </section>
  </div>
</template>
