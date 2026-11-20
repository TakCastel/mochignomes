<template>
  <Transition name="sheet">
    <div v-if="open" class="overlay" @click.self="close">
      <section class="sheet" role="dialog" aria-modal="true" :aria-label="title">
        <div class="grab" />
        <header class="head">
          <div class="title">
            <span v-if="icon" class="title-badge"><Icon :name="icon" class="title-icon" /></span>
            <div>
              <h2>{{ title }}</h2>
              <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
            </div>
          </div>
          <button class="close" aria-label="Fermer" @click="close">✕</button>
        </header>
        <slot />
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from "vue";

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  icon: { type: String, default: "" },
});

function close() {
  gameBus.sheet = null;
}
const onKey = (e) => e.key === "Escape" && close();
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(40, 20, 60, 0.4);
}
.sheet {
  width: 100%;
  max-width: 480px;
  max-height: 88%;
  overflow-y: auto;
  background: linear-gradient(180deg, #ffffff 60%, var(--plate-hi));
  color: var(--ink);
  border-radius: 32px 32px 0 0;
  padding: 10px 20px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -10px 40px rgba(30, 15, 50, 0.35), inset 0 2px 0 #fff;
}
.grab {
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: var(--knob-side);
  margin: 0 auto 14px;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.title-badge {
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, var(--accent-hi), var(--accent) 70%);
  box-shadow: 0 4px 0 var(--accent-lo), inset 0 2px 0 rgba(255, 255, 255, 0.4);
}
.title-icon { width: 26px; height: 26px; color: #fff; }
h2 {
  margin: 0;
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
}
.subtitle { margin: 2px 0 0; font-weight: 700; color: color-mix(in srgb, var(--ink) 72%, #fff); font-size: 14px; }
.close {
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: var(--plate-lo);
  color: var(--ink);
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 2px 3px 6px var(--plate-shade), -2px -2px 5px #fff;
}
.sheet-enter-active, .sheet-leave-active { transition: background 0.25s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.32s cubic-bezier(0.3, 1.2, 0.5, 1); }
.sheet-enter-from, .sheet-leave-to { background: rgba(40, 20, 60, 0); }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>
