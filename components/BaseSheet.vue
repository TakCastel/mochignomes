<template>
  <Transition :name="fullscreen ? 'page' : 'sheet'">
    <div v-if="open" class="overlay" :class="{ full: fullscreen }" @click.self="!fullscreen && close()">
      <section class="sheet" :class="{ full: fullscreen }" role="dialog" :aria-modal="!fullscreen" :aria-label="title">
        <div v-if="!fullscreen" class="grab" />
        <header class="head">
          <button v-if="fullscreen" class="ui-icon-btn" aria-label="Retour à la maison" @click="close">
            <Icon name="solar:arrow-left-bold" class="ic" />
          </button>
          <div class="title">
            <span v-if="icon" class="ui-medal ui-medal--sm"><Icon :name="icon" class="ic" /></span>
            <div class="title-txt">
              <h2>{{ title }}</h2>
              <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
            </div>
          </div>
          <button v-if="!fullscreen" class="ui-icon-btn" aria-label="Fermer" @click="close">
            <Icon name="solar:close-circle-bold" class="ic" />
          </button>
        </header>
        <div class="body"><slot /></div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  icon: { type: String, default: "" },
  // page plein écran avec flèche retour (la barre du bas reste visible)
  fullscreen: { type: Boolean, default: false },
});

function close() {
  if (props.fullscreen) closePage();
  else closeSettings();
}
const onKey = (e) => e.key === "Escape" && props.open && close();
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
  background: var(--scrim);
}
/* page : laisse la barre du bas libre */
.overlay.full {
  bottom: calc(var(--nav-h, 78px) + env(safe-area-inset-bottom, 0px));
  align-items: stretch;
  background: transparent;
  pointer-events: none;
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
.sheet.full {
  max-height: none;
  height: 100%;
  border-radius: 0;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 20px;
  background: var(--surface-2);
  box-shadow: none;
  pointer-events: auto;
  -webkit-overflow-scrolling: touch;
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
  align-items: center;
  gap: var(--s-3);
  margin-bottom: var(--s-4);
}
.title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  min-width: 0;
}
.title-txt { min-width: 0; }
h2 {
  margin: 0;
  font: 700 26px/1.1 var(--font-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.subtitle {
  margin: 2px 0 0;
  font: 700 var(--t-md)/1.25 var(--font-text);
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.body { min-width: 0; }
.sheet-enter-active, .sheet-leave-active { transition: background 0.25s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.32s cubic-bezier(0.3, 1.2, 0.5, 1); }
.sheet-enter-from, .sheet-leave-to { background: rgba(40, 20, 60, 0); }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
.page-enter-active, .page-leave-active { transition: opacity 0.2s, transform 0.25s ease; }
.page-enter-from, .page-leave-to { opacity: 0; transform: translateY(14px); }
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet, .sheet-leave-active .sheet, .page-enter-active, .page-leave-active { transition: none; }
}
</style>
