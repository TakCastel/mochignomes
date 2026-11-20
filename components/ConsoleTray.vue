<template>
  <nav class="tray" aria-label="Menu">
    <button v-for="t in tiles" :key="t.key" class="tile" @click="gameBus.sheet = t.key">
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
  { key: "galerie", label: "Photos", icon: "ph:images-fill", badge: photos.value.length || null },
  {
    key: "succes",
    label: "Succès",
    icon: "ph:trophy-fill",
    badge: `${store.unlocked.length}/${ACHIEVEMENTS.length}`,
    alert: store.unlocked.length > gameBus.seenUnlocked,
  },
  { key: "journal", label: "Journal", icon: "ph:calendar-fill", badge: null },
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
  background: linear-gradient(180deg, #ebdecb, #f3e8d9);
  box-shadow: inset 0 3px 6px rgba(140, 105, 70, 0.4), inset 0 -2px 2px #fff, 0 1px 0 #fff;
}
.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
/* bouton rond en relief, caramel brillant */
.well {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--tile, 44px);
  height: var(--tile, 44px);
  border-radius: 50%;
  background: radial-gradient(circle at 36% 26%, #f2bf86, #c2793a 55%, #8a4a1a 100%);
  box-shadow:
    inset 0 2px 2px rgba(255, 255, 255, 0.55),
    inset 0 -4px 5px rgba(70, 30, 5, 0.45),
    0 4px 0 #74401a,
    0 6px 9px rgba(90, 50, 20, 0.4);
  transition: transform 0.08s, box-shadow 0.08s;
}
.well::after {
  content: "";
  position: absolute;
  top: 8%;
  left: 22%;
  width: 56%;
  height: 28%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0));
}
.tile:active .well {
  transform: translateY(3px);
  box-shadow: inset 0 2px 2px rgba(255, 255, 255, 0.55), inset 0 -4px 5px rgba(70, 30, 5, 0.45), 0 1px 0 #74401a;
}
.icon {
  position: relative;
  z-index: 1;
  width: 52%;
  height: 52%;
  color: #fff4e3;
  filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 1px rgba(70, 30, 5, 0.6));
}
.badge {
  position: absolute;
  z-index: 2;
  top: -6px;
  right: -12px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #fff;
  color: #8a4a1a;
  font-size: 10px;
  font-weight: 900;
  box-shadow: 0 2px 0 #d9c4a8;
  white-space: nowrap;
}
.badge.alert { background: #ff4d4d; color: #fff; box-shadow: 0 2px 0 #b52020; }
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: #5a3a24;
  text-shadow: 0 1px 0 #fff;
}
@media (max-width: 380px) {
  .label { display: none; }
}
</style>
