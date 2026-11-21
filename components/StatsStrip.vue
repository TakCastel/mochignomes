<template>
  <!-- panneau des besoins : deux colonnes de jauges, libellé bleu au-dessus,
       médaillon rond collé à la jauge, humeur dans la dernière case -->
  <section class="needs" aria-label="Besoins">
    <button v-for="(n, i) in rows" :key="n.key" class="need" :class="'is-' + n.level" :style="{ '--i': i }" :aria-label="`${n.label} : ${Math.round(n.value)} sur 100`" @click="tap(n)">
      <span class="name">{{ n.label }}</span>
      <span class="gauge">
        <span class="track"><span class="fill" :style="{ width: n.width + '%' }" /></span>
        <span class="medal"><Icon :name="n.glyph" class="glyph" /></span>
      </span>
    </button>
    <div class="mood" :style="{ '--i': rows.length }" aria-live="polite">
      <span class="mood-k">Humeur</span>
      <span class="mood-v"><i class="mood-dot" :style="{ background: moodInfo[1] }" />{{ moodInfo[0] }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
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
/* panneau blanc net, cases séparées par de fins filets gris-bleu */
.needs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--hud-line);
  box-shadow: var(--hud-shadow), 0 0 0 1px var(--hud-line);
  animation: rise 0.5s var(--spring) both;
}
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
.need,
.mood {
  display: grid;
  align-content: center;
  gap: 4px;
  min-width: 0;
  min-height: 44px;
  padding: 6px 12px 7px 10px;
  background: linear-gradient(180deg, #fff 0 46%, var(--hud-band) 46% 100%);
  animation: fade 0.4s ease-out calc(0.1s + var(--i, 0) * 40ms) both;
}
@keyframes fade { from { opacity: 0; } }
.need {
  border: 0;
  text-align: left;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.name {
  font: 800 12px/1 var(--font-text);
  color: var(--hud-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* jauge : médaillon rond posé sur le début d'une barre épaisse et brillante */
.gauge {
  --c: #49c13a;
  --c-hi: #8ee86a;
  --c-lo: #2f9a24;
  position: relative;
  display: block;
  height: 24px;
}
.is-ok .gauge { --c: #d6cf22; --c-hi: #f2ee6a; --c-lo: #a9a312; }
.is-low .gauge { --c: #ff9a26; --c-hi: #ffc46e; --c-lo: #d0700c; }
.is-bad .gauge { --c: #ea4338; --c-hi: #ff8a7e; --c-lo: #b52a20; }
.track {
  position: absolute;
  left: 10px;
  right: 0;
  top: 4px;
  height: 16px;
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
  background: linear-gradient(180deg, var(--c-hi), var(--c) 60%, var(--c-lo));
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.12);
  transition: width 0.8s var(--spring), background 0.4s;
}
/* reflet brillant sur le haut de la jauge */
.fill::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 6px;
  top: 2px;
  height: 35%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
}
.medal {
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, var(--c-hi), var(--c) 65%, var(--c-lo));
  box-shadow: 0 0 0 2px #fff, 0 2px 4px rgba(40, 60, 90, 0.3);
  transition: background 0.4s, transform 0.4s var(--spring-strong);
}
.glyph { width: 14px; height: 14px; color: #fff; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25)); }
.need:active .medal { transform: scale(0.82); transition-duration: 0.08s; }
/* besoin critique : le médaillon palpite */
.is-bad .medal { animation: alert 1.1s ease-in-out infinite; }
@keyframes alert { 50% { transform: scale(1.18); } }
/* humeur : dernière case, en texte bleu */
.mood-k { font: 800 12px/1 var(--font-text); color: var(--hud-ink-2); }
.mood-v {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 24px;
  font: 700 15px/1 var(--font-title);
  color: var(--hud-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mood-dot { flex: none; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 2px #fff, 0 1px 3px rgba(40, 60, 90, 0.3); }
@media (prefers-reduced-motion: reduce) {
  .needs, .need, .mood, .is-bad .medal { animation: none; }
  .fill, .medal { transition: none; }
}
</style>
