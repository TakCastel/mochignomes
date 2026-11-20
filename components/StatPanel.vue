<template>
  <ul class="panel" aria-label="Jauges">
    <li v-for="s in rings" :key="s.key">
      <button
        class="ring"
        :class="{ low: s.low, bonus: s.bonus }"
        :style="{ '--c': s.color }"
        :aria-label="`${s.label} : ${Math.round(s.value)} sur 100`"
        @click="gameBus.sheet = 'fiche'"
      >
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <circle class="track" cx="30" cy="30" r="25" />
          <circle class="fill" cx="30" cy="30" r="25" :stroke-dasharray="`${s.dash} 200`" />
          <circle v-if="s.bonus" class="extra" cx="30" cy="30" r="25" :stroke-dasharray="`${s.extraDash} 200`" />
        </svg>
        <span class="core">
          <Icon :name="s.icon" class="icon" />
        </span>
      </button>
      <span class="bars" :style="{ '--c': s.color }" aria-hidden="true">
        <span v-for="i in 5" :key="i" :class="{ on: i <= s.segments }" />
      </span>
    </li>
  </ul>
</template>

<script setup>
import { computed } from "vue";
import { STATS } from "~/lib/gameUi";

const { store } = useCreatureMood();
const CIRC = 2 * Math.PI * 25;
const rings = computed(() =>
  STATS.map((s) => {
    const value = store[s.key];
    return {
      ...s,
      value,
      dash: (Math.min(value, 100) / 100) * CIRC,
      bonus: value > 100,
      extraDash: (Math.min(value - 100, 100) / 100) * CIRC,
      low: value < 25,
      segments: Math.ceil(Math.min(value, 100) / 20),
    };
  })
);
</script>

<style scoped>
.panel {
  list-style: none;
  margin: 0;
  padding: 10px 8px 9px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  border-radius: 26px;
  background: linear-gradient(180deg, #fbf6ee, #f1e7da);
  box-shadow: inset 0 2px 0 #fff, inset 0 -3px 0 rgba(170, 140, 110, 0.25), 0 3px 8px rgba(140, 110, 80, 0.25);
}
.panel li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ring {
  position: relative;
  width: var(--ring, 58px);
  height: var(--ring, 58px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f6eee3;
  box-shadow: 3px 4px 8px rgba(140, 110, 80, 0.35), -3px -3px 7px #fff;
  cursor: pointer;
}
.ring svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
}
.track { stroke: color-mix(in srgb, var(--c) 20%, #e8dccd); }
.fill {
  stroke: var(--c);
  filter: drop-shadow(0 0 2px color-mix(in srgb, var(--c) 60%, transparent));
  transition: stroke-dasharray 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
}
.extra { stroke: #ffd23f; stroke-width: 3.5; transition: stroke-dasharray 0.6s; }
.core {
  position: absolute;
  inset: 17%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, #fff, #f3eadf);
  box-shadow: inset -1px -2px 4px rgba(140, 110, 80, 0.3);
}
.icon { width: 60%; height: 60%; color: var(--c); filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.9)); }
.ring.low { animation: alarm 1.2s ease-in-out infinite; }
.ring.low .fill { stroke: #ff4d4d; }
@keyframes alarm {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07) rotate(-5deg); }
}
.ring.bonus { box-shadow: 3px 4px 8px rgba(140, 110, 80, 0.35), -3px -3px 7px #fff, 0 0 14px rgba(255, 210, 63, 0.9); }

.bars {
  display: flex;
  gap: 2px;
  padding: 2px 3px;
  border-radius: 999px;
  background: #e5d8c7;
  box-shadow: inset 1px 1px 3px rgba(140, 110, 80, 0.4);
}
.bars span {
  width: 7px;
  height: 6px;
  border-radius: 3px;
  background: #d6c7b4;
}
.bars span.on { background: var(--c); }
@media (prefers-reduced-motion: reduce) {
  .ring.low { animation: none; }
}
</style>
