<template>
  <div class="pad">
    <button
      v-for="a in actions"
      :key="a.key"
      class="jelly"
      :class="{ locked: !!a.reason, highlight: a.highlight, wiggle: wiggling === a.key }"
      :style="{ '--c': a.color, '--d': a.dark }"
      :aria-label="a.label + (a.reason ? ` (${a.reason})` : '')"
      @click="press(a)"
    >
      <Icon :name="a.icon" class="emoji" />
      <span v-if="a.reason" class="lock"><Icon name="ph:lock-simple-fill" class="lock-icon" /></span>
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const { store } = useCreatureMood();

const BASE = [
  { key: "nourrir", label: "Manger", icon: "fluent-emoji:bread", color: "#ffad42", dark: "#d9710f" },
  { key: "laver", label: "Laver", icon: "fluent-emoji:bathtub", color: "#58a8ff", dark: "#2a66d6" },
  { key: "jouer", label: "Jouer", icon: "fluent-emoji:soccer-ball", color: "#77d548", dark: "#3c9420" },
  { key: "coucher", label: "Dodo", icon: "fluent-emoji:crescent-moon", color: "#a36cf0", dark: "#6534c2" },
  { key: "calin", label: "Câlin", icon: "fluent-emoji:sparkling-heart", color: "#ff6f9f", dark: "#d4386b" },
  { key: "soigner", label: "Soigner", icon: "fluent-emoji:syringe", color: "#3fd2bf", dark: "#159488" },
];

// Pourquoi une action n'est pas possible : la créature le dit elle-même
function reasonFor(key) {
  if (store.health <= 0) return key === "soigner" ? null : "...";
  if (store.isSleeping) return key === "coucher" ? null : "Chut... je dors";
  if (key === "coucher" && store.energy >= 30) return "Je suis pas fatiguée !";
  if (key === "jouer" && store.energy < 10) return "Trop crevée...";
  return null;
}

const actions = computed(() =>
  BASE.map((a) => {
    const wake = a.key === "coucher" && store.isSleeping;
    return {
      ...a,
      label: wake ? "Réveil" : a.label,
      icon: wake ? "fluent-emoji:sun-with-face" : a.icon,
      color: wake ? "#ffc93c" : a.color,
      dark: wake ? "#d18a00" : a.dark,
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
  if (a.key === "coucher") return store.isSleeping ? store.wakeUp() : store.startSleeping();
  store.applyAction(a.key);
}
</script>

<style scoped>
/* panneau crème qui porte les boutons */
.pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap, 12px) 14px;
  padding: 16px 16px 20px;
  border-radius: 36px;
  background: linear-gradient(180deg, #fbf1e6 0%, #f6e3cf 100%);
  box-shadow:
    0 10px 26px rgba(60, 40, 20, 0.22),
    inset 0 2px 0 #fff,
    0 0 0 1.5px rgba(255, 255, 255, 0.7);
}
/* bouton « gelée » : bombé, brillant, avec une épaisse tranche dessous */
.jelly {
  position: relative;
  display: grid;
  place-items: center;
  height: var(--jelly, 92px);
  padding: 0;
  border: 0;
  border-radius: 30px;
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--c) 45%, #fff) 0%, transparent 55%),
    linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 78%, var(--d)));
  box-shadow:
    0 8px 0 var(--d),
    0 13px 18px rgba(60, 30, 10, 0.3),
    inset 0 -6px 10px color-mix(in srgb, var(--d) 55%, transparent),
    inset 0 3px 2px rgba(255, 255, 255, 0.55);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s, box-shadow 0.08s;
}
/* reflet brillant en haut */
.jelly::before {
  content: "";
  position: absolute;
  top: 6px;
  left: 14%;
  right: 14%;
  height: 34%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0));
  pointer-events: none;
}
.jelly:active {
  transform: translateY(6px);
  box-shadow: 0 2px 0 var(--d), 0 4px 8px rgba(60, 30, 10, 0.3), inset 0 -6px 10px color-mix(in srgb, var(--d) 55%, transparent), inset 0 3px 2px rgba(255, 255, 255, 0.55);
}
.jelly:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.emoji {
  position: relative;
  width: 92%;
  height: 92%;
  max-width: 96px;
  max-height: 96px;
  filter: drop-shadow(0 5px 3px rgba(40, 20, 0, 0.4));
}
.locked { filter: saturate(0.5) brightness(1.04); }
.lock {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.lock-icon { width: 13px; height: 13px; color: #5a3a22; }
.highlight { animation: beckon 1s ease-in-out infinite; }
@keyframes beckon { 50% { transform: translateY(-4px) scale(1.04); } }
.wiggle { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-6deg); }
  40% { transform: rotate(5deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .highlight, .wiggle { animation: none; }
}
</style>
