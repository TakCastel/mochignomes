<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in shown" :key="t.id" class="toast">
        <span class="medal" :style="{ '--c': tint(t)[0], '--c-lo': tint(t)[1] }"><Icon :name="t.icon" class="ic" /></span>
        <span class="txt">{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { ACHIEVEMENTS } from "~/lib/achievements";
import { levelInfo } from "~/stores/useTamagotchiStore";
import { pick, growUpLine, ILL_START, RECOVERY } from "~/lib/dialogue";

// Surveille succès et niveau : une notification à chaque nouveauté
const { store } = useCreatureMood();
const level = computed(() => levelInfo(store.xp).level);

// 2 messages visibles au plus (les plus récents)
const shown = computed(() => gameBus.toasts.slice(-2));
// couleur du médaillon selon le type (déduit de l'icône et du texte) :
// besoin = couleur de la jauge, succès/niveau = or, réussite = vert, sinon bleu ciel
const NEED_ICON = { "solar:donut-bitten-bold-duotone": "hunger", "solar:waterdrop-bold-duotone": "cleanliness", "solar:football-bold-duotone": "fun", "solar:bolt-bold-duotone": "energy", "solar:heart-bold-duotone": "health" };
const TIERS = [["#49c13a", "#2f9a24"], ["#f5c518", "#c49a08"], ["#ff9a26", "#d0700c"], ["#ea4338", "#b52a20"]];
function tint(t) {
  const need = NEED_ICON[t.icon];
  if (need && !/^Niveau|^Succès|succès/.test(t.text)) {
    const v = store[need];
    return TIERS[v >= 60 ? 0 : v >= 40 ? 1 : v >= 20 ? 2 : 3];
  }
  if (/^Niveau|^Succès|succès/.test(t.text) || /star|cup|medal|crown|trophy/.test(t.icon)) return ["#ffc21a", "#d18a00"];
  if (/check|confetti/.test(t.icon)) return ["#49c13a", "#2f9a24"];
  return ["#4aa8f0", "#1d6fbf"];
}

watch(level, (lvl, old) => {
  if (old && lvl > old) {
    gameToast(`Niveau ${lvl} !`, "solar:star-bold-duotone");
    gameCommand("react", "niveau");
  }
});

// Elle grandit, tombe malade, guérit : elle le dit (après la réaction en cours)
watch(() => store.stage, (st, old) => {
  if (!old || st === old) return;
  const line = growUpLine(st, store.name);
  if (line) setTimeout(() => gameSay(line), 2600);
});
watch(() => !!store.illness, (ill, was) => {
  if (ill === was) return;
  if (ill && !store.isSleeping) setTimeout(() => gameSay(pick(ILL_START)), 400);
  if (!ill) setTimeout(() => gameSay(pick(RECOVERY)), 1700);
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
/* centré sous la carte de profil, dans le ciel libre */
.toasts {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 100px);
  left: 14px;
  right: 14px;
  z-index: 25;
  display: grid;
  justify-items: center;
  gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(100%, 420px);
  min-height: 52px;
  padding: 6px 20px 6px 6px;
  border-radius: 999px;
  background: #fff;
  color: var(--hud-ink);
  font: 600 16px/1.2 var(--font-title);
  box-shadow: 0 12px 28px rgba(30, 55, 100, 0.22), 0 0 0 1px #d6dfea;
}
.medal {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.5), var(--c) 55%, var(--c-lo));
  background-color: var(--c);
  box-shadow: 0 0 0 3px #fff, 0 2px 4px rgba(40, 60, 90, 0.3);
}
.medal .ic { width: 22px; height: 22px; color: #fff; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3)); }
.txt {
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.toast-enter-active { transition: transform 0.4s var(--spring), opacity 0.3s; }
.toast-leave-active { transition: transform 0.3s, opacity 0.3s; }
.toast-enter-from { transform: translateY(14px) scale(0.9); opacity: 0; }
.toast-leave-to { transform: translateY(-8px); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
  .toast-enter-from, .toast-leave-to { transform: none; }
}
</style>
