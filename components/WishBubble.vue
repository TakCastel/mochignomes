<template>
  <Transition name="wb">
    <button v-if="shown" :key="shown.key" class="wish" :class="{ wish: true, real: shown.wish, urgent: shown.urgent }" type="button" @click="tap">
      <Icon :name="shown.icon" class="wi" />
      <span class="wt">{{ shown.text }}</span>
      <span class="tail" aria-hidden="true" />
    </button>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import * as dialogue from "~/lib/dialogue";
import { useInventoryStore } from "~/stores/useInventoryStore";

// Bulle de pensée : envie courante, sinon besoin le plus urgent, sinon une petite phrase
const { store } = useCreatureMood();

const NEEDS = {
  hunger: { icon: "solar:donut-bitten-bold-duotone", text: "J'ai un petit creux...", action: "nourrir" },
  cleanliness: { icon: "solar:bath-bold-duotone", text: "Je me sens sale...", action: "laver" },
  fun: { icon: "solar:football-bold-duotone", text: "Je m'ennuie un peu...", action: "jouer" },
  energy: { icon: "solar:bed-bold-duotone", text: "Je suis fatiguée...", action: "coucher" },
};
const ACTION_ICON = {
  nourrir: "solar:donut-bitten-bold-duotone", laver: "solar:bath-bold-duotone", jouer: "solar:football-bold-duotone",
  calin: "solar:hand-heart-bold-duotone", coucher: "solar:bed-bold-duotone", soigner: "solar:medical-kit-bold-duotone",
  danser: "solar:music-notes-bold-duotone", chatouiller: "solar:hand-heart-bold-duotone",
};

const line = ref("");
let lineTimer = null, hideTimer = null;
function newLine() {
  try {
    const t = dialogue.lineFor?.(store, {});
    line.value = typeof t === "string" ? t : t?.text || "";
  } catch { line.value = ""; }
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => (line.value = ""), 9000);
}

const shown = computed(() => {
  if (store.isSleeping || store.onboardStep < 6 || store.hatched === false) return null;
  const w = store.wish;
  if (w && w.action) {
    return { key: "w" + (w.id || w.action), wish: true, icon: w.icon || ACTION_ICON[w.action] || "solar:heart-bold-duotone", text: w.text || "J'ai envie de quelque chose...", action: w.action };
  }
  if (store.illness) return { key: "ill", urgent: true, icon: "solar:thermometer-bold-duotone", text: "Je ne me sens pas bien...", action: "soigner" };
  let k = null, low = 35;
  for (const n of Object.keys(NEEDS)) if (store[n] < low) { low = store[n]; k = n; }
  if (k) return { key: "n" + k, urgent: true, ...NEEDS[k] };
  if (line.value) return { key: "l" + line.value, icon: "solar:heart-bold-duotone", text: line.value, action: null };
  return null;
});

const inv = useInventoryStore();
function tap() {
  const a = shown.value?.action;
  if (!a) return;
  const w = store.wish;
  // envies « objets possédés » : on emmène directement au bon endroit
  if (shown.value.wish && w?.target) {
    if (a === "activite") return launchActivity(w.target);
    if (a === "repas") {
      if ((inv.meals?.[w.target] || 0) > 0) return openSheet("manger");
      if (store.features?.cuisine) return openKitchen(w.target);
    }
    if (a === "tenue" && store.features?.sac) return openPage("sac", { tab: "tenues", focus: w.target });
  }
  if (a === "repas" || a === "nourrir") return highlightAction("nourrir");
  if (a === "activite") return highlightAction("jouer");
  highlightAction(a);
}

onMounted(() => {
  setTimeout(newLine, 4000);
  lineTimer = setInterval(newLine, 50000);
});
onBeforeUnmount(() => { clearInterval(lineTimer); clearTimeout(hideTimer); });
</script>

<style scoped>
.wish {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(260px, 78vw);
  min-height: 44px;
  padding: 8px 14px 8px 10px;
  border: 0;
  border-radius: 22px;
  background: #fff;
  color: #2b3440;
  font: 700 14px/1.2 "Nunito", system-ui, sans-serif;
  text-align: left;
  box-shadow: 0 6px 16px rgba(40, 55, 80, 0.2);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: bob 3s ease-in-out infinite;
}
.wish.real { box-shadow: 0 6px 16px rgba(255, 79, 134, 0.3), 0 0 0 2px #ffb3cb; }
.wish.urgent .wi { color: #e8781c; }
.wi { flex: none; width: 26px; height: 26px; color: #ef3d6c; }
.tail {
  position: absolute;
  left: 22px;
  bottom: -7px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 8px 8px 0 -3px #fff;
}
@keyframes bob { 50% { transform: translateY(-4px); } }
.wb-enter-active, .wb-leave-active { transition: opacity 0.25s, transform 0.3s cubic-bezier(0.3, 1.6, 0.5, 1); }
.wb-enter-from, .wb-leave-to { opacity: 0; transform: scale(0.7) translateY(8px); }
@media (prefers-reduced-motion: reduce) { .wish { animation: none; } }
</style>
