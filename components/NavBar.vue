<template>
  <nav class="nav" aria-label="Menu">
    <button v-for="t in items" :key="t.key" class="item" :class="{ main: t.main }" :aria-label="t.label" @click="t.run">
      <span class="disc">
        <Icon :name="t.icon" class="ic" />
        <span v-if="t.badge" class="badge">{{ t.badge }}</span>
      </span>
      <span class="label">{{ t.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from "vue";

const emit = defineEmits(["actions"]);
const { store } = useCreatureMood();
const { photos } = useGallery();

function dance() {
  if (store.health <= 0) return gameSay("...");
  if (store.isSleeping) return gameSay("Chut... je dors");
  if (store.energy < 10) return gameSay("Trop crevée...");
  navigator.vibrate?.(12);
  store.applyAction("danser");
}

const items = computed(() => [
  { key: "journal", label: "Journal", icon: "ph:notebook-fill", run: () => (gameBus.sheet = "journal") },
  { key: "danser", label: "Danser", icon: "ph:music-notes-fill", run: dance },
  { key: "actions", label: "S'occuper", icon: "ph:hand-heart-fill", main: true, run: () => emit("actions") },
  { key: "photo", label: "Photo", icon: "ph:camera-fill", run: () => gameCommand("photo") },
  { key: "galerie", label: "Galerie", icon: "ph:images-fill", badge: photos.value.length || null, run: () => (gameBus.sheet = "galerie") },
]);
</script>

<style scoped>
.nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: end;
  padding: 10px 6px 8px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(25, 45, 80, 0.18);
}
.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.disc {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #eef4f8;
  transition: transform 0.1s;
}
.item:active .disc { transform: scale(0.92); }
.ic { width: 24px; height: 24px; color: var(--accent); }
/* bouton central mis en avant : il ouvre le menu d'actions */
.main .disc {
  width: 62px;
  height: 62px;
  margin-top: -26px;
  background: linear-gradient(180deg, var(--accent-hi), var(--accent));
  box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 0 5px #fff;
}
.main .ic { width: 32px; height: 32px; color: #fff; }
.label { font: 800 11.5px "Nunito", system-ui, sans-serif; color: var(--ink); }
.main .label { color: var(--accent-lo); }
.badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: #ef4b4b;
  color: #fff;
  font: 900 10px "Nunito", system-ui, sans-serif;
  box-shadow: 0 0 0 2px #fff;
}
</style>
