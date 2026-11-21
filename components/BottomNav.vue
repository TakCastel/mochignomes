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
      <span class="icwrap">
        <Icon :name="t.icon" class="ic" />
        <span v-if="t.badge" class="badge" />
      </span>
      <span class="label">{{ t.label }}</span>
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
/* barre blanche nette ; l'onglet actif : pastille bleu pâle derrière l'icône, point sous le libellé */
.nav {
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  height: var(--nav-h, 64px);
  box-sizing: content-box;
  padding: 0 8px env(safe-area-inset-bottom, 0px);
  border-radius: 20px 20px 0 0;
  background: var(--surface);
  box-shadow: 0 -4px 14px rgba(30, 55, 100, 0.1), 0 -1px 0 #d6dfea;
}
.item {
  position: relative;
  flex: 1;
  max-width: 120px;
  min-width: 64px;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--hud-ink-2);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: pop 0.45s var(--spring-strong) backwards;
  transition: transform 0.4s var(--spring-strong), color 0.2s;
}
.item:nth-child(2) { animation-delay: 0.04s; }
.item:nth-child(3) { animation-delay: 0.08s; }
.item:nth-child(4) { animation-delay: 0.12s; }
.item:nth-child(5) { animation-delay: 0.16s; }
.item:active { transform: scale(0.9); transition-duration: 0.08s; }
.icwrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 52px;
  height: 40px;
  border-radius: 999px;
  transition: background 0.25s;
}
.ic { width: 30px; height: 30px; transition: transform 0.45s var(--spring-strong), color 0.2s; }
.label { font: 800 12px/1 var(--font-text); }
@media (hover: hover) { .item:not(.on):hover .ic { transform: translateY(-2px); } }
.item.on { color: var(--hud-ink); }
.item.on .icwrap { background: var(--sky-soft); }
.item.on .ic { color: var(--sky); transform: translateY(-2px); }
.item.on .label::after {
  content: "";
  display: block;
  width: 6px;
  height: 6px;
  margin: 2px auto -8px;
  border-radius: 50%;
  background: #2f95e8;
}
.badge {
  position: absolute;
  top: 2px;
  right: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff3b3b;
  box-shadow: 0 0 0 2px var(--surface);
  animation: badge 0.9s ease-in-out 3;
}
@keyframes badge { 50% { transform: scale(1.35); } }
@keyframes pop { from { transform: scale(0.4); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .item, .badge { animation: none; } .item, .ic, .icwrap { transition: none; } }
</style>
