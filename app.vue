<template>
  <div class="world" :class="[`phase-${shownPhase}`, { dead }]" :style="paletteStyle">
    <!-- la scène 3D occupe tout l'écran, derrière l'interface -->
    <div class="scene" :class="{ studio: studioHome && !playing }">
      <Tamagotchi :phase="shownPhase" :dead="dead" :frame="frame" :sky="pal.sky" :theme="pal.world" @studio="(v) => (studioHome = v)" />
    </div>

    <!-- interface posée sur la scène ; les zones vides laissent passer les gestes vers la créature -->
    <main class="ui">
      <!-- pendant une activité 3D, l'interface s'efface (le mini-jeu a son propre HUD) -->
      <ProfileBar class="hit pad" :class="{ away: playing }" />
      <div ref="middle" class="middle" />
      <div class="pad stack" :class="{ away: playing }">
        <StatsStrip class="hit" />
        <!-- actions : uniquement pendant le tutoriel ; ensuite, tout passe par le menu sur la créature -->
        <ActionGrid v-if="(store.onboardStep ?? 6) < 6" class="hit" />
      </div>
      <BottomNav class="hit nav-top" :class="{ away: playing }" :style="{ '--mood': moodColor }" />
    </main>

    <!-- « +N » volants des gains (aucun montant total sur l'écran principal) -->
    <CoinBurst />
    <GameToasts />
    <GameSheet />
    <!-- nouveauté débloquée : « Elle a trouvé un ballon ! » -->
    <UnlockCard v-if="!playing" />
    <LazyActivityPlayer v-if="gameBus.activity" :key="gameBus.activity" :activity-id="gameBus.activity" @close="closeActivity" />
    <AwayCard />
    <WelcomeCard />
    <NotifPrompt />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { dayPhase } from "~/lib/gameUi";
import { PALETTES, DEFAULT_PALETTE, THEMES, themeKey } from "~/lib/palettes";
import { MOOD_LABELS } from "~/lib/creatureLook";
import { activeActivity } from "~/composables/useLiveCreature";

const store = useTamagotchiStore();
const playing = computed(() => !!gameBus.activity || !!activeActivity.value);
// vue studio à la maison (HOME_VIEW dans lib/world3d.js) : annoncée par la scène 3D une fois créée
const studioHome = ref(false);
const dead = computed(() => store.health <= 0);
const { mood } = useCreatureMood();
const moodColor = computed(() => MOOD_LABELS[mood.value]?.[1] || "#52c234");
const pal = computed(() => PALETTES[store.palette] || PALETTES[DEFAULT_PALETTE]);
// la palette ne règle que le décor et sa lumière ; l'interface suit le thème (Réglages)
const paletteStyle = computed(() => ({ "--glow": pal.value.glow, "--edge": pal.value.edge }));
// thème d'interface posé sur <html> : les feuilles téléportées dans <body> le suivent aussi
watchEffect(() => {
  const key = themeKey(store.ui);
  document.documentElement.dataset.theme = key;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES[key].dark ? "#1a1f2a" : "#8fd3ff");
});

// moment de la journée réel, mis à jour chaque minute
const phase = ref("day");
let phaseTimer = null;
// pas de nuit à l'écran : la scène reste en plein jour, même quand elle dort
// (la nuit délavait le personnage ; la simulation, elle, garde ses heures de nuit)
const shownPhase = computed(() => (phase.value === "night" ? "day" : phase.value));

// Cadrage : la créature se pose en bas de la zone libre entre les jauges et les boutons
const middle = ref(null);
const frame = ref(null);
let ro = null;
function measure() {
  const el = middle.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  // vue studio : la créature seule, un peu plus grande que dans la prairie
  const size = Math.round(studioHome.value ? Math.min(r.height * 0.64, window.innerWidth * 0.48) : Math.min(r.height * 0.60, window.innerWidth * 0.50));
  // studio : créature centrée dans la zone libre (un peu plus bas pour laisser la place à sa bulle),
  // avec de la marge sous les pieds pour les flèches au sol ; prairie : posée en bas comme avant
  const groundLow = r.bottom - Math.min(26, r.height * 0.10);
  let ground = studioHome.value ? Math.min(r.bottom - 48, r.top + (r.height + size) / 2 + 28) : groundLow;
  let shown = size;
  // essayage en boutique : la créature se cadre entière au-dessus de la barre d'essayage
  const tryTop = gameBus.tryTop;
  if (tryTop && tryTop > r.top + 80) {
    const free = tryTop - 16 - r.top;
    shown = Math.round(Math.min(size, free * 0.78));
    ground = r.top + (free + shown) / 2 + 10;
  }
  frame.value = {
    ground: Math.round(ground),
    size: shown,
    // haut de la zone libre + hauteur d'une bulle : la bulle reste visible
    minTop: Math.round(r.top + 56),
  };
}

watch(studioHome, measure);
watch(() => gameBus.tryTop, measure); // essayage en boutique : recadrage au-dessus de la barre

onMounted(() => {
  // succès déjà vus : la 1re fois, tous ceux déjà gagnés (pas de pastille au démarrage)
  loadSeenUnlocked(store.unlocked.length);
  store.startDecay();
  // ?palette=lagon : essayer une palette
  const wanted = new URLSearchParams(window.location.search).get("palette");
  if (wanted && PALETTES[wanted]) store.palette = wanted;
  // ?theme=sombre : essayer un thème d'interface
  const theme = new URLSearchParams(window.location.search).get("theme");
  if (theme && THEMES[theme]) store.ui = theme;
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
  --tile: clamp(52px, 8.4vh, 72px);
  --gap: clamp(8px, 1.4vh, 12px);
  --nav-h: 64px;
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
    linear-gradient(180deg, transparent 62%, rgba(248, 250, 252, 0.55) 100%),
    radial-gradient(70% 40% at 75% 28%, var(--glow), transparent 70%),
    radial-gradient(130% 90% at 50% 45%, transparent 55%, var(--edge) 100%);
  transition: opacity 0.25s ease;
}
/* vue studio : fond bleu uni et propre, plus de halo doré ni de bords sombres (le fond a déjà son halo et sa vignette) */
.scene.studio::after { opacity: 0; }

.ui {
  position: relative;
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
/* la barre du bas reste au-dessus des fenêtres et des pages (z 20), qui glissent derrière elle ;
   les cartes plein écran (nouveauté, accueil, activité : z 30+) passent au-dessus */
.nav-top { position: relative; z-index: 28; }
.stack { display: flex; flex-direction: column; gap: var(--gap); }
/* seuls les éléments d'interface captent le toucher, le reste va à la créature */
.hit { pointer-events: auto; }
/* activité en cours : on garde la place (le cadrage de la créature ne bouge pas) mais tout s'efface */
.ui .away { visibility: hidden; pointer-events: none; }
.middle {
  position: relative;
  flex: 1;
  min-height: 0;
}
</style>
