<template>
  <nav class="tray" aria-label="Menu">
    <button v-for="t in tiles" :key="t.key" class="tile" @click="gameBus.sheet = t.key">
      <span class="well">
        <Icon :name="t.icon" class="icon" />
        <span v-if="t.badge" class="badge">{{ t.badge }}</span>
      </span>
      <span class="label">{{ t.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { ACHIEVEMENTS } from "~/lib/achievements";

const { store } = useCreatureMood();
const { photos } = useGallery();

const tiles = computed(() => [
  { key: "galerie", label: "Galerie", icon: "ph:images-fill", badge: photos.value.length || null },
  { key: "succes", label: "Succès", icon: "ph:trophy-fill", badge: `${store.unlocked.length}/${ACHIEVEMENTS.length}` },
  { key: "journal", label: "Journal", icon: "ph:calendar-fill", badge: null },
]);
</script>

<style scoped>
.tray {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 7px;
  border-radius: 24px;
  background: #ece1d2;
  box-shadow: inset 3px 3px 8px rgba(140, 110, 80, 0.4), inset -3px -3px 8px #fff;
}
.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.well {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--tile, 46px);
  height: var(--tile, 46px);
  border-radius: 15px;
  background: radial-gradient(circle at 35% 25%, #e0a56a, #a8662e 60%, #7a4318);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45), inset 0 -4px 0 rgba(60, 25, 5, 0.4), 0 4px 0 #6b3a14, 0 6px 10px rgba(90, 50, 20, 0.4);
  transition: transform 0.08s;
}
.tile:active .well { transform: translateY(2px) scale(0.96); }
.icon { width: 56%; height: 56%; color: #fff3e0; filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.25)) drop-shadow(0 2px 1px rgba(60, 30, 10, 0.5)); }
.badge {
  position: absolute;
  top: -6px;
  right: -10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #ff5c5c;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 2px 0 #c22d2d;
  white-space: nowrap;
}
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #5a3a24;
  font-weight: 700;
  text-shadow: 0 1px 0 #fff;
}
@media (max-width: 380px) {
  .label { display: none; }
}
</style>
