<template>
  <div class="world" :class="[`phase-${shownPhase}`, { dead }]" :style="paletteStyle">
    <!-- la scène 3D occupe tout l'écran, derrière l'interface -->
    <div class="scene">
      <Tamagotchi :phase="shownPhase" :dead="dead" :frame="frame" :sky="pal.sky" :theme="pal.world" />
    </div>

    <!-- interface posée sur la scène ; les zones vides laissent passer les gestes vers la créature -->
    <main class="ui">
      <ProfileBar class="hit pad" />
      <div ref="middle" class="middle" />
      <div class="pad stack">
        <StatsStrip class="hit" />
        <ActionGrid class="hit" />
      </div>
      <BottomNav class="hit" :style="{ '--mood': moodColor }" />
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
import { PALETTES, DEFAULT_PALETTE, paletteVars, UI_THEMES } from "~/lib/palettes";
import { MOOD_LABELS } from "~/lib/creatureLook";

const store = useTamagotchiStore();
const dead = computed(() => store.health <= 0);
const { mood } = useCreatureMood();
const moodColor = computed(() => MOOD_LABELS[mood.value]?.[1] || "#52c234");
const pal = computed(() => PALETTES[store.palette] || PALETTES[DEFAULT_PALETTE]);
// interface très blanche, un seul accent vert
const paletteStyle = computed(() => ({
  ...paletteVars(store.palette),
  "--ink": "#2b3440",
  "--accent": "#4fbf34",
  "--accent-hi": "#7fdc5a",
  "--accent-lo": "#3c9a22",
  "--panel-top": "#ffffff",
  "--panel-bottom": "#f4f7fb",
  "--plate-hi": "#ffffff",
  "--plate-lo": "#eef3f8",
  "--plate-shade": "rgba(30, 50, 80, 0.18)",
  "--knob-hi": "#ffffff",
  "--knob-lo": "#eef3f8",
  "--knob-side": "#cfd9e4",
}));

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
    size: Math.round(Math.min(r.height * 0.5, window.innerWidth * 0.42)),
    // haut de la zone libre + hauteur d'une bulle : la bulle reste visible
    minTop: Math.round(r.top + 56),
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
  --tile: clamp(56px, 10vh, 84px);
  --gap: clamp(8px, 1.4vh, 12px);
}
.scene {
  position: absolute;
  inset: 0;
  z-index: 0;
}
/* lumière chaude fixe par-dessus la scène : halo doré en haut, bords plus profonds */
.scene::after {
  content: "";
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, transparent 50%, rgba(248, 250, 252, 0.5) 64%, rgba(248, 250, 252, 0.9) 80%),
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
  gap: var(--gap);
  padding-top: calc(env(safe-area-inset-top, 0px) + clamp(10px, 1.8vh, 18px));
  pointer-events: none;
}
.pad { margin: 0 14px; }
.stack { display: flex; flex-direction: column; gap: var(--gap); }
/* seuls les éléments d'interface captent le toucher, le reste va à la créature */
.hit { pointer-events: auto; }
.middle {
  position: relative;
  flex: 1;
  min-height: 0;
}
</style>
