<template>
  <div class="topbar">
    <!-- maison : la fiche de la créature -->
    <button class="knob square" :aria-label="`Fiche de ${store.name}`" @click="gameBus.sheet = 'fiche'">
      <Icon name="ph:house-fill" class="emoji house" />
    </button>

    <!-- niveau : étoile + barre à crans -->
    <button class="knob level" :aria-label="`Niveau ${lvl.level}, ${lvl.into} sur ${lvl.need} points`" @click="explainLevel">
      <span class="track">
        <span class="star">
          <Icon name="ph:star-fill" class="star-icon" />
          <span class="num">{{ lvl.level }}</span>
        </span>
        <span v-for="i in 5" :key="i" class="seg" :class="{ on: i <= filled }" />
      </span>
    </button>

    <!-- cloche (succès) et engrenage (réglages) -->
    <div class="knob duo">
      <button class="cell" aria-label="Succès" @click="gameBus.sheet = 'succes'">
        <Icon name="ph:bell-fill" class="emoji bell" />
        <span v-if="newUnlocked" class="dot" />
      </button>
      <button class="cell gear" aria-label="Réglages" @click="gameBus.sheet = 'reglages'">
        <Icon name="ph:gear-six-fill" class="emoji" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { levelInfo } from "~/stores/useTamagotchiStore";

const { store } = useCreatureMood();
const lvl = computed(() => levelInfo(store.xp));
const filled = computed(() => Math.round((lvl.value.into / lvl.value.need) * 5));
const newUnlocked = computed(() => store.unlocked.length > gameBus.seenUnlocked);

function explainLevel() {
  gameToast(`Niveau ${lvl.value.level} · ${lvl.value.into}/${lvl.value.need} points avant le suivant`, "ph:star-fill");
}
onMounted(() => store.initName());
</script>

<style scoped>
.topbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}
/* plastique crème bombé, avec une tranche dessous */
.knob {
  border: 0;
  background: linear-gradient(180deg, #fffaf2 0%, #f6e8d4 60%, #ecd6b8 100%);
  box-shadow:
    0 5px 0 #d2b48c,
    0 9px 16px rgba(90, 60, 30, 0.28),
    inset 0 2px 0 #fff,
    inset 0 -3px 4px rgba(180, 140, 90, 0.25);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.knob:active { transform: translateY(3px); box-shadow: 0 2px 0 #d2b48c, 0 4px 8px rgba(90, 60, 30, 0.25), inset 0 2px 0 #fff; }
.square {
  width: var(--top, 62px);
  height: var(--top, 62px);
  border-radius: 22px;
  display: grid;
  place-items: center;
}
.emoji { width: 56%; height: 56%; }
.house { color: #c07a3a; filter: drop-shadow(0 2px 0 #8a4f1c); }
.bell { color: #ffb400; filter: drop-shadow(0 2px 0 #c27e00); }

.level {
  justify-self: center;
  width: 100%;
  max-width: 230px;
  height: calc(var(--top, 62px) - 6px);
  padding: 6px;
  border-radius: 999px;
}
.track {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 100%;
  padding: 0 10px 0 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #4a3d36, #2f2622);
  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.55), 0 1px 0 #fff;
}
.star {
  position: relative;
  flex: none;
  width: 40px;
  height: 40px;
  margin: -6px 2px -6px -6px;
}
.star-icon { width: 100%; height: 100%; color: #ffc21a; filter: drop-shadow(0 2px 0 #c27e00) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35)); }
.num {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding-top: 3px;
  font: 700 13px "Fredoka", "Nunito", system-ui, sans-serif;
  color: #7a4300;
}
.seg {
  flex: 1;
  height: 60%;
  border-radius: 6px;
  background: linear-gradient(180deg, #5a4c45, #463a34);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}
.seg.on {
  background: linear-gradient(180deg, #fff3a0, #ffd21f 45%, #f0a800);
  box-shadow: 0 0 6px rgba(255, 200, 30, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.duo {
  display: flex;
  align-items: center;
  gap: 4px;
  height: var(--top, 62px);
  padding: 5px;
  border-radius: 999px;
}
.cell {
  position: relative;
  display: grid;
  place-items: center;
  width: calc(var(--top, 62px) - 12px);
  height: calc(var(--top, 62px) - 12px);
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.cell .emoji { width: 64%; height: 64%; }
.gear {
  background: radial-gradient(circle at 40% 30%, #6a77a8, #3d4a7a 70%);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.35), 0 2px 3px rgba(0, 0, 0, 0.25);
}
.gear .emoji { width: 56%; height: 56%; color: #fff; filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.3)); }
.dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff3b3b;
  box-shadow: 0 0 0 2px #fff;
}
</style>
