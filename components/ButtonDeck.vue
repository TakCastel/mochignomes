<template>
  <div class="deck">
    <div class="side">
      <CandyButton v-for="a in left" :key="a.key" :action="a" :wiggle="wiggling === a.key" @press="press(a)" />
    </div>

    <div class="center">
      <button class="big" aria-label="Fiche de la créature" @click="gameBus.sheet = 'fiche'">
        <span class="big-face">
          <Icon name="fluent-emoji-flat:sparkles" class="big-icon" />
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
  { key: "nourrir", label: "Manger", icon: "fluent-emoji-flat:bread", color: "#ffb02e", dark: "#c46a00" },
  { key: "laver", label: "Laver", icon: "fluent-emoji-flat:bathtub", color: "#3d9bff", dark: "#1258c4" },
  { key: "calin", label: "Câlin", icon: "fluent-emoji-flat:two-hearts", color: "#ff5c8a", dark: "#c2185b" },
  { key: "coucher", label: "Dodo", icon: "fluent-emoji-flat:crescent-moon", color: "#5b5fd6", dark: "#2e2f94" },
  { key: "jouer", label: "Jouer", icon: "fluent-emoji-flat:soccer-ball", color: "#3ccf5a", dark: "#16862f" },
  { key: "danser", label: "Danser", icon: "fluent-emoji-flat:musical-notes", color: "#b16cff", dark: "#6a2fc4" },
  { key: "soigner", label: "Soigner", icon: "fluent-emoji-flat:syringe", color: "#2ec5d8", dark: "#0b7f92" },
  { key: "photo", label: "Photo", icon: "fluent-emoji-flat:camera-with-flash", color: "#ff8a3d", dark: "#c24f0a" },
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
      icon: wake ? "fluent-emoji-flat:sun-with-face" : a.icon,
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
.deck {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 6px;
}
.side {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 6px;
  justify-items: center;
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.big {
  width: var(--big, 70px);
  height: var(--big, 70px);
  padding: 7px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(145deg, #fffaf3, #eadfcf);
  box-shadow: 4px 6px 12px rgba(140, 110, 80, 0.45), -4px -4px 10px #fff, inset 0 0 0 1px rgba(255, 255, 255, 0.7);
  cursor: pointer;
}
.big-face {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, #ffd58a, #d9862b 60%, #9a5212);
  box-shadow: inset 0 -5px 8px rgba(90, 40, 0, 0.45), inset 0 4px 6px rgba(255, 255, 255, 0.55);
  transition: transform 0.08s;
}
.big:active .big-face { transform: scale(0.92); }
.big-icon { width: 58%; height: 58%; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.2)); }
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 600;
  font-size: 12px;
  color: #6b4a33;
}
.grill {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}
.grill span {
  width: 46px;
  height: 4px;
  border-radius: 999px;
  background: #d9cab6;
  box-shadow: inset 1px 1px 2px rgba(120, 90, 60, 0.5), 0 1px 0 #fff;
}
</style>
