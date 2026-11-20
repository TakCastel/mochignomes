<template>
  <div class="deck">
    <div class="side">
      <CandyButton v-for="a in left" :key="a.key" :action="a" :wiggle="wiggling === a.key" @press="press(a)" />
    </div>

    <div class="center">
      <button class="big" aria-label="Fiche de la créature" @click="gameBus.sheet = 'fiche'">
        <span class="big-face">
          <Icon name="ph:sparkle-fill" class="big-icon" />
        </span>
      </button>
      <span class="label">Fiche</span>
      <div class="grill" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>

    <div class="side">
      <CandyButton v-for="a in right" :key="a.key" :action="a" :wiggle="wiggling === a.key" @press="press(a)" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const { store } = useCreatureMood();

const BASE = [
  { key: "nourrir", label: "Manger", icon: "ph:bowl-food-fill", color: "#ffa51f", dark: "#c45a00" },
  { key: "laver", label: "Laver", icon: "ph:bathtub-fill", color: "#2b8cff", dark: "#0b47b8" },
  { key: "calin", label: "Câlin", icon: "ph:hand-heart-fill", color: "#ff4f86", dark: "#c0104f" },
  { key: "coucher", label: "Dodo", icon: "ph:moon-stars-fill", color: "#5560ff", dark: "#2326a8" },
  { key: "jouer", label: "Jouer", icon: "ph:soccer-ball-fill", color: "#2fd456", dark: "#0c8a2a" },
  { key: "danser", label: "Danser", icon: "ph:music-notes-fill", color: "#b25bff", dark: "#6417c9" },
  { key: "soigner", label: "Soigner", icon: "ph:syringe-fill", color: "#14c6e0", dark: "#037a96" },
  { key: "photo", label: "Photo", icon: "ph:camera-fill", color: "#ff7a2e", dark: "#c43f00" },
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
      color: wake ? "#ffc93c" : a.color,
      dark: wake ? "#c98a00" : a.dark,
      reason: reasonFor(a.key),
      highlight: a.key === "soigner" && store.health <= 0,
    };
  })
);
const left = computed(() => actions.value.slice(0, 4));
const right = computed(() => actions.value.slice(4));

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
/* plaque biseautée encastrée dans la coque */
.deck {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 4px;
  padding: 10px 6px 11px;
  border-radius: 44px;
  background: linear-gradient(180deg, #f1e6d7, #f8f0e5);
  box-shadow: inset 0 3px 5px rgba(140, 110, 80, 0.35), inset 0 -2px 2px #fff, 0 1px 0 #fff, 0 -1px 0 rgba(140, 110, 80, 0.25);
  /* le bas de la console vient vers nous */
  transform: perspective(650px) rotateX(10deg);
  transform-origin: 50% 0;
}
.side {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 4px;
  justify-items: center;
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.big {
  position: relative;
  width: var(--big, 70px);
  height: var(--big, 70px);
  padding: 7px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(145deg, #fffaf3, #eadfcf);
  box-shadow: 0 6px 0 #d6c3a9, 0 8px 14px rgba(120, 90, 60, 0.45), -4px -4px 10px #fff, inset 0 1px 0 #fff;
  cursor: pointer;
  transition: transform 0.08s, box-shadow 0.08s;
}
.big:active { transform: translateY(5px); box-shadow: 0 1px 0 #d6c3a9, 0 2px 4px rgba(120, 90, 60, 0.4), inset 0 1px 0 #fff; }
.big-face {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 26%, #ffe3a6, #f29a2e 50%, #c56a12 85%, #9a4a0a 100%);
  box-shadow: inset 0 -5px 8px rgba(90, 40, 0, 0.45), inset 0 4px 6px rgba(255, 255, 255, 0.55);
  transition: transform 0.08s;
}
.big:active .big-face { transform: scale(0.92); }
.badge {
  position: absolute;
  top: -2px;
  right: -2px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff4d4d;
  color: #fff;
  font: 900 13px "Nunito", system-ui, sans-serif;
  box-shadow: 0 2px 0 #b52020, 0 0 0 2px #fff;
}
.big-icon { width: 50%; height: 50%; color: #fff; filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 1px #7a3d08); }
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 600;
  font-size: 12px;
  color: #5a3a24;
  font-weight: 700;
  text-shadow: 0 1px 0 #fff;
}
.grill {
  display: none;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}
@media (min-height: 820px) {
  .grill { display: flex; }
}
@media (max-height: 740px) {
  .label { display: none; }
}
.grill span {
  width: 46px;
  height: 4px;
  border-radius: 999px;
  background: #d9cab6;
  box-shadow: inset 1px 1px 2px rgba(120, 90, 60, 0.5), 0 1px 0 #fff;
}
</style>
