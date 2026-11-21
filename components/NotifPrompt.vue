<template>
  <Transition name="np">
    <div v-if="show" class="np" role="dialog" aria-label="Rappels">
      <div class="ico"><Icon name="solar:bell-bold-duotone" size="26" /></div>
      <div class="txt">
        <strong>{{ store.name }} peut te faire signe</strong>
        <p>Un petit rappel par jour au plus, jamais la nuit. Tu peux l'arrêter quand tu veux.</p>
      </div>
      <div class="btns">
        <button class="btn primary" @click="yes">Oui</button>
        <button class="btn" @click="later">Plus tard</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";

const store = useTamagotchiStore();
const { permission, enabled, lastAsk, enable, markAsked } = useNotifications();
const dismissed = ref(false);
const mounted = ref(false);
onMounted(() => { mounted.value = true; });

const WEEK = 7 * 24 * 3600 * 1000;
const turn = useOverlayTurn();
const show = computed(() =>
  mounted.value && !dismissed.value
  && turn.value === "notif"
  && (store.unlocked?.length || 0) >= 1
  && (store.sessions || 0) >= 2 // jamais pendant la toute première visite
  && store.onboardStep >= 6
  && permission.value === "default"
  && !enabled.value
  && Date.now() - (lastAsk.value || 0) > WEEK);

async function yes() {
  dismissed.value = true;
  markAsked();
  const ok = await enable();
  gameToast(ok ? `${store.name} te fera signe, doucement.` : "Pas de souci, tu pourras changer d'avis dans les réglages.", "solar:bell-bold-duotone");
}
function later() {
  dismissed.value = true;
  markAsked();
}
</script>

<style scoped>
.np {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 40;
  max-width: 420px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  padding: 14px;
  border-radius: 22px;
  background: var(--surface);
  color: var(--ink, #5a3816);
  box-shadow: 0 4px 0 var(--plate-lo, #e6d3b0), 0 10px 26px rgba(0, 0, 0, 0.18);
}
.ico { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 16px; background: var(--accent-hi, #ffe3b0); color: var(--accent, #e8780e); }
.txt strong { font: 700 16px "Fredoka", system-ui, sans-serif; }
.txt p { margin: 2px 0 0; font: 700 13px "Nunito", system-ui, sans-serif; opacity: 0.8; }
.btns { grid-column: 1 / -1; display: flex; gap: 8px; }
.btn {
  flex: 1;
  min-height: 48px;
  border: 0;
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink, #5a3816);
  font: 800 15px "Nunito", system-ui, sans-serif;
  box-shadow: 0 3px 0 var(--knob-side, #d9ac6c), inset 0 0 0 2px var(--knob-side, #d9ac6c);
  cursor: pointer;
}
.btn.primary { background: linear-gradient(180deg, var(--accent-hi, #ffb347), var(--accent, #e8780e)); color: #fff; box-shadow: 0 3px 0 var(--accent-lo, #b85a00); }
.np-enter-active, .np-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.np-enter-from, .np-leave-to { transform: translateY(24px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .np-enter-active, .np-leave-active { transition: none; } }
</style>
