<template>
  <div class="top">
    <button class="nameplate" :aria-label="`Fiche de ${store.name}`" @click="gameBus.sheet = 'fiche'">
      <span class="dot" :style="{ background: moodColor }"><Icon :name="moodIcon" class="mood-icon" /></span>
      <span class="text">
        <span class="name">{{ store.name || "..." }}</span>
        <span class="mood">{{ moodLabel }}</span>
      </span>
    </button>

    <button class="level" :aria-label="`Niveau ${lvl.level}, ${lvl.into} sur ${lvl.need} points`" @click="explainLevel">
      <span class="badge">
        <Icon name="ph:star-fill" class="star" />
        <span class="num">{{ lvl.level }}</span>
      </span>
      <!-- progression vers le niveau suivant, avec le chiffre écrit dedans -->
      <span class="progress">
        <span class="progress-fill" :style="{ width: pct + '%' }" />
        <span class="progress-text">{{ lvl.into }} / {{ lvl.need }}</span>
      </span>
    </button>

    <div class="corner">
      <span v-if="store.speed > 1" class="speed">×{{ store.speed }}</span>
      <button class="round" aria-label="Réglages" @click="gameBus.sheet = 'reglages'">
        <Icon name="ph:gear-six-fill" class="gear" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { MOOD_ICONS, MOOD_LABELS } from "~/lib/creatureLook";
import { levelInfo } from "~/stores/useTamagotchiStore";

const { store, mood } = useCreatureMood();
const moodLabel = computed(() => MOOD_LABELS[mood.value]?.[0] || "");
const moodIcon = computed(() => MOOD_ICONS[mood.value] || "ph:smiley-fill");
const moodColor = computed(() => MOOD_LABELS[mood.value]?.[1] || "#3ccf6e");
const lvl = computed(() => levelInfo(store.xp));
const pct = computed(() => Math.round((lvl.value.into / lvl.value.need) * 100));

function explainLevel() {
  gameToast(`Niveau ${lvl.value.level} · ${lvl.value.into}/${lvl.value.need} points avant le suivant`, "ph:star-fill");
}

onMounted(() => store.initName());
</script>

<style scoped>
.top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}
/* trois pastilles blanches brillantes, assorties */
.nameplate,
.level,
.round {
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 45%, var(--knob-lo) 100%);
  box-shadow: 0 4px 0 var(--knob-side), 0 7px 12px var(--plate-shade), inset 0 -2px 0 rgba(255, 255, 255, 0.6);
}
.nameplate {
  justify-self: start;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  padding: 5px 14px 5px 5px;
  border: 0;
  border-radius: 999px;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}
.nameplate:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--knob-side), inset 0 -2px 0 rgba(255, 255, 255, 0.6); }
/* pastille d'humeur : un rond de couleur avec un reflet */
.dot {
  flex: none;
  display: grid;
  place-items: center;
  transition: background 0.4s;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  box-shadow: inset 0 -3px 4px rgba(0, 0, 0, 0.22), inset 0 2px 2px rgba(255, 255, 255, 0.6);
}
.mood-icon { width: 21px; height: 21px; color: #fff; filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.2)); }
.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: clamp(15px, 4.4vw, 18px);
  line-height: 1.05;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mood {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level {
  justify-self: stretch;
  min-width: 0;
  height: 46px;
  box-sizing: border-box;
  border: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
}
.badge {
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
}
.star { width: 32px; height: 32px; color: #ffc21a; filter: drop-shadow(0 2px 0 #d18a00); }
.num {
  position: absolute;
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  text-shadow: 0 1px 0 #b36b00;
  padding-top: 2px;
}
.progress {
  position: relative;
  flex: 1;
  height: 20px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--plate-lo);
  box-shadow: inset 0 1px 3px var(--plate-shade);
}
.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  min-width: 20px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffe680, #ffb800);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 0 6px rgba(255, 190, 20, 0.6);
  transition: width 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
}
.progress-text {
  position: relative;
  display: block;
  text-align: center;
  font: 800 11px/20px "Nunito", system-ui, sans-serif;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.corner {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 6px;
}
.speed {
  font-weight: 800;
  font-size: 11px;
  color: #4a2410;
  background: #ffe066;
  border-radius: 999px;
  padding: 3px 7px;
}
.round {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.round:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--knob-side); }
.gear { width: 24px; height: 24px; color: var(--accent); }
/* écran étroit : le niveau se réduit à l'étoile, pour laisser la place au nom */
@media (max-width: 380px) {
  .progress-text { font-size: 10px; }
}
</style>
