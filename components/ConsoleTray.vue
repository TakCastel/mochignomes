<template>
  <nav class="tray" aria-label="Menu">
    <button v-for="t in tiles" :key="t.key" class="tile" :style="{ '--c': t.color }" @click="gameBus.sheet = t.key">
      <span class="well">
        <Icon :name="t.icon" class="icon" />
        <span v-if="t.badge" class="badge" :class="{ alert: t.alert }">{{ t.badge }}</span>
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
  { key: "galerie", label: "Photos", icon: "ph:images-fill", color: "#ff5c8a", badge: photos.value.length || null },
  {
    key: "succes",
    label: "Succès",
    icon: "ph:trophy-fill",
    color: "#ffb300",
    badge: `${store.unlocked.length}/${ACHIEVEMENTS.length}`,
    alert: store.unlocked.length > gameBus.seenUnlocked,
  },
  { key: "journal", label: "Journal", icon: "ph:calendar-fill", color: "#21b8d6", badge: null },
]);
</script>

<style scoped>
/* barre creusée dans le bas de la coque, qui en suit l'arrondi */
.tray {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 7px 14px 11px;
  border-radius: 36px 36px 50% 50% / 36px 36px 60px 60px;
  background: linear-gradient(180deg, var(--plate-lo), var(--plate-hi));
  box-shadow: inset 0 3px 6px var(--plate-shade), inset 0 -2px 2px #fff, 0 1px 0 rgba(255, 255, 255, 0.8);
}
.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
/* bouton rond blanc, icône de couleur */
.well {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--tile, 44px);
  height: var(--tile, 44px);
  border-radius: 50%;
  background: radial-gradient(circle at 38% 28%, #ffffff, #ffffff 40%, var(--knob-lo) 100%);
  box-shadow: 0 4px 0 var(--knob-side), 0 6px 10px var(--plate-shade), inset 0 -2px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.08s, box-shadow 0.08s;
}
.tile:active .well {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--knob-side), 0 2px 4px var(--plate-shade);
}
.icon {
  width: 54%;
  height: 54%;
  color: var(--c);
  filter: drop-shadow(0 2px 0 color-mix(in srgb, var(--c) 60%, #000));
}
.badge {
  position: absolute;
  top: -7px;
  right: -9px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
}
.badge.alert { background: #ff4d4d; box-shadow: 0 2px 0 #b52020; }
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--ink);
}
@media (max-width: 380px) {
  .label { display: none; }
}
</style>
