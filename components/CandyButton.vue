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
  gap: 4px;
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
  box-shadow: 3px 5px 10px rgba(140, 110, 80, 0.45), -3px -3px 8px #fff;
  transition: box-shadow 0.1s;
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
.icon {
  position: relative;
  z-index: 1;
  width: 56%;
  height: 56%;
  filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.25));
}
.candy-btn:active .rim { box-shadow: inset 2px 3px 6px rgba(140, 110, 80, 0.45), inset -2px -2px 5px #fff; }
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
