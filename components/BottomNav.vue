<template>
  <nav class="nav" aria-label="Navigation">
    <button
      v-for="t in items"
      :key="t.key"
      class="item"
      :class="{ on: active === t.key, center: t.center }"
      :aria-label="t.label"
      @click="t.run"
    >
      <Icon :name="t.icon" class="ic" />
      <span v-if="t.badge" class="badge" />
    </button>
  </nav>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
// l'onglet allumé suit le panneau ouvert ; « accueil » quand aucun panneau n'est ouvert
const active = computed(() => gameBus.sheet || "accueil");

const items = computed(() => [
  { key: "accueil", label: "Accueil", icon: "ph:house-bold", run: () => (gameBus.sheet = null) },
  { key: "journal", label: "Journal", icon: "ph:calendar-dots-fill", run: () => (gameBus.sheet = "journal") },
  { key: "fiche", label: "Humeur et caractère", icon: "ph:sparkle-fill", center: true, run: () => (gameBus.sheet = "fiche") },
  { key: "galerie", label: "Photos", icon: "ph:images-fill", run: () => (gameBus.sheet = "galerie") },
  { key: "succes", label: "Succès", icon: "ph:chart-bar-fill", badge: store.unlocked.length > gameBus.seenUnlocked, run: () => (gameBus.sheet = "succes") },
]);
</script>

<style scoped>
.nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 10px 10px calc(env(safe-area-inset-bottom, 0px) + 10px);
  border-radius: 28px 28px 0 0;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -6px 24px rgba(40, 55, 80, 0.12);
}
.item {
  position: relative;
  display: grid;
  place-items: center;
  height: 52px;
  margin: 0 4px;
  padding: 0;
  border: 0;
  border-radius: 16px;
  border-left: 1px solid transparent;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.item + .item::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 12px;
  bottom: 12px;
  width: 1px;
  background: #e8ecf1;
}
.ic { width: 30px; height: 30px; color: #5b6472; }
.on { background: linear-gradient(180deg, #e9fadf, #d6f3c4); }
.on .ic { color: #3c9a22; }
/* au centre, l'éclat d'humeur, à la couleur de l'humeur */
.center .ic { width: 36px; height: 36px; color: var(--mood, #52c234); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--mood, #52c234) 55%, transparent)); }
.badge {
  position: absolute;
  top: 8px;
  right: 18px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff3b3b;
  box-shadow: 0 0 0 2px #fff;
}
</style>
