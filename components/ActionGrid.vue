<template>
  <!-- actions en pilules blanches au texte bleu, l'objet 3D déborde à gauche -->
  <section class="panel" aria-label="Actions">
    <button
      v-for="(a, i) in shownActions"
      :key="a.key"
      class="act"
      :style="{ '--i': i, '--c1': a.color[0], '--c2': a.color[1] }"
      :class="{
        best: primary?.kind === 'best' && primary.key === a.key,
        wanted: primary?.kind === 'wanted' && primary.key === a.key,
        glow: a.glow,
        off: !!a.reason,
        cooling: !!a.cool,
        wiggle: wiggling === a.key,
      }"
      :aria-label="a.label + (a.reason ? ` (${a.reason})` : primary?.key === a.key ? (primary.kind === 'wanted' ? ' (elle en a envie)' : ' (conseillé)') : '')"
      @click="press(a)"
    >
      <span class="pill">
        <span v-if="a.cool" :key="a.cool.readyAt" class="cool-fill" :style="a.cool.style" aria-hidden="true" />
        <span class="lbl">{{ a.label }}</span>
      </span>
      <span class="obj">
        <img v-if="a.img" :src="a.img" class="emoji" alt="" draggable="false" />
        <Icon v-else :name="a.icon" mode="svg" class="ic" />
      </span>
      <Icon v-if="a.locked" name="solar:lock-keyhole-bold" class="lock" />
      <span v-if="primary?.kind === 'wanted' && primary.key === a.key" class="dot" aria-hidden="true" />
      <span v-for="f in floats.filter((x) => x.key === a.key)" :key="f.id" class="float" :style="{ '--fx': f.dx + 'px' }">{{ f.text }}</span>
    </button>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import * as growth from "~/lib/growth";
import { V1_ACTIVITIES, activityById } from "~/lib/catalog";
import { useInventoryStore } from "~/stores/useInventoryStore";

const ACTION_UNLOCK_LEVEL = growth.ACTION_UNLOCK_LEVEL || { danser: 3 };

const { store } = useCreatureMood();
const inv = useInventoryStore();
const tutoDone = computed(() => (store.onboardStep ?? 6) >= 6);
const has = (k) => !!store.features?.[k];
// Manger ouvre le choix goûter / plat (le tutoriel garde le goûter direct)
const mealPath = computed(() => tutoDone.value && (has("cuisine") || inv.mealsCount > 0));

// Activité à proposer à la place de « Jouer » : tout est plein, Jouer est grisé,
// ou le ballon vient d'arriver et elle n'a jamais joué au foot (1re partie guidée)
const suggestedActivity = computed(() => {
  void store.tick;
  if (!tutoDone.value || store.isSleeping || store.exhausted) return null;
  const w = store.wish;
  if (w?.action === "activite" && w.target && store.canActivity(w.target).ok) return w.target;
  const idle = store.idleSuggestion;
  if (idle?.kind === "activite") return idle.id;
  const ok = V1_ACTIVITIES.filter((a) => store.canActivity(a.id).ok);
  if (!ok.length) return null;
  if (has("ballon") && !(store.counters?.["activite:foot"] > 0) && ok.some((a) => a.id === "foot")) return "foot";
  const jouer = store.canAct?.("jouer");
  if (jouer && !jouer.ok && !(jouer.remaining > 0)) {
    const fav = ok.find((a) => a.id === store.tastes?.activity && inv.isTasteSeen("activity"));
    return (fav || ok.find((a) => a.id === "foot") || ok[0]).id;
  }
  return null;
});
// Plus faim du tout : Manger devient Cuisiner (préparer un plat pour plus tard)
const suggestCooking = computed(() => mealPath.value && has("cuisine") && store.hunger > 90 && !store.isSleeping);
const SHORT = { foot: "Foot", course: "Course", tele: "Télé" };

// Icônes Fluent Emoji 3D (Microsoft, licence MIT), avec contour blanc façon autocollant
const IMG = "/icons/actions/";
const ACT_IMG = { foot: "jouer", course: "course", tele: "tele" };

