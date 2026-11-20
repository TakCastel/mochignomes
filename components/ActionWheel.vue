<template>
  <Transition name="wheel">
    <div v-if="open" class="veil" @click.self="close">
      <div class="wheel" :style="{ left: center.x + 'px', top: center.y + 'px' }">
        <button
          v-for="(a, i) in actions"
          :key="a.key"
          class="item"
          :class="{ locked: !!a.reason }"
          :style="{ '--x': pos[i].x + 'px', '--y': pos[i].y + 'px', '--delay': i * 25 + 'ms' }"
          :aria-label="a.label + (a.reason ? ` (${a.reason})` : '')"
          @click="press(a)"
        >
          <span class="disc">
            <Icon :name="a.icon" class="ic" />
            <Icon v-if="a.reason" name="ph:lock-simple-fill" class="lock" />
          </span>
          <span class="label">{{ a.label }}</span>
        </button>
        <button class="close" aria-label="Fermer le menu" @click="close">
          <Icon name="ph:x-bold" class="x" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  center: { type: Object, default: () => ({ x: 200, y: 400 }) },
  radius: { type: Number, default: 118 },
});
const emit = defineEmits(["close"]);
const { store } = useCreatureMood();

const BASE = [
  { key: "nourrir", label: "Manger", icon: "ph:bowl-food-fill" },
  { key: "laver", label: "Laver", icon: "ph:bathtub-fill" },
  { key: "jouer", label: "Jouer", icon: "ph:soccer-ball-fill" },
  { key: "soigner", label: "Soigner", icon: "ph:first-aid-kit-fill" },
  { key: "coucher", label: "Dodo", icon: "ph:moon-stars-fill" },
  { key: "calin", label: "Câlin", icon: "ph:hand-heart-fill" },
];

// Pourquoi une action n'est pas possible : la créature le dit elle-même
function reasonFor(key) {
  if (store.health <= 0) return key === "soigner" ? null : "...";
  if (store.isSleeping) return key === "coucher" ? null : "Chut... je dors";
  if (key === "coucher" && store.energy >= 30) return "Je suis pas fatiguée !";
  if (key === "jouer" && store.energy < 10) return "Trop crevée...";
  return null;
}

const actions = computed(() =>
  BASE.map((a) => {
    const wake = a.key === "coucher" && store.isSleeping;
    return { ...a, label: wake ? "Réveil" : a.label, icon: wake ? "ph:sun-fill" : a.icon, reason: reasonFor(a.key) };
  })
);

// six positions en cercle, la première en haut à gauche
const pos = computed(() =>
  actions.value.map((_, i) => {
    const angle = (-150 + i * 60) * (Math.PI / 180);
    return { x: Math.cos(angle) * props.radius, y: Math.sin(angle) * props.radius };
  })
);

function close() {
  emit("close");
}
function press(a) {
  if (a.reason) {
    gameSay(a.reason);
    return;
  }
  navigator.vibrate?.(12);
  close();
  if (a.key === "coucher") return store.isSleeping ? store.wakeUp() : store.startSleeping();
  store.applyAction(a.key);
}
</script>

<style scoped>
.veil {
  position: fixed;
  inset: 0;
  z-index: 15;
  background: radial-gradient(circle at 50% 45%, rgba(20, 35, 60, 0.05), rgba(20, 35, 60, 0.35));
}
.wheel { position: absolute; width: 0; height: 0; }
.item {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%));
  animation: pop 0.32s cubic-bezier(0.3, 1.5, 0.5, 1) both;
  animation-delay: var(--delay);
  -webkit-tap-highlight-color: transparent;
}
@keyframes pop {
  from { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
}
.disc {
  position: relative;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 8px 20px rgba(20, 40, 70, 0.28), inset 0 -3px 0 #e3eaf2;
  transition: transform 0.1s;
}
.item:active .disc { transform: scale(0.92); }
.ic { width: 30px; height: 30px; color: var(--accent); }
.lock {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 16px;
  height: 16px;
  padding: 2px;
  border-radius: 50%;
  background: #fff;
  color: #8a97a8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.locked .ic { color: #b3bfcc; }
.label {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: 800 12px "Nunito", system-ui, sans-serif;
  white-space: nowrap;
  box-shadow: 0 3px 8px rgba(20, 40, 70, 0.2);
}
.locked .label { background: #9aa8b8; }
.close {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 12px rgba(20, 40, 70, 0.25);
  cursor: pointer;
}
.x { width: 18px; height: 18px; color: var(--ink); }
.wheel-enter-active, .wheel-leave-active { transition: opacity 0.2s; }
.wheel-enter-from, .wheel-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .item { animation: none; } }
</style>
