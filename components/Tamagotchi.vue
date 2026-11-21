<template>
  <div ref="stage" class="stage">
    <img
      v-if="fallback"
      :src="`/images/${MOODS[shownMood].image}.png`"
      alt="Tamagotchi"
      class="fallback-img"
      :style="{ '--sc': houseFx.swapping ? 0 : stageScale || 0 }"
    >
    <div v-if="fallback && fallbackMessage" class="fallback-bubble">{{ fallbackMessage }}</div>

    <div class="flash" :class="{ on: flash }" />

    <!-- bulle d'envie / besoin / petite phrase, au-dessus de sa tête -->
    <!-- une seule bulle : celle-ci s'efface tant qu'elle parle (bulle 3D) -->
    <div v-if="bubbleStyle && !activeActivity" v-show="!speaking" class="bubble-wrap" :style="bubbleStyle">
      <WishBubble />
      <span v-if="statusText" class="status" :class="{ ill: !!store.illness }">{{ statusText }}</span>
    </div>

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
import { MOODS, MESSAGES, REACTIONS, MOOD_LABELS, pick } from "~/lib/creatureLook";
import { idleLine, PHOTO } from "~/lib/dialogue";
import { STATS, SKY } from "~/lib/gameUi";
import { setLiveCreature, activeActivity } from "~/composables/useLiveCreature";
import { bindOutfit } from "~/composables/useOutfit";
import { houseFx } from "~/composables/useHouse";

const props = defineProps({
  phase: { type: String, default: "day" },
  dead: { type: Boolean, default: false },
  // cadrage : { ground, size } en pixels (voir creature3d.setFrame)
  frame: { type: Object, default: null },
  // couleurs du ciel de jour imposées par la palette
  sky: { type: Object, default: null },
  // couleurs du décor (herbe, arbres, collines) imposées par la palette
  theme: { type: Object, default: null },
});
const emit = defineEmits(["ground", "tap"]);
const { store, mood, morph, sulking } = useCreatureMood();

const stage = ref(null);
const creature = shallowRef(null);
// la tenue du Sac suit la créature (et l'essayage de la boutique passe par là)
const outfit = bindOutfit(creature);
let meadow = null;
const fallback = ref(false);
const fallbackMessage = ref("");
const reaction = ref(null);

// prio : 0 bavardage, 1 réaction (défaut), 2 réplique précise (voir creature3d say)
const speaking = ref(false);
let speakTimer = null;
function onSpeech(ms) {
  speaking.value = true;
  clearTimeout(speakTimer);
  speakTimer = setTimeout(() => (speaking.value = false), ms);
}
function say(text, ms, prio = 1) {
  if (!text) return;
  if (creature.value) creature.value.say(text, ms, prio);
  else {
    if (fallbackMessage.value && prio === 0) return;
    fallbackMessage.value = text;
    onSpeech(3000);
    setTimeout(() => { if (fallbackMessage.value === text) fallbackMessage.value = ""; }, 3000);
  }
}
watch(() => gameBus.speech, (s) => s && say(s.text, undefined, 2));

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
    say(pick(PHOTO));
  }
});
const flash = ref(false);

// Apparence finale = humeur de fond + réaction en cours + morphing des jauges.
// Le nuage de pensée 3D est remplacé par la bulle HTML (WishBubble).
const shownMood = computed(() => {
  if (store.isSleeping) return "endormie";
  if (store.exhausted) return "fatiguee";
  if (store.illness) return "malade";
  return mood.value;
});
const look = computed(() => ({ ...MOODS[shownMood.value], ...(reaction.value?.look || {}), morph: morph.value, mark: MOOD_LABELS[shownMood.value]?.[1], thought: null }));
watch(look, (l) => creature.value?.setLook(l), { deep: true });
watch(() => [props.phase, props.dead, props.sky, props.theme], ([phase, dead, sky, theme]) => creature.value?.setScene({ phase, dead, sky, theme }));
watch(() => props.frame, (f) => f && creature.value?.setFrame(f), { deep: true });

watch(shownMood, (m, old) => { if (old && !reaction.value && MESSAGES[m]) say(pick(MESSAGES[m]), undefined, 0); });

// Échelle selon le stade : bébé tout petit, adulte à taille pleine, œuf = invisible (WelcomeCard)
const STAGE_SCALE = { oeuf: 0, bebe: 0.62, enfant: 0.8, ado: 0.92, adulte: 1 };
const stageKey = computed(() => (store.hatched === false ? "oeuf" : store.stage || "adulte"));
const stageScale = computed(() => STAGE_SCALE[stageKey.value] ?? 1);
watch(stageKey, (k) => { if (!houseFx.swapping) creature.value?.setStage?.(k); });
// maison : celle du pré rapetisse et s'en va, la nouvelle venue arrive en grandissant
// (apparence, tenue et stade sont repris par les watchers pendant qu'elle est invisible)
watch(() => houseFx.swapping, (out) => {
  const c = creature.value;
  if (!c) return;
  c.setStage?.(out ? "oeuf" : stageKey.value);
  if (!out) c.setAppearance?.(store.appearance);
});
// son apparence (couleur, motif, forme, houppe, oreilles), tirée à l'éclosion : voir lib/appearance.js
watch(() => store.appearance, (a) => creature.value?.setAppearance?.(a), { deep: true });

