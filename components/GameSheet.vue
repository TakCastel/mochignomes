<template>
  <div>
    <!-- pages plein écran (la barre du bas reste visible) : Elle, Jours, Album, Sac, Boutique -->
    <BaseSheet fullscreen :open="!!gameBus.page" :title="meta.title" :subtitle="meta.subtitle" :icon="meta.icon">
      <CreatureSheet v-if="gameBus.page === 'elle'" />
      <JournalSheet v-else-if="gameBus.page === 'jours'" />
      <AlbumSheet v-else-if="gameBus.page === 'album'" />
      <InventorySheet
        v-else-if="gameBus.page === 'sac'"
        :tab="gameBus.pageTab || 'tenues'"
        :focus="gameBus.pageFocus"
        @navigate="navigate"
      />
      <ShopSheet
        v-else-if="gameBus.page === 'boutique'"
        :tab="gameBus.pageTab || 'vetements'"
        :focus="gameBus.pageFocus"
        :focus-color="gameBus.pageFocusColor"
        @navigate="navigate"
      />
    </BaseSheet>

    <!-- réglages : petite fenêtre -->
    <BaseSheet :open="gameBus.sheet === 'reglages'" title="Réglages" icon="solar:settings-bold-duotone">
      <SettingsSheet />
    </BaseSheet>

    <!-- activités : records, maîtrises, cartes « bientôt » -->
    <BaseSheet :open="gameBus.sheet === 'activites'" title="Activités" subtitle="Ses jeux et ses records" icon="solar:cup-star-bold-duotone">
      <ActivitiesSheet @launch="launchActivity" />
    </BaseSheet>

    <!-- Manger : goûter ou plat du frigo -->
    <MealPicker :open="gameBus.sheet === 'manger'" @close="closeSheet" @cook="openKitchen()" />

    <!-- Cuisine : demi-hauteur, on la voit en 3D au-dessus -->
    <KitchenSheet :open="gameBus.sheet === 'cuisine'" :focus="gameBus.kitchenFocus" @close="closeKitchen" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ACHIEVEMENTS, ageInDays } from "~/lib/achievements";

const { store } = useCreatureMood();
const { photos, max } = useGallery();

function closeKitchen() {
  gameBus.kitchenFocus = "";
  closeSheet();
}

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
    case "sac":
      return { title: "Sac", subtitle: "Ses tenues, son frigo, sa collection", icon: "solar:bag-4-bold-duotone" };
    case "boutique":
      return { title: "Boutique", subtitle: "Vêtements, épicerie et objets", icon: "solar:shop-bold-duotone" };
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
