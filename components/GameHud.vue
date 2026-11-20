<template>
  <header class="hud">
    <div class="top">
      <div class="identity">
        <div class="name">{{ store.name || "..." }}</div>
        <div class="mood" :style="{ '--mc': moodColor }">
          <span class="dot" />{{ moodLabel }}
        </div>
      </div>
      <span v-if="store.speed > 1" class="speed" title="Temps accéléré pour tester">×{{ store.speed }}</span>
      <button class="sheet-btn" aria-label="Voir sa fiche et son caractère" @click="gameBus.sheetOpen = true">
        <Icon name="fluent-emoji-flat:sparkles" class="sheet-icon" />
        <span>Fiche</span>
      </button>
    </div>

    <ul class="rings" aria-label="Jauges">
      <li v-for="s in rings" :key="s.key">
        <button
          class="ring"
          :class="{ low: s.low, bonus: s.bonus }"
          :style="{ '--c': s.color }"
          :aria-label="`${s.label} : ${Math.round(s.value)} sur 100`"
          @click="gameBus.sheetOpen = true"
        >
          <svg viewBox="0 0 52 52" aria-hidden="true">
            <circle class="track" cx="26" cy="26" r="22" />
            <circle class="fill" cx="26" cy="26" r="22" :stroke-dasharray="`${s.dash} 200`" />
            <circle v-if="s.bonus" class="extra" cx="26" cy="26" r="22" :stroke-dasharray="`${s.extraDash} 200`" />
          </svg>
          <Icon :name="s.icon" class="ring-icon" />
        </button>
        <span class="ring-label">{{ s.label }}</span>
      </li>
    </ul>
  </header>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { MOOD_LABELS } from "~/lib/creatureLook";
import { STATS } from "~/lib/gameUi";

const { store, mood } = useCreatureMood();
const moodLabel = computed(() => MOOD_LABELS[mood.value]?.[0] || "");
const moodColor = computed(() => MOOD_LABELS[mood.value]?.[1] || "#3ccf6e");

const CIRC = 2 * Math.PI * 22;
const rings = computed(() =>
  STATS.map((s) => {
    const value = store[s.key];
    return {
      ...s,
      label: s.label === "Amusement" ? "Jeu" : s.label,
      value,
      dash: (Math.min(value, 100) / 100) * CIRC,
      bonus: value > 100,
      extraDash: (Math.min(value - 100, 100) / 100) * CIRC,
      low: value < 25,
    };
  })
);

onMounted(() => store.initName());
</script>

<style scoped>
.hud {
  position: relative;
  z-index: 3;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 14px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.name {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 1;
  color: #fff;
  letter-spacing: 0.01em;
  -webkit-text-stroke: 1.5px #4a2410;
  paint-order: stroke fill;
  text-shadow: 0 3px 0 #4a2410;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mood {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  background: var(--mc);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);
  box-shadow: 0 3px 0 color-mix(in srgb, var(--mc) 60%, #000), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: background 0.4s;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 50% { transform: scale(0.6); opacity: 0.7; } }
.speed {
  font-weight: 800;
  font-size: 12px;
  color: #4a2410;
  background: #ffe066;
  border-radius: 999px;
  padding: 3px 8px;
}
.sheet-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 8px 9px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(180deg, #b896ff, #8b5cf6);
  color: #fff;
  font: 800 14px "Nunito", system-ui, sans-serif;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  box-shadow: 0 4px 0 #5b33b8, inset 0 2px 0 rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}
.sheet-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #5b33b8, inset 0 2px 0 rgba(255, 255, 255, 0.45); }
.sheet-icon { width: 20px; height: 20px; }

.rings {
  list-style: none;
  margin: 0;
  padding: 10px 8px 8px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 244, 228, 0.92));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 22px;
  border: 2.5px solid #ffffff;
  box-shadow: 0 5px 0 rgba(74, 36, 16, 0.22), 0 10px 24px rgba(30, 20, 60, 0.18);
}
.rings li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.ring {
  position: relative;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  background: radial-gradient(circle at 50% 35%, #fff, color-mix(in srgb, var(--c) 14%, #fff));
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 3px 0 rgba(60, 30, 10, 0.12);
}
.ring svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
}
.track { stroke: color-mix(in srgb, var(--c) 22%, #efe2d2); }
.fill { stroke: var(--c); transition: stroke-dasharray 0.6s cubic-bezier(0.3, 1.4, 0.5, 1); }
.extra { stroke: #ffd23f; stroke-width: 3; transition: stroke-dasharray 0.6s; }
.ring-icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 26px;
  height: 26px;
}
.ring.low {
  animation: alarm 1.2s ease-in-out infinite;
}
.ring.low .fill { stroke: #ff4d4d; }
@keyframes alarm {
  0%, 100% { transform: scale(1); box-shadow: 0 3px 0 rgba(60, 30, 10, 0.12), 0 0 0 0 rgba(255, 77, 77, 0.5); }
  50% { transform: scale(1.06) rotate(-4deg); box-shadow: 0 3px 0 rgba(60, 30, 10, 0.12), 0 0 0 8px rgba(255, 77, 77, 0); }
}
.ring.bonus { box-shadow: 0 3px 0 rgba(60, 30, 10, 0.12), 0 0 14px rgba(255, 210, 63, 0.8); }
.ring-label {
  font-size: 11px;
  font-weight: 800;
  color: #4a2410;
  letter-spacing: 0.02em;
}
@media (prefers-reduced-motion: reduce) {
  .ring.low { animation: none; }
}
</style>