const BASE = [
  { key: "nourrir", label: "Manger", img: IMG + "manger.png", icon: "solar:donut-bitten-bold-duotone", color: ["#ffcf8a", "#e8781c"], need: "hunger" },
  { key: "laver", label: "Laver", img: IMG + "laver.png", icon: "solar:bath-bold-duotone", color: ["#a9dcff", "#2f86e0"], need: "cleanliness" },
  { key: "jouer", label: "Jouer", img: IMG + "jouer.png", icon: "solar:football-bold-duotone", color: ["#b4ec9c", "#2a9a3a"], need: "fun" },
  { key: "calin", label: "Tendresse", img: IMG + "tendresse.png", icon: "solar:hand-heart-bold-duotone", color: ["#f9bf94", "#ef3d6c"] },
  { key: "coucher", label: "Dodo", img: IMG + "dodo.png", icon: "solar:bed-bold-duotone", color: ["#8f9fff", "#3a4bc0"], need: "energy" },
  { key: "soigner", label: "Soigner", img: IMG + "soigner.png", icon: "solar:medical-kit-bold-duotone", color: ["#ff6d62", "#c42a24"], need: "health" },
  { key: "danser", label: "Danser", img: IMG + "danser.png", icon: "solar:music-notes-bold-duotone", color: ["#e0c4ff", "#8048e0"] },
  { key: "photo", label: "Photo", img: IMG + "photo.png", icon: "solar:camera-bold-duotone", color: ["#4fd2ca", "#0f6f69"] },
];

// Motifs de vibration par action (respecte le réglage « tamagotchi-haptics »)
const BUZZ = { calin: 10, nourrir: [12, 30, 12], laver: [10, 20, 10], jouer: [10, 20, 10], soigner: 40, danser: [10, 20, 10], succes: [20, 40, 20] };
function buzz(pattern) {
  try {
    const v = localStorage.getItem("tamagotchi-haptics");
    if (v === "0" || v === "false" || v === "off") return;
  } catch { /* stockage indisponible */ }
  try { navigator.vibrate?.(pattern); } catch { /* non supporté */ }
}

const now = computed(() => store.tick || Date.now());

// Anneau de recharge fluide : on fige UNE fois par recharge (clé readyAt) la durée totale
// et le temps déjà écoulé, puis une animation CSS linéaire le remplit en continu
// (le tick d'une seconde ne fait que décider s'il est encore affiché).
const coolCache = new Map();
function coolOf(key, c) {
  const hit = coolCache.get(key);
  if (hit && hit.readyAt === c.readyAt) return hit;
  const total = Math.max(c.cooldownMs, c.remaining);
  const elapsed = Math.max(0, total - Math.max(0, c.readyAt - Date.now()));
  const cool = { readyAt: c.readyAt, style: { "--dur": total + "ms", "--delay": -elapsed + "ms" } };
  coolCache.set(key, cool);
  return cool;
}

function stateOf(key) {
  if (key === "photo") return { reason: null, cool: null, locked: false };
  const needLevel = ACTION_UNLOCK_LEVEL?.[key];
  if (needLevel && store.level < needLevel) {
    return { reason: `Je saurai danser au niveau ${needLevel} !`, cool: null, locked: true };
  }
  if (key === "coucher" && store.isSleeping) return { reason: null, cool: null, locked: false };
  void now.value; // dépendance : l'anneau disparaît à la fin de la recharge
  const c = store.canAct?.(key);
  if (!c || c.ok) return { reason: null, cool: null, locked: false };
  const cool = c.cooldownMs > 0 && c.remaining > 0 ? coolOf(key, c) : null;
  // goûter en recharge : les plats du frigo restent accessibles par Manger
  if (key === "nourrir" && mealPath.value && c.remaining > 0 && !store.isSleeping) return { reason: null, cool, locked: false };
  return { reason: c.reason || "Encore un instant...", cool, locked: false };
}

const actions = computed(() =>
  BASE.map((a) => {
    if (a.key === "jouer" && suggestedActivity.value) {
      const act = activityById(suggestedActivity.value);
      const w = store.wish;
      return {
        ...a, label: SHORT[act.id] || act.label, icon: act.icon,
        img: ACT_IMG[act.id] ? IMG + ACT_IMG[act.id] + ".png" : null, reason: null, cool: null, locked: false,
        activity: act.id, wanted: w?.action === "activite" && w.target === act.id, suggest: true,
        glow: gameBus.highlight?.action === a.key,
      };
    }
    if (a.key === "nourrir" && suggestCooking.value) {
      const wish = store.wish?.action === "repas" ? store.wish.target : "";
      return {
        ...a, label: "Cuisiner", icon: "solar:chef-hat-bold-duotone", img: IMG + "cuisiner.png", reason: null, cool: null, locked: false,
        cook: wish || "", wanted: !!wish, glow: gameBus.highlight?.action === a.key,
      };
    }
    const wake = a.key === "coucher" && store.isSleeping;
    const st = stateOf(a.key);
    return {
      ...a,
      label: wake ? "Réveil" : a.label,
      icon: wake ? "solar:sun-bold-duotone" : a.icon,
      img: wake ? IMG + "reveil.png" : a.img,
      color: wake ? ["#ffe58a", "#f29400"] : a.color,
      ...st,
      wanted: !st.reason && (store.wish?.action === a.key || (a.key === "nourrir" && mealPath.value && store.wish?.action === "repas")),
      glow: gameBus.highlight?.action === a.key,
    };
  })
);

