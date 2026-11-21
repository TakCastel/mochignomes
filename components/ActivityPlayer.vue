<template>
  <div class="ap" :class="{ dim: phase !== 'play' }">
    <!-- couche de capture : tous les gestes vont au mini-jeu, jamais au poke de la créature -->
    <div
      class="capture"
      @pointerdown="onDown"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @contextmenu.prevent
    />

    <!-- HUD -->
    <div v-if="phase === 'play' || phase === 'intro'" class="hud">
      <div class="hud-row">
        <span class="hud-name"><Icon :name="act?.icon || 'solar:gamepad-bold-duotone'" class="hud-ic" />{{ act?.label }}</span>
        <button class="hud-btn" aria-label="Pause" @click="pause(true)">
          <Icon name="solar:pause-bold" class="hud-btn-ic" />
        </button>
      </div>
      <div v-if="!act?.noScore" class="score" :class="{ pop: scorePop }">
        <b>{{ score }}</b><small v-if="act?.scoreUnit">{{ act.scoreUnit }}</small>
      </div>
      <div v-if="hud.text" class="hud-text">{{ hud.text }}</div>
      <div v-if="hud.combo > 1" :key="hud.combo" class="combo">×{{ hud.combo }}</div>
      <div v-if="hud.timeLeft != null && timeMax" class="timebar"><i :style="{ width: `${Math.max(0, Math.min(100, (hud.timeLeft / timeMax) * 100))}%` }" /></div>
    </div>

    <!-- 3-2-1 -->
    <Transition name="pop">
      <div v-if="phase === 'intro'" :key="count" class="count">{{ count > 0 ? count : "Go !" }}</div>
    </Transition>

    <!-- pause -->
    <div v-if="paused && phase === 'play'" class="center">
      <div class="card">
        <span class="badge"><Icon name="solar:pause-circle-bold-duotone" class="badge-ic" /></span>
        <h3>En pause</h3>
        <p class="muted">Elle t'attend.</p>
        <div class="btns">
          <button class="btn ghost" @click="stopNow">Arrêter</button>
          <button class="btn" @click="resume">Reprendre</button>
        </div>
      </div>
    </div>

    <!-- impossible de jouer -->
    <div v-if="phase === 'blocked'" class="center">
      <div class="card">
        <span class="badge soft"><Icon :name="act?.icon || 'solar:gamepad-bold-duotone'" class="badge-ic" /></span>
        <h3>{{ act?.label || "Activité" }}</h3>
        <p class="muted">{{ blockedReason }}</p>
        <div class="btns"><button class="btn" @click="close">Retour</button></div>
      </div>
    </div>

    <!-- résultat -->
    <div v-if="phase === 'result' && result" class="center">
      <div class="card result">
        <span class="badge" :class="{ gold: result.isRecord }">
          <Icon :name="result.isRecord ? 'solar:cup-star-bold-duotone' : act?.icon || 'solar:star-bold-duotone'" class="badge-ic" />
        </span>
        <h3>{{ result.title }}</h3>
        <div v-if="!act?.noScore" class="big">
          <b>{{ result.score }}</b> <small>{{ act?.scoreUnit }}</small>
        </div>
        <p v-if="!act?.noScore" class="muted">Record : {{ result.best }}{{ act?.scoreUnit ? ` ${act.scoreUnit}` : "" }}</p>
        <p v-if="result.line" class="line">« {{ result.line }} »</p>

        <div class="chips">
          <span v-if="result.coins > 0" class="chip coin"><Icon name="solar:dollar-minimalistic-bold-duotone" class="chip-ic" />+{{ result.coins }}</span>
          <span v-if="result.gems > 0" class="chip gem"><Icon name="solar:star-bold-duotone" class="chip-ic" />+{{ result.gems }} Étoile{{ result.gems > 1 ? "s" : "" }}</span>
          <span v-for="g in result.gains" :key="g.key" class="chip" :style="{ '--c': g.color }">
            <Icon :name="g.icon" class="chip-ic" />{{ g.n > 0 ? "+" : "" }}{{ g.n }}
          </span>
          <span v-for="i in result.ingredients" :key="i.id" class="chip food"><Icon :name="i.icon" class="chip-ic" />{{ i.label }} ×{{ i.n }}</span>
          <span v-if="result.levelUp" class="chip lvl"><Icon name="solar:star-bold-duotone" class="chip-ic" />Niveau {{ store.level }} !</span>
        </div>
        <p v-for="m in result.mastery" :key="m" class="mastery"><Icon name="solar:star-bold-duotone" class="m-ic" />Maîtrise : {{ m }}</p>
        <p v-if="result.wishDone" class="note">Envie exaucée, elle est ravie !</p>
        <p v-if="result.falloff < 1 && !act?.noScore" class="note">Elle préfère varier : les gains baissent un peu aujourd'hui.</p>

        <div class="btns">
          <button class="btn ghost" @click="close">Retour</button>
          <button v-if="canReplay" class="btn" @click="replay">Rejouer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Lecteur d'activité : couche de capture au-dessus de la 3D, 3-2-1, HUD, pause, résultat.
