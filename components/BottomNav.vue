<template>
  <nav class="nav" aria-label="Navigation">
    <button
      v-for="t in items"
      :key="t.key"
      class="item"
      :class="{ on: active === t.key }"
      :aria-current="active === t.key ? 'page' : undefined"
      @click="t.run"
    >
      <Icon :name="t.icon" class="ic" />
      <span class="label">{{ t.label }}</span>
      <span v-if="t.badge" class="badge" />
    </button>
  </nav>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
const active = computed(() => gameBus.page || "maison");
const pages = computed(() => store.unlockedPages || ["maison", "elle"]);

// pastille : défi prêt à réclamer (Jours) ou succès pas encore vu (Album)
const questReady = computed(() => (store.quests?.list || []).some((q) => q.progress >= q.target && !q.claimed) || store.pendingBonus > 0);
const newUnlocked = computed(() => store.unlocked.length > gameBus.seenUnlocked);

const ALL = [
  { key: "maison", label: "Maison", icon: "solar:home-2-bold-duotone", run: closePage },
  { key: "elle", label: "Elle", icon: "solar:heart-bold-duotone", run: () => openPage("elle") },
  { key: "jours", label: "Jours", icon: "solar:calendar-bold-duotone", run: () => openPage("jours") },
  { key: "album", label: "Album", icon: "solar:gallery-bold-duotone", run: () => openPage("album") },
];
// les entrées pas encore débloquées n'apparaissent pas
const items = computed(() =>
  ALL.filter((t) => pages.value.includes(t.key)).map((t) => ({
    ...t,
    badge: (t.key === "jours" && questReady.value) || (t.key === "album" && newUnlocked.value),
  }))
);
</script>

<style scoped>
.nav {
  display: flex;
  justify-content: space-around;
  height: var(--nav-h, 78px);
  box-sizing: content-box;
  padding: 0 10px env(safe-area-inset-bottom, 0px);
  border-radius: 28px 28px 0 0;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 -6px 24px rgba(40, 55, 80, 0.12);
  align-items: center;
}
.item {
  position: relative;
  flex: 1;
  max-width: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 56px;
  margin: 0 3px;
  padding: 4px 0;
  border: 0;
  border-radius: 18px;
  background: none;
  color: #5b6472;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: pop 0.45s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.ic { width: 30px; height: 30px; }
.label { font: 800 11px/1 "Nunito", system-ui, sans-serif; }
.on { background: linear-gradient(180deg, #e9fadf, #d6f3c4); color: #3c9a22; }
.badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 24px);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff3b3b;
  box-shadow: 0 0 0 2px #fff;
}
@keyframes pop { from { transform: scale(0.4); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .item { animation: none; } }
</style>
