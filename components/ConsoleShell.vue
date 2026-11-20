<template>
  <!-- Coque de la console en forme de galet : côtés bombés, bas en arc.
       Dessinée en SVG à la taille exacte de l'écran, derrière le contenu. -->
  <div ref="box" class="shell" aria-hidden="true">
    <svg v-if="w" :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`">
      <defs>
        <linearGradient id="shell-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--shell-hi)" />
          <stop offset="0.45" style="stop-color: var(--shell)" />
          <stop offset="1" style="stop-color: var(--shell-lo)" />
        </linearGradient>
        <!-- volume : plus clair à gauche, plus sombre sur les bords, comme un objet bombé -->
        <linearGradient id="shell-round" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style="stop-color: var(--shell-edge)" stop-opacity="0.28" />
          <stop offset="0.07" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="0.17" stop-color="#ffffff" stop-opacity="0.65" />
          <stop offset="0.32" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="0.78" style="stop-color: var(--shell-edge)" stop-opacity="0" />
          <stop offset="0.95" style="stop-color: var(--shell-edge)" stop-opacity="0.22" />
          <stop offset="1" style="stop-color: var(--shell-edge)" stop-opacity="0.38" />
        </linearGradient>
        <linearGradient id="shell-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.75" style="stop-color: var(--shell-edge)" stop-opacity="0" />
          <stop offset="1" style="stop-color: var(--shell-edge)" stop-opacity="0.25" />
        </linearGradient>
        <linearGradient id="shell-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.4" />
          <stop offset="1" style="stop-color: var(--shell-edge)" />
        </linearGradient>
        <filter id="shell-shadow" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#28143c" flood-opacity="0.45" />
        </filter>
        <filter id="shell-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" values="0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.18 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <path :d="outline" fill="url(#shell-body)" filter="url(#shell-shadow)" />
      <path :d="outline" fill="url(#shell-round)" />
      <path :d="outline" fill="url(#shell-bottom)" />
      <path :d="outline" fill="#000" filter="url(#shell-grain)" />
      <!-- reflet en haut -->
      <path :d="gloss" fill="#ffffff" opacity="0.85" />
      <!-- liseré en biseau : clair en haut, plus sombre en bas -->
      <path :d="outline" fill="none" stroke="url(#shell-rim)" stroke-width="3" />
      <path :d="outline" fill="none" style="stroke: var(--shell-edge)" stroke-width="1" stroke-opacity="0.6" />
    </svg>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const box = ref(null);
const w = ref(0);
const h = ref(0);
let ro = null;

// Contour en galet. m : retrait des côtés en haut (ils se bombent ensuite jusqu'au bord),
// r : rayon des coins du haut, rb : rayon des coins du bas, bb : creux de l'arc du bas.
const outline = computed(() => {
  const W = w.value, H = h.value;
  if (!W) return "";
  const m = 0; // côtés droits : le contenu garde la même marge partout
  const r = Math.min(56, W * 0.14);
  const rb = Math.min(110, W * 0.28);
  const bb = Math.min(14, H * 0.016); // léger arc en bas
  const f = (n) => Math.round(n * 10) / 10;
  return [
    `M ${f(m + r)} 0`,
    `L ${f(W - m - r)} 0`,
    // coin haut droit
    `C ${f(W - m - r * 0.42)} 0 ${f(W - m)} ${f(r * 0.42)} ${f(W - m)} ${f(r)}`,
    // côté droit qui se bombe vers l'extérieur
    `C ${f(W - m)} ${f(H * 0.4)} ${f(W)} ${f(H * 0.5)} ${f(W)} ${f(H * 0.68)}`,
    // coin bas droit arrondi
    `C ${f(W)} ${f(H - rb * 0.55)} ${f(W - rb * 0.45)} ${f(H - bb)} ${f(W - rb)} ${f(H - bb * 0.55)}`,
    // bas en arc
    `C ${f(W * 0.66)} ${f(H + bb * 0.3)} ${f(W * 0.34)} ${f(H + bb * 0.3)} ${f(rb)} ${f(H - bb * 0.55)}`,
    // coin bas gauche
    `C ${f(rb * 0.45)} ${f(H - bb)} 0 ${f(H - rb * 0.55)} 0 ${f(H * 0.68)}`,
    // côté gauche
    `C 0 ${f(H * 0.5)} ${f(m)} ${f(H * 0.4)} ${f(m)} ${f(r)}`,
    // coin haut gauche
    `C ${f(m)} ${f(r * 0.42)} ${f(m + r * 0.42)} 0 ${f(m + r)} 0`,
    "Z",
  ].join(" ");
});

// reflet allongé le long du bord du haut
const gloss = computed(() => {
  const W = w.value;
  if (!W) return "";
  const x0 = W * 0.16, x1 = W * 0.84;
  return `M ${x0} 7 Q ${W / 2} 1 ${x1} 7 Q ${W / 2} 17 ${x0} 7 Z`;
});

onMounted(() => {
  ro = new ResizeObserver(() => {
    w.value = box.value.offsetWidth;
    h.value = box.value.offsetHeight;
  });
  ro.observe(box.value);
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<style scoped>
.shell {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
.shell svg {
  display: block;
  overflow: visible;
}
</style>
