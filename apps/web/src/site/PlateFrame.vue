<script setup lang="ts">
import "./plates.css";
import SiteIcon from "./SiteIcon.vue";

// Shared frame for screens drawn as plates. The plate draws its own navigation and footer,
// so SiteRoot skips the shared header and footer on these routes. In game mode (the sample case) the bar is
// slim, links back to the main menu, and the footer is left out so the game keeps the screen.
withDefaults(
  defineProps<{
    active?: "cases" | "guide" | "settings" | "";
    // Plates that lay out their own columns (for example the dashboard grid) set wrap to false.
    wrap?: boolean;
    game?: boolean;
    immersive?: boolean;
  }>(),
  { active: "", wrap: true, game: false, immersive: false },
);
</script>

<template>
  <div class="plate" :class="{ 'is-game': game, 'is-immersive': immersive }">
    <nav v-if="!immersive" class="plate-nav" aria-label="Site">
      <a class="brand" href="/dashboard" aria-label="Cluenite main menu"
        ><span class="glyph"><SiteIcon name="search" size="22px" :stroke="2" /></span> Cluenite</a
      >
      <span class="nav-jewel" aria-hidden="true"></span>
      <div class="navlinks">
        <a href="/dashboard">Main menu</a>
        <a
          href="/play"
          :class="{ light: active === 'cases' }"
          :aria-current="active === 'cases' && !game ? 'page' : undefined"
          >Play</a
        >
        <a
          href="/guide"
          :class="{ light: active === 'guide' }"
          :aria-current="active === 'guide' ? 'page' : undefined"
          >How to play</a
        >
        <a
          href="/settings"
          :class="{ light: active === 'settings' }"
          :aria-current="active === 'settings' ? 'page' : undefined"
          >Settings</a
        >
      </div>
    </nav>

    <div v-if="wrap" class="inner">
      <slot />
    </div>
    <template v-else>
      <slot />
    </template>

    <footer v-if="!game" class="plate-foot">
      <p>Cluenite is a prototype. Sample rounds are labeled sample data and are not connected to Twitch.</p>
      <p>Settings are saved in this browser only.</p>
    </footer>
  </div>
</template>

<style scoped>
.plate.is-immersive { height: 100dvh; min-height: 0; overflow: hidden; }
.plate.is-game.is-immersive > .inner { height: 100%; width: 100%; max-width: none; margin: 0; padding: 0; }
:global(body:has(.plate.is-immersive)) { overflow: hidden; }
/* Game mode: a slimmer bar and tighter margins, so the case gets the height. */
.plate.is-game .plate-nav {
  height: 52px;
  padding: 0 clamp(16px, 3vw, 40px);
}
.plate.is-game .inner {
  min-height: 0;
  padding: 16px clamp(14px, 2.4vw, 32px) 24px;
}
</style>
