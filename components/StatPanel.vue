<template>
  <ul class="panel" aria-label="Jauges">
    <li v-for="s in rings" :key="s.key" :style="{ '--c': s.color }">
      <button class="ring" :class="{ urgent: s.need === 'urgent' }" :aria-label="`${s.label} : ${Math.round(s.value)} sur 100`" @click="gameBus.sheet = 'fiche'">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle class="groove" cx="32" cy="32" r="27" />
          <circle class="arc" cx="32" cy="32" r="27" :stroke-dasharray="`${s.dash} 200`" transform="rotate(-90 32 32)" />
          <circle v-if="s.bonus" class="extra" cx="32" cy="32" r="27" :stroke-dasharray="`${s.extraDash} 200`" transform="rotate(-90 32 32)" />
        </svg>
        <span class="core"><Icon :name="s.emoji" class="emoji" /></span>
        <span v-if="s.need" class="need" :class="s.need">!</span>
      </button>
      <span class="bar" aria-hidden="true">
        <span v-for="i in 5" :key="i" :class="{ on: i <= s.segments }" />
      </span>
    </li>
  </ul>
</template>

<script setup>
import { computed } from "vue";
import { STATS } from "~/lib/gameUi";

// Symbole de chaque jauge
const EMOJI = {
  hunger: "ph:bowl-food-fill",
  cleanliness: "ph:drop-fill",
  fun: "ph:soccer-ball-fill",
  energy: "ph:lightning-fill",
  health: "ph:heart-fill",
};
import { uiTheme } from "~/lib/palettes";

const { store } = useCreatureMood();
const CIRC = 2 * Math.PI * 27;
const rings = computed(() =>
  STATS.map((s) => {
    const value = store[s.key];
    return {
      ...s,
      color: uiTheme(store.ui).stats[s.key],
      emoji: EMOJI[s.key],
      value,
      need: value < 25 ? "urgent" : value < 50 ? "soon" : null,
      dash: Math.max(0.01, (Math.min(value, 100) / 100) * CIRC),
      bonus: value > 100,
      extraDash: (Math.min(value - 100, 100) / 100) * CIRC,
      segments: Math.ceil(Math.min(value, 100) / 20),
    };
  })
);
</script>

<style scoped>
/* panneau crème laiteux, posé sur la scène */
.panel {
  list-style: none;
  margin: 0;
  padding: 12px 10px 12px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  border-radius: 34px;
  background: linear-gradient(180deg, var(--panel-top), var(--panel-bottom));
  box-shadow:
    0 10px 24px rgba(60, 40, 20, 0.22),
    inset 0 2px 0 #fff,
    inset 0 -3px 0 rgba(200, 170, 130, 0.35),
    0 0 0 1.5px rgba(255, 255, 255, 0.7);
}
.panel li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.ring {
  position: relative;
  width: var(--ring, 62px);
  height: var(--ring, 62px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, #ffffff, #f3e9dc 80%);
  box-shadow: 0 4px 8px rgba(90, 60, 30, 0.22), inset 0 -2px 3px rgba(160, 120, 80, 0.2);
  cursor: pointer;
}
.ring svg { position: absolute; inset: 0; }
.ring circle { fill: none; stroke-width: 8.5; stroke-linecap: round; }
.groove { stroke: #ebe0d2; }
.arc {
  stroke: var(--c);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
  transition: stroke-dasharray 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
}
.extra { stroke: #ffd23f; stroke-width: 3.5; }
.core {
  position: absolute;
  inset: 15%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, #fffdf9, #efe4d6);
  box-shadow: inset 0 2px 3px rgba(150, 110, 70, 0.25);
}
.emoji { width: 66%; height: 66%; color: var(--c); filter: drop-shadow(0 2px 0 color-mix(in srgb, var(--c) 55%, #000)); }
.ring.urgent { animation: alarm 1.1s ease-in-out infinite; }
@keyframes alarm { 50% { transform: scale(1.07) rotate(-5deg); } }
.need {
  position: absolute;
  top: -3px;
  right: -3px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: #fff;
  font: 900 12px "Nunito", system-ui, sans-serif;
  box-shadow: 0 0 0 2px #fff;
}
.need.soon { background: #ff9f1c; }
.need.urgent { background: #ff2d4b; }

/* barre à crans sous chaque jauge */
.bar {
  display: flex;
  gap: 2px;
  width: 86%;
  padding: 2px;
  border-radius: 999px;
  background: #e6dacb;
  box-shadow: inset 0 1px 2px rgba(120, 90, 60, 0.35), 0 1px 0 #fff;
}
.bar span {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: #d5c8b8;
}
.bar span.on {
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 55%, #fff), var(--c));
}
@media (prefers-reduced-motion: reduce) {
  .ring.urgent { animation: none; }
}
</style>
