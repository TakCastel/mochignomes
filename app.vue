<template>
  <div class="world">
    <main class="phone">
      <SceneBackdrop :phase="shownPhase" :dead="store.health <= 0" />
      <GameHud />
      <div class="play">
        <Tamagotchi :phase="shownPhase" :dead="store.health <= 0" />
      </div>
      <ActionDock />
      <CreatureSheet />
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { dayPhase } from "~/lib/gameUi";

const store = useTamagotchiStore();

// moment de la journée réel, mis à jour chaque minute
const phase = ref("day");
let phaseTimer = null;

// quand elle dort, la nuit tombe sur la scène
const shownPhase = computed(() => (store.isSleeping ? "night" : phase.value));

onMounted(() => {
  store.startDecay();
  // ?heure=22 force l'heure affichée (pratique pour voir le décor de nuit)
  const forced = Number(new URLSearchParams(window.location.search).get("heure"));
  const now = () => {
    const d = new Date();
    if (forced >= 0 && forced < 24 && new URLSearchParams(window.location.search).has("heure")) d.setHours(forced, 0);
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
  height: 100%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 176, 46, 0.25), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(167, 125, 255, 0.22), transparent 45%),
    #2b1d14;
}
.phone {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  isolation: isolate;
}
/* sur grand écran, le jeu s'affiche dans un cadre de téléphone */
@media (min-width: 600px) and (min-height: 700px) {
  .phone {
    height: min(920px, calc(100% - 48px));
    border-radius: 40px;
    box-shadow: 0 0 0 10px #1a110b, 0 30px 80px rgba(0, 0, 0, 0.55);
  }
}
.play {
  position: relative;
  flex: 1;
  min-height: 0;
  z-index: 2;
}
</style>
