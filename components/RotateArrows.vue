<template>
  <div class="rot" :class="{ hidden }" :style="{ top: `${top}px`, '--off': `${offset}px` }">
    <!-- plateau couché au sol en perspective : un cercle autour des pieds, vu de dessus puis basculé -->
    <div class="stage">
      <!-- deux arcs du cercle (centre 100,100, rayon 86) ; à gauche, arc du côté gauche
           (pointe à l'avant, vers le joueur) ; la droite est le miroir. Copies décalées dessous = épaisseur et ombre. -->
      <svg class="arcs" viewBox="0 0 200 200" aria-hidden="true">
        <g v-for="b in BUTTONS" :key="b.dir" :class="['arc', b.cls, { pressed: pressed === b.dir }]" :transform="b.dir === 1 ? 'translate(200 0) scale(-1 1)' : undefined">
          <g class="shadow" transform="translate(0 7)">
            <path d="M70.6 180.8A86 86 0 0 1 19.2 70.6" />
            <path class="head" d="M87.5 187L72.5 169.8L64.9 190.4Z" />
          </g>
          <g class="side" transform="translate(0 3.5)">
            <path d="M70.6 180.8A86 86 0 0 1 19.2 70.6" />
            <path class="head" d="M87.5 187L72.5 169.8L64.9 190.4Z" />
          </g>
          <g class="top">
            <path d="M70.6 180.8A86 86 0 0 1 19.2 70.6" />
            <path class="head" d="M87.5 187L72.5 169.8L64.9 190.4Z" />
          </g>
        </g>
      </svg>
      <button
        v-for="b in BUTTONS"
        :key="b.dir"
        type="button"
        class="rbtn"
        :class="b.cls"
        :aria-label="b.label"
        :tabindex="hidden ? -1 : 0"
        @pointerdown.prevent="down(b.dir, $event)"
        @pointerup="up(b.dir)"
        @pointercancel="cancel"
        @lostpointercapture="cancel"
        @contextmenu.prevent
        @keydown.enter.prevent="emit('step', b.dir)"
        @keydown.space.prevent="emit('step', b.dir)"
      />
    </div>
  </div>
</template>

<script setup>
// Deux grandes flèches courbes (écran de création de personnage) : un toucher = un quart de tour,
// appui maintenu = rotation continue. Le composant ne fait que signaler : step(dir) / hold(dir) ; hold(0) = relâche.
// dir : -1 = vers la gauche, 1 = vers la droite.
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  top: { type: Number, default: 400 },    // ordonnée (px) du centre des boutons
  offset: { type: Number, default: 130 }, // écart (px) entre le centre de l'écran et le centre de chaque bouton
  hidden: { type: Boolean, default: false },
});
const emit = defineEmits(["step", "hold"]);

const BUTTONS = [
  { dir: -1, cls: "left", label: "Tourner à gauche" },
  { dir: 1, cls: "right", label: "Tourner à droite" },
];
const HOLD_MS = 260; // au-delà, c'est un appui maintenu
const pressed = ref(0);
let timer = 0;
let holding = 0;

function down(dir, e) {
  e.currentTarget.setPointerCapture?.(e.pointerId);
  clearTimeout(timer);
  if (holding) { emit("hold", 0); holding = 0; }
  pressed.value = dir;
  timer = setTimeout(() => { holding = dir; emit("hold", dir); }, HOLD_MS);
}
function up(dir) {
  if (pressed.value !== dir) return;
  pressed.value = 0;
  clearTimeout(timer);
  if (holding) { holding = 0; emit("hold", 0); }
  else emit("step", dir);
}
function cancel() {
  clearTimeout(timer);
  pressed.value = 0;
  if (holding) { holding = 0; emit("hold", 0); }
}
// masquées pendant l'appui (menu ouvert, activité) : on lâche proprement
watch(() => props.hidden, (h) => { if (h) cancel(); });
onBeforeUnmount(cancel);
</script>

<style scoped>
.rot {
  /* --r : rayon du cercle au sol, bien au-delà de la créature */
  --r: calc(var(--off) + 80px);
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  z-index: 3;
  pointer-events: none;
  transition: opacity 0.22s ease;
}
.rot.hidden { opacity: 0; visibility: hidden; transition: opacity 0.18s ease, visibility 0s 0.18s; }
/* plateau carré centré sous les pieds, basculé pour être couché sur le sol */
.stage {
  position: absolute;
  left: 50%;
  top: 0;
  width: calc(var(--r) * 2);
  height: calc(var(--r) * 2);
  transform: translate(-50%, -50%) perspective(720px) rotateX(78deg);
  transform-origin: 50% 50%;
}
.arcs { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.arc path { fill: none; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.arc path.head { stroke-width: 3; }
.arc .top path { stroke: rgba(255, 255, 255, 0.82); }
.arc .top path.head { fill: rgba(255, 255, 255, 0.82); }
.arc .side path { stroke: rgba(170, 200, 232, 0.75); }
.arc .side path.head { fill: rgba(170, 200, 232, 0.75); }
.arc .shadow path { stroke: rgba(20, 50, 110, 0.18); }
.arc .shadow path.head { fill: rgba(20, 50, 110, 0.18); }
.arc { transition: opacity 0.2s ease; opacity: 0.85; }
/* au toucher : la flèche s'allume */
.arc.pressed { opacity: 1; }
.arc.pressed .top path { stroke: #fff; }
.arc.pressed .top path.head { fill: #fff; }
/* zones tactiles : la partie extérieure de chaque côté du plateau, jamais près des pieds */
.rbtn {
  position: absolute;
  top: 4%;
  bottom: 0;
  width: 40%;
  padding: 0;
  border: 0;
  border-radius: 40%;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.rbtn.left { left: 0; }
.rbtn.right { right: 0; }
.rbtn:focus-visible { outline: 3px solid rgba(255, 255, 255, 0.9); outline-offset: -6px; }
@media (prefers-reduced-motion: reduce) {
  .rot, .arc { transition: none; }
}
</style>
