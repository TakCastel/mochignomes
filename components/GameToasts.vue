<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in gameBus.toasts" :key="t.id" class="toast">
        <span class="ui-medal ui-medal--gold medal"><Icon :name="t.icon" class="ic" /></span>
        <span class="txt">{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { ACHIEVEMENTS } from "~/lib/achievements";
import { levelInfo } from "~/stores/useTamagotchiStore";

// Surveille succès et niveau : une notification à chaque nouveauté
const { store } = useCreatureMood();
const level = computed(() => levelInfo(store.xp).level);

watch(level, (lvl, old) => {
  if (old && lvl > old) {
    gameToast(`Niveau ${lvl} !`, "solar:star-bold-duotone");
    gameCommand("react", "niveau");
  }
});

// Plusieurs succès d'un coup (ex. ancienne partie au démarrage) : un seul bandeau.
// Avant l'Album (où on les retrouve), ils s'accumulent sans bruit.
// Au démarrage (ancienne partie, retour) : rattrapage silencieux, rien ne s'empile sur
// la carte des retrouvailles ; ils sont simplement marqués comme vus.
let booted = false;
onMounted(() => setTimeout(() => {
  checkAchievements(true);
  booted = true;
}, 1500));
function checkAchievements(silent = false) {
  if (!booted && !silent) return;
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (store.unlocked.includes(a.id)) continue;
    const [value, goal] = a.progress(store);
    if (value >= goal) {
      store.unlocked.push(a.id);
      fresh.push(a);
    }
  }
  if (silent) { markSeenUnlocked(store.unlocked.length); return; }
  if (!fresh.length || !(store.unlockedPages || []).includes("album")) return;
  const [first] = fresh;
  gameToast(fresh.length > 1 ? `${fresh.length} nouveaux succès dans l'Album !` : `Succès : ${first.label}`, first.icon);
}
watch(() => [store.xp, JSON.stringify(store.counters), Math.floor((store.lastUpdate || 0) / 60000)], () => checkAchievements());
</script>

<style scoped>
/* sous la carte de profil, dans le ciel libre (jamais par-dessus le profil) */
.toasts {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + clamp(10px, 1.8vh, 18px) + 84px);
  left: 14px;
  right: 14px;
  z-index: 25;
  display: grid;
  justify-items: center;
  gap: var(--s-2);
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  min-height: 48px;
  padding: 6px 18px 6px 6px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.97);
  color: var(--ink);
  font: 700 var(--t-lg)/1.25 var(--font-title);
  box-shadow: var(--sh-3), var(--hl);
}
.medal { width: 36px; height: 36px; box-shadow: 0 2px 0 #d18a00, inset 0 2px 0 rgba(255, 255, 255, 0.5); }
.medal .ic { width: 20px; height: 20px; }
.txt { min-width: 0; }
.toast-enter-active { transition: transform 0.4s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.3s; }
.toast-leave-active { transition: transform 0.3s, opacity 0.3s; }
.toast-enter-from { transform: translateY(-20px) scale(0.6); opacity: 0; }
.toast-leave-to { transform: translateY(-10px); opacity: 0; }
</style>
