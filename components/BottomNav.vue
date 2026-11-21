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
/* niveau 3 : barre bleu ciel dense, ancrée en bas, reflet de verre en haut */
.nav {
  position: relative;
  display: flex;
  justify-content: space-around;
  height: var(--nav-h, 78px);
  box-sizing: content-box;
  padding: 0 10px env(safe-area-inset-bottom, 0px);
  border-radius: 30px 30px 0 0;
  background: var(--nav-sky);
  box-shadow: 0 -8px 26px rgba(20, 60, 130, 0.32), var(--nav-sky-edge);
  align-items: center;
}
.nav::before {
  content: "";
  position: absolute;
  inset: 3px 3px auto 3px;
  height: 38%;
  border-radius: 28px 28px 50% 50% / 28px 28px 14px 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  pointer-events: none;
}
.item {
  position: relative;
  flex: 1;
  max-width: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 58px;
  margin: 0 3px;
  padding: 4px 0;
  border: 0;
  border-radius: 20px;
  background: none;
  color: #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: pop 0.45s var(--spring-strong) backwards;
  transition: transform 0.4s var(--spring-strong), background 0.25s, color 0.2s, box-shadow 0.25s;
}
.item:nth-child(2) { animation-delay: 0.04s; }
.item:nth-child(3) { animation-delay: 0.08s; }
.item:nth-child(4) { animation-delay: 0.12s; }
.item:nth-child(5) { animation-delay: 0.16s; }
.item:active { transform: scale(0.88); transition-duration: 0.08s; }
.ic { width: 28px; height: 28px; filter: drop-shadow(0 2px 2px rgba(10, 40, 100, 0.4)); transition: transform 0.45s var(--spring-strong); }
.label { font: 800 11px/1 var(--font-text); text-shadow: 0 1px 2px rgba(10, 40, 100, 0.55); }
@media (hover: hover) { .item:not(.on):hover .ic { transform: translateY(-2px) scale(1.08); } }
/* onglet actif : pilule blanche en relief, icône bleu ciel qui saute */
.on {
  background: linear-gradient(180deg, #ffffff, #dff0ff);
  color: var(--sky-ink);
  box-shadow: 0 5px 12px rgba(8, 36, 90, 0.38), inset 0 -3px 6px rgba(108, 194, 255, 0.4), inset 0 2px 0 #fff;
  animation: pop 0.45s var(--spring-strong) backwards, settle 0.5s var(--spring-strong);
}
.on .ic { color: var(--sky); filter: drop-shadow(0 2px 2px rgba(30, 100, 190, 0.3)); transform: translateY(-2px) scale(1.1); }
.on .label { text-shadow: none; }
.badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 24px);
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--dot);
  box-shadow: 0 0 0 2px #fff, 0 0 8px rgba(255, 59, 59, 0.7);
  animation: badge 1.6s ease-in-out infinite;
}
@keyframes badge { 50% { transform: scale(1.25); } }
@keyframes pop { from { transform: scale(0.4); opacity: 0; } }
@keyframes settle { from { transform: translateY(6px) scale(0.92); } }
@media (prefers-reduced-motion: reduce) { .item, .on, .badge { animation: none; } .item, .ic { transition: none; } }
</style>
