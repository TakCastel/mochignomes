<template>
  <header class="bar">
    <!-- carte de profil : avatar (ouvre la page Elle), nom, niveau, stade, jours -->
    <div class="profile">
      <button class="avatar" :class="{ live: portrait.live.value }" :style="avatarStyle" :aria-label="`Voir ${store.name}`" @click="openPage('elle')">
        <img :src="portrait.src.value" alt="" width="60" height="60">
      </button>
      <div class="info">
        <span class="name">{{ store.name || "..." }}</span>
        <span class="meta">{{ stageLabel }} · {{ days }}</span>
        <button class="level" :aria-label="`Niveau ${lvl.level}, ${lvl.into} sur ${lvl.need} points`" @click="explainLevel">
          <span class="lvl">Niv. {{ lvl.level }}</span>
          <span class="track">
            <span class="bar-fill" :style="{ width: pct + '%' }" />
            <span class="xp">{{ lvl.into }}/{{ lvl.need }}</span>
          </span>
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
/* carte blanche opaque, filet fin */
.profile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  max-width: 270px;
  padding: 6px 14px 6px 6px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(30, 55, 100, 0.14), 0 0 0 1px #d6dfea;
  animation: slide-in 0.55s var(--spring) both;
}
@keyframes slide-in { from { opacity: 0; transform: translateX(-24px) scale(0.94); } }
.avatar {
  flex: none;
  width: 60px;
  height: 60px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(180deg, #ffe7c2, #ffc98a);
  box-shadow: 0 0 0 1px #d6dfea, 0 3px 8px rgba(40, 55, 80, 0.18);
  cursor: pointer;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.12) translateY(4%); }
.avatar.live { background: linear-gradient(180deg, color-mix(in srgb, var(--av, #ffc98a) 18%, #fff), color-mix(in srgb, var(--av, #ffc98a) 42%, #fff)); }
.avatar.live img { transform: none; }
.info { min-width: 0; flex: 1; display: grid; gap: 3px; }
.name {
  font: 600 19px/1.1 var(--font-title);
  color: var(--hud-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta { font: 700 13px/1.2 var(--font-text); color: var(--hud-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.level {
  width: 100%;
  min-height: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.lvl { font: 800 13px var(--font-text); color: var(--hud-ink); white-space: nowrap; }
/* barre de niveau : même matière que les jauges (bleu ciel dégradé + reflet) */
/* gouttière creusée, comme les jauges des besoins */
.track {
  position: relative;
  flex: 1;
  min-width: 56px;
  height: 18px;
  padding: 2px;
  box-sizing: border-box;
  border-radius: 999px;
  background: linear-gradient(180deg, #cdd6e2, #e4eaf1);
  overflow: hidden;
  box-shadow: inset 0 1.5px 2.5px rgba(30, 50, 90, 0.28), inset 0 -1px 0 rgba(255, 255, 255, 0.7), 0 1px 0 #fff;
}
/* remplissage en relief bleu ciel : dégradé de tube, liseré lumineux en haut, ombre douce en bas */
.bar-fill {
  position: relative;
  display: block;
  min-width: 14px;
  height: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(180deg, #d4eeff 0%, #8fd2ff 22%, var(--sky) 58%, var(--sky-lo) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65), inset 0 -2px 2px rgba(29, 111, 191, 0.55), 0 1px 2px rgba(29, 111, 191, 0.4);
  transition: width 0.8s var(--spring);
}
/* reflet qui balaie la jauge de temps en temps */
.bar-fill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.5) 48%, rgba(255, 255, 255, 0.5) 52%, transparent 70%);
  transform: translateX(-110%);
  animation: sheen 6s ease-in-out 3.5s infinite;
  pointer-events: none;
}
@keyframes sheen {
  0% { transform: translateX(-110%); }
  14%, 100% { transform: translateX(110%); }
}
@media (prefers-reduced-motion: reduce) { .bar-fill::after { animation: none; display: none; } }
.xp {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 800 11px/1 var(--font-text);
  color: var(--hud-ink);
  text-shadow: 0 0 3px #fff, 0 0 2px #fff;
}
/* réglages : bouton rond blanc */
.round {
  position: relative;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 6px 16px rgba(30, 55, 100, 0.14), 0 0 0 1px #d6dfea;
  cursor: pointer;
  transition: transform 0.4s var(--spring-strong);
  animation: pop-in 0.5s var(--spring-strong) 0.15s both;
}
@keyframes pop-in { from { opacity: 0; transform: scale(0.4); } }
.round .ic { width: 26px; height: 26px; color: #2c4f9e; transition: transform 0.6s var(--spring); }
.round:active .ic { transform: rotate(60deg); }
.round:active, .avatar:active { transform: scale(0.9); transition-duration: 0.08s; }
.avatar { transition: transform 0.4s var(--spring-strong); }
@media (max-width: 370px) {
  .avatar { width: 54px; height: 54px; }
  .name { font-size: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .profile, .round { animation: none; }
  .bar-fill, .round, .avatar, .round .ic { transition: none; }
}
</style>
