<template>
  <!-- tuto de la nouveauté en cours (lib/guides.js) : une étape à la fois.
       Écran principal : en haut, sous la carte de profil (le menu sur la créature se cale dessous,
       elle s'efface le temps qu'elle parle : sa bulle 3D est sous l'interface).
       Dans une page : en bas, au-dessus de la barre ; la page réserve sa hauteur (--guide-h).
       Pendant l'essayage en boutique : en haut (la barre d'essayage occupe le bas). -->
  <Transition name="guide">
    <div
      v-if="shown"
      ref="el"
      :key="shown.id"
      class="menu-guide"
      :class="{ top: atTop, hush: atTop && gameBus.speaking }"
      role="status"
      aria-live="polite"
    >
      <div class="body">
        <span class="kicker">{{ shown.label }} · {{ shown.n }}/{{ shown.total }}</span>
        <span class="txt">{{ shown.text }}</span>
      </div>
      <button class="skip" type="button" @click="store.advanceGuide()">Passer</button>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { GUIDES, guideText } from "~/lib/guides";
import { gameBus, useCreatureMood } from "~/composables/useCreatureMood";
import { FEATURES } from "~/lib/growth";

const { store } = useCreatureMood();
const el = ref(null);

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
const onPage = computed(() => !!(gameBus.page || gameBus.sheet));
const atTop = computed(() => !onPage.value || !!gameBus.trying);

// en bas d'une page : la page garde la place de la bannière sous son contenu (BaseSheet, Cuisine)
function setSpace(px) {
  if (typeof document !== "undefined") document.documentElement.style.setProperty("--guide-h", px ? `${px}px` : "0px");
}
watch(
  () => [shown.value?.id, atTop.value],
  async () => {
    await nextTick();
    setSpace(shown.value && !atTop.value && el.value ? Math.ceil(el.value.offsetHeight + 12) : 0);
  },
  { immediate: true }
);
onBeforeUnmount(() => setSpace(0));
</script>

<style scoped>
.menu-guide {
  position: fixed;
  left: 50%;
  /* au-dessus de la barre du bas (64 px + onglet de 28 px) */
  bottom: calc(env(safe-area-inset-bottom, 0px) + 100px);
  z-index: 29; /* par-dessus les pages (20) et la barre (28) */
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(92vw, 400px);
  box-sizing: border-box;
  transform: translateX(-50%);
  padding: 9px 9px 9px 14px;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--ui-sh-3), 0 0 0 2px color-mix(in srgb, var(--accent) 45%, var(--surface));
  pointer-events: none;
  transition: opacity 0.25s;
}
/* écran principal : même place que la carte du tutoriel, sous la carte de profil */
.menu-guide.top { bottom: auto; top: calc(env(safe-area-inset-top, 0px) + 92px); }
.menu-guide.hush { opacity: 0; }
.body { flex: 1; min-width: 0; display: grid; gap: 2px; }
.kicker { font: 800 11px/1.2 "Nunito", system-ui, sans-serif; letter-spacing: 0.04em; text-transform: uppercase; color: var(--accent-ink, var(--accent)); }
.txt { font: 700 14px/1.3 "Nunito", system-ui, sans-serif; color: var(--ink); }
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
