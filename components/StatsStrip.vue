<template>
  <section class="strip" aria-label="Besoins">
    <button v-for="n in rows" :key="n.key" class="cell" :aria-label="`${n.label} : ${Math.round(n.value)} sur 100`" @click="tap(n)">
      <Icon :name="n.icon" class="ic" :style="{ color: n.color }" />
      <span class="track"><span class="fill" :class="n.level" :style="{ width: n.width + '%' }" /></span>
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
const STAT_ACTION = { hunger: "nourrir", cleanliness: "laver", fun: "jouer", energy: "coucher", health: "soigner" };
const NEEDS = [
  { key: "hunger", label: "Ventre", icon: "solar:donut-bitten-bold-duotone", color: "#e8892a" },
  { key: "cleanliness", label: "Propreté", icon: "solar:waterdrop-bold-duotone", color: "#3b9cf0" },
  { key: "fun", label: "Jeu", icon: "solar:football-bold-duotone", color: "#2fae4a" },
  { key: "energy", label: "Énergie", icon: "solar:bolt-bold-duotone", color: "#7a5ce6" },
  { key: "health", label: "Santé", icon: "solar:heart-bold-duotone", color: "#ef5b9a" },
];
const PHRASES = {
  hunger: ["a très faim", "a un peu faim", "n'a pas faim", "est bien rassasiée"],
  cleanliness: ["est toute sale", "aurait besoin d'un bain", "est propre", "est impeccable"],
  fun: ["s'ennuie beaucoup", "aimerait jouer", "s'amuse bien", "est tout excitée"],
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
.strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 12px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 24px rgba(40, 55, 80, 0.16), var(--hl);
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 9px;
  position: relative;
  border: 0;
  background: none;
  cursor: pointer;
}
/* séparateur doux (pas de filet) */
.cell + .cell::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, transparent, var(--surface-3) 30%, var(--surface-3) 70%, transparent);
}
.ic { width: 28px; height: 28px; }
.track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(40, 55, 80, 0.12);
}
.fill { display: block; height: 100%; border-radius: 999px; transition: width 0.6s ease, background 0.4s; }
.good { background: linear-gradient(180deg, #7fdc5a, #44b82e); }
.ok { background: linear-gradient(180deg, #e3e45a, #c2c524); }
.low { background: linear-gradient(180deg, #ffc067, #ff9a26); }
.bad { background: linear-gradient(180deg, #ff7a6e, #e8443a); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .bad { animation: none; } }
</style>
