<template>
  <nav class="tray" aria-label="Menu">
    <button v-for="t in tiles" :key="t.key" class="chip" :style="{ '--c': t.color }" @click="gameBus.sheet = t.key">
      <Icon :name="t.icon" class="icon" />
      <span class="label">{{ t.label }}</span>
      <span v-if="t.badge" class="badge" :class="{ alert: t.alert }">{{ t.badge }}</span>
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
/* rainure foncée creusée dans le bas de la coque */
.tray {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  padding: 8px 10px 11px;
  border-radius: 999px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--shell-edge) 85%, #000), var(--shell-lo));
  box-shadow:
    inset 0 4px 8px rgba(0, 0, 0, 0.35),
    inset 0 -2px 2px rgba(255, 255, 255, 0.25),
    0 1px 0 rgba(255, 255, 255, 0.7);
}
/* pastilles blanches : icône colorée + libellé */
.chip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 9px 6px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 50%, var(--knob-lo));
  box-shadow: 0 4px 0 color-mix(in srgb, var(--shell-edge) 55%, #000), 0 6px 10px rgba(0, 0, 0, 0.28), inset 0 1px 0 #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s, box-shadow 0.08s;
}
.chip:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--shell-edge) 55%, #000), 0 2px 4px rgba(0, 0, 0, 0.25);
}
.icon {
  flex: none;
  width: 20px;
  height: 20px;
  color: var(--c);
  filter: drop-shadow(0 1.5px 0 color-mix(in srgb, var(--c) 55%, #000));
}
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badge {
  position: absolute;
  top: -8px;
  right: 2px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font: 900 10px "Nunito", system-ui, sans-serif;
  white-space: nowrap;
  box-shadow: 0 0 0 2px #fff;
}
.badge.alert { background: #ff3d5a; }
@media (max-width: 360px) {
  .label { display: none; }
}
</style>
