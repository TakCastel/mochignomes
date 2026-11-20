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
  gap: 10px;
  padding: 10px;
  border-radius: 26px;
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
  background: linear-gradient(160deg, #b98a5e, #8a5b34);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.35), inset 0 -3px 0 rgba(60, 30, 10, 0.35), 0 3px 6px rgba(90, 60, 30, 0.35);
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
  color: #6b4a33;
}
@media (max-width: 380px) {
  .label { display: none; }
}
</style>
