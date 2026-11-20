<template>
  <div class="world" :class="[`phase-${shownPhase}`, { dead }]" :style="paletteStyle">
    <!-- la scène 3D occupe tout l'écran, derrière l'interface -->
    <div class="scene">
      <Tamagotchi :phase="shownPhase" :dead="dead" :frame="frame" :sky="pal.sky" :theme="pal.world" @tap="openWheel" />
    </div>

    <!-- interface posée sur la scène ; les zones vides laissent passer les gestes vers la créature -->
    <main class="ui">
      <HudTop class="hit" />
      <div ref="middle" class="middle">
        <button class="arrow prev hit" :class="{ hint: arrowHint }" aria-label="Tourner vers la gauche" @click="gameCommand('rotate', -1)">
          <Icon name="ph:caret-left-bold" class="chevron" />
        </button>
        <button class="arrow next hit" :class="{ hint: arrowHint }" aria-label="Tourner vers la droite" @click="gameCommand('rotate', 1)">
          <Icon name="ph:caret-right-bold" class="chevron" />
        </button>
      </div>
      <NeedsCard class="hit" />
      <NavBar class="hit" @actions="openWheel" />
    </main>

    <!-- menu d'actions en cercle autour de la créature -->
    <ActionWheel :open="wheelOpen" :center="wheelCenter" :radius="wheelRadius" @close="wheelOpen = false" />

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
// interface claire : panneaux blancs, un seul accent turquoise
const paletteStyle = computed(() => ({
  ...paletteVars(store.palette),
  "--ink": "#23324a",
  "--accent": "#13b0ac",
  "--accent-hi": "#4fd8cf",
  "--accent-lo": "#0b8481",
  "--panel-top": "#ffffff",
  "--panel-bottom": "#f4f7fb",
  "--plate-hi": "#ffffff",
  "--plate-lo": "#eef3f8",
  "--plate-shade": "rgba(30, 50, 80, 0.18)",
  "--knob-hi": "#ffffff",
  "--knob-lo": "#eef3f8",
  "--knob-side": "#cfd9e4",
}));

// Menu d'actions : s'ouvre au centre de la zone de la créature
const wheelOpen = ref(false);
const wheelCenter = ref({ x: 200, y: 400 });
const wheelRadius = ref(118);
function openWheel() {
  const r = middle.value?.getBoundingClientRect();
  if (r) {
    wheelCenter.value = { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
    wheelRadius.value = Math.min(124, r.width * 0.36, r.height * 0.42);
  }
  wheelOpen.value = true;
  store.countGesture("menu");
}
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
    size: Math.round(Math.min(r.height * 0.62, window.innerWidth * 0.48)),
    // haut de la zone libre + hauteur d'une bulle : la bulle reste visible
    minTop: Math.round(r.top + 52),
  };
}

onMounted(() => {
  store.startDecay();
  // ?palette=lagon : essayer une palette
  const wanted = new URLSearchParams(window.location.search).get("palette");
  if (wanted && PALETTES[wanted]) store.palette = wanted;
  // ?theme=verre : essayer un thème d'interface
  const theme = new URLSearchParams(window.location.search).get("theme");
  if (theme && UI_THEMES[theme]) store.ui = theme;
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
  width: 44px;
  height: 44px;
  margin-top: -22px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 6px 16px rgba(25, 45, 80, 0.22);
  cursor: pointer;
}
.arrow:active { transform: scale(0.94); }
.prev { left: 0; }
.next { right: 0; }
.chevron { width: 22px; height: 22px; color: var(--accent); }
/* pulsation en transform : animée par le navigateur sans redessiner la page */
.arrow.hint { animation: nudge 1.6s ease-in-out infinite; }
@keyframes nudge { 50% { transform: scale(1.12); } }
@media (prefers-reduced-motion: reduce) {
  .arrow.hint { animation: none; }
}
</style>
