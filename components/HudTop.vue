<template>
  <header class="hud">
    <!-- portrait : visage d'humeur, nom, humeur écrite en clair -->
    <button class="card who" :aria-label="`Fiche de ${store.name}`" @click="gameBus.sheet = 'fiche'">
      <span class="portrait" :style="{ '--m': moodColor }">
        <Icon :name="moodIcon" class="face" />
      </span>
      <span class="who-text">
        <span class="name">{{ store.name || "..." }}</span>
        <span class="mood" :style="{ '--m': moodColor }">{{ moodLabel }}</span>
      </span>
    </button>

    <div class="right">
      <!-- niveau : étoile, numéro, fine barre de progression -->
      <button class="card level" :aria-label="`Niveau ${lvl.level}, ${lvl.into} sur ${lvl.need} points`" @click="explainLevel">
        <Icon name="ph:star-fill" class="star" />
        <span class="lvl-text">
          <span class="lvl-num">Niv. {{ lvl.level }}</span>
          <span class="lvl-bar"><span :style="{ width: pct + '%' }" /></span>
        </span>
      </button>
      <button class="round" aria-label="Succès" @click="gameBus.sheet = 'succes'">
        <Icon name="ph:trophy-fill" class="ic" />
        <span v-if="newUnlocked" class="dot" />
      </button>
      <button class="round" aria-label="Réglages" @click="gameBus.sheet = 'reglages'">
        <Icon name="ph:gear-six-fill" class="ic" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { MOOD_ICONS, MOOD_LABELS } from "~/lib/creatureLook";
import { levelInfo } from "~/stores/useTamagotchiStore";

const { store, mood } = useCreatureMood();
const moodLabel = computed(() => MOOD_LABELS[mood.value]?.[0] || "");
const moodColor = computed(() => MOOD_LABELS[mood.value]?.[1] || "#3ccf6e");
const moodIcon = computed(() => MOOD_ICONS[mood.value] || "ph:smiley-fill");
const lvl = computed(() => levelInfo(store.xp));
const pct = computed(() => Math.round((lvl.value.into / lvl.value.need) * 100));
const newUnlocked = computed(() => store.unlocked.length > gameBus.seenUnlocked);

function explainLevel() {
  gameToast(`Niveau ${lvl.value.level} · ${lvl.value.into}/${lvl.value.need} points avant le suivant`, "ph:star-fill");
}
onMounted(() => store.initName());
</script>

<style scoped>
.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card,
.round {
  border: 0;
  background: #fff;
  box-shadow: 0 6px 18px rgba(25, 45, 80, 0.18), 0 1px 0 rgba(25, 45, 80, 0.06);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.card:active,
.round:active { transform: scale(0.96); }
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 5px 14px 5px 5px;
  border-radius: 999px;
}
/* portrait : un disque à la couleur de l'humeur, cerclé de blanc */
.portrait {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--m);
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.12), 0 0 0 3px #fff, 0 0 0 5px color-mix(in srgb, var(--m) 35%, #fff);
  transition: background 0.4s;
}
.face { width: 28px; height: 28px; color: #fff; }
.who-text { display: flex; flex-direction: column; min-width: 0; text-align: left; }
.name {
  font: 700 17px/1.1 "Fredoka", "Nunito", system-ui, sans-serif;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mood {
  font: 800 12px/1.3 "Nunito", system-ui, sans-serif;
  color: color-mix(in srgb, var(--m) 75%, #000);
  white-space: nowrap;
}

.right { display: flex; align-items: center; gap: 6px; }
.level {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 12px 0 8px;
  border-radius: 999px;
}
.star { width: 24px; height: 24px; color: #ffbe1a; }
.lvl-text { display: flex; flex-direction: column; gap: 3px; }
.lvl-num { font: 800 12px/1 "Nunito", system-ui, sans-serif; color: var(--ink); }
.lvl-bar { display: block; width: 46px; height: 6px; border-radius: 999px; background: #e7edf4; overflow: hidden; }
.lvl-bar span { display: block; height: 100%; border-radius: 999px; background: #ffbe1a; }
.round {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
}
.ic { width: 22px; height: 22px; color: var(--accent); }
.dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4b4b;
  box-shadow: 0 0 0 2px #fff;
}
@media (max-width: 360px) {
  .lvl-bar { width: 30px; }
  .who { padding-right: 10px; }
}
/* très petit écran : portrait et boutons plus compacts, niveau réduit à l'étoile et au chiffre */
@media (max-width: 340px) {
  .portrait { width: 36px; height: 36px; }
  .face { width: 22px; height: 22px; }
  .round, .level { width: 38px; height: 38px; }
  .level { width: auto; padding: 0 9px 0 6px; }
  .lvl-bar { display: none; }
  .lvl-num { white-space: nowrap; }
  .right { gap: 4px; }
}
</style>
