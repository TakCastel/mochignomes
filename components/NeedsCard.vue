<template>
  <section class="needs" aria-label="Besoins">
    <button v-for="n in rows" :key="n.key" class="row" :aria-label="`${n.label} : ${Math.round(n.value)} sur 100`" @click="gameBus.sheet = 'fiche'">
      <Icon :name="n.icon" class="ic" />
      <span class="label">{{ n.label }}</span>
      <span class="bar"><span class="fill" :class="n.level" :style="{ width: n.width + '%' }" /></span>
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();

const NEEDS = [
  { key: "hunger", label: "Ventre", icon: "ph:bowl-food-fill" },
  { key: "cleanliness", label: "Propreté", icon: "ph:drop-fill" },
  { key: "fun", label: "Jeu", icon: "ph:soccer-ball-fill" },
  { key: "energy", label: "Énergie", icon: "ph:lightning-fill" },
  { key: "health", label: "Santé", icon: "ph:heart-fill" },
];

// La couleur de la barre dit tout de suite si ça va : vert, jaune, orange, rouge
const rows = computed(() =>
  NEEDS.map((n) => {
    const value = store[n.key];
    const level = value >= 70 ? "good" : value >= 50 ? "ok" : value >= 25 ? "low" : "bad";
    return { ...n, value, level, width: Math.max(4, Math.min(value, 100)) };
  })
);
</script>

<style scoped>
.needs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  padding: 12px 14px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(25, 45, 80, 0.18);
}
.row {
  display: grid;
  grid-template-columns: 20px 62px 1fr;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  text-align: left;
}
/* la 5e jauge prend toute la largeur */
.row:last-child { grid-column: 1 / -1; grid-template-columns: 20px 62px 1fr; }
.ic { width: 18px; height: 18px; color: var(--accent); }
.label { font: 800 13px "Nunito", system-ui, sans-serif; color: var(--ink); white-space: nowrap; }
.bar {
  height: 12px;
  border-radius: 999px;
  background: #e8eef5;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(25, 45, 80, 0.12);
}
.fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease, background 0.4s;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.good { background: linear-gradient(180deg, #7fe08a, #46c35a); }
.ok { background: linear-gradient(180deg, #e6ec5a, #c4cf22); }
.low { background: linear-gradient(180deg, #ffc067, #ff9a26); }
.bad { background: linear-gradient(180deg, #ff7a6e, #e8443a); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.6; } }
@media (prefers-reduced-motion: reduce) { .bad { animation: none; } }
@media (max-width: 360px) {
  .row, .row:last-child { grid-template-columns: 18px 56px 1fr; }
  .label { font-size: 12px; }
}
</style>
