<template>
  <div class="world" :class="[`phase-${shownPhase}`, { dead }]" :style="paletteStyle">
    <!-- la scène 3D occupe tout l'écran, derrière l'interface -->
    <div class="scene">
      <Tamagotchi :phase="shownPhase" :dead="dead" :frame="frame" :sky="pal.sky" />
    </div>

    <!-- interface posée sur la scène ; les zones vides laissent passer les gestes vers la créature -->
    <main class="ui">
      <TopBar class="hit" />
      <StatPanel class="hit" />
      <div ref="middle" class="middle">
        <button class="arrow prev hit" :class="{ hint: arrowHint }" aria-label="Tourner vers la gauche" @click="gameCommand('rotate', -1)">
          <Icon name="ph:caret-left-bold" class="chevron" />
        </button>
        <button class="arrow next hit" :class="{ hint: arrowHint }" aria-label="Tourner vers la droite" @click="gameCommand('rotate', 1)">
          <Icon name="ph:caret-right-bold" class="chevron" />
        </button>
      </div>
      <JellyPad class="hit" />
      <BottomTiles class="hit" />
    </main>

    <GameToasts />
    <GameSheet />
    <WelcomeCard />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { dayPhase } from "~/lib/gameUi";
import { PALETTES, DEFAULT_PALETTE, paletteVars } from "~/lib/palettes";

const store = useTamagotchiStore();
const dead = computed(() => store.health <= 0);
const pal = computed(() => PALETTES[store.palette] || PALETTES[DEFAULT_PALETTE]);
const paletteStyle = computed(() => paletteVars(store.palette));
const arrowHint = computed(() => !(store.counters.tourner > 0));

// moment de la journée réel, mis à jour chaque minute
const phase = ref("day");
let phaseTimer = null;
// quand elle dort, la nuit tombe sur la scène
const shownPhase = computed(() => (store.isSleeping ? "night" : phase.value));

// Cadrage : la créature se pose en bas de la zone libre entre les jauges et les boutons
const middle = ref(null);
const frame = ref(null);
let ro = null;
function measure() {
  const el = middle.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  frame.value = {
    ground: Math.round(r.bottom - Math.min(30, r.height * 0.12)),
    size: Math.round(Math.min(r.height * 0.66, window.innerWidth * 0.5)),
    // haut de la zone libre + hauteur d'une bulle : la bulle reste visible
    minTop: Math.round(r.top + 52),
  };
}

onMounted(() => {
  store.startDecay();
  // ?palette=lagon : essayer une palette
  const wanted = new URLSearchParams(window.location.search).get("palette");
  if (wanted && PALETTES[wanted]) store.palette = wanted;
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
  ro = new ResizeObserver(measure);
  ro.observe(middle.value);
  window.addEventListener("resize", measure);
  measure();
});
onBeforeUnmount(() => {
  clearInterval(phaseTimer);
  ro?.disconnect();
  window.removeEventListener("resize", measure);
});
</script>

<style>
html,
body {
  margin: 0;
  height: 100%;
  background: #7cc8ff;
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
  overflow: hidden;
  /* couleurs partagées par les panneaux */
  --accent: #ff8a3d;
  --accent-hi: #ffb070;
  --accent-lo: #c25a12;
  --plate-shade: rgba(140, 100, 60, 0.35);
  --shell-edge: #c9a77f;
  /* tailles qui suivent la hauteur de l'écran */
  --top: clamp(50px, 7.4vh, 62px);
  --ring: clamp(44px, min(14vw, 7vh), 62px);
  --jelly: clamp(64px, 10.6vh, 96px);
  --tile: clamp(52px, 7.6vh, 70px);
  --gap: clamp(10px, 1.6vh, 16px);
}
.scene {
  position: absolute;
  inset: 0;
}
/* lumière chaude fixe par-dessus la scène : halo doré en haut, bords plus profonds */
.scene::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(70% 40% at 75% 28%, var(--glow), transparent 70%),
    radial-gradient(130% 90% at 50% 45%, transparent 55%, var(--edge) 100%);
}

.ui {
  position: relative;
  z-index: 2;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.4vh, 14px);
  padding: calc(env(safe-area-inset-top, 0px) + clamp(10px, 1.8vh, 18px)) 14px calc(env(safe-area-inset-bottom, 0px) + clamp(10px, 1.8vh, 18px));
  pointer-events: none;
}
/* seuls les éléments d'interface captent le toucher, le reste va à la créature */
.hit { pointer-events: auto; }
.middle {
  position: relative;
  flex: 1;
  min-height: 0;
}
.arrow {
  position: absolute;
  top: 56%;
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  margin-top: -25px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--knob-hi), var(--knob-lo));
  box-shadow: 0 4px 0 var(--knob-side), 0 8px 14px rgba(40, 20, 50, 0.28), inset 0 2px 0 #fff;
  cursor: pointer;
}
.arrow:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--knob-side), inset 0 2px 0 #fff; }
.prev { left: 0; }
.next { right: 0; }
.chevron { width: 24px; height: 24px; color: var(--ink); }
/* pulsation en transform : animée par le navigateur sans redessiner la page */
.arrow.hint { animation: nudge 1.6s ease-in-out infinite; }
@keyframes nudge { 50% { transform: scale(1.12); } }
@media (prefers-reduced-motion: reduce) {
  .arrow.hint { animation: none; }
}
</style>
