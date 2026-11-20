<template>
  <ul class="panel" aria-label="Jauges">
    <li v-for="s in rings" :key="s.key" :style="s.vars">
      <button
        class="ring"
        :class="{ low: s.low, bonus: s.bonus }"
        :aria-label="`${s.label} : ${Math.round(s.value)} sur 100`"
        @click="gameBus.sheet = 'fiche'"
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <linearGradient :id="`g-${s.key}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" class="stop-light" />
              <stop offset="1" class="stop-dark" />
            </linearGradient>
          </defs>
          <!-- sillon creusé dans le plastique -->
          <circle class="groove" cx="32" cy="32" r="24" />
          <!-- remplissage brillant -->
          <circle
            class="fill"
            cx="32"
            cy="32"
            r="24"
            :stroke="`url(#g-${s.key})`"
            :stroke-dasharray="`${s.dash} 200`"
            transform="rotate(-90 32 32)"
          />
          <circle
            v-if="s.bonus"
            class="extra"
            cx="32"
            cy="32"
            r="24"
            :stroke-dasharray="`${s.extraDash} 200`"
            transform="rotate(-90 32 32)"
          />
          <!-- reflet sur le haut de l'anneau -->
          <path class="gloss" d="M14 22 A 21 21 0 0 1 44 12" />
        </svg>
        <span class="core">
          <Icon :name="s.icon" class="icon" />
        </span>
      </button>
      <span class="bars" aria-hidden="true">
        <span v-for="i in 5" :key="i" :class="{ on: i <= s.segments }" />
      </span>
    </li>
  </ul>
</template>

<script setup>
import { computed } from "vue";
import { STATS } from "~/lib/gameUi";

const { store } = useCreatureMood();
const CIRC = 2 * Math.PI * 24;
const rings = computed(() =>
  STATS.map((s) => {
    const value = store[s.key];
    const low = value < 25;
    const c = low ? "#ff3b3b" : s.color;
    return {
      ...s,
      value,
      low,
      dash: Math.max(0.01, (Math.min(value, 100) / 100) * CIRC),
      bonus: value > 100,
      extraDash: (Math.min(value - 100, 100) / 100) * CIRC,
      segments: Math.ceil(Math.min(value, 100) / 20),
      vars: { "--c": c },
    };
  })
);
</script>

<style scoped>
.panel {
  list-style: none;
  margin: 0;
  padding: 10px 8px 10px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  border-radius: 28px;
  background: linear-gradient(180deg, #fffdf9, #efe2d1);
  box-shadow:
    inset 0 2px 0 #fff,
    inset 0 -4px 0 rgba(170, 130, 95, 0.3),
    0 0 0 2px #e7d6c0,
    0 6px 12px rgba(120, 85, 55, 0.3);
}
.panel li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  --c-light: color-mix(in srgb, var(--c) 60%, #fff);
  --c-dark: color-mix(in srgb, var(--c) 86%, #000);
}
.ring {
  position: relative;
  width: var(--ring, 60px);
  height: var(--ring, 60px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  /* bouton crème bombé qui porte l'anneau */
  background: radial-gradient(circle at 40% 30%, #fffdf8, #ecdfcd 75%);
  box-shadow: 0 4px 0 #d9c4a8, 0 7px 10px rgba(110, 75, 45, 0.35), inset 0 1px 0 #fff, 0 0 0 2px color-mix(in srgb, var(--c) 35%, #fff);
  cursor: pointer;
}
.ring svg {
  position: absolute;
  inset: 0;
  overflow: visible;
}
.ring circle { fill: none; }
.stop-light { stop-color: var(--c-light); }
.stop-dark { stop-color: var(--c-dark); }
/* partie vide : la même couleur en pastel, légèrement creusée */
.groove {
  stroke: color-mix(in srgb, var(--c) 26%, #fff4e8);
  stroke-width: 10;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.9));
}
.fill {
  stroke-width: 10;
  stroke-linecap: round;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--c) 70%, transparent));
  transition: stroke-dasharray 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
}
.extra {
  stroke: #ffe14d;
  stroke-width: 4;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px #ffcc00);
  transition: stroke-dasharray 0.6s;
}
.gloss {
  fill: none;
  stroke: rgba(255, 255, 255, 0.7);
  stroke-width: 3;
  stroke-linecap: round;
}
/* disque blanc brillant au centre */
.core {
  position: absolute;
  inset: 25%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 28%, #ffffff, #f4ebdf 70%);
  box-shadow: 0 2px 3px rgba(90, 60, 30, 0.35), inset 0 -2px 3px rgba(140, 110, 80, 0.25);
}
.icon {
  width: 66%;
  height: 66%;
  color: var(--c);
  filter: drop-shadow(0 1.5px 0 var(--c-dark));
}
.ring.low { animation: alarm 1.1s ease-in-out infinite; }
@keyframes alarm {
  0%, 100% { transform: scale(1); box-shadow: 0 4px 0 #d9c4a8, 0 7px 10px rgba(110, 75, 45, 0.35), 0 0 0 0 rgba(255, 59, 59, 0.6); }
  50% { transform: scale(1.08) rotate(-5deg); box-shadow: 0 4px 0 #d9c4a8, 0 7px 10px rgba(110, 75, 45, 0.35), 0 0 0 9px rgba(255, 59, 59, 0); }
}
.ring.bonus { box-shadow: 0 4px 0 #d9c4a8, 0 7px 10px rgba(110, 75, 45, 0.35), 0 0 16px 2px rgba(255, 210, 40, 0.9); }

/* barre à crans, comme une pile */
.bars {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  background: #5b4436;
  box-shadow: 0 1px 0 #fff, inset 0 1px 2px rgba(0, 0, 0, 0.4);
}
.bars span {
  width: 8px;
  height: 8px;
  border-radius: 2.5px;
  background: #3a2a22;
}
.bars span.on {
  background: linear-gradient(180deg, var(--c-light), var(--c) 60%, var(--c-dark));
  box-shadow: 0 0 4px color-mix(in srgb, var(--c) 70%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
@media (prefers-reduced-motion: reduce) {
  .ring.low { animation: none; }
}
</style>
