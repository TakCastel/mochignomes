<template>
  <nav class="dock" aria-label="Actions">
    <button
      v-for="a in actions"
      :key="a.key"
      class="action"
      :class="{ locked: !!a.reason, highlight: a.highlight, wiggle: wiggling === a.key }"
      :style="{ '--c': a.color, '--c-dark': a.dark }"
      :aria-label="a.label + (a.reason ? ` (${a.reason})` : '')"
      @click="press(a)"
    >
      <span class="face">
        <Icon :name="a.icon" class="icon" />
      </span>
      <span class="label">{{ a.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { computed, ref } from "vue";

const { store } = useCreatureMood();

const BASE = [
  { key: "nourrir", label: "Manger", icon: "fluent-emoji-flat:bread", color: "#ffb02e", dark: "#d9800b" },
  { key: "laver", label: "Laver", icon: "fluent-emoji-flat:soap", color: "#4cb8ff", dark: "#1f8bd1" },
  { key: "jouer", label: "Jouer", icon: "fluent-emoji-flat:soccer-ball", color: "#45d47a", dark: "#22a552" },
  { key: "coucher", label: "Dodo", icon: "fluent-emoji-flat:crescent-moon", color: "#a77dff", dark: "#7a4fe0" },
  { key: "soigner", label: "Soigner", icon: "fluent-emoji-flat:syringe", color: "#ff6b7d", dark: "#d93f55" },
];

// Pourquoi une action n'est pas possible : la créature le dit elle-même
function reasonFor(key) {
  if (store.health <= 0) return key === "soigner" ? null : "...";
  if (store.isSleeping) return key === "coucher" ? null : "Chut... je dors";
  if (key === "coucher" && store.energy >= 30) return "Je suis pas fatiguée !";
  if (key === "jouer" && store.energy < 10) return "Trop crevée pour jouer...";
  return null;
}

const actions = computed(() =>
  BASE.map((a) => {
    const sleepingButton = a.key === "coucher" && store.isSleeping;
    return {
      ...a,
      label: sleepingButton ? "Réveil" : a.label,
      icon: sleepingButton ? "fluent-emoji-flat:sun-with-face" : a.icon,
      color: sleepingButton ? "#ffc93c" : a.color,
      dark: sleepingButton ? "#e09a00" : a.dark,
      reason: reasonFor(a.key),
      highlight: a.key === "soigner" && store.health <= 0,
    };
  })
);

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
  if (a.key === "coucher") {
    if (store.isSleeping) store.wakeUp();
    else store.startSleeping();
  } else {
    store.applyAction(a.key);
  }
}
</script>

<style scoped>
.dock {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 12px 12px calc(env(safe-area-inset-bottom, 0px) + 14px);
  background: linear-gradient(180deg, #fff6e6, #ffe2b8);
  border-top: 3px solid #fff;
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -4px 0 rgba(74, 36, 16, 0.12), 0 -10px 30px rgba(30, 20, 60, 0.22);
}
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.face {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  max-width: 64px;
  aspect-ratio: 1;
  border-radius: 20px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 62%, #fff), var(--c) 50%, color-mix(in srgb, var(--c) 85%, #000) 100%);
  border: 2.5px solid color-mix(in srgb, var(--c-dark) 70%, #000);
  box-shadow: 0 6px 0 var(--c-dark), 0 9px 14px rgba(60, 30, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.55);
  transition: transform 0.08s, box-shadow 0.08s, filter 0.2s;
}
.face::after {
  content: "";
  position: absolute;
  left: 14%;
  right: 14%;
  top: 7%;
  height: 26%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
}
.icon {
  width: 58%;
  height: 58%;
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.15));
  position: relative;
  z-index: 1;
}
.action:active .face {
  transform: translateY(5px);
  box-shadow: 0 1px 0 var(--c-dark), 0 3px 6px rgba(60, 30, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.55);
}
.action:focus-visible .face { outline: 3px solid #4a2410; outline-offset: 3px; }
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #4a2410;
}
.locked .face {
  filter: grayscale(0.85) brightness(1.05);
  opacity: 0.7;
}
.locked .label { opacity: 0.55; }
.highlight .face { animation: beckon 1s ease-in-out infinite; }
@keyframes beckon {
  50% { transform: translateY(-4px) scale(1.06); }
}
.wiggle .face { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-10deg); }
  40% { transform: rotate(9deg); }
  60% { transform: rotate(-6deg); }
  80% { transform: rotate(3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .highlight .face, .wiggle .face { animation: none; }
}
</style>
