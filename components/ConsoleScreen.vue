<template>
  <div class="bezel">
    <span v-for="c in ['tl', 'tr', 'bl', 'br']" :key="c" class="screw" :class="c" />
    <span class="light left" />
    <span class="light right" />
    <div class="screen">
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
</template>

<script setup>
defineProps({
  phase: { type: String, default: "day" },
  dead: { type: Boolean, default: false },
});
</script>

<style scoped>
.bezel {
  position: relative;
  height: 100%;
  padding: 8px;
  border-radius: 40px;
  background: linear-gradient(180deg, #5a4f7a 0%, #2a2340 60%, #1d1830 100%);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.35),
    inset 0 -2px 4px rgba(0, 0, 0, 0.6),
    0 0 0 5px #fbf3e8,
    0 0 0 8px #dcc6a8,
    0 10px 18px rgba(90, 60, 30, 0.45);
}
.screen {
  position: relative;
  height: 100%;
  border-radius: 33px;
  overflow: hidden;
  isolation: isolate;
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.25);
}
.glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 4;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 28%);
  box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.25);
}
/* petites vis cruciformes dans les coins */
.screw {
  position: absolute;
  z-index: 6;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fffdf8, #cbb79c 75%);
  box-shadow: inset 0 -1px 1px rgba(90, 60, 30, 0.4), 0 1px 1px rgba(255, 255, 255, 0.9);
}
.screw::before,
.screw::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 1.6px;
  margin: -0.8px 0 0 -3.5px;
  background: #9b8466;
  border-radius: 1px;
  transform: rotate(35deg);
}
.screw::after { transform: rotate(125deg); }
.tl { top: -8px; left: -8px; }
.tr { top: -8px; right: -8px; }
.bl { bottom: -8px; left: -8px; }
.br { bottom: -8px; right: -8px; }
.light {
  position: absolute;
  top: 18%;
  width: 7px;
  height: 46px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fffbd0, #ffd23a 60%, #ffae00);
  box-shadow: 0 0 14px 4px rgba(255, 196, 30, 0.85), inset 0 1px 0 #fff;
}
.light.left { left: -18px; }
.light.right { right: -18px; }
.arrow {
  position: absolute;
  top: 50%;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-top: -22px;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, #fffaf2, #ead9c2);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5), 0 4px 0 #b99b78, 0 6px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  opacity: 0.92;
}
.arrow:active { transform: translateY(3px); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5), 0 1px 0 #b99b78; }
.arrow span {
  width: 0;
  height: 0;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
}
.prev { left: 10px; }
.next { right: 10px; }
.prev span { border-right: 13px solid #9a5a1c; margin-right: 3px; }
.next span { border-left: 13px solid #9a5a1c; margin-left: 3px; }
</style>
