<template>
  <header class="bar">
    <!-- carte de profil : avatar, nom, niveau -->
    <div class="profile">
      <button class="avatar" :aria-label="`Fiche de ${store.name}`" @click="gameBus.sheet = 'fiche'">
        <img src="/images/avatar.webp" alt="" width="64" height="64">
      </button>
      <div class="info">
        <div class="name-row">
          <span class="name">{{ store.name || "..." }}</span>
          <button class="edit" aria-label="Renommer" @click="gameBus.sheet = 'reglages'">
            <Icon name="ph:pencil-simple-fill" class="edit-ic" />
          </button>
        </div>
        <button class="level" :aria-label="`Niveau ${lvl.level}, ${lvl.into} sur ${lvl.need} points`" @click="explainLevel">
          <Icon name="ph:plant-fill" class="sprout" />
          <span class="lvl">Niv. {{ lvl.level }}</span>
          <span class="track"><span :style="{ width: pct + '%' }" /></span>
        </button>
      </div>
    </div>

    <!-- boutons ronds : succès, photos, réglages -->
    <div class="rounds">
      <button class="round" aria-label="Succès" @click="gameBus.sheet = 'succes'">
        <Icon name="ph:bell-fill" class="ic" />
        <span v-if="newUnlocked" class="dot" />
      </button>
      <button class="round" aria-label="Galerie photos" @click="gameBus.sheet = 'galerie'">
        <Icon name="ph:users-fill" class="ic" />
      </button>
      <button class="round" aria-label="Réglages" @click="gameBus.sheet = 'reglages'">
        <Icon name="ph:gear-six-fill" class="ic" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { levelInfo } from "~/stores/useTamagotchiStore";

const { store } = useCreatureMood();
const lvl = computed(() => levelInfo(store.xp));
const pct = computed(() => Math.max(6, Math.round((lvl.value.into / lvl.value.need) * 100)));
const newUnlocked = computed(() => store.unlocked.length > gameBus.seenUnlocked);
function explainLevel() {
  gameToast(`Niveau ${lvl.value.level} · ${lvl.value.into}/${lvl.value.need} points avant le suivant`, "ph:plant-fill");
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
  max-width: 236px;
  padding: 6px 12px 6px 6px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 6px 20px rgba(40, 55, 80, 0.16);
}
.avatar {
  flex: none;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffe7c2, #ffc98a);
  box-shadow: 0 3px 8px rgba(40, 55, 80, 0.18);
  cursor: pointer;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.12) translateY(4%); }
.info { min-width: 0; flex: 1; display: grid; gap: 6px; }
.name-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.name {
  font: 700 18px/1.1 "Fredoka", "Nunito", system-ui, sans-serif;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.edit {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #eef1f5;
  cursor: pointer;
}
.edit-ic { width: 14px; height: 14px; color: #5b6676; }
.level {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.sprout { flex: none; width: 18px; height: 18px; color: #52b83a; }
.lvl { font: 800 13px "Nunito", system-ui, sans-serif; color: #5b6676; white-space: nowrap; }
.track {
  flex: 1;
  min-width: 40px;
  height: 9px;
  border-radius: 999px;
  background: #dfe5ec;
  overflow: hidden;
}
.track span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, #7fdc5a, #4fbf34);
}
.rounds { display: flex; gap: 8px; }
.round {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 18px rgba(40, 55, 80, 0.18);
  cursor: pointer;
}
.round:active, .avatar:active { transform: scale(0.95); }
.ic { width: 26px; height: 26px; color: #4a5260; }
.dot {
  position: absolute;
  top: 5px;
  right: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff3b3b;
  box-shadow: 0 0 0 2px #fff;
}
@media (max-width: 370px) {
  .avatar { width: 52px; height: 52px; }
  .round { width: 40px; height: 40px; }
  .rounds { gap: 5px; }
  .name { font-size: 17px; }
}
</style>
