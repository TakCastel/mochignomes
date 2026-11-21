<template>
  <!-- Pièces + Étoiles (à placer DANS l'en-tête du Sac ou de la Boutique seulement) -->
  <div class="currency-bar" role="group" aria-label="Ton porte-monnaie">
    <span class="pill coins" :class="{ bump: bumpCoins }" :aria-label="`${inv.coins} pièces`">
      <Icon name="solar:dollar-minimalistic-bold-duotone" class="ic" />
      <span class="num">{{ shownCoins }}</span>
    </span>
    <span v-if="showGems" class="pill gems" :class="{ bump: bumpGems }" :aria-label="`${inv.gems} Étoiles`">
      <Icon name="solar:star-bold-duotone" class="ic" />
      <span class="num">{{ shownGems }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";

const inv = useInventoryStore();
const store = useTamagotchiStore();

// Étoiles : visibles une fois la fonctionnalité débloquée (ou si elle en a déjà)
const showGems = computed(() => !!store.hasFeature?.("etoiles") || inv.gems > 0);

// compteur qui défile jusqu'à la nouvelle valeur
function useCountUp(source) {
  const shown = ref(source());
  const bump = ref(false);
  let raf = 0, timer = 0;
  watch(source, (to, from) => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    const start = shown.value;
    const t0 = performance.now();
    const dur = Math.min(900, 250 + Math.abs(to - start) * 12);
    if (to > from) { bump.value = false; requestAnimationFrame(() => (bump.value = true)); timer = setTimeout(() => (bump.value = false), 500); }
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      shown.value = Math.round(start + (to - start) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
  onBeforeUnmount(() => { cancelAnimationFrame(raf); clearTimeout(timer); });
  return { shown, bump };
}

const { shown: shownCoins, bump: bumpCoins } = useCountUp(() => inv.coins);
const { shown: shownGems, bump: bumpGems } = useCountUp(() => inv.gems);
</script>

<style scoped>
.currency-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 4px 14px 4px 6px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(40, 55, 80, 0.12), inset 0 -2px 0 rgba(40, 55, 80, 0.05);
  font: 700 18px/1 "Fredoka", "Nunito", system-ui, sans-serif;
  color: var(--ink, #2f3a4a);
  font-variant-numeric: tabular-nums;
}
.ic { width: 26px; height: 26px; }
.coins .ic { color: #f2b01e; }
.gems .ic { color: #a77bff; }
.bump { animation: bump 0.45s cubic-bezier(0.3, 1.6, 0.5, 1); }
.coins.bump { box-shadow: 0 0 0 4px rgba(242, 176, 30, 0.25), 0 3px 10px rgba(40, 55, 80, 0.12); }
.gems.bump { box-shadow: 0 0 0 4px rgba(167, 123, 255, 0.25), 0 3px 10px rgba(40, 55, 80, 0.12); }
@keyframes bump { 0% { transform: scale(1); } 40% { transform: scale(1.14); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .bump { animation: none; } }
</style>
