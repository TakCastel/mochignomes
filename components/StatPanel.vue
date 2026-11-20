<template>
  <ul class="panel" aria-label="Jauges">
    <li v-for="s in rings" :key="s.key" :style="s.vars">
      <button
        class="ring"
        :class="{ low: s.need === 'urgent', bonus: s.bonus }"
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
        <!-- besoin qui monte (orange) ou urgent (rouge) -->
        <span v-if="s.need" class="need" :class="s.need">!</span>
      </button>
      <span class="name">{{ s.short }}</span>
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
    // mêmes seuils que l'humeur : elle se plaint dès 50, c'est urgent sous 25
    const need = value < 25 ? "urgent" : value < 50 ? "soon" : null;
    return {
      ...s,
      value,
      need,
      dash: Math.max(0.01, (Math.min(value, 100) / 100) * CIRC),
      bonus: value > 100,
      extraDash: (Math.min(value - 100, 100) / 100) * CIRC,
      vars: { "--c": s.color },
    };
  })
);
</script>

<style scoped>
.panel {
  list-style: none;
  margin: 0;
  padding: 8px 6px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  border-radius: 44px;
  background: linear-gradient(180deg, var(--plate-hi), var(--plate-lo));
  box-shadow:
    inset 0 2px 0 #fff,
    inset 0 -4px 0 var(--plate-shade),
    0 0 0 2px var(--shell-lo),
    0 6px 12px var(--plate-shade);
}
.panel li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
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
  background: radial-gradient(circle at 40% 30%, #ffffff, var(--knob-lo) 75%);
  box-shadow: 0 4px 0 var(--knob-side), 0 7px 10px var(--plate-shade), inset 0 1px 0 #fff, 0 0 0 2px color-mix(in srgb, var(--c) 35%, #fff);
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
  stroke: color-mix(in srgb, var(--c) 38%, #fff4e8);
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
  inset: 22%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 28%, #ffffff, #f4ebdf 70%);
  box-shadow: 0 2px 3px rgba(90, 60, 30, 0.35), inset 0 -2px 3px var(--plate-shade);
}
.icon {
  width: 72%;
  height: 72%;
  color: var(--c);
  filter: drop-shadow(0 1.5px 0 var(--c-dark));
}
.ring.low { animation: alarm 1.1s ease-in-out infinite; }
.need {
  position: absolute;
  top: -4px;
  right: -4px;
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  color: #fff;
  font: 900 13px "Nunito", system-ui, sans-serif;
  box-shadow: 0 0 0 2px #fff, 0 2px 4px rgba(0, 0, 0, 0.25);
}
.need.soon { background: #ff9f1c; }
.need.urgent { background: #ff2d4b; }
.name {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 1;
  color: color-mix(in srgb, var(--c) 70%, #000);
}
@keyframes alarm {
  0%, 100% { transform: scale(1); box-shadow: 0 4px 0 var(--knob-side), 0 7px 10px var(--plate-shade), 0 0 0 0 rgba(255, 59, 59, 0.6); }
  50% { transform: scale(1.08) rotate(-5deg); box-shadow: 0 4px 0 var(--knob-side), 0 7px 10px var(--plate-shade), 0 0 0 9px rgba(255, 59, 59, 0); }
}
.ring.bonus { box-shadow: 0 4px 0 var(--knob-side), 0 7px 10px var(--plate-shade), 0 0 16px 2px rgba(255, 210, 40, 0.9); }

@media (prefers-reduced-motion: reduce) {
  .ring.low { animation: none; }
}
</style>