const statusText = computed(() => {
  if (store.isSleeping) return "";
  if (store.exhausted) return "Épuisée : repos et petits soins";
  if (store.illness) return "Enrhumée : un soin l'aiderait";
  return "";
});
// position de la bulle : au-dessus de la tête, selon le cadrage et l'échelle
const bubbleStyle = computed(() => {
  const f = props.frame;
  if (!f || stageScale.value === 0) return null;
  const head = f.ground - f.size * 1.12 * stageScale.value;
  return { top: `${Math.max((f.minTop || 40) - 30, head - 14)}px` };
});
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
    after((result) => {
      if (name === "applyAction" && result && result.ok === false) return;
      if (name === "applyAction") {
        showDeltas(before);
        const action = args[0];
        if (action === "soigner" && wasDead) react("revivre");
        else if (action === "coucher") react(wasSleeping ? "reveil" : "coucher");
        else react(action);
      }
      if (name === "startSleeping") react("coucher");
      if (name === "wakeUp" && wasSleeping) react("reveil");
    });
  });
}

// Toucher la créature la chatouille
function onPoke({ dead, asleep }) {
  try { if (!["0", "false", "off"].includes(localStorage.getItem("tamagotchi-haptics"))) navigator.vibrate?.(8); } catch { /* ignoré */ }
  if (dead) return;
  if (asleep) return say("Mmh... laisse-moi dormir");
  const res = store.applyAction("chatouiller");
  if (res && res.ok === false) react("chatouiller");
  store.countGesture("menu");
  emit("tap");
}

onMounted(async () => {
  listenToActions();
  chatter = setInterval(() => { if (!reaction.value && stageKey.value !== "oeuf") say(idleLine(store, shownMood.value, MESSAGES[shownMood.value]), undefined, 0); }, 40000);
  try {
    const { createCreature, webglAvailable } = await import("~/lib/creature3d.js");
    if (!webglAvailable()) throw new Error("WebGL indisponible");
    creature.value = createCreature(stage.value, {
      onPoke,
      onGround: (y) => emit("ground", y),
      onSpin: () => store.countGesture("tourner"),
      onSpeech,
      world: true,
    });
    creature.value.setAppearance(store.appearance);
    creature.value.setStage(stageKey.value);
    creature.value.setLook(look.value);
    creature.value.setScene({ phase: props.phase, dead: props.dead, sky: props.sky, theme: props.theme });
    if (props.frame) creature.value.setFrame(props.frame);
    // partagée avec les activités 3D, la cuisine et l'essayage
    setLiveCreature(creature.value);
    // objets possédés posés dans le pré : les toucher lance l'activité
    try {
      const { bindMeadowProps } = await import("~/lib/meadowProps.js");
      if (creature.value) meadow = bindMeadowProps(creature.value, { onLaunch: (id) => launchActivity(id) });
    } catch (e) { console.warn("Objets du pré indisponibles :", e); }
    // tant qu'elle n'a jamais été chatouillée, elle invite à la toucher
    setTimeout(() => {
      if (stageKey.value === "oeuf") return;
      const firstTime = !(store.counters.menu > 0);
      say(firstTime ? "Coucou ! Fais-moi un petit poke, ça me fait rire !" : idleLine(store, shownMood.value, MESSAGES[shownMood.value]), firstTime ? 6000 : undefined);
    }, 600);
  } catch (e) {
    console.warn("Affichage 3D impossible, retour aux images :", e);
    fallback.value = true;
  }
});

onBeforeUnmount(() => {
  clearInterval(chatter);
  clearTimeout(reactionTimer);
  clearTimeout(speakTimer);
  stopListening?.();
  meadow?.dispose();
  meadow = null;
  setLiveCreature(null);
  outfit.unbind(); // retire la tenue avant de détruire la créature
  creature.value?.dispose();
  creature.value = null;
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
  transform: translateX(-50%) scale(var(--sc, 1));
  transform-origin: 50% 100%;
}
.bubble-wrap {
  position: absolute;
  left: 50%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  transform: translate(-30%, -100%);
  pointer-events: none;
}
.bubble-wrap > * { pointer-events: auto; }
.status {
  margin-left: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #7a5c20;
  font: 800 11px "Nunito", system-ui, sans-serif;
  box-shadow: 0 2px 6px rgba(40, 55, 80, 0.15);
}
.status.ill { color: #3b7a30; }
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
