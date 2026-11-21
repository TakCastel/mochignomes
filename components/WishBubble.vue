<template>
  <Transition name="wb">
    <button v-if="shown" :key="shown.key" class="wish" :class="{ real: shown.wish, urgent: shown.urgent, calm: calm }" type="button" @click="tap">
      <img v-if="shownImg" :src="shownImg" alt="" class="wimg" draggable="false">
      <Icon v-else :name="shown.icon" class="wi" />
      <span class="wt">{{ shown.text }}</span>
      <span v-if="shown.wish" class="heart" aria-hidden="true">&#10084;</span>
      <span class="tail" aria-hidden="true" />
    </button>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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

const IMG = {
  nourrir: "manger", repas: "manger", laver: "laver", jouer: "jouer", activite: "jouer", calin: "tendresse",
  coucher: "dodo", soigner: "soigner", danser: "danser",
};
const shownImg = computed(() => {
  const f = IMG[shown.value?.action];
  return f ? `/icons/actions/${f}.svg` : null;
});
// la bulle se calme (ne bouge plus) après 3 s
const calm = ref(false);
let calmTimer = null;

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

watch(() => shown.value?.key, () => {
  calm.value = false;
  clearTimeout(calmTimer);
  calmTimer = setTimeout(() => (calm.value = true), 3000);
}, { immediate: true });

const emit = defineEmits(["pick"]);
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
  if (a === "repas" || a === "nourrir") { highlightAction("nourrir"); return emit("pick", "nourrir"); }
  if (a === "activite" || a === "jouer") { highlightAction("jouer"); return emit("pick", "jouer"); }
  emit("pick", a);
}

onMounted(() => {
  setTimeout(newLine, 4000);
  lineTimer = setInterval(newLine, 50000);
});
onBeforeUnmount(() => { clearInterval(lineTimer); clearTimeout(hideTimer); clearTimeout(calmTimer); });
</script>

<style scoped>
.wish {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(260px, 78vw);
  min-height: 48px;
  padding: 8px 14px 8px 10px;
  border: 1px solid #d6dfea;
  border-radius: 18px;
  background: var(--surface);
  color: var(--hud-ink);
  font: 800 15px/1.25 var(--font-text);
  text-align: left;
  box-shadow: 0 2px 0 #c9d4e2, 0 6px 16px rgba(30, 55, 100, 0.14);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: bob 4s ease-in-out infinite;
}
.wish.calm { animation: none; }
.wish.real { border-color: #ffc2d4; }
.wish.urgent .wi { color: var(--warn); }
.wi { flex: none; width: 28px; height: 28px; color: var(--love); }
.wimg {
  flex: none;
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff);
  pointer-events: none;
}
.wt { min-width: 0; }
.heart { flex: none; margin-left: -2px; font-size: 14px; line-height: 1; color: #ff4f86; }
/* queue : vrai triangle, filet compris */
.tail {
  position: absolute;
  left: 20px;
  bottom: -9px;
  width: 16px;
  height: 10px;
  background: #d6dfea;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
.tail::after {
  content: "";
  position: absolute;
  inset: 0 0 1px 0;
  background: var(--surface);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  top: -1px;
}
@keyframes bob { 50% { transform: translateY(-2px); } }
.wb-enter-active, .wb-leave-active { transition: opacity 0.25s, transform 0.3s cubic-bezier(0.3, 1.6, 0.5, 1); }
.wb-enter-from, .wb-leave-to { opacity: 0; transform: scale(0.7) translateY(8px); }
@media (prefers-reduced-motion: reduce) { .wish { animation: none; } }
</style>
