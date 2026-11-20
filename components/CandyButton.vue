<template>
  <button
    class="candy-btn"
    :class="{ locked: !!action.reason, highlight: action.highlight, wiggle }"
    :style="{ '--c': action.color, '--d': action.dark }"
    :aria-label="action.label + (action.reason ? ` (${action.reason})` : '')"
    @click="$emit('press')"
  >
    <span class="rim">
      <span class="candy">
        <Icon :name="action.icon" class="icon" />
      </span>
    </span>
    <span class="label">{{ action.label }}</span>
  </button>
</template>

<script setup>
defineProps({
  action: { type: Object, required: true },
  wiggle: { type: Boolean, default: false },
});
defineEmits(["press"]);
</script>

<style scoped>
.candy-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
/* anneau crème en relief, comme moulé dans la coque */
.rim {
  display: block;
  width: var(--btn, 64px);
  height: var(--btn, 64px);
  padding: 5px;
  border-radius: 50%;
  background: linear-gradient(145deg, #fffaf3, #e9dece);
  /* épaisseur du plastique sous le bouton */
  box-shadow: 0 6px 0 #d6c3a9, 0 8px 12px rgba(120, 90, 60, 0.4), -3px -3px 8px #fff, inset 0 1px 0 #fff;
  transition: box-shadow 0.08s, transform 0.08s;
}
/* bonbon brillant */
.candy {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 28%, color-mix(in srgb, var(--c) 45%, #fff), var(--c) 52%, var(--d) 100%);
  box-shadow: inset 0 -5px 8px color-mix(in srgb, var(--d) 70%, #000), inset 0 3px 5px rgba(255, 255, 255, 0.5);
  transition: transform 0.08s, filter 0.2s;
}
.candy::after {
  content: "";
  position: absolute;
  top: 8%;
  left: 22%;
  width: 56%;
  height: 26%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0));
}
/* symbole blanc moulé dans le bonbon */
.icon {
  position: relative;
  z-index: 1;
  width: 50%;
  height: 50%;
  color: #fff;
  filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.18)) drop-shadow(0 2px 1px color-mix(in srgb, var(--d) 75%, #000));
}
.candy-btn:active .rim {
  transform: translateY(5px);
  box-shadow: 0 1px 0 #d6c3a9, 0 2px 4px rgba(120, 90, 60, 0.4), inset 0 1px 0 #fff;
}
.candy-btn:active .candy { transform: scale(0.92); }
.candy-btn:focus-visible .rim { outline: 3px solid #6f4fe0; outline-offset: 2px; }
.label {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 600;
  font-size: 12px;
  color: #6b4a33;
}
.locked .candy { filter: grayscale(0.9) brightness(1.1) opacity(0.65); }
.locked .label { opacity: 0.5; }
.highlight .rim { animation: beckon 1s ease-in-out infinite; }
@keyframes beckon { 50% { transform: translateY(-4px) scale(1.06); } }
.wiggle .rim { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-10deg); }
  40% { transform: rotate(9deg); }
  60% { transform: rotate(-6deg); }
  80% { transform: rotate(3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .highlight .rim, .wiggle .rim { animation: none; }
}
</style>
