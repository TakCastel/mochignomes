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

import { PALETTES, DEFAULT_PALETTE } from "~/lib/palettes";

const { store } = useCreatureMood();

const BASE = [
  { key: "nourrir", label: "Manger", icon: "ph:bowl-food-fill", color: "#ff9a12", dark: "#d25a00" },
  { key: "laver", label: "Laver", icon: "ph:bathtub-fill", color: "#2f86ff", dark: "#1447c9" },
  { key: "jouer", label: "Jouer", icon: "ph:soccer-ball-fill", color: "#4fcc1f", dark: "#23860c" },
  { key: "coucher", label: "Dodo", icon: "ph:moon-stars-fill", color: "#9450f5", dark: "#5317c2" },
  { key: "calin", label: "Câlin", icon: "ph:hand-heart-fill", color: "#ff4d8a", dark: "#c81858" },
  { key: "soigner", label: "Soigner", icon: "ph:syringe-fill", color: "#14cdb8", dark: "#04887e" },
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
  BASE.map((base) => {
    const [color, dark] = (PALETTES[store.palette] || PALETTES[DEFAULT_PALETTE]).jelly[base.key];
    const a = { ...base, color, dark };
    const wake = a.key === "coucher" && store.isSleeping;
    return {
      ...a,
      label: wake ? "Réveil" : a.label,
      icon: wake ? "ph:sun-fill" : a.icon,
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
  background: linear-gradient(180deg, var(--panel-top) 0%, var(--panel-bottom) 100%);
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
  width: 54%;
  height: 54%;
  max-width: 56px;
  max-height: 56px;
  color: #fff;
  /* gravé : liseré sombre dessous, reflet clair dessus */
  filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.15)) drop-shadow(0 3px 0 color-mix(in srgb, var(--d) 80%, #000)) drop-shadow(0 6px 6px rgba(0, 0, 0, 0.18));
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
