<template>
  <div>
    <!-- pages plein écran : Elle, Jours, Album -->
    <BaseSheet fullscreen :open="!!gameBus.page" :title="meta.title" :subtitle="meta.subtitle" :icon="meta.icon">
      <CreatureSheet v-if="gameBus.page === 'elle'" />
      <JournalSheet v-else-if="gameBus.page === 'jours'" />
      <AlbumSheet v-else-if="gameBus.page === 'album'" />
    </BaseSheet>

    <!-- réglages : petite fenêtre -->
    <BaseSheet :open="gameBus.sheet === 'reglages'" title="Réglages" icon="solar:settings-bold-duotone">
      <SettingsSheet />
    </BaseSheet>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ACHIEVEMENTS, ageInDays } from "~/lib/achievements";

const { store } = useCreatureMood();
const { photos, max } = useGallery();

const meta = computed(() => {
  switch (gameBus.page) {
    case "jours":
      return { title: "Jours", subtitle: `${store.streak || 0} jour${(store.streak || 0) > 1 ? "s" : ""} de suite`, icon: "solar:calendar-bold-duotone" };
    case "album":
      return {
        title: "Album",
        subtitle: gameBus.albumTab === "succes"
          ? `${store.unlocked.length} succès sur ${ACHIEVEMENTS.length}`
          : photos.value.length ? `${photos.value.length} photo${photos.value.length > 1 ? "s" : ""} sur ${max}` : "Aucune photo pour l'instant",
        icon: "solar:gallery-bold-duotone",
      };
    default: {
      const d = (store.lastUpdate, ageInDays(store));
      return {
        title: store.name || "Elle",
        subtitle: `${store.stageInfo?.label || ""} · ${d < 1 ? "née aujourd'hui" : `${d} jour${d > 1 ? "s" : ""} ensemble`}`,
        icon: "solar:heart-bold-duotone",
      };
    }
  }
});
</script>
