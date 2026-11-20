<template>
  <BaseSheet :open="!!gameBus.sheet" :title="meta.title" :subtitle="meta.subtitle" :icon="meta.icon">
    <!-- onglets du carnet (pas pour les réglages) -->
    <nav v-if="gameBus.sheet !== 'reglages'" class="tabs" aria-label="Carnet">
      <button
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ active: gameBus.sheet === t.key }"
        :aria-current="gameBus.sheet === t.key ? 'page' : undefined"
        @click="gameBus.sheet = t.key"
      >
        <Icon :name="t.icon" class="tab-icon" />
        <span>{{ t.label }}</span>
        <span v-if="t.key === 'succes' && fresh" class="dot" />
      </button>
    </nav>

    <CreatureSheet v-if="gameBus.sheet === 'fiche'" />
    <AchievementsSheet v-else-if="gameBus.sheet === 'succes'" />
    <GallerySheet v-else-if="gameBus.sheet === 'galerie'" />
    <JournalSheet v-else-if="gameBus.sheet === 'journal'" />
    <SettingsSheet v-else-if="gameBus.sheet === 'reglages'" />
  </BaseSheet>
</template>

<script setup>
import { computed, watch } from "vue";
import { ACHIEVEMENTS, ageInDays } from "~/lib/achievements";
import { TRAIT_INFO } from "~/lib/gameUi";

const { store } = useCreatureMood();
const { photos, max } = useGallery();

const TABS = [
  { key: "fiche", label: "Fiche", icon: "ph:sparkle-fill" },
  { key: "succes", label: "Succès", icon: "ph:trophy-fill" },
  { key: "galerie", label: "Photos", icon: "ph:images-fill" },
  { key: "journal", label: "Journal", icon: "ph:calendar-fill" },
];

// pastille sur l'onglet Succès tant qu'il en reste à voir
const fresh = computed(() => store.unlocked.length > 0 && gameBus.sheet !== "succes" && gameBus.seenUnlocked !== store.unlocked.length);

watch(() => [gameBus.sheet, store.unlocked.length], ([sheet]) => {
  if (sheet === "succes") gameBus.seenUnlocked = store.unlocked.length;
}, { immediate: true });

const meta = computed(() => {
  switch (gameBus.sheet) {
    case "succes":
      return { title: "Succès", subtitle: `${store.unlocked.length} sur ${ACHIEVEMENTS.length} débloqués`, icon: "ph:trophy-fill" };
    case "galerie":
      return {
        title: "Photos",
        subtitle: photos.value.length ? `${photos.value.length} photo${photos.value.length > 1 ? "s" : ""} sur ${max}` : "Aucune photo pour l'instant",
        icon: "ph:images-fill",
      };
    case "journal": {
      const d = (store.lastUpdate, ageInDays(store));
      return { title: "Journal", subtitle: d < 1 ? `${store.name} est née aujourd'hui` : `${store.name} a ${d} jour${d > 1 ? "s" : ""}`, icon: "ph:calendar-fill" };
    }
    case "reglages":
      return { title: "Réglages", subtitle: "", icon: "ph:gear-six-fill" };
    default: {
      const strong = Object.entries(TRAIT_INFO)
        .map(([k, i]) => ({ label: i.label, v: store.traits[k] || 0 }))
        .filter((t) => t.v >= 0.35)
        .sort((a, b) => b.v - a.v);
      const subtitle = strong.length
        ? `Elle devient ${strong.slice(0, 2).map((t) => t.label.toLowerCase()).join(" et ")}.`
        : "Son caractère est encore en train de se former.";
      return { title: store.name || "...", subtitle, icon: "ph:sparkle-fill" };
    }
  }
});
</script>

<style scoped>
.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin: 4px 0 10px;
  padding: 5px;
  border-radius: 999px;
  background: #efe2d0;
  box-shadow: inset 2px 2px 5px rgba(140, 110, 80, 0.35), inset -2px -2px 5px #fff;
}
.tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 4px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #8a5a3a;
  font: 800 13px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.tab.active {
  background: linear-gradient(180deg, #a68cff, #6f4fe0);
  color: #fff;
  box-shadow: 0 3px 0 #4b2fb0, inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.tab-icon { width: 17px; height: 17px; flex: none; }
.dot {
  position: absolute;
  top: 4px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4d4d;
  box-shadow: 0 0 0 2px #efe2d0;
}
@media (max-width: 360px) {
  .tab span:not(.dot) { display: none; }
}
</style>