// Usage (intégrateur) : <ActivityPlayer v-if="playing" :activity-id="playing" @close="playing = null" />
// Une partie interrompue (fermeture, onglet quitté, démontage) est réglée quand même :
// sa récompense n'est jamais perdue.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { activityById, ingredientById, MASTERY } from "~/lib/catalog";
import { STATS } from "~/lib/gameUi";
import { runActivity } from "~/lib/activities/index.js";
import { liveCreature, activeActivity } from "~/composables/useLiveCreature";
import { beep, haptic } from "~/composables/useBeep";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { useInventoryStore } from "~/stores/useInventoryStore";

const props = defineProps({ activityId: { type: String, required: true } });
const emit = defineEmits(["close"]);

const store = useTamagotchiStore();
const inventory = useInventoryStore();
const act = computed(() => activityById(props.activityId));

const phase = ref("idle"); // idle | intro | play | result | blocked
const count = ref(3);
const score = ref(0);
const scorePop = ref(false);
const paused = ref(false);
const blockedReason = ref("");
const result = ref(null);
const hud = reactive({ text: "", timeLeft: null, combo: 0 });
const timeMax = ref(0);
const canReplay = ref(false);

let ctrl = null;
let settled = true;
let unmounting = false;
let timers = [];
let masteryBefore = [];
let popTimer = 0;
let down = null;

const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function begin() {
  clearTimers();
  result.value = null; score.value = 0; paused.value = false;
  Object.assign(hud, { text: "", timeLeft: null, combo: 0 }); timeMax.value = 0;
  const a = act.value;
  if (!a) return block("Activité inconnue.");
  const can = store.canActivity(props.activityId);
  if (!can.ok) return block(can.reason);
  if (!liveCreature.value) return block("La 3D n'est pas disponible sur cet appareil.");
  if (a.noScore) return launch();
  phase.value = "intro";
  count.value = 3;
  beep("count");
  const tick = () => {
    count.value -= 1;
    if (count.value > 0) { beep("count"); later(tick, 650); }
    else { beep("go"); haptic(15); later(launch, 450); }
  };
  later(tick, 650);
}

function block(reason) {
  phase.value = "blocked";
  blockedReason.value = reason || "Pas maintenant.";
}

