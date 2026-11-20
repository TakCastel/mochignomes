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
      <Icon :name="a.icon" class="ic" :style="{ '--c1': a.color[0], '--c2': a.color[1] }" />
      <Icon v-if="a.reason" name="ph:lock-simple-fill" class="lock" />
    </button>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

const { store } = useCreatureMood();

const BASE = [
  { key: "nourrir", label: "Manger", icon: "ph:bowl-food-fill", color: ["#ffb347", "#d9731a"], need: "hunger" },
  { key: "laver", label: "Laver", icon: "ph:bathtub-fill", color: ["#7cc6ff", "#2f86e0"], need: "cleanliness" },
  { key: "jouer", label: "Jouer", icon: "ph:soccer-ball-fill", color: ["#7ad85a", "#2e9a3a"], need: "fun" },
  { key: "calin", label: "Câlin", icon: "ph:hand-heart-fill", color: ["#ff86a8", "#e63b6e"] },
  { key: "coucher", label: "Dodo", icon: "ph:bed-fill", color: ["#8ea0ff", "#4a5cd0"], need: "energy" },
  { key: "soigner", label: "Soigner", icon: "ph:first-aid-kit-fill", color: ["#ff7a6a", "#d93a30"], need: "health" },
  { key: "danser", label: "Danser", icon: "ph:music-notes-fill", color: ["#c08cff", "#8048e0"] },
  { key: "photo", label: "Photo", icon: "ph:camera-fill", color: ["#5fd6cf", "#16928d"] },
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
      icon: wake ? "ph:sun-fill" : a.icon,
      color: wake ? ["#ffd84a", "#f29a00"] : a.color,
      reason: reasonFor(a.key),
    };
  })
);

// Action conseillée : celle du besoin le plus bas (mise en avant en vert)
const best = computed(() => {
  if (store.health <= 0) return "soigner";
  if (store.isSleeping) return null;
  let pick = null, low = 60;
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
  border-radius: 28px;
  background: rgba(246, 248, 251, 0.94);
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
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff, #f4f6f9);
  box-shadow: 0 4px 10px rgba(40, 55, 80, 0.1), 0 1px 0 rgba(40, 55, 80, 0.06), inset 0 1px 0 #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s, box-shadow 0.08s;
}
.tile:active { transform: scale(0.95); box-shadow: 0 1px 3px rgba(40, 55, 80, 0.12); }
/* icône pleine peinte en dégradé (relief), avec une ombre douce */
.ic {
  width: 58%;
  height: 58%;
  max-width: 52px;
  max-height: 52px;
  background-image: linear-gradient(180deg, var(--c1), var(--c2));
  filter: drop-shadow(0 3px 2px rgba(40, 55, 80, 0.18));
}
/* action conseillée : fond vert tendre et liseré vert */
.best {
  border-color: #8fdc6a;
  background: linear-gradient(180deg, #f3fdec, #e2f7d4);
  box-shadow: 0 4px 12px rgba(80, 180, 50, 0.25), inset 0 1px 0 #fff;
}
.locked .ic { opacity: 0.4; filter: grayscale(0.6); }
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
