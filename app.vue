<template>
  <div class="world" :class="`phase-${shownPhase}`">
    <!-- décor derrière la console -->
    <div class="outside">
      <SceneBackdrop :phase="shownPhase" :dead="dead" />
      <div class="tree left" />
      <div class="tree right" />
      <div class="meadow" />
    </div>

    <main class="console">
      <ConsoleTop />
      <StatPanel />
      <div class="screen-slot">
        <ConsoleScreen :phase="shownPhase" :dead="dead" />
      </div>
      <ButtonDeck />
      <ConsoleTray />

      <GameToasts />
      <CreatureSheet />
      <GallerySheet />
      <AchievementsSheet />
      <JournalSheet />
      <SettingsSheet />
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { dayPhase } from "~/lib/gameUi";

const store = useTamagotchiStore();
const dead = computed(() => store.health <= 0);

// moment de la journée réel, mis à jour chaque minute
const phase = ref("day");
let phaseTimer = null;
// quand elle dort, la nuit tombe sur la scène
const shownPhase = computed(() => (store.isSleeping ? "night" : phase.value));

onMounted(() => {
  store.startDecay();
  // ?heure=22 force l'heure affichée (pratique pour voir le décor de nuit)
  const params = new URLSearchParams(window.location.search);
  const forced = Number(params.get("heure"));
  const now = () => {
    const d = new Date();
    if (params.has("heure") && forced >= 0 && forced < 24) d.setHours(forced, 0);
    return d;
  };
  phase.value = dayPhase(now());
  phaseTimer = setInterval(() => (phase.value = dayPhase(now())), 60000);
});
onBeforeUnmount(() => clearInterval(phaseTimer));
</script>

<style>
html,
body {
  margin: 0;
  height: 100%;
  background: #2b1d14;
  overscroll-behavior: none;
}
body {
  font-family: "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}
#__nuxt {
  height: 100%;
}
</style>

<style scoped>
.world {
  position: relative;
  height: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
  /* tailles qui s'adaptent à la hauteur de l'écran */
  --btn: clamp(48px, min(15vw, 8.2vh), 70px);
  --big: clamp(54px, min(17vw, 9vh), 76px);
  --ring: clamp(44px, min(14vw, 7.4vh), 60px);
  --tile: clamp(38px, 6vh, 50px);
}
.outside {
  position: absolute;
  inset: 0;
}
.tree {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #7fdc5a, #2f9e3a 70%);
  box-shadow: inset -20px -20px 0 rgba(0, 60, 20, 0.15);
}
.tree.left { width: 260px; height: 220px; left: -120px; top: -40px; }
.tree.right { width: 200px; height: 170px; right: -110px; top: 30%; }
.meadow {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: 0;
  height: 22%;
  border-radius: 50% 50% 0 0 / 40px 40px 0 0;
  background: linear-gradient(180deg, #ffd27a, #ffb347);
}
.phase-night .tree { filter: brightness(0.45) saturate(0.8); }
.phase-night .meadow { filter: brightness(0.5); }
.phase-dusk .tree, .phase-dusk .meadow { filter: brightness(0.8); }

/* la console : coque en plastique crème brillant */
.console {
  position: relative;
  z-index: 1;
  width: calc(100% - 16px);
  max-width: 470px;
  height: calc(100% - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  max-height: 960px;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  gap: clamp(8px, 1.4vh, 14px);
  padding: clamp(10px, 1.6vh, 16px) 12px;
  border-radius: 44px;
  background: linear-gradient(180deg, #fffaf3 0%, #f4ebdf 45%, #ece0cf 100%);
  box-shadow:
    inset 0 3px 0 #fff,
    inset 0 -8px 14px rgba(170, 135, 100, 0.25),
    inset 0 0 0 2px rgba(255, 255, 255, 0.6),
    0 0 0 3px #e3d5c2,
    0 18px 40px rgba(40, 20, 60, 0.45);
  overflow: hidden;
  isolation: isolate;
}
/* grain mat du plastique + reflet sur l'arête du haut */
.console::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
  opacity: 0.35;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0 0.35 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.console::after {
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  top: 4px;
  height: 18px;
  border-radius: 999px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0));
}
.screen-slot {
  min-height: 0;
  padding: 2px 6px;
}
@media (min-width: 600px) and (min-height: 760px) {
  .console { height: min(940px, calc(100% - 48px)); }
}
</style>
