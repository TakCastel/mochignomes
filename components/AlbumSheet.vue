<template>
  <div class="album">
    <div class="seg" role="tablist" aria-label="Album">
      <button v-for="t in TABS" :key="t.key" class="opt" role="tab" :aria-selected="gameBus.albumTab === t.key" :class="{ on: gameBus.albumTab === t.key }" @click="gameBus.albumTab = t.key">
        <Icon :name="t.icon" class="ic" />
        {{ t.label }}
        <span v-if="t.key === 'succes' && fresh" class="dot" />
      </button>
    </div>
    <AchievementsSheet v-if="gameBus.albumTab === 'succes'" />
    <GallerySheet v-else />
  </div>
</template>

<script setup>
import { computed, watch } from "vue";

const { store } = useCreatureMood();
const TABS = [
  { key: "photos", label: "Photos", icon: "solar:gallery-bold-duotone" },
  { key: "succes", label: "Succès", icon: "solar:cup-star-bold-duotone" },
];
const fresh = computed(() => store.unlocked.length > gameBus.seenUnlocked && gameBus.albumTab !== "succes");
watch(() => [gameBus.albumTab, store.unlocked.length], ([tab]) => {
  if (tab === "succes") gameBus.seenUnlocked = store.unlocked.length;
}, { immediate: true });
</script>

<style scoped>
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  background: #e6ebf2;
}
.opt {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #5b6676;
  font: 800 15px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.opt.on { background: #fff; color: #3c9a22; box-shadow: 0 2px 8px rgba(40, 55, 80, 0.16); }
.ic { width: 22px; height: 22px; }
.dot { position: absolute; top: 9px; right: 18%; width: 9px; height: 9px; border-radius: 50%; background: #ff3b3b; }
</style>
