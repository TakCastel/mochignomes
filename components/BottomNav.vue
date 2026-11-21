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
import { useInventoryStore } from "~/stores/useInventoryStore";

// 5 destinations au plus : Maison, Sac, Boutique, Cuisine, Elle (Jours et Album s'ouvrent depuis Elle)
const { store } = useCreatureMood();
const inv = useInventoryStore();
const pages = computed(() => store.unlockedPages || ["maison", "elle"]);
const has = (k) => !!store.features?.[k];

const active = computed(() => {
  if (gameBus.sheet === "cuisine") return "cuisine";
  const p = gameBus.page;
  if (!p) return "maison";
  if (p === "jours" || p === "album") return "elle";
  return p;
});

// Pastille : UNE seule à la fois dans la barre, pour la chose la plus utile à faire
// (récompense à prendre > nouveau vêtement ou set complet > coffre gratuit). Une envie de plat
// se voit déjà dans sa bulle et sur la tuile Manger : pas de pastille en plus.
// Seulement pour ce qui est réellement à faire, jamais pour une nouveauté pas encore découverte.
const questReady = computed(() =>
  pages.value.includes("jours") && (
    (has("defis") && (store.quests?.list || []).some((q) => q.progress >= q.target && !q.claimed))
    || store.pendingBonus > 0 || !!store.questBonusReady
  ));
const sacBadge = computed(() => has("sac") && (inv.unseenCount > 0 || (has("collection") && inv.setsReady.length > 0)));
const shopBadge = computed(() => has("boutique") && !!inv.chestReady);
const badgeKey = computed(() =>
  (questReady.value && "elle") || (sacBadge.value && "sac") || (shopBadge.value && "boutique") || "");

function goHome() {
  closePage();
  closeSheet();
}

const ALL = [
  { key: "maison", label: "Maison", icon: "solar:home-2-bold-duotone", run: goHome },
  { key: "sac", label: "Sac", icon: "solar:bag-4-bold-duotone", feature: "sac", run: () => openPage("sac") },
  { key: "boutique", label: "Boutique", icon: "solar:shop-bold-duotone", feature: "boutique", run: () => openPage("boutique") },
  { key: "cuisine", label: "Cuisine", icon: "solar:chef-hat-bold-duotone", feature: "cuisine", run: () => openKitchen() },
  { key: "elle", label: "Elle", icon: "solar:heart-bold-duotone", run: () => openPage("elle") },
];
// les entrées pas encore débloquées n'apparaissent pas
const items = computed(() =>
  ALL.filter((t) => !t.feature || has(t.feature)).map((t) => ({ ...t, badge: badgeKey.value === t.key })));
</script>

<style scoped>
.nav {
  display: flex;
  justify-content: space-around;
  height: var(--nav-h, 78px);
  box-sizing: content-box;
  padding: 0 10px env(safe-area-inset-bottom, 0px);
  border-radius: 28px 28px 0 0;
  background: var(--glass-solid);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: 0 -6px 24px rgba(30, 70, 120, 0.14), var(--glass-edge);
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
  animation: pop 0.45s var(--spring-strong);
  transition: transform 0.4s var(--spring-strong), background 0.2s, color 0.2s;
}
.item:active { transform: scale(0.9); transition-duration: 0.08s; }
.ic { width: 30px; height: 30px; transition: transform 0.45s var(--spring-strong); }
.label { font: 800 11px/1 var(--font-text); }
/* onglet actif : pastille bleu ciel, l'icône saute un peu plus haut */
.on { background: var(--sel-bg); color: var(--sel-ink); box-shadow: var(--sel-ring); }
.on .ic { transform: translateY(-2px) scale(1.08); }
.badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 24px);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dot);
  box-shadow: 0 0 0 2px #fff;
}
@keyframes pop { from { transform: scale(0.4); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .item { animation: none; } }
</style>