// Une action pas encore apprise (Danser) n'apparaît pas du tout : pas de tuile cadenassée
const shownActions = computed(() => actions.value.filter((a) => !a.locked));

// UN seul appel à l'action à la fois : son envie > l'activité proposée > le besoin le plus bas
const primary = computed(() => {
  const list = shownActions.value;
  const wish = list.find((a) => a.wanted && !a.reason);
  if (wish) return { key: wish.key, kind: "wanted" };
  const sug = list.find((a) => a.suggest);
  // simple suggestion (tout est plein, Jouer grisé…) : mise en avant douce, sans pastille
  if (sug) return { key: sug.key, kind: "best" };
  return best.value ? { key: best.value, kind: "best" } : null;
});

// Action conseillée : celle du besoin le plus bas (sans compter Soigner si elle va bien)
const best = computed(() => {
  if (store.isSleeping) return null;
  let pick = null, low = 60;
  for (const a of actions.value) {
    if (!a.need || a.reason) continue;
    if (store[a.need] < low) { low = store[a.need]; pick = a.key; }
  }
  return pick;
});

const wiggling = ref(null);
function wiggle(key) {
  wiggling.value = null;
  requestAnimationFrame(() => (wiggling.value = key));
  setTimeout(() => { if (wiggling.value === key) wiggling.value = null; }, 450);
}

// petits « +N » qui montent depuis la tuile
const floats = ref([]);
let floatId = 0;
function addFloat(key, text, dx = 0) {
  const id = ++floatId;
  floats.value.push({ id, key, text, dx });
  setTimeout(() => (floats.value = floats.value.filter((f) => f.id !== id)), 1100);
}
function showGains(key, res) {
  const parts = [];
  const g = res.gains || {};
  const top = Object.entries(g).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1])[0];
  if (top) parts.push("+" + Math.round(top[1]));
  if (res.xp > 0) parts.push(`+${res.xp} xp`);
  parts.forEach((t, i) => setTimeout(() => addFloat(key, t, (i - 0.5) * 14), i * 140));
}

function press(a) {
  if (a.reason) {
    gameSay(a.reason);
    wiggle(a.key);
    return;
  }
  if (a.key === "photo") { buzz(12); return gameCommand("photo"); }
  if (a.activity) { buzz(12); return launchActivity(a.activity); }
  if (a.cook !== undefined) { buzz(12); return openKitchen(a.cook); }
  if (a.key === "nourrir" && mealPath.value) { buzz(12); return openSheet("manger"); }
  if (a.key === "coucher") {
    buzz(12);
    if (store.isSleeping) return store.wakeUp();
    const r = store.canAct?.("coucher");
    if (r && !r.ok) { gameSay(r.reason || "Je ne suis pas fatiguée !"); return wiggle(a.key); }
    return store.startSleeping();
  }
  const res = store.applyAction(a.key);
  if (!res || res.ok === false) {
    gameSay(res?.reason || "Pas maintenant...");
    wiggle(a.key);
    return;
  }
  buzz(BUZZ[a.key] || 12);
  showGains(a.key, res);
  if (res.levelUp || res.stageUp || res.wishDone) setTimeout(() => buzz(BUZZ.succes), 250);
}
</script>

<style scoped>
/* panneau blanc net, 3 pilules par rangée (une rangée incomplète se centre) */
.panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 8px;
  padding: 12px 10px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fbfcfe, var(--hud-band));
  box-shadow: var(--hud-shadow), 0 0 0 1px var(--hud-line);
  animation: panel-in 0.5s var(--spring) 0.08s both;
}
@keyframes panel-in { from { opacity: 0; transform: translateY(18px); } }

