<template>
  <div class="backdrop" :class="[`phase-${phase}`, { dead }]" :style="skyVars">
    <div class="sky" />
    <div class="rays" />

    <div class="stars">
      <span
        v-for="s in stars"
        :key="s.id"
        :style="{ left: s.x + '%', top: s.y + '%', animationDelay: s.d + 's', '--s': s.size + 'px' }"
      />
    </div>
    <div class="shooting" />

    <div class="astre" :class="phase === 'night' ? 'moon' : 'sun'" />

    <div class="clouds">
      <div class="cloud c1" />
      <div class="cloud c2" />
      <div class="cloud c3" />
      <div class="cloud c4" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { SKY } from "~/lib/gameUi";

const props = defineProps({
  phase: { type: String, default: "day" },
  dead: { type: Boolean, default: false },
});

const skyVars = computed(() => {
  const c = SKY[props.phase] || SKY.day;
  return { "--sky-top": c.top, "--sky-bottom": c.bottom };
});

// positions fixes (graine) pour que le ciel ne saute pas d'un rendu à l'autre
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = Array.from({ length: 46 }, (_, id) => ({ id, x: rnd() * 100, y: rnd() * 60, d: rnd() * 4, size: 2 + rnd() * 3 }));
</script>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  --cloud: #ffffff;
  --astre: #ffe14d;
  --astre-glow: rgba(255, 214, 64, 0.5);
  transition: filter 1s;
}
.phase-dawn { --astre: #ffd06e; --astre-glow: rgba(255, 170, 100, 0.6); --cloud: #ffe9e0; }
.phase-dusk { --astre: #ff8a4c; --astre-glow: rgba(255, 110, 70, 0.6); --cloud: #ffc9b8; }
.phase-night { --astre: #fff6c9; --astre-glow: rgba(240, 236, 200, 0.4); --cloud: rgba(150, 165, 240, 0.35); }
.dead { filter: grayscale(0.8) brightness(0.92); }

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 62%);
  transition: background 1.5s;
}

/* rayons de soleil qui tournent lentement */
.rays {
  position: absolute;
  top: calc(27% + 36px - 300px);
  right: calc(10% + 36px - 300px);
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: repeating-conic-gradient(rgba(255, 255, 255, 0.16) 0deg 8deg, transparent 8deg 22deg);
  mask-image: radial-gradient(circle, #000 18%, transparent 62%);
  -webkit-mask-image: radial-gradient(circle, #000 18%, transparent 62%);
  animation: spin 90s linear infinite;
  transition: opacity 1.5s;
}
.phase-night .rays { opacity: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

.astre {
  position: absolute;
  top: 27%;
  right: 10%;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%, #fff9d6, var(--astre) 55%);
  box-shadow: 0 0 0 12px var(--astre-glow), 0 0 70px 30px var(--astre-glow);
  transition: background 1.5s, box-shadow 1.5s;
}
/* croissant de lune : une ombre intérieure, le reste du disque reste transparent */
.moon {
  background: transparent;
  box-shadow: inset 20px -9px 0 0 var(--astre), 0 0 40px 4px var(--astre-glow);
}

.stars span {
  position: absolute;
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
  animation: twinkle 3.5s ease-in-out infinite;
  transition: opacity 1s;
}
.phase-night .stars span { opacity: 0.9; }
.phase-dusk .stars span:nth-child(4n) { opacity: 0.5; }
@keyframes twinkle { 50% { transform: scale(0.4); } }

.shooting {
  position: absolute;
  top: 12%;
  left: -20%;
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #fff);
  border-radius: 2px;
  opacity: 0;
  transform: rotate(18deg);
}
.phase-night .shooting { animation: shoot 9s ease-in 3s infinite; }
@keyframes shoot {
  0% { left: -20%; top: 10%; opacity: 0; }
  2% { opacity: 1; }
  8% { left: 110%; top: 32%; opacity: 0; }
  100% { left: 110%; top: 32%; opacity: 0; }
}

.cloud {
  position: absolute;
  height: 36px;
  border-radius: 999px;
  background: var(--cloud);
  box-shadow: inset 0 -8px 0 rgba(120, 160, 220, 0.18);
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
.cloud::before { width: 50px; height: 50px; left: 18px; top: -26px; }
.cloud::after { width: 36px; height: 36px; left: 56px; top: -16px; }
.c1 { width: 116px; top: 31%; animation-duration: 75s; animation-delay: -20s; }
.c2 { width: 90px; top: 40%; animation-duration: 100s; animation-delay: -65s; transform: scale(0.75); }
.c3 { width: 130px; top: 22%; animation-duration: 130s; animation-delay: -95s; opacity: 0.9; }
.c4 { width: 80px; top: 45%; animation-duration: 85s; animation-delay: -40s; transform: scale(0.6); opacity: 0.85; }
@keyframes drift {
  from { left: -170px; }
  to { left: 110%; }
}

@media (prefers-reduced-motion: reduce) {
  .cloud, .stars span, .rays, .shooting { animation: none; }
}
</style>
