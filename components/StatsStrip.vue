<template>
  <section class="strip" aria-label="Besoins">
    <button v-for="n in rows" :key="n.key" class="cell" :aria-label="`${n.label} : ${Math.round(n.value)} sur 100`" @click="gameBus.sheet = 'fiche'">
      <Icon :name="n.icon" class="ic" :style="{ color: n.color }" />
      <span class="track"><span class="fill" :class="n.level" :style="{ width: n.width + '%' }" /></span>
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
const NEEDS = [
  { key: "hunger", label: "Ventre", icon: "ph:bowl-food-duotone", color: "#6b7482" },
  { key: "cleanliness", label: "Propreté", icon: "ph:drop-duotone", color: "#3b9cf0" },
  { key: "fun", label: "Jeu", icon: "ph:soccer-ball-duotone", color: "#2fae4a" },
  { key: "energy", label: "Énergie", icon: "ph:lightning-duotone", color: "#7a5ce6" },
  { key: "health", label: "Santé", icon: "ph:heart-duotone", color: "#ef5b9a" },
];
// la barre verte devient jaune, orange puis rouge quand le besoin monte
const rows = computed(() =>
  NEEDS.map((n) => {
    const value = store[n.key];
    const level = value >= 60 ? "good" : value >= 40 ? "ok" : value >= 20 ? "low" : "bad";
    return { ...n, value, level, width: Math.max(5, Math.min(value, 100)) };
  })
);
</script>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 12px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(40, 55, 80, 0.16), inset 0 1px 0 #fff;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  border: 0;
  border-left: 1px solid #e6eaf0;
  background: none;
  cursor: pointer;
}
.cell:first-child { border-left: 0; }
.ic { width: 30px; height: 30px; }
.track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #dfe4ea;
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
