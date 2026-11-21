<template>
  <Transition :name="fullscreen ? 'page' : 'sheet'">
    <div v-if="open" class="overlay" :class="{ full: fullscreen }" @click.self="!fullscreen && close()">
      <section ref="sheetEl" class="sheet" :class="{ full: fullscreen, 'is-tall': tall }" role="dialog" :aria-modal="!fullscreen" :aria-label="title">
        <div v-if="!fullscreen" class="grab-zone" v-on="grabOn"><div class="grab" /></div>
        <header class="head">
          <button v-if="fullscreen" class="ui-icon-btn" aria-label="Retour à la maison" @click="close">
            <Icon name="solar:arrow-left-bold" class="ic" />
          </button>
          <div class="title">
            <span v-if="icon" class="ui-medal ui-medal--sm ui-medal--sky"><Icon :name="icon" class="ic" /></span>
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
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSheetDrag } from "~/composables/useSheetDrag";

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
// changement de page : on repart du haut (pas de défilement hérité de la page précédente)
const sheetEl = ref(null);
// volet tirable par sa poignée (bas = fermer, haut = agrandir) ; pas pour les pages plein écran
const { tall, grab: grabOn } = useSheetDrag(sheetEl, () => close());
watch(() => props.title, () => { if (sheetEl.value) sheetEl.value.scrollTop = 0; });
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
/* page : descend jusqu'en bas, la barre du bas (au-dessus, z 28) la recouvre */
.overlay.full {
  bottom: 0;
  align-items: stretch;
  background: transparent;
  pointer-events: none;
}
.sheet {
  width: 100%;
  max-width: 480px;
  max-height: 88%;
  overflow-y: auto;
  background: var(--glass-solid);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  color: var(--ink);
  border-radius: 32px 32px 0 0;
  /* en bas : la place de la barre du bas, qui passe par-dessus */
  padding: 10px 20px calc(env(safe-area-inset-bottom, 0px) + var(--nav-h, 78px) + 20px);
  box-shadow: 0 -10px 40px rgba(30, 60, 110, 0.3), var(--glass-edge);
  will-change: transform;
}
/* page plein écran : fond bleu ciel très léger, comme un ciel dégagé */
.sheet.is-tall { max-height: 96%; }
.sheet { transition: max-height 0.38s cubic-bezier(0.22, 1, 0.36, 1); }
.sheet.full {
  max-height: none;
  height: 100%;
  border-radius: 0;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px calc(env(safe-area-inset-bottom, 0px) + var(--nav-h, 78px) + 24px);
  background: linear-gradient(180deg, #e2f0ff 0%, #eef6ff 30%, var(--surface-2) 70%);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
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
  color: var(--sky-ink);
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
/* animations fluides : courbe « ease-out quint » (part vite, se pose en douceur, sans rebond),
   sortie plus courte en accélération ; fond qui se fond au même rythme */
.sheet-enter-active, .sheet-leave-active { transition: background 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
.sheet-enter-active .sheet { transition: transform 0.46s cubic-bezier(0.22, 1, 0.36, 1); }
.sheet-leave-active .sheet { transition: transform 0.24s cubic-bezier(0.55, 0, 0.75, 0.2); }
.sheet-enter-from, .sheet-leave-to { background: rgba(40, 20, 60, 0); }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
/* page : monte de quelques pixels en apparaissant, comme une fenêtre qui s'ouvre */
.page-enter-active { transition: opacity 0.28s ease-out, transform 0.42s cubic-bezier(0.22, 1, 0.36, 1); }
.page-leave-active { transition: opacity 0.16s ease-in, transform 0.18s ease-in; }
.page-enter-from { opacity: 0; transform: translateY(28px); }
.page-leave-to { opacity: 0; transform: translateY(12px); }
.page-enter-active .sheet, .sheet-enter-active .sheet { will-change: transform; }
/* le contenu de la page entre en cascade douce */
.page-enter-active .body :deep(.ui-page > *) { animation: rise-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
.page-enter-active .body :deep(.ui-page > *:nth-child(2)) { animation-delay: 0.04s; }
.page-enter-active .body :deep(.ui-page > *:nth-child(3)) { animation-delay: 0.08s; }
.page-enter-active .body :deep(.ui-page > *:nth-child(4)) { animation-delay: 0.12s; }
.page-enter-active .body :deep(.ui-page > *:nth-child(n + 5)) { animation-delay: 0.16s; }
@keyframes rise-in { from { opacity: 0; transform: translateY(18px); } }
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet, .sheet-leave-active .sheet, .page-enter-active, .page-leave-active { transition: none; }
  .page-enter-active .body :deep(.ui-page > *) { animation: none; }
}
</style>
