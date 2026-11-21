<template>
  <section class="panel" aria-label="Actions">
    <button
      v-for="a in shownActions"
      :key="a.key"
      class="tile"
      :class="{
        best: primary?.kind === 'best' && primary.key === a.key,
        wanted: primary?.kind === 'wanted' && primary.key === a.key,
        glow: a.glow,
        off: !!a.reason,
        cooling: a.ring > 0,
        wiggle: wiggling === a.key,
      }"
      :aria-label="a.label + (a.reason ? ` (${a.reason})` : primary?.key === a.key ? (primary.kind === 'wanted' ? ' (elle en a envie)' : ' (conseillé)') : '')"
      @click="press(a)"
    >
      <span v-if="a.ring > 0" class="ring" :style="{ '--p': a.ring }" aria-hidden="true" />
      <Icon :name="a.icon" mode="svg" class="ic" :style="{ '--c1': a.color[0], '--c2': a.color[1] }" />
      <span class="lbl">{{ a.label }}</span>
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

const BASE = [
  { key: "nourrir", label: "Manger", icon: "solar:donut-bitten-bold-duotone", color: ["#ffcf8a", "#e8781c"], need: "hunger" },
  { key: "laver", label: "Laver", icon: "solar:bath-bold-duotone", color: ["#a9dcff", "#2f86e0"], need: "cleanliness" },
  { key: "jouer", label: "Jouer", icon: "solar:football-bold-duotone", color: ["#b4ec9c", "#2a9a3a"], need: "fun" },
  { key: "calin", label: "Câlin", icon: "solar:hand-heart-bold-duotone", color: ["#f9bf94", "#ef3d6c"] },
  { key: "coucher", label: "Dodo", icon: "solar:bed-bold-duotone", color: ["#8f9fff", "#3a4bc0"], need: "energy" },
  { key: "soigner", label: "Soigner", icon: "solar:medical-kit-bold-duotone", color: ["#ff6d62", "#c42a24"], need: "health" },
  { key: "danser", label: "Danser", icon: "solar:music-notes-bold-duotone", color: ["#e0c4ff", "#8048e0"] },
  { key: "photo", label: "Photo", icon: "solar:camera-bold-duotone", color: ["#4fd2ca", "#0f6f69"] },
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

function stateOf(key) {
  if (key === "photo") return { reason: null, ring: 0, locked: false };
  const needLevel = ACTION_UNLOCK_LEVEL?.[key];
  if (needLevel && store.level < needLevel) {
    return { reason: `Je saurai danser au niveau ${needLevel} !`, ring: 0, locked: true };
  }
  if (key === "coucher" && store.isSleeping) return { reason: null, ring: 0, locked: false };
  void now.value; // dépendance : l'anneau se met à jour chaque seconde
  const c = store.canAct?.(key);
  if (!c || c.ok) return { reason: null, ring: 0, locked: false };
  let ring = 0;
  if (c.cooldownMs > 0 && c.remaining > 0) ring = Math.min(0.999, Math.max(0.02, 1 - c.remaining / c.cooldownMs));
  // goûter en recharge : les plats du frigo restent accessibles par Manger
  if (key === "nourrir" && mealPath.value && c.remaining > 0 && !store.isSleeping) return { reason: null, ring, locked: false };
  return { reason: c.reason || "Encore un instant...", ring, locked: false };
}

const actions = computed(() =>
  BASE.map((a) => {
    if (a.key === "jouer" && suggestedActivity.value) {
      const act = activityById(suggestedActivity.value);
      const w = store.wish;
      return {
        ...a, label: SHORT[act.id] || act.label, icon: act.icon, reason: null, ring: 0, locked: false,
        activity: act.id, wanted: w?.action === "activite" && w.target === act.id, suggest: true,
        glow: gameBus.highlight?.action === a.key,
      };
    }
    if (a.key === "nourrir" && suggestCooking.value) {
      const wish = store.wish?.action === "repas" ? store.wish.target : "";
      return {
        ...a, label: "Cuisiner", icon: "solar:chef-hat-bold-duotone", reason: null, ring: 0, locked: false,
        cook: wish || "", wanted: !!wish, glow: gameBus.highlight?.action === a.key,
      };
    }
    const wake = a.key === "coucher" && store.isSleeping;
    const st = stateOf(a.key);
    return {
      ...a,
      label: wake ? "Réveil" : a.label,
      icon: wake ? "solar:sun-bold-duotone" : a.icon,
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
  if (sug) return { key: sug.key, kind: "wanted" };
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
.panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap, 12px);
  padding: 14px;
  border-radius: 26px;
  background: rgba(244, 246, 249, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 28px rgba(40, 55, 80, 0.16), inset 0 1px 0 #fff;
}
/* tuile blanche douce */
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: var(--tile, 84px);
  gap: 2px;
  padding-top: 4px;
  border: 2px solid transparent;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f3f5f8);
  box-shadow: 0 4px 10px rgba(40, 55, 80, 0.1), 0 1px 0 rgba(40, 55, 80, 0.06), inset 0 1px 0 #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s, box-shadow 0.08s;
}
.tile:active { transform: scale(0.95); box-shadow: 0 1px 3px rgba(40, 55, 80, 0.12); }
/* icône Solar bicolore : ton clair pour le fond de l'objet, ton soutenu pour le dessin */
.ic {
  width: 46px;
  height: 46px;
  color: var(--c2);
  filter: drop-shadow(0 3px 3px rgba(40, 55, 80, 0.16));
}
.ic :deep([opacity]) { opacity: 1; color: var(--c1); }
/* action conseillée : fond vert tendre et liseré vert */
.best {
  border-color: #8fdc6a;
  background: linear-gradient(180deg, #f3fdec, #e2f7d4);
  box-shadow: 0 4px 12px rgba(80, 180, 50, 0.25), inset 0 1px 0 #fff;
}
.off .ic { opacity: 0.45; filter: grayscale(0.5); }
.off .lbl { opacity: 0.6; }
.lbl { font: 800 11px/1 "Nunito", system-ui, sans-serif; color: #4a5565; padding-bottom: 6px; }
/* anneau de recharge */
.ring {
  position: absolute;
  inset: -2px;
  border-radius: 20px;
  padding: 3px;
  background: conic-gradient(#4fbf34 calc(var(--p) * 360deg), rgba(150, 160, 175, 0.28) 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  pointer-events: none;
}
/* envie de la créature : la tuile pulse en rose */
.wanted {
  border-color: #ff8fb0;
  background: linear-gradient(180deg, #fff6f9, #ffe3ec);
  animation: pulse 1.3s ease-in-out infinite;
}
.glow { animation: pulse 0.9s ease-in-out 3; border-color: #ffc21a; }
.dot { position: absolute; top: 6px; left: 6px; width: 9px; height: 9px; border-radius: 50%; background: #ff4f86; }
@keyframes pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 4px 10px rgba(40, 55, 80, 0.1), 0 0 0 0 rgba(255, 90, 140, 0.45); }
  50% { transform: scale(1.06); box-shadow: 0 6px 14px rgba(40, 55, 80, 0.14), 0 0 0 8px rgba(255, 90, 140, 0); }
}
.float {
  position: absolute;
  top: 6px;
  left: 50%;
  z-index: 5;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff;
  color: #2a9a3a;
  font: 800 13px "Fredoka", "Nunito", system-ui, sans-serif;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(40, 55, 80, 0.2);
  animation: up 1.05s ease-out forwards;
}
@keyframes up {
  0% { transform: translate(calc(-50% + var(--fx)), 6px) scale(0.7); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--fx)), -52px) scale(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .wanted, .glow, .wiggle { animation: none; }
}
.lock {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 14px;
  height: 14px;
  color: #9aa4b2;
}
.wiggle { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-6deg); }
  40% { transform: rotate(5deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(2deg); }
}
</style>
