<template>
  <section class="panel" aria-label="Actions">
    <button
      v-for="(a, i) in shownActions"
      :key="a.key"
      class="tile"
      :style="{ '--i': i }"
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
      <span class="disc" :style="{ '--c1': a.color[0], '--c2': a.color[1] }">
        <span v-if="a.cool" :key="a.cool.readyAt" class="cool-ring" :style="a.cool.style" aria-hidden="true" />
        <img v-if="a.img" :src="a.img" class="ic emoji" alt="" draggable="false" />
        <Icon v-else :name="a.icon" mode="svg" class="ic" />
        <Icon v-if="a.locked" name="solar:lock-keyhole-bold" class="lock" />
        <span v-if="primary?.kind === 'wanted' && primary.key === a.key" class="dot" aria-hidden="true" />
      </span>
      <span class="lbl">{{ a.label }}</span>
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
/* 4 boutons par rangée ; une rangée incomplète (Danser pas encore appris) se centre */
.panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--gap, 12px);
  position: relative;
  padding: 16px 10px 14px;
  border-radius: 28px;
  /* niveau 2 : verre clair lumineux, c'est le panneau héros */
  background: var(--hud-light);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: 0 12px 30px rgba(24, 64, 128, 0.26), var(--glass-edge), inset 0 -10px 22px rgba(108, 194, 255, 0.22);
  animation: panel-in 0.55s var(--spring) 0.1s both;
}
@keyframes panel-in { from { opacity: 0; transform: translateY(24px) scale(0.96); } }
/* bouton = disque rond + libellé dessous */
.tile {
  position: relative;
  flex: 0 0 calc((100% - 3 * var(--gap, 12px)) / 4);
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  /* les boutons sortent l'un après l'autre en rebondissant */
  animation: tile-in 0.5s var(--spring-strong) calc(0.18s + var(--i, 0) * 45ms) both;
}
@keyframes tile-in { from { opacity: 0; transform: scale(0.3) translateY(10px); } }
.disc {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--tile, 68px);
  max-width: 100%;
  aspect-ratio: 1;
  border: 3px solid #fff;
  border-radius: 50%;
  /* pastille pastel de la couleur de l'action : le contour blanc de l'objet ressort dessus */
  background: radial-gradient(circle at 50% 22%, color-mix(in srgb, var(--c1) 34%, #fff), color-mix(in srgb, var(--c1) 88%, #fff) 70%, color-mix(in srgb, var(--c2) 38%, var(--c1)) 100%);
  box-shadow: 0 6px 12px color-mix(in srgb, var(--c2) 34%, transparent), 0 1px 0 rgba(40, 55, 80, 0.06), inset 0 -4px 8px color-mix(in srgb, var(--c2) 26%, transparent);
  transition: transform 0.42s var(--spring-strong), box-shadow 0.2s;
}
/* reflet de verre en haut du disque */
.disc::after {
  content: "";
  position: absolute;
  top: 5%;
  left: 17%;
  width: 66%;
  height: 34%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0));
  pointer-events: none;
}
.disc .emoji, .disc .ic { position: relative; z-index: 1; }
/* pression : le disque s'écrase vite puis rebondit au relâcher */
.tile:active .disc { transform: scale(0.86); box-shadow: 0 1px 3px rgba(40, 55, 80, 0.12); transition-duration: 0.08s; }
.disc .emoji { transition: transform 0.5s var(--spring-strong); }
.tile:active .disc .emoji { transform: scale(1.12) rotate(-6deg); transition-duration: 0.1s; }
@media (hover: hover) {
  .tile:hover .disc { transform: translateY(-3px); }
  .tile:hover .disc .emoji { transform: scale(1.08) rotate(-4deg); }
}
/* icône Solar bicolore : ton clair pour le fond de l'objet, ton soutenu pour le dessin */
.ic {
  width: 58%;
  height: 58%;
  color: var(--c2);
  filter: drop-shadow(0 3px 3px rgba(40, 55, 80, 0.16));
}
.ic :deep([opacity]) { opacity: 1; color: var(--c1); }
/* objet 3D détouré d'un contour blanc façon autocollant, puis petite ombre portée */
.emoji {
  width: 64%;
  height: 64%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  filter:
    drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff)
    drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)
    drop-shadow(0 3px 3px rgba(40, 55, 80, 0.25));
}
/* action conseillée : halo bleu ciel qui respire doucement */
.best .disc {
  border-color: #fff;
  animation: halo 1.8s ease-in-out infinite;
}
@keyframes halo {
  0%, 100% { box-shadow: 0 0 0 3px var(--sky-hi), 0 0 10px 3px rgba(108, 194, 255, 0.55), 0 4px 10px rgba(30, 70, 120, 0.15); }
  50% { box-shadow: 0 0 0 3px var(--sky-hi), 0 0 18px 8px rgba(108, 194, 255, 0.35), 0 4px 10px rgba(30, 70, 120, 0.15); }
}
/* indisponible : disque désaturé mais clair, objet encore lisible (pas « cassé ») */
.off .disc { filter: saturate(0.4) brightness(1.03); box-shadow: 0 3px 8px rgba(40, 70, 110, 0.16), inset 0 -3px 6px rgba(80, 100, 130, 0.12); }
.off .emoji, .off .ic { opacity: 0.8; }
.off .lbl { color: var(--ink-3); background: rgba(255, 255, 255, 0.5); }
.lbl {
  max-width: 100%;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 1px 3px rgba(30, 70, 120, 0.12);
  font: 800 11px/1 var(--font-text);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform 0.35s var(--spring-strong);
}
.tile:active .lbl { transform: scale(0.94); }
/* anneau de recharge : rempli en continu par une animation linéaire
   (durée = recharge totale, délai négatif = temps déjà écoulé) */
@property --p {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}
.cool-ring {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(#4fbf34 calc(var(--p) * 360deg), rgba(150, 160, 175, 0.28) 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  pointer-events: none;
  animation: cool var(--dur, 1s) linear var(--delay, 0s) forwards;
}
@keyframes cool {
  from { --p: 0; }
  to { --p: 1; }
}
/* envie de la créature : le bouton pulse en rose */
.wanted .disc {
  border-color: #ff8fb0;
  background: linear-gradient(180deg, #fff6f9, #ffe3ec);
  animation: pulse 1.3s ease-in-out infinite;
}
.glow .disc { animation: pulse 0.9s ease-in-out 3; border-color: #ffc21a; }
.dot { position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--love); box-shadow: 0 0 0 2px #fff; }
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
  0% { transform: translate(calc(-50% + var(--fx)), 6px) scale(0.4); opacity: 0; }
  18% { transform: translate(calc(-50% + var(--fx)), -14px) scale(1.25); opacity: 1; }
  30% { transform: translate(calc(-50% + var(--fx)), -18px) scale(1); }
  75% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--fx)), -58px) scale(0.95); opacity: 0; }
}
.lock {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  color: #9aa4b2;
}
.wiggle .disc { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-6deg); }
  40% { transform: rotate(5deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .wanted .disc, .glow .disc, .wiggle .disc, .tile, .panel { animation: none; }
  .best .disc { animation: none; box-shadow: 0 0 0 3px var(--sky-hi), 0 0 10px 3px rgba(108, 194, 255, 0.55); }
  .disc, .disc .emoji, .lbl { transition: none; }
}
</style>
