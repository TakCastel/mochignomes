<template>
  <div ref="stage" class="stage">
    <img
      v-if="fallback"
      :src="`/images/${MOODS[mood].image}.png`"
      alt="Tamagotchi"
      class="fallback-img"
    >
    <div v-if="fallback && fallbackMessage" class="fallback-bubble">{{ fallbackMessage }}</div>

    <div class="flash" :class="{ on: flash }" />

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
import { STATS, SKY } from "~/lib/gameUi";

const props = defineProps({
  phase: { type: String, default: "day" },
  dead: { type: Boolean, default: false },
  // cadrage : { ground, size } en pixels (voir creature3d.setFrame)
  frame: { type: Object, default: null },
  // couleurs du ciel de jour imposées par la palette
  sky: { type: Object, default: null },
});
const emit = defineEmits(["ground"]);
const { store, mood, morph, sulking } = useCreatureMood();

const stage = ref(null);
const creature = shallowRef(null);
const fallback = ref(false);
const fallbackMessage = ref("");
const reaction = ref(null);

function say(text, ms) {
  if (creature.value) creature.value.say(text, ms);
  else {
    fallbackMessage.value = text;
    setTimeout(() => { if (fallbackMessage.value === text) fallbackMessage.value = ""; }, 3000);
  }
}
watch(() => gameBus.speech, (s) => s && say(s.text));

// Commandes venues des boutons de la console
const { addPhoto } = useGallery();
watch(() => gameBus.command, (cmd) => {
  if (!cmd) return;
  if (cmd.type === "rotate") {
    creature.value?.rotateBy(cmd.value * Math.PI / 2);
    store.countGesture("tourner");
  }
  if (cmd.type === "react") react(cmd.value);
  if (cmd.type === "photo") {
    if (!creature.value) return say("Pas de photo sans la 3D...");
    const sky = SKY[props.phase] || SKY.day;
    addPhoto(creature.value.snapshot({ top: sky.top, bottom: sky.bottom }));
    store.countPhoto();
    flash.value = true;
    setTimeout(() => (flash.value = false), 350);
    say(pick(["Cheese !", "Je suis photogénique ?", "Clic clac !"]));
  }
});
const flash = ref(false);

// Apparence finale = humeur de fond + réaction en cours + morphing des jauges
const look = computed(() => ({ ...MOODS[mood.value], ...(reaction.value?.look || {}), morph: morph.value }));
watch(look, (l) => creature.value?.setLook(l), { deep: true });
watch(() => [props.phase, props.dead, props.sky], ([phase, dead, sky]) => creature.value?.setScene({ phase, dead, sky }));
watch(() => props.frame, (f) => f && creature.value?.setFrame(f), { deep: true });

watch(mood, (m, old) => { if (old && !reaction.value) say(pick(MESSAGES[m])); });
let chatter = null;

let reactionTimer = null;
function react(key) {
  if (sulking.value && ["nourrir", "laver", "jouer", "soigner", "danser", "calin"].includes(key)) key = "bouderie";
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
    creature.value = createCreature(stage.value, {
      onPoke,
      onGround: (y) => emit("ground", y),
      onSpin: () => store.countGesture("tourner"),
      world: true,
    });
    creature.value.setLook(look.value);
    creature.value.setScene({ phase: props.phase, dead: props.dead, sky: props.sky });
    if (props.frame) creature.value.setFrame(props.frame);
    // tant qu'elle n'a jamais été chatouillée, elle invite à la toucher
    setTimeout(() => {
      const firstTime = !(store.counters.chatouiller > 0);
      say(firstTime ? "Touche-moi pour me chatouiller !" : pick(MESSAGES[mood.value]), firstTime ? 5000 : undefined);
    }, 600);
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
.flash {
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s;
  z-index: 3;
}
.flash.on { opacity: 0.85; transition: none; }
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
  width: 20px;
  height: 20px;
  color: var(--c);
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