function launch() {
  const creature = liveCreature.value;
  if (!creature) return block("La 3D n'est pas disponible sur cet appareil.");
  masteryBefore = [...(inventory.stats?.mastery || [])];
  settled = false;
  phase.value = "play";
  ctrl = runActivity(props.activityId, {
    creature,
    container: creature.three?.renderer?.domElement?.parentElement,
    store,
    inventory,
    say: (text, ms) => creature.say(text, ms),
    haptic,
    beep,
    onScore: (n) => {
      if (n > score.value) {
        scorePop.value = false;
        clearTimeout(popTimer);
        requestAnimationFrame(() => { scorePop.value = true; popTimer = setTimeout(() => (scorePop.value = false), 180); });
      }
      score.value = n;
    },
    onHud: (h) => {
      if (!h) return;
      if (h.text !== undefined) hud.text = h.text || "";
      if (h.combo !== undefined) hud.combo = h.combo || 0;
      if (h.timeLeft !== undefined) {
        hud.timeLeft = h.timeLeft;
        if (h.timeLeft != null && h.timeLeft > timeMax.value) timeMax.value = h.timeLeft;
      }
    },
    onEnd: settle,
  });
  if (!ctrl && !settled) { settled = true; block("Oups, l'activité n'a pas pu démarrer."); }
}

// Applique les récompenses (une seule fois par partie, même interrompue)
function settle(res) {
  if (settled) return;
  settled = true;
  ctrl = null;
  const id = props.activityId;
  const a = act.value;
  let r = null;
  try { r = store.applyActivity(id, { score: res.score, channel: res.channel || res.details?.channel || null }); } catch (e) { console.error(e); }
  const ingredients = [];
  for (const [k, n] of Object.entries(res.ingredients || {})) {
    if (!(n > 0)) continue;
    try { inventory.addIngredient(k, n); } catch { continue; }
    const ing = ingredientById(k);
    ingredients.push({ id: k, n, label: ing?.label || k, icon: ing?.icon || "solar:bag-4-bold-duotone" });
  }
  const after = inventory.stats?.mastery || [];
  const fresh = MASTERY.filter((m) => after.includes(m.id) && !masteryBefore.includes(m.id));
  if (unmounting) return;
  const gains = Object.entries(r?.gains || {})
    .map(([key, n]) => ({ key, n, ...(STATS.find((s) => s.key === key) || {}) }))
    .filter((g) => g.icon && (g.key === "fun" || g.key === "energy" || g.n > 0));
  const love = r?.channelReaction?.mood === "love" ? r.channelReaction : r?.reaction?.mood === "love" ? r.reaction : null;
  const title = a?.noScore
    ? res.details?.favFound ? "Sa chaîne préférée !" : "Un bon moment ensemble"
    : r?.isRecord ? "Nouveau record !" : res.score > 0 ? "Bien joué !" : "La prochaine fois !";
  result.value = {
    title,
    score: res.score,
    best: r?.best ?? res.score,
    isRecord: !!r?.isRecord,
    coins: r?.coins || 0,
    gems: fresh.reduce((s, m) => s + (m.gems || 0), 0),
    mastery: fresh.map((m) => m.label),
    gains,
    ingredients,
    levelUp: !!r?.levelUp,
    wishDone: !!r?.wishDone,
    falloff: r?.falloff ?? 1,
    line: love?.line || "",
  };
  canReplay.value = store.canActivity(id).ok;
  phase.value = "result";
  paused.value = false;
  beep(r?.isRecord ? "record" : fresh.length ? "star" : "end");
  haptic(r?.isRecord ? [20, 60, 20, 60, 40] : 20);
}

function replay() { begin(); }
function close() {
  if (ctrl?.running) ctrl.abort();
  emit("close");
}

function pause(manual = false) {
  if (phase.value === "intro" && manual) { clearTimers(); phase.value = "idle"; close(); return; }
  if (phase.value !== "play" || paused.value || !ctrl) return;
  paused.value = true;
  ctrl.pause();
}
function resume() {
  if (!paused.value) return;
  paused.value = false;
  ctrl?.resume();
}
function stopNow() {
  paused.value = false;
  ctrl?.abort(); // règle la partie avec le dernier score : rien n'est perdu
}

