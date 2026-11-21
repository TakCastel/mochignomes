<template>
  <!-- panneau des besoins : un rectangle blanc, deux colonnes ; médaillon rond à gauche,
       libellé bleu marine puis jauge épaisse et brillante, humeur dans la dernière case -->
  <section class="needs" aria-label="Besoins">
    <button v-for="(n, i) in rows" :key="n.key" class="need" :class="['is-' + n.level, { 'is-up': bumped[n.key] }]" :style="{ '--i': i }" :aria-label="`${n.label} : ${Math.round(n.value)} sur 100`" @click="tap(n)">
      <span class="medal"><Icon :name="n.glyph" class="glyph" /></span>
      <span class="body">
        <span class="name">{{ n.label }}</span>
        <span class="track"><span class="fill" :style="{ width: n.width + '%' }" /></span>
      </span>
    </button>
    <div class="mood" :style="{ '--i': rows.length }" aria-live="polite">
      <span class="mood-dot" :style="{ '--d': moodInfo[1] }" />
      <span class="body">
        <span class="name">Humeur</span>
        <span class="mood-v">{{ moodInfo[0] }}</span>
      </span>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, watch } from "vue";
import { MOOD_LABELS } from "~/lib/creatureLook";

const { store, mood } = useCreatureMood();
const moodInfo = computed(() => MOOD_LABELS[mood.value] || ["Sereine", "#4fc3a1"]);
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
</script>

<style scoped>
/* un seul panneau blanc opaque, filet fin */
.needs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 0;
  padding: 4px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(30, 55, 100, 0.14), 0 0 0 1px #d6dfea;
  animation: rise 0.5s var(--spring) both;
}
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
.need,
.mood {
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
  box-shadow: 0 0 0 3px #fff, 0 2px 4px rgba(40, 60, 90, 0.3);
  transition: background 0.4s, transform 0.4s var(--spring-strong);
}
.glyph { width: 20px; height: 20px; color: #fff; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3)); }
.need:active .medal { transform: scale(0.84); transition-duration: 0.08s; }
.need.is-up .medal { animation: bump 0.6s var(--spring-strong); }
@keyframes bump { 40% { transform: scale(1.15); } }
.track {
  display: block;
  height: 20px;
  overflow: hidden;
  border-radius: 999px;
  background: #d9e1ea;
  box-shadow: inset 0 2px 3px rgba(40, 60, 90, 0.18);
}
.fill {
  position: relative;
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--c-hi), var(--c) 55%, var(--c-lo));
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.12);
  transition: width 0.7s var(--spring), background 0.4s;
}
/* reflet blanc sur le haut + petit éclat */
.fill::before {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  top: 2px;
  height: 35%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
}
.fill::after {
  content: "";
  position: absolute;
  right: 6px;
  top: 5px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}
/* besoin critique : le médaillon palpite */
.need.is-bad .medal { animation: alert 1.1s ease-in-out infinite; }
@keyframes alert { 50% { transform: scale(1.15); } }
/* humeur */
.mood-dot {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.55), var(--d) 60%);
  background-color: var(--d);
  box-shadow: 0 0 0 3px #fff, 0 2px 4px rgba(40, 60, 90, 0.3);
}
.mood-v {
  display: block;
  height: 20px;
  font: 700 16px/20px var(--font-title);
  color: var(--hud-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (prefers-reduced-motion: reduce) {
  .needs, .need, .mood, .need.is-bad .medal, .need.is-up .medal { animation: none; }
  .fill, .medal { transition: none; }
}
</style>
