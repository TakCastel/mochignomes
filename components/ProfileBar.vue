<template>
  <header class="bar">
    <!-- carte de profil : avatar (ouvre la page Elle), nom, niveau, stade, jours -->
    <div class="profile">
      <button class="avatar" :class="{ live: portrait.live.value }" :style="avatarStyle" :aria-label="`Voir ${store.name}`" @click="openPage('elle')">
        <img :src="portrait.src.value" alt="" width="64" height="64">
      </button>
      <div class="info">
        <span class="name">{{ store.name || "..." }}</span>
        <span class="meta">{{ stageLabel }} · {{ days }}</span>
        <button class="level" :aria-label="`Niveau ${lvl.level}, ${lvl.into} sur ${lvl.need} points`" @click="explainLevel">
          <Icon name="solar:leaf-bold-duotone" class="sprout" />
          <span class="lvl">Niv. {{ lvl.level }}</span>
          <span class="track"><span :style="{ width: pct + '%' }" /></span>
        </button>
      </div>
    </div>

    <!-- un seul bouton rond : réglages -->
    <button class="round" aria-label="Réglages" @click="openSettings">
      <Icon name="solar:settings-bold-duotone" class="ic" />
    </button>
  </header>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { ageInDays } from "~/lib/achievements";
import { levelInfo } from "~/stores/useTamagotchiStore";

const { store } = useCreatureMood();
// avatar : portrait de la vraie créature (sa couleur, sa tenue), image fixe en secours
const portrait = useCreaturePortrait();
const avatarStyle = computed(() => (store.appearance?.color ? { "--av": store.appearance.color } : null));
const lvl = computed(() => levelInfo(store.xp));
const pct = computed(() => Math.max(6, Math.round((lvl.value.into / lvl.value.need) * 100)));
const stageLabel = computed(() => store.stageInfo?.label || "");
const days = computed(() => {
  const d = (store.lastUpdate, ageInDays(store));
  return d < 1 ? "née aujourd'hui" : `${d} jour${d > 1 ? "s" : ""}`;
});
function explainLevel() {
  gameToast(`Niveau ${lvl.value.level} · ${lvl.value.into}/${lvl.value.need} points avant le suivant`, "solar:leaf-bold-duotone");
}
onMounted(() => store.initName());
</script>

<style scoped>
.bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
/* carte blanche laiteuse */
.profile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  max-width: 260px;
  padding: 6px 14px 6px 6px;
  border-radius: 20px;
  background: var(--glass);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow), var(--glass-edge);
  animation: slide-in 0.55s var(--spring) both;
}
@keyframes slide-in { from { opacity: 0; transform: translateX(-24px) scale(0.94); } }
.avatar {
  flex: none;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffe7c2, #ffc98a);
  box-shadow: 0 3px 8px rgba(40, 55, 80, 0.18);
  cursor: pointer;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.12) translateY(4%); }
.avatar.live { background: linear-gradient(180deg, color-mix(in srgb, var(--av, #ffc98a) 18%, #fff), color-mix(in srgb, var(--av, #ffc98a) 42%, #fff)); }
.avatar.live img { transform: none; }
.info { min-width: 0; flex: 1; display: grid; gap: 3px; }
.name {
  font: 700 18px/1.1 var(--font-title);
  color: var(--sky-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta { font: 700 12px/1.2 var(--font-text); color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.level {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.sprout { flex: none; width: 18px; height: 18px; color: var(--accent); }
.lvl { font: 800 12.5px var(--font-text); color: var(--ink-2); white-space: nowrap; }
.track {
  flex: 1;
  min-width: 40px;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(40, 55, 80, 0.1);
}
.track span {
  position: relative;
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--accent-hi), var(--accent));
  transition: width 0.8s var(--spring);
}
/* reflet brillant sur la jauge */
.track span::after { content: ""; position: absolute; left: 3px; right: 3px; top: 1px; height: 40%; border-radius: inherit; background: rgba(255, 255, 255, 0.55); }
/* bouton rond givré cerclé de bleu ciel */
.round {
  position: relative;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: var(--glass-solid);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: 0 6px 18px rgba(30, 70, 120, 0.18), inset 0 0 0 2px rgba(124, 192, 245, 0.55), inset 0 2px 0 #fff;
  cursor: pointer;
  transition: transform 0.4s var(--spring-strong);
  animation: pop-in 0.5s var(--spring-strong) 0.15s both;
}
@keyframes pop-in { from { opacity: 0; transform: scale(0.4); } }
.round .ic { color: var(--sky-lo); transition: transform 0.6s var(--spring); }
.round:active .ic { transform: rotate(60deg); }
.round:active, .avatar:active { transform: scale(0.9); transition-duration: 0.08s; }
.avatar { transition: transform 0.4s var(--spring-strong); }
.ic { width: 26px; height: 26px; color: #4a5260; }
@media (max-width: 370px) {
  .avatar { width: 52px; height: 52px; }
  .name { font-size: 17px; }
}
</style>
