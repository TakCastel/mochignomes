<template>
  <div class="world" :class="`phase-${shownPhase}`" :style="theme">
    <!-- fond de jeu derrière la console : dégradé vif à pois -->
    <div class="outside">
      <div class="wall" />
      <div class="dots" />
      <div class="night" />
    </div>

    <main class="console">
      <ConsoleShell />
      <ConsoleTop />
      <StatPanel />
      <div class="screen-slot">
        <ConsoleScreen :phase="shownPhase" :dead="dead" />
      </div>
      <ButtonDeck />
      <ConsoleTray />

      <GameToasts />
      <GameSheet />
      <WelcomeCard />
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { dayPhase, shellVars } from "~/lib/gameUi";

const store = useTamagotchiStore();
const dead = computed(() => store.health <= 0);
// couleur de coque choisie dans les réglages
const theme = computed(() => shellVars(store.shell));

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
  --btn: clamp(42px, min(14vw, 6.6vh), 62px);
  --big: clamp(48px, min(15vw, 7.6vh), 68px);
  --ring: clamp(40px, min(12.5vw, 6.2vh), 56px);
  --tile: clamp(32px, 4.8vh, 42px);
}
.outside {
  position: absolute;
  inset: 0;
}
.wall {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(90% 60% at 20% 10%, rgba(255, 255, 255, 0.35), transparent 60%),
    linear-gradient(150deg, var(--wall-1), var(--wall-2));
  transition: background 0.6s;
}
.dots {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image: radial-gradient(circle, #fff 2.5px, transparent 3px);
  background-size: 34px 34px;
  background-position: 0 0;
}
.night {
  position: absolute;
  inset: 0;
  background: rgba(15, 10, 50, 0.45);
  opacity: 0;
  transition: opacity 1.2s;
}
.phase-night .night { opacity: 1; }
/* la nuit, la coque s'assombrit aussi un peu */
.phase-night :deep(.shell) { filter: brightness(0.86) saturate(1.05); }
.phase-dusk .night { opacity: 0.35; }

/* la console : coque en plastique crème brillant */
.console {
  position: relative;
  z-index: 1;
  width: calc(100% - 6px);
  max-width: 470px;
  height: calc(100% - 10px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  max-height: 960px;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  gap: clamp(6px, 1.1vh, 12px);
  padding: clamp(16px, 2.2vh, 20px) 14px clamp(22px, 3.2vh, 30px);
  isolation: isolate;
}
.screen-slot {
  min-height: 0;
}
/* même marge pour toutes les rangées ; la barre du bas rentre dans l'arrondi */
.console > :deep(.tray) { margin: 0 18px; }
@media (min-width: 600px) and (min-height: 760px) {
  .console { height: min(940px, calc(100% - 48px)); }
}
</style>
