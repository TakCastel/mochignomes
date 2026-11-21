<template>
  <!-- panneau des besoins : deux colonnes, médaillon rond à gauche, libellé bleu marine puis jauge ;
       son bord bas épouse l'onglet de la barre du bas (coin bas-gauche laissé libre pour lui).
       L'humeur est dans cet onglet, à côté du bouton actif (BottomNav). -->
  <div class="stats">
    <div ref="wrap" class="shadow">
  <section ref="panel" class="needs" :style="clipStyle" aria-label="Besoins">
    <button v-for="(n, i) in rows" :key="n.key" class="need" :class="['is-' + n.level, { 'is-up': bumped[n.key] }]" :style="{ '--i': i }" :aria-label="`${n.label} : ${Math.round(n.value)} sur 100`" @click="tap(n)">
      <span class="medal"><Icon :name="n.glyph" class="glyph" /></span>
      <span class="body">
        <span class="name">{{ n.label }}</span>
        <span class="track"><span class="fill" :style="{ width: n.width + '%' }" /></span>
      </span>
    </button>
  </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { navOrb, navBumpAt } from "~/composables/useNavOrb";

const { store } = useCreatureMood();
const STAT_ACTION = { hunger: "nourrir", cleanliness: "laver", fun: "jouer", energy: "coucher", health: "soigner" };
// icon : pastille du message (gameToast) ; glyph : pictogramme blanc dans le médaillon
const NEEDS = [
  { key: "hunger", label: "Ventre", icon: "solar:donut-bitten-bold-duotone", glyph: "solar:donut-bitten-bold" },
  { key: "cleanliness", label: "Propreté", icon: "solar:waterdrop-bold-duotone", glyph: "solar:waterdrop-bold" },
  { key: "fun", label: "Jeu", icon: "solar:football-bold-duotone", glyph: "solar:football-bold" },
  { key: "energy", label: "Énergie", icon: "solar:bolt-bold-duotone", glyph: "solar:bolt-bold" },
  { key: "health", label: "Santé", icon: "solar:heart-bold-duotone", glyph: "solar:heart-bold" },
];
const PHRASES = {
  hunger: ["a très faim", "a un peu faim", "n'a pas faim", "est bien rassasiée"],
  cleanliness: ["est toute sale", "aurait besoin d'un bain", "est propre", "est impeccable"],
  fun: ["s'ennuie beaucoup", "aimerait jouer", "s'amuse bien", "pétille de joie"],
  energy: ["est épuisée", "est un peu fatiguée", "a de l'énergie", "déborde d'énergie"],
  health: ["ne va pas bien", "est un peu patraque", "est en forme", "respire la santé"],
};
function level(v) {
  return v >= 60 ? "good" : v >= 40 ? "ok" : v >= 20 ? "low" : "bad";
}
// la jauge verte devient jaune, orange puis rouge quand le besoin monte
const rows = computed(() =>
  NEEDS.map((n) => {
    const value = store[n.key];
    return { ...n, value, level: level(value), width: Math.max(4, Math.min(value, 100)) };
  })
);

// quand une valeur monte d'au moins 5, le médaillon bondit
const bumped = reactive({});
const last = {};
watch(rows, (list) => {
  for (const n of list) {
    if (last[n.key] !== undefined && n.value - last[n.key] >= 5) {
      bumped[n.key] = true;
      setTimeout(() => (bumped[n.key] = false), 650);
    }
    last[n.key] = n.value;
  }
}, { immediate: true });

// un tap sur une jauge ne change jamais d'écran : il dit l'état et montre l'action liée
function tap(n) {
  const v = n.value;
  const i = v < 20 ? 0 : v < 45 ? 1 : v < 85 ? 2 : 3;
  let text = `${store.name || "Elle"} ${PHRASES[n.key][i]}.`;
  if (n.key === "health" && store.illness) text = `${store.name || "Elle"} est malade, un soin lui ferait du bien.`;
  if (n.key === "energy" && store.exhausted) text = `${store.name || "Elle"} est à bout de forces.`;
  gameToast(text, n.icon);
  highlightAction(STAT_ACTION[n.key]);
}

