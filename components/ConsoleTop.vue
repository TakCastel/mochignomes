<template>
  <div class="top">
    <button class="nameplate" :aria-label="`Fiche de ${store.name}`" @click="gameBus.sheet = 'fiche'">
      <span class="name">{{ store.name || "..." }}</span>
      <span class="mood"><span class="dot" :style="{ background: moodColor }" />{{ moodLabel }}</span>
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
import { MOOD_LABELS } from "~/lib/creatureLook";
import { levelInfo } from "~/stores/useTamagotchiStore";

const { store, mood } = useCreatureMood();
const moodLabel = computed(() => MOOD_LABELS[mood.value]?.[0] || "");
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
.nameplate {
  justify-self: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  padding: 6px 12px 7px;
  border: 0;
  border-radius: 20px;
  background: linear-gradient(180deg, #a68cff, #6f4fe0);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45), inset 0 -4px 0 rgba(40, 10, 120, 0.3), 0 4px 0 #4b2fb0, 0 8px 14px rgba(60, 30, 140, 0.35);
  color: #fff;
  cursor: pointer;
  text-align: left;
}
.nameplate:active { transform: translateY(2px); box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45), 0 2px 0 #4b2fb0; }
.name {
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: clamp(15px, 4.6vw, 19px);
  line-height: 1;
  text-shadow: 0 2px 0 rgba(40, 10, 120, 0.45);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mood {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  opacity: 0.95;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
}

.level {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 5px;
  border-radius: 999px;
  background: #e9dccb;
  box-shadow: inset 2px 2px 5px rgba(140, 110, 80, 0.4), inset -2px -2px 5px #fff;
}
.badge {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
}
.star { width: 34px; height: 34px; color: #ffc21a; filter: drop-shadow(0 2px 0 #c98a00) drop-shadow(0 0 4px rgba(255, 200, 40, 0.6)); }
.num {
  position: absolute;
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: #6b3a00;
  padding-top: 2px;
}
.segments {
  display: flex;
  gap: clamp(2px, 0.6vw, 3px);
  padding: 4px;
  border-radius: 999px;
  background: #4a3a48;
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.5);
}
.seg {
  width: clamp(5px, 1.7vw, 9px);
  height: 14px;
  border-radius: 4px;
  background: #2f2430;
}
.seg.on {
  background: linear-gradient(180deg, #fff1a0, #ffc21a);
  box-shadow: 0 0 6px rgba(255, 200, 40, 0.7);
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
  background: linear-gradient(145deg, #4c5a8a, #2f3a63);
  box-shadow: 0 0 0 4px #f5ede2, 3px 4px 8px rgba(110, 80, 50, 0.45), -2px -2px 6px #fff;
  cursor: pointer;
}
.round:active { transform: scale(0.94); }
.gear { width: 26px; height: 26px; color: #fff; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.3)); }
</style>
