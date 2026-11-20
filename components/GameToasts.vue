<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in gameBus.toasts" :key="t.id" class="toast">
        <Icon :name="t.icon" class="icon" />
        <span>{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { ACHIEVEMENTS } from "~/lib/achievements";
import { levelInfo } from "~/stores/useTamagotchiStore";

// Surveille succès et niveau : une notification à chaque nouveauté
const { store } = useCreatureMood();
const level = computed(() => levelInfo(store.xp).level);

watch(level, (lvl, old) => {
  if (old && lvl > old) {
    gameToast(`Niveau ${lvl} !`, "ph:star-fill");
    gameCommand("react", "niveau");
  }
});

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (store.unlocked.includes(a.id)) continue;
    const [value, goal] = a.progress(store);
    if (value >= goal) {
      store.unlocked.push(a.id);
      gameToast(`Succès : ${a.label}`, a.icon);
    }
  }
}
watch(() => [store.xp, JSON.stringify(store.counters), Math.floor((store.lastUpdate || 0) / 60000)], checkAchievements);
</script>

<style scoped>
.toasts {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 70px);
  left: 0;
  right: 0;
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
  padding: 8px 16px 8px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fff8e0, #ffe39a);
  color: #5a3200;
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 4px 0 #d9a400, 0 10px 24px rgba(60, 30, 0, 0.3);
}
.icon {
  width: 32px;
  height: 32px;
  padding: 6px;
  box-sizing: border-box;
  border-radius: 50%;
  color: #fff;
  background: radial-gradient(circle at 38% 30%, #ffe27a, #f0a500 70%);
  box-shadow: 0 2px 0 #b07c00;
}
.toast-enter-active { transition: transform 0.4s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.3s; }
.toast-leave-active { transition: transform 0.3s, opacity 0.3s; }
.toast-enter-from { transform: translateY(-20px) scale(0.6); opacity: 0; }
.toast-leave-to { transform: translateY(-10px); opacity: 0; }
</style>