// ---- bord bas qui épouse l'onglet de la barre du bas ----
const GAP = 7; // écart entre le panneau et l'onglet (dessus et flancs)
const R = 16; // coins du panneau
const panel = ref(null);
const wrap = ref(null);
const box = ref(null);
function remeasure() {
  const el = panel.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  box.value = { left: r.left, top: r.top, w: el.offsetWidth, h: el.offsetHeight };
}
const clipStyle = computed(() => {
  const b = box.value;
  if (!b || !b.w || !navOrb.on) return {};
  const limit = navOrb.top - b.top - GAP; // haut de la barre, en coordonnées du panneau
  const bottom = [];
  for (let x = b.w; x >= 0; x -= 2) {
    let y = b.h;
    if (x < R) y -= R - Math.sqrt(R * R - (R - x) ** 2);
    else if (x > b.w - R) y -= R - Math.sqrt(R * R - (x - (b.w - R)) ** 2);
    y = Math.min(y, limit - navBumpAt(b.left + x, GAP));
    bottom.push(`${x},${y.toFixed(1)}`);
  }
  const d = `M0,${R} Q0,0 ${R},0 L${b.w - R},0 Q${b.w},0 ${b.w},${R} L${bottom.join(" L")} Z`;
  return { clipPath: `path("${d}")` };
});
let ro;
onMounted(() => {
  remeasure();
  ro = new ResizeObserver(remeasure);
  ro.observe(panel.value);
  // la pile autour (tutoriel, etc.) peut déplacer le panneau sans le redimensionner
  const stack = wrap.value?.parentElement?.parentElement;
  if (stack) ro.observe(stack);
  wrap.value?.addEventListener("animationend", remeasure);
  window.addEventListener("resize", remeasure);
});
watch(() => navOrb.top, remeasure);
onBeforeUnmount(() => {
  ro?.disconnect();
  window.removeEventListener("resize", remeasure);
});
</script>

<style scoped>
.stats { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
/* l'ombre est portée par l'enveloppe : elle suit la découpe du panneau */
.shadow {
  align-self: stretch;
  filter: drop-shadow(0 0 0.5px rgba(30, 55, 100, 0.45)) drop-shadow(0 6px 12px rgba(30, 55, 100, 0.16));
  animation: rise 0.5s var(--spring) both;
}
/* panneau blanc ; Santé en bas à droite, le coin bas-gauche est la place de l'onglet « Maison » */
.needs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 0;
  padding: 4px 4px 6px;
  border-radius: 16px;
  background: var(--surface);
}
.need:nth-child(5) { grid-column: 2; }
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
.need {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 44px;
  padding: 3px 8px 3px 4px;
  animation: fade 0.4s ease-out calc(0.1s + var(--i, 0) * 40ms) both;
}
@keyframes fade { from { opacity: 0; } }
.need {
  --c: #49c13a;
  --c-hi: #8ee86a;
  --c-lo: #2f9a24;
  border: 0;
  border-radius: 12px;
  background: none;
  text-align: left;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.need.is-ok { --c: #f5c518; --c-hi: #ffe46b; --c-lo: #c49a08; }
.need.is-low { --c: #ff9a26; --c-hi: #ffc46e; --c-lo: #d0700c; }
.need.is-bad { --c: #ea4338; --c-hi: #ff8a7e; --c-lo: #b52a20; }
.body { flex: 1; min-width: 0; display: grid; gap: 3px; }
.name {
  font: 800 13px/1 var(--font-text);
  color: var(--hud-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.medal {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 28%, var(--c-hi), var(--c) 62%, var(--c-lo));
  box-shadow: 0 0 0 3px var(--surface), 0 2px 4px rgba(40, 60, 90, 0.3);
  transition: background 0.4s, transform 0.4s var(--spring-strong);
}
.glyph { width: 20px; height: 20px; color: #fff; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3)); }
.need:active .medal { transform: scale(0.84); transition-duration: 0.08s; }
.need.is-up .medal { animation: bump 0.6s var(--spring-strong); }
@keyframes bump { 40% { transform: scale(1.15); } }
/* gouttière creusée dans le panneau : ombre intérieure en haut, liseré clair en bas */
.track {
  display: block;
  height: 18px;
  padding: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--track-lo), var(--track-hi));
  box-shadow: inset 0 1.5px 2.5px rgba(30, 50, 90, 0.28), inset 0 -1px 0 var(--glint), 0 1px 0 var(--glint);
}
/* remplissage en relief : dégradé de tube arrondi, liseré lumineux fin en haut, ombre douce en bas */
.fill {
  position: relative;
  display: block;
  min-width: 14px;
  height: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--c-hi) 70%, var(--surface)) 0%,
    var(--c-hi) 22%,
    var(--c) 58%,
    var(--c-lo) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    inset 0 -2px 2px color-mix(in srgb, var(--c-lo) 60%, transparent),
    0 1px 2px color-mix(in srgb, var(--c-lo) 45%, transparent);
  transition: width 0.7s var(--spring), background 0.4s;
}
/* reflet qui balaie la jauge de temps en temps, chaque jauge à son tour */
.fill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.5) 48%, rgba(255, 255, 255, 0.5) 52%, transparent 70%);
  transform: translateX(-110%);
  animation: sheen 6s ease-in-out calc(1.5s + var(--i, 0) * 0.35s) infinite;
  pointer-events: none;
}
@keyframes sheen {
  0% { transform: translateX(-110%); }
  14%, 100% { transform: translateX(110%); }
}
/* besoin critique : le médaillon palpite */
.need.is-bad .medal { animation: alert 1.1s ease-in-out infinite; }
@keyframes alert { 50% { transform: scale(1.15); } }
@media (prefers-reduced-motion: reduce) {
  .shadow, .need, .need.is-bad .medal, .need.is-up .medal { animation: none; }
  .fill, .medal { transition: none; }
  .fill::after { animation: none; display: none; }
}
</style>