// --- gestes -> coordonnées normalisées de la 3D ---
function toNdc(e) {
  const el = liveCreature.value?.three?.renderer?.domElement;
  const r = el?.getBoundingClientRect();
  if (!r || !r.width) return [0, 0];
  return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
}
const tapEv = { type: "tap" };
const swipeEv = { type: "swipe", dx: 0, dy: 0, speed: 0 };
const tapEndEv = { type: "tapend", dt: 0 };
function onDown(e) {
  if (phase.value !== "play" || paused.value || !ctrl) return;
  try { e.target.setPointerCapture?.(e.pointerId); } catch { /* ignoré */ }
  const [x, y] = toNdc(e);
  down = { x: e.clientX, y: e.clientY, t: performance.now(), nx: x, ny: y, id: e.pointerId };
  ctrl.tap(x, y, tapEv);
}
function onUp(e) {
  if (!down || down.id !== e.pointerId) return;
  const d = down; down = null;
  if (phase.value !== "play" || paused.value || !ctrl) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y, dist = Math.hypot(dx, dy);
  if (dist < 28) {
    tapEndEv.dt = performance.now() - d.t;
    const [x, y] = toNdc(e);
    ctrl.tap(x, y, tapEndEv);
    return;
  }
  swipeEv.dx = dx; swipeEv.dy = dy; swipeEv.speed = dist / Math.max(16, performance.now() - d.t);
  ctrl.tap(d.nx, d.ny, swipeEv);
}
function onCancel() { down = null; }

// --- cycle de vie ---
function onVisibility() { if (document.hidden) pause(); }
function onPageHide() { if (ctrl?.running) ctrl.abort(); }

watch(liveCreature, (c) => { if (!c && ctrl?.running) ctrl.abort(); });

onMounted(() => {
  activeActivity.value = props.activityId;
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  begin();
});
onBeforeUnmount(() => {
  unmounting = true;
  clearTimers();
  clearTimeout(popTimer);
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onPageHide);
  if (ctrl?.running) ctrl.abort();
  activeActivity.value = null;
});
</script>

<style scoped>
.ap {
  position: fixed;
  inset: 0;
  z-index: 40;
  font-family: "Nunito", system-ui, sans-serif;
  color: #2b3440;
  pointer-events: auto;
  transition: background 0.25s;
}
.ap.dim { background: rgba(30, 45, 35, 0.12); }
.capture { position: absolute; inset: 0; touch-action: none; -webkit-tap-highlight-color: transparent; user-select: none; }

