<template>
  <div ref="stage" class="stage">
    <img
      v-if="fallback"
      :src="`/images/${MOODS[mood].image}.png`"
      alt="Tamagotchi"
      class="fallback-img"
    >
    <div v-if="fallback && fallbackMessage" class="fallback-bubble">{{ fallbackMessage }}</div>

    <!-- gains et pertes qui s'envolent après une action -->
    <div class="deltas">
      <div
        v-for="d in deltas"
        :key="d.id"
        class="delta"
        :style="{ left: `calc(50% + ${d.x}px)`, top: `${d.y}px`, '--c': d.color }"
      >
        <Icon :name="d.icon" class="delta-icon" />{{ d.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { MOODS, MESSAGES, REACTIONS, POKE_MESSAGES, pick } from "~/lib/creatureLook";
import { STATS } from "~/lib/gameUi";

const emit = defineEmits(["ground"]);
const { store, mood, morph, sulking } = useCreatureMood();

const stage = ref(null);
const creature = shallowRef(null);
const fallback = ref(false);
const fallbackMessage = ref("");
const reaction = ref(null);

function say(text) {
  if (creature.value) creature.value.say(text);
  else {
    fallbackMessage.value = text;
    setTimeout(() => { if (fallbackMessage.value === text) fallbackMessage.value = ""; }, 3000);
  }
}
watch(() => gameBus.speech, (s) => s && say(s.text));

// Apparence finale = humeur de fond + réaction en cours + morphing des jauges
const look = computed(() => ({ ...MOODS[mood.value], ...(reaction.value?.look || {}), morph: morph.value }));
watch(look, (l) => creature.value?.setLook(l), { deep: true });

watch(mood, (m, old) => { if (old && !reaction.value) say(pick(MESSAGES[m])); });
let chatter = null;

let reactionTimer = null;
function react(key) {
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

// Petits chiffres qui s'envolent : on compare les jauges avant / après l'action
const deltas = ref([]);
let deltaId = 0;
function showDeltas(before) {
  const changed = STATS.filter((s) => Math.round(store[s.key] - before[s.key]) !== 0);
  const h = stage.value?.clientHeight || 400;
  changed.forEach((s, i) => {
    const diff = Math.round(store[s.key] - before[s.key]);
    const id = ++deltaId;
    deltas.value.push({
      id, icon: s.icon, color: diff > 0 ? s.color : "#c0392b",
      text: (diff > 0 ? "+" : "") + diff,
      x: (i - (changed.length - 1) / 2) * 78 + (Math.random() * 16 - 8),
      y: h * 0.4,
    });
    setTimeout(() => (deltas.value = deltas.value.filter((d) => d.id !== id)), 1300);
  });
}

let stopListening = null;
function listenToActions() {
  stopListening = store.$onAction(({ name, args, after }) => {
    const wasDead = store.health <= 0;
    const wasSleeping = store.isSleeping;
    const before = Object.fromEntries(STATS.map((s) => [s.key, store[s.key]]));
    after(() => {
      if (name === "applyAction") {
        showDeltas(before);
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
  navigator.vibrate?.(8);
  store.applyAction("chatouiller");
  say(pick(POKE_MESSAGES));
}

onMounted(async () => {
  listenToActions();
  chatter = setInterval(() => { if (!reaction.value) say(pick(MESSAGES[mood.value])); }, 14000);
  try {
    const { createCreature, webglAvailable } = await import("~/lib/creature3d.js");
    if (!webglAvailable()) throw new Error("WebGL indisponible");
    creature.value = createCreature(stage.value, { onPoke, onGround: (y) => emit("ground", y) });
    creature.value.setLook(look.value);
    setTimeout(() => say(pick(MESSAGES[mood.value])), 600);
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
  position: absolute;
  inset: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.fallback-img {
  position: absolute;
  left: 50%;
  bottom: 18%;
  transform: translateX(-50%);
  width: 12rem;
  height: 12rem;
  object-fit: contain;
}
.fallback-bubble {
  position: absolute;
  top: 12%;
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
.deltas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.delta {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px 4px 6px;
  border-radius: 999px;
  background: #fff;
  color: var(--c);
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-weight: 700;
  font-size: 20px;
  box-shadow: 0 3px 0 rgba(74, 36, 16, 0.18);
  animation: rise 1.3s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}
.delta-icon {
  width: 22px;
  height: 22px;
}
@keyframes rise {
  0% { transform: translate(-50%, 10px) scale(0.6); opacity: 0; }
  15% { transform: translate(-50%, 0) scale(1.1); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(-50%, -90px) scale(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .delta { animation-duration: 2s; }
}
</style>
