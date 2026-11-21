<template>
  <div v-show="!activeActivity" class="zoom-controls">
    <button type="button" class="zbtn" aria-label="Zoom avant" @click="emit('in')">
      <Icon name="solar:magnifer-zoom-in-bold" class="zi" />
    </button>
    <button type="button" class="zbtn" :class="{ hidden: zoom <= 1.02 }" :tabindex="zoom <= 1.02 ? -1 : 0" aria-label="Zoom arrière" @click="emit('out')">
      <Icon name="solar:magnifer-zoom-out-bold" class="zi" />
    </button>
    <button v-if="Math.abs(zoom - 1) > 0.05" type="button" class="zbtn" aria-label="Recentrer" @click="emit('reset')">
      <Icon name="solar:target-bold" class="zi" />
    </button>
    <Transition name="zl">
      <span v-if="label" class="zlabel" aria-live="polite">{{ label }}</span>
    </Transition>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { activeActivity } from "~/composables/useLiveCreature";

const props = defineProps({ zoom: { type: Number, default: 1 } });
const emit = defineEmits(["in", "out", "reset"]);

// petit libellé « 1,7× » qui s'efface 1 s après le dernier changement
const label = ref("");
let timer = null;
watch(() => props.zoom, (z) => {
  label.value = `${z.toFixed(1).replace(".", ",")}×`;
  clearTimeout(timer);
  timer = setTimeout(() => (label.value = ""), 1000);
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
.zoom-controls {
  position: absolute;
  right: 14px;
  top: calc(env(safe-area-inset-top, 0px) + 96px);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.zbtn {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--hud-line, #d6dfea);
  border-radius: 50%;
  background: var(--surface);
  color: var(--hud-ink, #2c4f9e);
  box-shadow: 0 4px 10px rgba(30, 55, 100, 0.16);
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s, opacity 0.2s;
}
.zbtn:active { transform: scale(0.92); }
.zbtn.hidden { opacity: 0; pointer-events: none; }
.zi { width: 24px; height: 24px; }
.zlabel {
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--hud-line, #d6dfea);
  color: var(--hud-ink, #2c4f9e);
  font: 800 12px var(--font-text, system-ui, sans-serif);
  box-shadow: 0 2px 6px rgba(30, 55, 100, 0.14);
}
.zl-enter-active, .zl-leave-active { transition: opacity 0.2s; }
.zl-enter-from, .zl-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .zbtn { transition: none; }
}
</style>
