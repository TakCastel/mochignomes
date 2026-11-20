<template>
  <div ref="stage" class="stage relative w-full max-w-md">
    <img
      v-if="fallback"
      :src="`/images/${MOODS[mood].image}.png`"
      alt="Tamagotchi"
      class="absolute inset-0 m-auto w-48 h-48 object-contain"
    >
    <div v-if="fallback && fallbackMessage" class="fallback-bubble">{{ fallbackMessage }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { storeToRefs } from "pinia";
import { useTamagotchiStore } from "@/stores/useTamagotchiStore";
import {
  MOODS, MESSAGES, REACTIONS, POKE_MESSAGES, moodFromStats, morphFromStats, pick,
} from "~/lib/creatureLook";

const store = useTamagotchiStore();
const { hunger, cleanliness, fun, energy, health, isSleeping, traits, lastUpdate } = storeToRefs(store);

const stats = computed(() => ({
  hunger: hunger.value, cleanliness: cleanliness.value, fun: fun.value,
  energy: energy.value, health: health.value, isSleeping: isSleeping.value,
}));
// lastUpdate avance chaque seconde : il sert d'horloge pour savoir s'il boude encore
const sulking = computed(() => store.isSulking(lastUpdate.value || Date.now()));
const mood = computed(() => moodFromStats(stats.value, traits.value, sulking.value));
const morph = computed(() => morphFromStats(stats.value, traits.value));

const stage = ref(null);
const creature = shallowRef(null);
const fallback = ref(false);
const fallbackMessage = ref("");
const reaction = ref(null); // { look, until }

function say(text) {
  if (creature.value) creature.value.say(text);
  else {
    fallbackMessage.value = text;
    setTimeout(() => { if (fallbackMessage.value === text) fallbackMessage.value = ""; }, 3000);
  }
}

// Apparence finale = humeur de fond + réaction en cours + morphing des jauges
const look = computed(() => {
  const base = MOODS[mood.value];
  const r = reaction.value;
  return { ...base, ...(r ? r.look : {}), morph: morph.value };
});
watch(look, (l) => creature.value?.setLook(l), { deep: true });

// Une phrase quand l'humeur change, puis de temps en temps
watch(mood, (m, old) => { if (old && !reaction.value) say(pick(MESSAGES[m])); });
let chatter = null;

let reactionTimer = null;
function react(key) {
  // une créature qui boude accueille les soins du bout des lèvres
  if (sulking.value && ["nourrir", "laver", "jouer", "soigner"].includes(key)) key = "bouderie";
  const r = REACTIONS[key];
  if (!r) return;
  clearTimeout(reactionTimer);
  if (r.duration > 0) {
    reaction.value = { look: r.look };
    reactionTimer = setTimeout(() => (reaction.value = null), r.duration);
  }
  if (r.hop) creature.value?.hop(r.hop);
  else creature.value?.blop();
  say(pick(r.say));
}

// Les boutons d'action passent par le store : on écoute ses actions
let stopListening = null;
function listenToActions() {
  stopListening = store.$onAction(({ name, args, after }) => {
    const wasDead = store.health <= 0;
    const wasSleeping = store.isSleeping;
    after(() => {
      if (name === "applyAction") {
        const action = args[0];
        if (action === "chatouiller") return;
        if (action === "soigner" && wasDead) react("revivre");
        else if (action === "coucher") react(wasSleeping ? "reveil" : "coucher");
        else react(action);
      }
      if (name === "startSleeping") react("coucher");
      if (name === "wakeUp" && wasSleeping) react("reveil");
    });
  });
}

function onPoke({ dead, asleep }) {
  if (dead) return say("...");
  if (asleep) return say("Mmh... laisse-moi dormir");
  store.applyAction("chatouiller");
  say(pick(POKE_MESSAGES));
}

onMounted(async () => {
  listenToActions();
  chatter = setInterval(() => { if (!reaction.value) say(pick(MESSAGES[mood.value])); }, 12000);
  try {
    const { createCreature, webglAvailable } = await import("~/lib/creature3d.js");
    if (!webglAvailable()) throw new Error("WebGL indisponible");
    creature.value = createCreature(stage.value, { onPoke });
    creature.value.setLook(look.value);
    say(pick(MESSAGES[mood.value]));
  } catch (e) {
    console.warn("Affichage 3D impossible, retour aux images :", e);
    fallback.value = true;
  }
});

onBeforeUnmount(() => {
  clearInterval(chatter);
  clearTimeout(reactionTimer);
  stopListening?.();
  creature.value?.dispose();
});
</script>

<style scoped>
.stage {
  height: 330px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
@media (min-height: 820px) {
  .stage { height: 390px; }
}
.fallback-bubble {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border: 3px solid #5a2e14;
  border-radius: 999px;
  padding: 6px 14px;
  font-weight: 800;
  font-style: italic;
  white-space: nowrap;
  color: #3b2210;
}
</style>
