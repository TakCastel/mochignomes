<template>
  <!-- trois couches découpées en squircle : liseré crème, cadre sombre, écran -->
  <div ref="outer" class="frame">
    <div ref="mid" class="bezel">
      <div ref="inner" class="screen">
        <SceneBackdrop :phase="phase" :dead="dead" />
        <Tamagotchi :phase="phase" :dead="dead" />
        <button class="arrow prev" :class="{ hint }" aria-label="Tourner vers la gauche" @click="gameCommand('rotate', -1)">
          <span />
        </button>
        <button class="arrow next" :class="{ hint }" aria-label="Tourner vers la droite" @click="gameCommand('rotate', 1)">
          <span />
        </button>
        <div class="glare" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

defineProps({
  phase: { type: String, default: "day" },
  dead: { type: Boolean, default: false },
});

// les flèches pulsent tant qu'on n'a jamais fait tourner la créature
const { store } = useCreatureMood();
const hint = computed(() => !(store.counters.tourner > 0));

const outer = ref(null);
const mid = ref(null);
const inner = ref(null);
// rayon proportionnel à la taille de l'écran, un peu plus serré à chaque couche
useSquircle([outer], (w, h) => Math.min(w, h) * 0.3, 0.85);
useSquircle([mid], (w, h) => Math.min(w, h) * 0.29, 0.85);
useSquircle([inner], (w, h) => Math.min(w, h) * 0.28, 0.85);
</script>

<style scoped>
.frame {
  position: relative;
  height: 100%;
  padding: 3px;
  /* liseré crème bombé : clair en haut, plus sombre en bas */
  background: linear-gradient(180deg, #ffffff 0%, var(--shell) 55%, var(--shell-lo) 100%);
}
.bezel {
  position: relative;
  height: 100%;
  padding: 5px;
  background: linear-gradient(180deg, #5c5180 0%, #2b2442 55%, #1b1630 100%);
}
.screen {
  position: relative;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  background: #7cc8ff;
}
.glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 26%);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.22);
}
.arrow {
  position: absolute;
  top: 64%;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin-top: -18px;
  opacity: 0.85;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff 50%, var(--knob-lo));
  box-shadow: 0 3px 0 var(--knob-side), 0 6px 10px rgba(0, 0, 0, 0.22), inset 0 1px 0 #fff;
  cursor: pointer;
}
.arrow.hint { animation: nudge 1.6s ease-in-out infinite; opacity: 1; }
@keyframes nudge {
  0%, 100% { box-shadow: 0 3px 0 var(--knob-side), 0 0 0 0 color-mix(in srgb, var(--accent) 60%, transparent); }
  50% { box-shadow: 0 3px 0 var(--knob-side), 0 0 0 10px transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .arrow.hint { animation: none; }
}
.arrow:active { transform: translateY(3px); box-shadow: 0 0 0 var(--knob-side); }
.arrow span {
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
}
.prev { left: 10px; }
.next { right: 10px; }
.prev span { border-right: 12px solid var(--accent); margin-right: 3px; }
.next span { border-left: 12px solid var(--accent); margin-left: 3px; }
</style>
