<template>
  <div class="backdrop" :class="[`phase-${shownPhase}`, { dead }]" :style="{ '--ground': ground + 'px' }">
    <div class="sky" />

    <!-- étoiles et lucioles la nuit -->
    <div class="stars">
      <span v-for="s in stars" :key="s.id" :style="{ left: s.x + '%', top: s.y + '%', animationDelay: s.d + 's', '--s': s.size + 'px' }" />
    </div>

    <div class="astre" :class="shownPhase === 'night' ? 'moon' : 'sun'" />

    <div class="clouds">
      <div class="cloud c1" />
      <div class="cloud c2" />
      <div class="cloud c3" />
    </div>

    <div class="hill back" />
    <div class="hill front">
      <span v-for="f in flowers" :key="f.id" class="flower" :style="{ left: f.x + '%', top: f.y + 'px', '--fc': f.c, transform: `scale(${f.s})` }" />
    </div>

    <div class="fireflies">
      <span v-for="f in fireflies" :key="f.id" :style="{ left: f.x + '%', top: f.y + '%', animationDelay: f.d + 's' }" />
    </div>

    <div class="sleep-veil" />
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  phase: { type: String, default: "day" },
  sleeping: { type: Boolean, default: false },
  dead: { type: Boolean, default: false },
  ground: { type: Number, default: 520 },
});

const shownPhase = computed(() => (props.sleeping ? "night" : props.phase));

// positions fixes (graine) pour que le décor ne saute pas d'un rendu à l'autre
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = Array.from({ length: 34 }, (_, id) => ({ id, x: rnd() * 100, y: rnd() * 55, d: rnd() * 4, size: 2 + rnd() * 3 }));
const fireflies = Array.from({ length: 9 }, (_, id) => ({ id, x: 5 + rnd() * 90, y: 45 + rnd() * 35, d: rnd() * 6 }));
const FLOWER_COLORS = ["#ff8fab", "#ffd166", "#ffffff", "#c3a6ff"];
const flowers = Array.from({ length: 14 }, (_, id) => {
  const left = rnd() < 0.5;
  return {
    id,
    // on évite le centre, là où se tient la créature
    x: left ? 18 + rnd() * 18 : 64 + rnd() * 18,
    y: 22 + rnd() * 70,
    c: FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)],
    s: 0.7 + rnd() * 0.6,
  };
});
</script>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  --sky-top: #7cc8ff;
  --sky-bottom: #d8f1ff;
  --hill-back: #a8e07e;
  --hill-front: #7fcf5c;
  --hill-edge: #6bbd4a;
  --cloud: rgba(255, 255, 255, 0.95);
  --astre: #ffd84d;
  --astre-glow: rgba(255, 216, 77, 0.55);
  transition: filter 1s;
}
.phase-dawn {
  --sky-top: #ffa98a;
  --sky-bottom: #ffe7c2;
  --hill-back: #c9d98a;
  --hill-front: #9cc96a;
  --hill-edge: #86b456;
  --astre: #ffcf6e;
  --astre-glow: rgba(255, 180, 110, 0.6);
}
.phase-dusk {
  --sky-top: #6c5fd0;
  --sky-bottom: #ffad7a;
  --hill-back: #8e9a68;
  --hill-front: #6f8a4f;
  --hill-edge: #5d7642;
  --cloud: rgba(255, 214, 200, 0.85);
  --astre: #ff8a5c;
  --astre-glow: rgba(255, 120, 80, 0.55);
}
.phase-night {
  --sky-top: #141a46;
  --sky-bottom: #3a3f86;
  --hill-back: #2d4a55;
  --hill-front: #24414a;
  --hill-edge: #1d363e;
  --cloud: rgba(170, 180, 230, 0.25);
  --astre: #f4f1d0;
  --astre-glow: rgba(240, 236, 200, 0.35);
}
.dead { filter: grayscale(0.75) brightness(0.9); }

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--sky-top), var(--sky-bottom) 70%);
  transition: background 1.5s;
}

.astre {
  position: absolute;
  top: calc(var(--ground) * 0.36 + 60px);
  right: 9%;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: var(--astre);
  box-shadow: 0 0 0 14px var(--astre-glow), 0 0 60px 30px var(--astre-glow);
  transition: background 1.5s, box-shadow 1.5s;
}
/* croissant de lune : une ombre intérieure, le reste du disque reste transparent */
.moon {
  background: transparent;
  box-shadow: inset 18px -8px 0 0 var(--astre), 0 0 36px 4px var(--astre-glow);
}

.stars span {
  position: absolute;
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  animation: twinkle 3.5s ease-in-out infinite;
  transition: opacity 1s;
}
.phase-night .stars span { opacity: 0.8; }
.phase-dusk .stars span:nth-child(3n) { opacity: 0.4; }
@keyframes twinkle { 50% { transform: scale(0.4); } }

.cloud {
  position: absolute;
  height: 34px;
  border-radius: 999px;
  background: var(--cloud);
  animation: drift linear infinite;
  transition: background 1.5s;
}
.cloud::before,
.cloud::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  background: inherit;
}
.cloud::before { width: 46px; height: 46px; left: 18px; top: -22px; }
.cloud::after { width: 34px; height: 34px; left: 52px; top: -14px; }
.c1 { width: 110px; top: 16%; animation-duration: 70s; animation-delay: -20s; }
.c2 { width: 86px; top: 30%; animation-duration: 95s; animation-delay: -60s; transform: scale(0.8); }
.c3 { width: 120px; top: 7%; animation-duration: 120s; animation-delay: -90s; opacity: 0.8; }
@keyframes drift {
  from { left: -160px; }
  to { left: 110%; }
}

.hill {
  position: absolute;
  left: -30%;
  width: 160%;
  border-radius: 50% 50% 0 0 / 70px 70px 0 0;
  transition: background 1.5s;
}
.hill.back {
  top: calc(var(--ground) - 120px);
  bottom: 0;
  left: -10%;
  width: 90%;
  border-radius: 50% 50% 0 0 / 90px 90px 0 0;
  background: var(--hill-back);
}
.hill.front {
  top: calc(var(--ground) - 48px);
  bottom: 0;
  background: linear-gradient(180deg, var(--hill-front), var(--hill-edge));
  box-shadow: inset 0 6px 0 rgba(255, 255, 255, 0.18);
}
.flower {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffd84d;
  box-shadow: 0 -7px 0 0 var(--fc), 0 7px 0 0 var(--fc), -7px 0 0 0 var(--fc), 7px 0 0 0 var(--fc);
  transition: opacity 1s;
}
.phase-night .flower { opacity: 0.35; }

.fireflies span {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff7a8;
  box-shadow: 0 0 12px 4px rgba(255, 240, 120, 0.7);
  opacity: 0;
  animation: firefly 6s ease-in-out infinite;
}
.phase-night .fireflies span { animation-name: firefly-on; }
@keyframes firefly { 0%, 100% { opacity: 0; } }
@keyframes firefly-on {
  0%, 100% { opacity: 0; transform: translate(0, 0); }
  30% { opacity: 1; }
  50% { transform: translate(20px, -24px); opacity: 0.8; }
  80% { opacity: 0; transform: translate(-10px, -40px); }
}

.sleep-veil {
  position: absolute;
  inset: 0;
  background: rgba(10, 12, 40, 0.25);
  opacity: 0;
  transition: opacity 1.2s;
  pointer-events: none;
}
.phase-night .sleep-veil { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .cloud, .stars span, .fireflies span { animation: none; }
}
</style>
