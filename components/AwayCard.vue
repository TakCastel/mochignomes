<template>
  <Transition name="pop">
    <div v-if="away" class="overlay">
      <section class="card" role="dialog" aria-modal="true" aria-labelledby="away-title">
        <div class="medal"><Icon name="solar:heart-bold-duotone" class="medal-icon" /></div>
        <h2 id="away-title">Pendant ton absence</h2>
        <p class="since">{{ since }}</p>
        <ul v-if="lines.length" class="lines">
          <li v-for="(l, i) in lines" :key="i">{{ l }}</li>
        </ul>
        <div v-if="away.surprise" class="surprise">
          <Icon :name="away.surprise.icon || 'solar:gift-bold-duotone'" class="s-icon" />
          <span>{{ away.surprise.text }}</span>
        </div>
        <!-- retour après une pause : un cadeau, jamais de reproche (versé en disant bonjour) -->
        <div v-if="store.returnGift > 0" class="surprise">
          <Icon name="solar:dollar-minimalistic-bold-duotone" class="s-icon" />
          <span>Elle t'a gardé {{ store.returnGift }} pièces.</span>
        </div>
        <button class="cta" type="button" @click="hello">Coucou !</button>
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
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  grid-template-columns: minmax(0, 360px);
  justify-content: center;
  background: rgba(30, 40, 70, 0.45);
}
.card {
  position: relative;
  width: 100%;
  padding: 54px 22px 22px;
  border-radius: 34px;
  text-align: center;
  color: #2b3440;
  background: linear-gradient(180deg, #ffffff, #eef3f8);
  box-shadow: 0 8px 0 #cfd9e4, 0 24px 50px rgba(30, 40, 70, 0.4), inset 0 2px 0 #fff;
}
.medal {
  position: absolute;
  top: -42px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 28%, #ffc0d2, #ff6d8a 60%, #e03a64);
  box-shadow: 0 0 0 6px #fff, 0 6px 0 6px #cfd9e4, 0 14px 24px rgba(30, 40, 70, 0.3);
  animation: bob 2.4s ease-in-out infinite;
}
.medal-icon { width: 44px; height: 44px; color: #fff; }
@keyframes bob { 50% { transform: translateX(-50%) translateY(-5px) rotate(-4deg); } }
h2 { margin: 0; font: 700 26px "Fredoka", "Nunito", system-ui, sans-serif; }
.since { margin: 4px 0 0; font-weight: 700; font-size: 14px; opacity: 0.7; }
.lines { margin: 14px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; text-align: left; }
.lines li { padding: 10px 14px; border-radius: 16px; background: #f1f5fa; font-weight: 700; font-size: 15px; line-height: 1.35; }
.surprise {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: #fff3d9;
  box-shadow: 0 0 0 2px #ffd88a;
  text-align: left;
  font-weight: 800;
  font-size: 15px;
}
.s-icon { flex: none; width: 28px; height: 28px; color: #e8892a; }
.cta {
  width: 100%;
  min-height: 52px;
  margin-top: 18px;
  padding: 14px 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #7fdc5a, #4fbf34);
  color: #fff;
  font: 700 18px "Fredoka", "Nunito", system-ui, sans-serif;
  box-shadow: 0 5px 0 #3c9a22, 0 10px 18px rgba(30, 50, 80, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.35);
  cursor: pointer;
}
.cta:active { transform: translateY(4px); box-shadow: 0 1px 0 #3c9a22; }
.pop-enter-active { transition: opacity 0.25s; }
.pop-enter-active .card { transition: transform 0.45s cubic-bezier(0.3, 1.6, 0.5, 1); }
.pop-leave-active { transition: opacity 0.2s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-from .card { transform: scale(0.7) translateY(30px); }
@media (prefers-reduced-motion: reduce) { .medal { animation: none; } }
</style>
