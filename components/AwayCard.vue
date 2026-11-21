<template>
  <Transition name="pop">
    <div v-if="away" class="ui-scrim away-scrim">
      <section class="ui-dialog card" role="dialog" aria-modal="true" aria-labelledby="away-title">
        <div class="ui-medal ui-medal--love medal"><Icon name="solar:heart-bold-duotone" class="ic" /></div>
        <h2 id="away-title" class="ui-dialog-title">Pendant ton absence</h2>
        <p class="ui-text">{{ since }}</p>
        <ul v-if="lines.length" class="lines">
          <li v-for="(l, i) in lines" :key="i" class="ui-well">{{ l }}</li>
        </ul>
        <!-- surprises : même ligne pour le cadeau trouvé et les pièces gardées -->
        <div v-if="away.surprise || store.returnGift > 0" class="surprises">
          <div v-if="away.surprise" class="surprise">
            <span class="ui-thumb s-thumb"><Icon :name="away.surprise.icon || 'solar:gift-bold-duotone'" class="ic" /></span>
            <span>{{ away.surprise.text }}</span>
          </div>
          <!-- retour après une pause : un cadeau, jamais de reproche (versé en disant bonjour) -->
          <div v-if="store.returnGift > 0" class="surprise">
            <span class="ui-thumb s-thumb"><Icon name="solar:dollar-minimalistic-bold-duotone" class="ic ui-coin" /></span>
            <span>Elle t'a gardé {{ store.returnGift }} pièces.</span>
          </div>
        </div>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--primary cta" type="button" @click="hello">Coucou !</button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();

// la carte n'apparaît pas pendant l'onboarding
const away = computed(() => (store.onboardStep >= 6 || store.onboardStep == null ? store.away : null));
const lines = computed(() => (away.value?.lines || []).slice(0, 3));

const since = computed(() => {
  const s = away.value?.seconds || 0;
  const h = Math.floor(s / 3600);
  if (h >= 48) return `${store.name} t'a attendu ${Math.floor(h / 24)} jours.`;
  if (h >= 1) return `${store.name} t'a attendu ${h} h.`;
  return `${store.name} t'a attendu ${Math.max(1, Math.floor(s / 60))} min.`;
});

function hello() {
  if (store.returnGift > 0) store.claimReturnGift?.();
  store.dismissAway?.();
  gameCommand("react", "calin");
}
</script>

<style scoped>
/* au-dessus de tout (bulles de la créature comprises) ; le flou calme la scène derrière */
.away-scrim { z-index: 45; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.card { overflow: visible; margin-top: 40px; padding-top: 52px; }
.medal { position: absolute; top: -36px; left: 50%; width: 76px; height: 76px; transform: translateX(-50%); box-shadow: 0 0 0 6px #fff, 0 4px 0 6px #e3e9f0, 0 12px 24px rgba(30, 40, 70, 0.3); animation: bob 2.4s ease-in-out infinite; }
.medal .ic { width: 40px; height: 40px; }
@keyframes bob { 50% { transform: translateX(-50%) translateY(-5px) rotate(-4deg); } }
.lines { width: 100%; margin: var(--s-1) 0 0; padding: 0; list-style: none; display: grid; gap: var(--s-2); text-align: left; }
.lines li { padding: 10px var(--s-3); font: 700 15px/1.35 var(--font-text); color: var(--ink); }
.surprises { width: 100%; display: grid; gap: var(--s-2); }
.surprise {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: var(--s-2) var(--s-3) var(--s-2) var(--s-2);
  border-radius: var(--r-md);
  background: linear-gradient(180deg, #fff8e6, #ffefc8);
  text-align: left;
  font: 800 15px/1.3 var(--font-text);
  color: #6b4a00;
}
.s-thumb { width: 40px; height: 40px; background: #fff; }
.s-thumb .ic { width: 26px; height: 26px; color: var(--warn); }
.s-thumb .ic.ui-coin { color: var(--coin); }
.cta { min-height: 52px; font-size: var(--t-xl); border-radius: var(--r-pill); }
.pop-enter-active { transition: opacity 0.25s; }
.pop-enter-active .card { transition: transform 0.45s cubic-bezier(0.3, 1.6, 0.5, 1); }
.pop-leave-active { transition: opacity 0.2s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-from .card { transform: scale(0.7) translateY(30px); }
@media (prefers-reduced-motion: reduce) { .medal { animation: none; } }
</style>
