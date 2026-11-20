<template>
  <section class="panel" aria-label="Actions">
    <button
      v-for="a in actions"
      :key="a.key"
      class="tile"
      :class="{ best: a.key === best, locked: !!a.reason, wiggle: wiggling === a.key }"
      :aria-label="a.label + (a.reason ? ` (${a.reason})` : a.key === best ? ' (conseillé)' : '')"
      @click="press(a)"
    >
      <Icon :name="a.icon" mode="svg" class="ic" :style="{ '--c1': a.color[0], '--c2': a.color[1] }" />
      <Icon v-if="a.reason" name="solar:lock-keyhole-bold" class="lock" />
    </button>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

const { store } = useCreatureMood();

const BASE = [
  { key: "nourrir", label: "Manger", icon: "solar:donut-bitten-bold-duotone", color: ["#ffcf8a", "#e8781c"], need: "hunger" },
  { key: "laver", label: "Laver", icon: "solar:bath-bold-duotone", color: ["#a9dcff", "#2f86e0"], need: "cleanliness" },
  { key: "jouer", label: "Jouer", icon: "solar:football-bold-duotone", color: ["#b4ec9c", "#2a9a3a"], need: "fun" },
  { key: "calin", label: "Câlin", icon: "solar:hand-heart-bold-duotone", color: ["#f9bf94", "#ef3d6c"] },
  { key: "coucher", label: "Dodo", icon: "solar:bed-bold-duotone", color: ["#8f9fff", "#3a4bc0"], need: "energy" },
  { key: "soigner", label: "Soigner", icon: "solar:medical-kit-bold-duotone", color: ["#ff6d62", "#c42a24"], need: "health" },
  { key: "danser", label: "Danser", icon: "solar:music-notes-bold-duotone", color: ["#e0c4ff", "#8048e0"] },
  { key: "photo", label: "Photo", icon: "solar:camera-bold-duotone", color: ["#4fd2ca", "#0f6f69"] },
];

// Pourquoi une action n'est pas possible : la créature le dit elle-même
function reasonFor(key) {
  if (key === "photo") return null;
  if (store.health <= 0) return key === "soigner" ? null : "...";
  if (store.isSleeping) return key === "coucher" ? null : "Chut... je dors";
  if (key === "coucher" && store.energy >= 30) return "Je suis pas fatiguée !";
  if ((key === "jouer" || key === "danser") && store.energy < 10) return "Trop crevée...";
  return null;
}

const actions = computed(() =>
  BASE.map((a) => {
    const wake = a.key === "coucher" && store.isSleeping;
    return {
      ...a,
      label: wake ? "Réveil" : a.label,
      icon: wake ? "solar:sun-bold-duotone" : a.icon,
      color: wake ? ["#ffe58a", "#f29400"] : a.color,
      reason: reasonFor(a.key),
    };
  })
);

// Action conseillée : celle du besoin le plus bas, toujours mise en avant en vert
const best = computed(() => {
  if (store.health <= 0) return "soigner";
  if (store.isSleeping) return null;
  let pick = null, low = Infinity;
  for (const a of actions.value) {
    if (!a.need || a.reason) continue;
    if (store[a.need] < low) { low = store[a.need]; pick = a.key; }
  }
  return pick;
});

const wiggling = ref(null);
function press(a) {
  if (a.reason) {
    gameSay(a.reason);
    wiggling.value = null;
    requestAnimationFrame(() => (wiggling.value = a.key));
    setTimeout(() => { if (wiggling.value === a.key) wiggling.value = null; }, 450);
    return;
  }
  navigator.vibrate?.(12);
  if (a.key === "photo") return gameCommand("photo");
  if (a.key === "coucher") return store.isSleeping ? store.wakeUp() : store.startSleeping();
  store.applyAction(a.key);
}
</script>

<style scoped>
.panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap, 12px);
  padding: 14px;
  border-radius: 26px;
  background: rgba(244, 246, 249, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 28px rgba(40, 55, 80, 0.16), inset 0 1px 0 #fff;
}
/* tuile blanche douce */
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: var(--tile, 84px);
  padding: 0;
  border: 2px solid transparent;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f3f5f8);
  box-shadow: 0 4px 10px rgba(40, 55, 80, 0.1), 0 1px 0 rgba(40, 55, 80, 0.06), inset 0 1px 0 #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s, box-shadow 0.08s;
}
.tile:active { transform: scale(0.95); box-shadow: 0 1px 3px rgba(40, 55, 80, 0.12); }
/* icône Solar bicolore : ton clair pour le fond de l'objet, ton soutenu pour le dessin */
.ic {
  width: 62%;
  height: 62%;
  max-width: 50px;
  max-height: 50px;
  color: var(--c2);
  filter: drop-shadow(0 3px 3px rgba(40, 55, 80, 0.16));
}
.ic :deep([opacity]) { opacity: 1; color: var(--c1); }
/* action conseillée : fond vert tendre et liseré vert */
.best {
  border-color: #8fdc6a;
  background: linear-gradient(180deg, #f3fdec, #e2f7d4);
  box-shadow: 0 4px 12px rgba(80, 180, 50, 0.25), inset 0 1px 0 #fff;
}
.locked .ic { opacity: 0.5; }
.lock {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 14px;
  height: 14px;
  color: #9aa4b2;
}
.wiggle { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-6deg); }
  40% { transform: rotate(5deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(2deg); }
}
</style>
