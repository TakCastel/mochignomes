<template>
  <nav class="tiles" aria-label="Menu">
    <button v-for="t in tiles" :key="t.key" class="tile" :style="{ '--c': t.color }" :aria-label="t.label" @click="t.run">
      <Icon :name="t.icon" class="emoji" />
      <span v-if="t.badge" class="badge">{{ t.badge }}</span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
const { photos } = useGallery();

function dance() {
  if (store.health <= 0) return gameSay("...");
  if (store.isSleeping) return gameSay("Chut... je dors");
  if (store.energy < 10) return gameSay("Trop crevée...");
  navigator.vibrate?.(12);
  store.applyAction("danser");
}

const tiles = computed(() => [
  { key: "journal", label: "Journal", icon: "ph:backpack-fill", color: "#f0812a", run: () => (gameBus.sheet = "journal") },
  { key: "danser", label: "Danser", icon: "ph:disco-ball-fill", color: "#9a4dff", run: dance },
  { key: "photo", label: "Prendre une photo", icon: "ph:camera-fill", color: "#14b8c8", run: () => gameCommand("photo") },
  { key: "galerie", label: "Galerie photos", icon: "ph:images-fill", color: "#f0479b", badge: photos.value.length || null, run: () => (gameBus.sheet = "galerie") },
]);
</script>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px 14px 14px;
  border-radius: 34px;
  background: linear-gradient(180deg, #f8ebdc 0%, #f0d8bd 100%);
  box-shadow:
    0 10px 24px rgba(60, 40, 20, 0.22),
    inset 0 2px 0 #fff,
    0 0 0 1.5px rgba(255, 255, 255, 0.7);
}
/* tuile crème bombée */
.tile {
  position: relative;
  display: grid;
  place-items: center;
  height: var(--tile, 68px);
  padding: 0;
  border: 0;
  border-radius: 24px;
  background: linear-gradient(180deg, #fffaf2 0%, #f3e3cc 70%, #e9d2b2 100%);
  box-shadow:
    0 5px 0 #d2b48c,
    0 9px 14px rgba(90, 60, 30, 0.25),
    inset 0 2px 0 #fff,
    inset 0 -3px 5px rgba(180, 140, 90, 0.3);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s, box-shadow 0.08s;
}
.tile:active { transform: translateY(4px); box-shadow: 0 1px 0 #d2b48c, 0 3px 6px rgba(90, 60, 30, 0.25), inset 0 2px 0 #fff; }
.emoji { width: 58%; height: 58%; max-width: 42px; max-height: 42px; color: var(--c); filter: drop-shadow(0 2px 0 color-mix(in srgb, var(--c) 55%, #000)); }
.badge {
  position: absolute;
  top: -6px;
  right: -4px;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #ff5c5c;
  color: #fff;
  font: 900 11px "Nunito", system-ui, sans-serif;
  box-shadow: 0 0 0 2px #fff;
}
</style>
