<template>
  <!-- tuto de la nouveauté en cours (lib/guides.js) : une étape à la fois, au-dessus de la barre du bas.
       Pendant l'essayage en boutique, elle remonte en haut (la barre d'essayage occupe le bas). -->
  <Transition name="guide">
    <div v-if="shown" :key="shown.id" class="guide" :class="{ top: gameBus.trying }" role="status" aria-live="polite">
      <span class="num">{{ shown.label }} · {{ shown.n }}/{{ shown.total }}</span>
      <span class="txt">{{ shown.text }}</span>
      <button class="skip" type="button" @click="store.advanceGuide()">Passer</button>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from "vue";
import { GUIDES, guideText } from "~/lib/guides";
import { gameBus, useCreatureMood } from "~/composables/useCreatureMood";
import { FEATURES } from "~/lib/growth";

const { store } = useCreatureMood();

const shown = computed(() => {
  const g = store.guide;
  if (!g || !store.hatched || (store.onboardStep ?? 6) < 6 || store.away) return null;
  // la carte « Nouveau ! » passe d'abord ; pendant une activité 3D, le mini-jeu a son propre HUD
  const ev = store.unlockEvent;
  if ((ev && !ev.seen) || gameBus.activity) return null;
  const steps = GUIDES[g.key];
  const step = steps?.[g.step];
  if (!step) return null;
  return {
    id: `${g.key}:${g.step}`,
    label: FEATURES[g.key]?.label || "",
    n: g.step + 1,
    total: steps.length,
    text: guideText(step, store.name),
  };
});
</script>

<style scoped>
.guide {
  position: fixed;
  left: 50%;
  /* au-dessus de la barre du bas (64 px + onglet de 28 px) */
  bottom: calc(env(safe-area-inset-bottom, 0px) + 104px);
  z-index: 29; /* par-dessus les pages (20) et la barre (28) */
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(92vw, 400px);
  box-sizing: border-box;
  transform: translateX(-50%);
  padding: 10px 10px 10px 12px;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--ui-sh-3), 0 0 0 2px color-mix(in srgb, var(--accent) 45%, var(--surface));
  pointer-events: none;
}
.guide.top { bottom: auto; top: calc(env(safe-area-inset-top, 0px) + 12px); }
.num {
  flex: none;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: 800 12px "Nunito", system-ui, sans-serif;
  white-space: nowrap;
}
.txt { flex: 1; min-width: 0; font: 700 14px/1.3 "Nunito", system-ui, sans-serif; color: var(--ink); }
.skip {
  flex: none;
  pointer-events: auto;
  padding: 6px 10px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--hud-ink-2);
  font: 800 12px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.guide-enter-active, .guide-leave-active { transition: opacity 0.3s, transform 0.35s; }
.guide-enter-from, .guide-leave-to { opacity: 0; transform: translate(-50%, 10px); }
@media (prefers-reduced-motion: reduce) {
  .guide-enter-active, .guide-leave-active { transition: opacity 0.2s; }
  .guide-enter-from, .guide-leave-to { transform: translateX(-50%); }
}
</style>
