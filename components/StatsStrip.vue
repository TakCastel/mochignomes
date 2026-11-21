<template>
  <section class="strip" aria-label="Besoins">
    <button v-for="(n, i) in rows" :key="n.key" class="cell" :class="n.level" :style="{ '--i': i, '--nc': n.color }" :aria-label="`${n.label} : ${Math.round(n.value)} sur 100`" @click="tap(n)">
      <span class="chip"><img :src="n.img" class="pic" alt="" draggable="false" /></span>
      <span class="track"><span class="fill" :class="n.level" :style="{ width: n.width + '%' }" /></span>
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
const STAT_ACTION = { hunger: "nourrir", cleanliness: "laver", fun: "jouer", energy: "coucher", health: "soigner" };
const NEEDS = [
  { key: "hunger", label: "Ventre", icon: "solar:donut-bitten-bold-duotone", img: "/icons/actions/manger.png", color: "#ffb35c" },
  { key: "cleanliness", label: "Propreté", icon: "solar:waterdrop-bold-duotone", img: "/icons/actions/laver.png", color: "#6cc2ff" },
  { key: "fun", label: "Jeu", icon: "solar:football-bold-duotone", img: "/icons/actions/jouer.png", color: "#7fdc5a" },
  { key: "energy", label: "Énergie", icon: "solar:bolt-bold-duotone", img: "/icons/actions/dodo.png", color: "#a39bff" },
  { key: "health", label: "Santé", icon: "solar:heart-bold-duotone", img: "/icons/actions/soigner.png", color: "#ff7f9e" },
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
// la barre verte devient jaune, orange puis rouge quand le besoin monte
const rows = computed(() =>
  NEEDS.map((n) => {
    const value = store[n.key];
    return { ...n, value, level: level(value), width: Math.max(5, Math.min(value, 100)) };
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
/* niveau 1 : verre bleu profond, compact, il porte la couleur des besoins sans voler la vedette aux actions */
.strip {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 10px 6px 11px;
  border-radius: 22px;
  background: var(--hud-deep);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  backdrop-filter: blur(16px) saturate(1.6);
  box-shadow: 0 8px 22px rgba(18, 50, 104, 0.34), var(--hud-deep-edge);
  animation: rise 0.55s var(--spring) 0.05s both;
}
/* reflet de verre sur la moitié haute */
.strip::before {
  content: "";
  position: absolute;
  inset: 2px 2px 50% 2px;
  border-radius: 20px 20px 40% 40% / 20px 20px 12px 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.04));
  pointer-events: none;
}
@keyframes rise { from { opacity: 0; transform: translateY(18px) scale(0.96); } }
.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-height: 48px;
  padding: 0 8px;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: cell-in 0.5s var(--spring-strong) calc(0.2s + var(--i, 0) * 50ms) both;
}
@keyframes cell-in { from { opacity: 0; transform: scale(0.5) translateY(8px); } }
/* pastille ronde de la couleur du besoin, image 3D détourée dessus */
.chip {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2.5px solid #fff;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 25%, #fff, var(--nc) 88%);
  box-shadow: 0 3px 8px rgba(8, 30, 70, 0.38), inset 0 -3px 5px rgba(20, 40, 90, 0.16);
  transition: transform 0.42s var(--spring-strong);
}
.pic {
  width: 74%;
  height: 74%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff) drop-shadow(0 2px 2px rgba(20, 40, 80, 0.3));
}
.cell:active .chip { transform: scale(0.84); transition-duration: 0.08s; }
@media (hover: hover) { .cell:hover .chip { transform: translateY(-2px) scale(1.06); } }
.track {
  position: relative;
  width: 100%;
  height: 11px;
  border-radius: 999px;
  background: rgba(6, 24, 62, 0.5);
  overflow: hidden;
  box-shadow: inset 0 2px 3px rgba(2, 14, 40, 0.5), 0 1px 0 rgba(255, 255, 255, 0.28);
}
/* jauge brillante : reflet en haut, remplissage à ressort */
.fill { position: relative; display: block; height: 100%; border-radius: 999px; transition: width 0.8s var(--spring), background 0.4s; box-shadow: 0 0 8px rgba(255, 255, 255, 0.25); }
.fill::after { content: ""; position: absolute; left: 3px; right: 3px; top: 1px; height: 40%; border-radius: inherit; background: rgba(255, 255, 255, 0.6); }
.good { background: linear-gradient(180deg, #8ff06a, #3fc22b); }
.ok { background: linear-gradient(180deg, #f1ef5e, #cfd11f); }
.low { background: linear-gradient(180deg, #ffc067, #ff8f1f); }
.bad { background: linear-gradient(180deg, #ff8579, #ec3f35); }
/* besoin critique : la pastille et la barre palpitent */
.cell.bad .chip { animation: alert 1.2s ease-in-out infinite; }
.fill.bad { animation: pulse 1.2s ease-in-out infinite; }
@keyframes alert { 50% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(255, 90, 80, 0.5), 0 3px 8px rgba(8, 30, 70, 0.38); } }
@keyframes pulse { 50% { opacity: 0.6; } }
@media (prefers-reduced-motion: reduce) {
  .strip, .cell, .cell.bad .chip, .fill.bad { animation: none; }
  .chip, .fill { transition: none; }
}
</style>
