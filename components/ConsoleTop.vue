<template>
  <div class="top">
    <button class="nameplate" :aria-label="`Fiche de ${store.name}`" @click="gameBus.sheet = 'fiche'">
      <span class="dot" :style="{ background: moodColor }"><Icon :name="moodIcon" class="mood-icon" /></span>
      <span class="text">
        <span class="name">{{ store.name || "..." }}</span>
        <span class="mood">{{ moodLabel }}</span>
      </span>
    </button>

    <div class="level" :aria-label="`Niveau ${lvl.level}, ${lvl.into} sur ${lvl.need} points`">
      <span class="badge">
        <Icon name="ph:star-fill" class="star" />
        <span class="num">{{ lvl.level }}</span>
      </span>
      <span class="segments">
        <span v-for="i in 8" :key="i" class="seg" :class="{ on: i <= filled }" />
      </span>
    </div>

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
const filled = computed(() => Math.floor((lvl.value.into / lvl.value.need) * 8));

onMounted(() => store.initName());
</script>

<style scoped>
.top {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
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
  font-size: 11px;
  font-weight: 800;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level {
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
  font-size: 12px;
  color: #6b3a00;
  padding-top: 2px;
}
.segments {
  display: flex;
  gap: clamp(2px, 0.6vw, 3px);
  padding: 3px;
  border-radius: 999px;
  background: var(--plate-lo);
  box-shadow: inset 0 1px 3px var(--plate-shade);
}
.seg {
  width: clamp(5px, 1.6vw, 8px);
  height: 12px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--knob-side) 60%, #fff);
}
.seg.on {
  background: linear-gradient(180deg, #fff1a0, #ffb800);
  box-shadow: 0 0 5px rgba(255, 190, 20, 0.7);
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
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.round:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--knob-side); }
.gear { width: 24px; height: 24px; color: var(--shell-edge); }
</style>
