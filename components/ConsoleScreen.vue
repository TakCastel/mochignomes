<template>
  <!-- trois couches découpées en squircle : liseré crème, cadre sombre, écran -->
  <div ref="outer" class="frame">
    <div ref="mid" class="bezel">
      <div ref="inner" class="screen">
        <SceneBackdrop :phase="phase" :dead="dead" />
        <Tamagotchi :phase="phase" :dead="dead" />
        <button class="arrow prev" aria-label="Tourner vers la gauche" @click="gameCommand('rotate', -1)">
          <span />
        </button>
        <button class="arrow next" aria-label="Tourner vers la droite" @click="gameCommand('rotate', 1)">
          <span />
        </button>
        <div class="glare" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  phase: { type: String, default: "day" },
  dead: { type: Boolean, default: false },
});

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
  background: linear-gradient(180deg, #ffffff 0%, #efe2cf 55%, #d8c2a4 100%);
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
  top: 50%;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-top: -20px;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, #fffaf2, #ead9c2);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5), 0 4px 0 #b99b78, 0 6px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  opacity: 0.88;
}
.arrow:active { transform: translateY(3px); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5), 0 1px 0 #b99b78; }
.arrow span {
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
}
.prev { left: 8px; }
.next { right: 8px; }
.prev span { border-right: 12px solid #9a5a1c; margin-right: 3px; }
.next span { border-left: 12px solid #9a5a1c; margin-left: 3px; }
</style>
