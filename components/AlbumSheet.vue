<template>
  <div class="ui-page album">
    <div class="ui-tabs" role="tablist" aria-label="Album">
      <button v-for="t in TABS" :key="t.key" class="ui-tab" role="tab" :aria-selected="gameBus.albumTab === t.key" :class="{ 'is-on': gameBus.albumTab === t.key }" @click="gameBus.albumTab = t.key">
        <Icon :name="t.icon" class="ic" />
        <span>{{ t.label }}</span>
        <span v-if="t.key === 'succes' && fresh" class="ui-dot" />
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
  if (tab === "succes") markSeenUnlocked(store.unlocked.length);
}, { immediate: true });
</script>