.hud {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}
.hud-row { width: 100%; display: flex; align-items: center; justify-content: space-between; }
.hud-name {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px 6px 8px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.92); box-shadow: 0 4px 12px rgba(40, 55, 80, 0.14);
  font-weight: 800; font-size: 14px;
}
.hud-ic { width: 22px; height: 22px; color: #3faa2e; }
.hud-btn {
  pointer-events: auto;
  width: 42px; height: 42px; border: 0; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.92); box-shadow: 0 4px 12px rgba(40, 55, 80, 0.14);
  cursor: pointer;
}
.hud-btn-ic { width: 22px; height: 22px; color: #4a5565; }
.score {
  display: flex; align-items: baseline; gap: 6px;
  padding: 4px 18px; border-radius: 20px;
  background: rgba(255, 255, 255, 0.94); box-shadow: 0 6px 16px rgba(40, 55, 80, 0.16);
  transition: transform 0.12s;
}
.score b { font-size: 40px; font-weight: 900; line-height: 1.05; color: #2a9a3a; font-variant-numeric: tabular-nums; }
.score small { font-size: 14px; font-weight: 800; color: #6a7585; }
.score.pop { transform: scale(1.18); }
.hud-text {
  padding: 4px 12px; border-radius: 999px;
  background: rgba(43, 52, 64, 0.72); color: #fff; font-weight: 800; font-size: 13px;
}
.combo {
  font-weight: 900; font-size: 22px; color: #ff8a3d;
  text-shadow: 0 2px 0 #fff, 0 0 10px rgba(255, 255, 255, 0.9);
  animation: combo 0.35s ease-out;
}
@keyframes combo { from { transform: scale(1.8); opacity: 0.2; } to { transform: scale(1); opacity: 1; } }
.timebar { width: min(220px, 60%); height: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.7); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1); }
.timebar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #8fdc6a, #4fbf34); transition: width 0.3s linear; }

.count {
  position: absolute; top: 38%; left: 50%; transform: translate(-50%, -50%);
  font-size: 96px; font-weight: 900; color: #fff;
  text-shadow: 0 6px 0 #3faa2e, 0 10px 24px rgba(30, 60, 30, 0.35);
  pointer-events: none;
}
.pop-enter-active { transition: transform 0.3s cubic-bezier(0.2, 1.6, 0.4, 1), opacity 0.3s; }
.pop-leave-active { transition: opacity 0.15s; position: absolute; }
.pop-enter-from { transform: translate(-50%, -50%) scale(2); opacity: 0; }
.pop-leave-to { opacity: 0; }

.center { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(30, 40, 50, 0.25); }
.card {
  width: min(360px, 100%);
  padding: 22px 18px 16px;
  border-radius: 26px;
  background: linear-gradient(180deg, #ffffff 70%, #f3f7f2);
  box-shadow: 0 18px 40px rgba(30, 40, 60, 0.3), inset 0 1px 0 #fff;
  text-align: center;
  animation: rise 0.35s cubic-bezier(0.2, 1.3, 0.4, 1);
}
@keyframes rise { from { transform: translateY(30px) scale(0.92); opacity: 0; } to { transform: none; opacity: 1; } }
.card h3 { margin: 8px 0 2px; font-size: 22px; font-weight: 900; }
.badge {
  display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, #a6ea85, #4fbf34 70%);
  box-shadow: 0 5px 0 #2f8f22, inset 0 2px 0 rgba(255, 255, 255, 0.45);
}
.badge.gold { background: radial-gradient(circle at 38% 30%, #ffe27a, #ffb21a 70%); box-shadow: 0 5px 0 #c98200, inset 0 2px 0 rgba(255, 255, 255, 0.45); animation: wobble 0.9s ease-in-out 2; }
.badge.soft { background: #eef3f7; box-shadow: none; }
.badge-ic { width: 36px; height: 36px; color: #fff; }
.badge.soft .badge-ic { color: #8a95a5; }
@keyframes wobble { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-10deg) scale(1.08); } 75% { transform: rotate(10deg) scale(1.08); } }
.big b { font-size: 52px; font-weight: 900; color: #2a9a3a; line-height: 1; }
.big small { font-size: 16px; font-weight: 800; color: #6a7585; }
.muted { margin: 4px 0; color: #6a7585; font-weight: 700; font-size: 14px; }
.line { margin: 8px 0 0; font-weight: 800; color: #e0477f; font-size: 15px; }
.chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 4px; }
.chip {
  --c: #4a5565;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c);
  font-weight: 900; font-size: 14px;
}
.chip-ic { width: 18px; height: 18px; }
.chip.coin { --c: #d08a00; }
.chip.gem { --c: #8a4dff; }
.chip.food { --c: #e0477f; }
.chip.lvl { --c: #2a9a3a; }
.mastery { margin: 6px 0 0; font-weight: 800; color: #8a4dff; display: flex; align-items: center; justify-content: center; gap: 4px; }
.m-ic { width: 18px; height: 18px; }
.note { margin: 6px 0 0; font-size: 13px; font-weight: 700; color: #6a7585; }
.btns { display: flex; gap: 10px; margin-top: 16px; }
.btn {
  flex: 1; min-height: 48px; border: 0; border-radius: 16px;
  background: linear-gradient(180deg, #6fd14c, #43b02a); color: #fff;
  font: 900 16px/1 "Nunito", system-ui, sans-serif;
  box-shadow: 0 4px 0 #2f8f22; cursor: pointer;
}
.btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #2f8f22; }
.btn.ghost { background: #f1f4f8; color: #4a5565; box-shadow: 0 4px 0 #d5dbe3; }
</style>