/* une action : l'objet 3D à gauche, posé à cheval sur une pilule blanche */
.act {
  position: relative;
  flex: 0 0 calc((100% - 2 * 8px) / 3);
  min-width: 0;
  height: 46px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: act-in 0.45s var(--spring-strong) calc(0.15s + var(--i, 0) * 40ms) both;
}
@keyframes act-in { from { opacity: 0; transform: scale(0.6) translateY(8px); } }
.pill {
  position: absolute;
  left: 16px;
  right: 0;
  top: 5px;
  bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 6px 0 24px;
  border-radius: 999px;
  background: var(--hud-pill);
  box-shadow: var(--hud-pill-shadow), inset 0 1px 0 #fff;
  transition: transform 0.4s var(--spring-strong), box-shadow 0.2s, background 0.2s;
}
.lbl {
  position: relative;
  z-index: 1;
  min-width: 0;
  font: 800 clamp(11px, 3.1vw, 13px)/1 var(--font-text);
  color: var(--hud-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.obj {
  position: absolute;
  left: 0;
  top: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-top: -20px;
  pointer-events: none;
  transition: transform 0.45s var(--spring-strong);
}
/* objet 3D détouré d'un contour blanc façon autocollant */
.emoji {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  filter:
    drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff)
    drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)
    drop-shadow(0 3px 3px rgba(30, 55, 100, 0.28));
}
.ic { width: 32px; height: 32px; color: var(--c2); filter: drop-shadow(0 0 2px #fff) drop-shadow(0 2px 2px rgba(30, 55, 100, 0.25)); }
.ic :deep([opacity]) { opacity: 1; color: var(--c1); }

/* toucher : la pilule s'écrase, l'objet saute ; retour en rebond */
.act:active .pill { transform: scale(0.93); transition-duration: 0.08s; }
.act:active .obj { transform: scale(1.15) rotate(-8deg); transition-duration: 0.1s; }
@media (hover: hover) {
  .act:hover .pill { background: linear-gradient(180deg, #fff, #eef5ff 60%, #dde9f7); }
  .act:hover .obj { transform: translateY(-2px) rotate(-5deg); }
}

/* recharge : la pilule se remplit de bleu clair, en continu, de gauche à droite
   (durée = recharge totale, délai négatif = temps déjà écoulé) */
@property --p {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}
.cool-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(108, 194, 255, 0.42) calc(var(--p) * 100%), transparent 0);
  pointer-events: none;
  animation: cool var(--dur, 1s) linear var(--delay, 0s) forwards;
}
@keyframes cool {
  from { --p: 0; }
  to { --p: 1; }
}

/* action conseillée : liseré bleu ciel lumineux qui respire */
.best .pill { animation: halo 1.8s ease-in-out infinite; }
@keyframes halo {
  0%, 100% { box-shadow: 0 0 0 2.5px var(--sky-hi), 0 0 8px 2px rgba(108, 194, 255, 0.55), var(--hud-pill-shadow); }
  50% { box-shadow: 0 0 0 2.5px var(--sky-hi), 0 0 16px 6px rgba(108, 194, 255, 0.35), var(--hud-pill-shadow); }
}
/* envie de la créature : pilule rose qui pulse */
.wanted .pill {
  background: linear-gradient(180deg, #fff7fa, #ffe6ee);
  box-shadow: 0 0 0 2.5px #ff9ab8, 0 4px 10px rgba(255, 79, 134, 0.25);
}
.wanted { animation: act-in 0.45s var(--spring-strong) calc(0.15s + var(--i, 0) * 40ms) both, pulse 1.3s ease-in-out 0.8s infinite; }
.wanted .lbl { color: var(--love-ink); }
.glow .pill { box-shadow: 0 0 0 2.5px #ffc21a, 0 0 12px rgba(255, 194, 26, 0.6); }
.glow { animation: pulse 0.9s ease-in-out 3; }
@keyframes pulse { 50% { transform: scale(1.06); } }
.dot { position: absolute; z-index: 3; top: 1px; left: 1px; width: 12px; height: 12px; border-radius: 50%; background: var(--love); box-shadow: 0 0 0 2px #fff; }

/* indisponible : texte bleu pâle, objet un peu éteint, mais toujours lisible */
.off .lbl { color: var(--hud-ink-2); }
.off .obj { filter: saturate(0.35); opacity: 0.75; }
.off .pill { background: linear-gradient(180deg, #f8fafc, #e9eef4); }

/* petits « +N » qui sautent puis montent depuis l'action */
.float {
  position: absolute;
  top: -4px;
  left: 50%;
  z-index: 5;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff;
  color: #2a9a3a;
  font: 800 13px var(--font-title);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(30, 55, 100, 0.22);
  animation: up 1.05s ease-out forwards;
}
@keyframes up {
  0% { transform: translate(calc(-50% + var(--fx)), 6px) scale(0.4); opacity: 0; }
  18% { transform: translate(calc(-50% + var(--fx)), -14px) scale(1.25); opacity: 1; }
  30% { transform: translate(calc(-50% + var(--fx)), -18px) scale(1); }
  75% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--fx)), -58px) scale(0.95); opacity: 0; }
}
.lock { position: absolute; z-index: 3; top: 2px; right: 4px; width: 14px; height: 14px; color: #9aa4b2; }
.wiggle { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-5deg); }
  40% { transform: rotate(4deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .panel, .act, .wanted, .glow, .wiggle, .best .pill { animation: none; }
  .best .pill { box-shadow: 0 0 0 2.5px var(--sky-hi), var(--hud-pill-shadow); }
  .pill, .obj { transition: none; }
}
</style>
