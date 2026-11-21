<template>
  <!-- menu d'interaction : des pilules blanches en arc autour de la créature touchée,
       chacune avec son objet 3D qui déborde du côté extérieur -->
  <div ref="rootEl" class="ring" :class="{ closing, ready }" role="menu" aria-label="Actions">
    <div class="veil" aria-hidden="true" />
    <div class="halo" aria-hidden="true" :style="haloStyle" />
    <div v-for="(a, i) in ordered" :key="a.key" class="slot" :class="{ live }" :style="slotStyle(a, i)">
      <button
        :ref="(el) => setBtn(a.key, el)"
        class="pill-btn"
        type="button"
        role="menuitem"
        :class="{
          'is-left': sideOf(a) === 'l',
          'is-right': sideOf(a) === 'r',
          'is-big': solo,
          'is-primary': prim?.key === a.key && ordered.length > 2,
          'is-wanted': prim?.kind === 'wanted' && prim.key === a.key,
          'is-best': prim?.kind === 'best' && prim.key === a.key && !solo,
          'is-pulse': solo && tutoPulse,
          'is-glow': a.glow,
          'is-off': !!a.reason,
          'is-wiggle': wiggling === a.key,
        }"
        :style="{ '--c1': a.color[0], '--c2': a.color[1] }"
        :aria-disabled="a.reason ? 'true' : undefined"
        :aria-label="a.label + (a.reason ? ` (${a.reason})` : prim?.key === a.key ? (prim.kind === 'wanted' ? ' (elle en a envie)' : ' (conseillé)') : '')"
        @pointerdown.stop
        @click="pick(a)"
      >
        <span class="body">
          <span v-if="a.cool" :key="a.cool.readyAt" class="cool-fill" :style="a.cool.style" aria-hidden="true" />
        </span>
        <span class="lbl">{{ a.label }}</span>
        <span class="obj" aria-hidden="true">
          <img v-if="a.img" :src="a.img" class="emoji" alt="" draggable="false" />
          <Icon v-else :name="a.icon" mode="svg" class="ic" />
        </span>
        <span v-if="prim?.kind === 'wanted' && prim.key === a.key" class="dot" aria-hidden="true" />
        <span v-for="f in floats.filter((x) => x.key === a.key)" :key="f.id" class="float" :style="{ '--fx': f.dx + 'px' }">{{ f.text }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { gameBus } from "~/composables/useCreatureMood";
import { activeActivity } from "~/composables/useLiveCreature";
import { useActionList } from "~/composables/useActionList";
import { V1_ACTIVITIES } from "~/lib/catalog";

const props = defineProps({
  anchor: { type: Object, default: () => ({}) }, // { x, y, r, top, bottom } en px, repère du parent plein écran
  zoom: { type: Number, default: 1 },
  focus: { type: String, default: null }, // action à mettre en avant (ex. 'laver')
  minTop: { type: Number, default: 80 }, // haut de la zone libre
});
const emit = defineEmits(["close", "picked"]);

const { store, shownActions, primary, press, wiggling, floats, tutoDone } = useActionList();

// ---------------------------------------------------------------- contenu
// Deux niveaux, façon menu de jeu de simulation de vie : d'abord des catégories, rangées par urgence
// (son envie d'abord, puis le besoin le plus bas ; l'ordre change donc souvent), puis leurs choix.
// Une catégorie qui n'a qu'un choix possible agit directement.
const ACT_IMG = { foot: "jouer", course: "course", tele: "tele" };
const ACT_SHORT = { foot: "Foot", course: "Course", tele: "Télé" };
const CATS = [
  { key: "cat:manger", label: "Manger", keys: ["nourrir"], needs: ["hunger"] },
  { key: "cat:soins", label: "Soins", keys: ["laver", "soigner"], needs: ["cleanliness", "health"] },
  { key: "cat:jouer", label: "Jouer", keys: ["jouer", "danser"], acts: true, needs: ["fun"] },
  { key: "cat:calins", label: "Câlins", keys: ["calin", "chatouiller"], needs: [] },
  { key: "cat:dodo", label: "Dodo", keys: ["coucher"], needs: ["energy"] },
  { key: "cat:photo", label: "Photo", keys: ["photo"], needs: [], last: true },
];
const level = ref(null); // null = catégories ; sinon clé de la catégorie ouverte
const BACK = { key: "back", label: "Retour", icon: "solar:arrow-left-bold", color: ["#e3edf8", "#2c4f9e"], reason: null, cool: null, back: true };

const byKey = computed(() => Object.fromEntries(shownActions.value.map((a) => [a.key, a])));

// choix d'une catégorie (actions du composable, plus les activités découvertes pour Jouer)
function subItems(cat) {
  void store.tick;
  const by = byKey.value;
  const out = cat.keys.map((k) => by[k]).filter(Boolean);
  if (cat.acts && store.canActivity) {
    const jouerColor = by.jouer?.color || ["#b4ec9c", "#2a9a3a"];
    for (const act of V1_ACTIVITIES) {
      if (out.some((a) => a.activity === act.id)) continue; // déjà proposée à la place de « Jouer »
      const c = store.canActivity(act.id);
      if (c.locked) continue; // pas encore découverte : n'apparaît pas
      out.push({
        key: "act:" + act.id, label: ACT_SHORT[act.id] || act.label, icon: act.icon,
        img: ACT_IMG[act.id] ? `/icons/actions/${ACT_IMG[act.id]}.png` : null,
        color: jouerColor, activity: act.id, reason: c.ok ? null : c.reason || "Pas maintenant...", cool: null,
      });
    }
  }
  return out;
}
// catégorie qui contient une clé d'action (pour l'envie ou le conseil)
const catOf = (key) => CATS.find((c) => c.keys.includes(key) || (c.acts && String(key).startsWith("act:")));

const categoryList = computed(() => {
  const p = primary.value;
  const pc = p ? catOf(p.key)?.key : null;
  const fc = props.focus ? catOf(props.focus)?.key : null;
  const urgency = (c) => {
    if (c.last) return 1000;
    if (c.key === fc) return -2;
    if (c.key === pc && p.kind === "wanted") return -1;
    return c.needs.length ? Math.min(...c.needs.map((n) => store[n] ?? 100)) : 90;
  };
  return CATS
    .map((c) => ({ c, subs: subItems(c) }))
    .filter((x) => x.subs.length)
    .sort((a, b) => urgency(a.c) - urgency(b.c))
    .map(({ c, subs }) => {
      if (subs.length === 1) return subs[0];
      const ok = subs.find((s) => !s.reason) || subs[0];
      return { key: c.key, label: c.label + "…", img: ok.img, icon: ok.icon, color: ok.color, reason: null, cool: null, cat: c.key };
    });
});

const baseList = computed(() => {
  const by = byKey.value;
  let keys = null;
  if (store.health <= 0) keys = ["soigner"];
  else if (store.isSleeping) keys = ["coucher", "calin"];
  else if (!tutoDone.value) keys = ["chatouiller"];
  if (keys) {
    return keys
      .map((k) => by[k])
      .filter(Boolean)
      .map((a) => (store.isSleeping && a.key === "calin" && a.reason ? { ...a, reason: "Chut, elle dort..." } : a));
  }
  const open = level.value && CATS.find((c) => c.key === level.value);
  if (open) return [...subItems(open), BACK];
  return categoryList.value;
});

// l'appel mis en avant : focus (bulle d'envie) > mode > envie / conseil du composable ;
// au niveau des catégories, c'est la catégorie qui contient l'action qui est mise en avant
const prim = computed(() => {
  const list = baseList.value;
  if (store.health <= 0) return list[0] ? { key: list[0].key, kind: "best" } : null;
  if (store.isSleeping) return { key: "coucher", kind: "best" };
  if (!tutoDone.value) return { key: "chatouiller", kind: "best" };
  const p = primary.value;
  const find = (key) => list.find((a) => a.key === key) || list.find((a) => a.cat && a.cat === catOf(key)?.key);
  if (props.focus) {
    const f = find(props.focus);
    if (f && !f.reason) return { key: f.key, kind: p?.key === props.focus ? p.kind : "best" };
  }
  if (!p) return null;
  const hit = find(p.key);
  return hit ? { key: hit.key, kind: p.kind } : null;
});

// angles (degrés depuis le haut, sens horaire) : 6 pilules à -125..125, moins de pilules = arc plus serré
function slotAngles(n) {
  if (n <= 1) return [0];
  const span = Math.min(250, (n - 1) * 50);
  return Array.from({ length: n }, (_, i) => -span / 2 + (i * span) / (n - 1));
}

// l'appel prend la place la plus haute
const ordered = computed(() => {
  const list = baseList.value.slice();
  const p = prim.value;
  if (p && list.length > 2) {
    const ang = slotAngles(list.length);
    let ti = 0;
    ang.forEach((g, i) => { if (Math.abs(g) < Math.abs(ang[ti]) - 1e-6) ti = i; });
    const pi = list.findIndex((a) => a.key === p.key);
    if (pi >= 0 && pi !== ti) [list[pi], list[ti]] = [list[ti], list[pi]];
  }
  return list;
});
const solo = computed(() => ordered.value.length === 1);
const tutoPulse = computed(() => !tutoDone.value);

// ---------------------------------------------------------------- placement
const rootEl = ref(null);
const btnEls = new Map();
const posMap = ref({});
const ready = ref(false); // premier placement fait : la cascade peut démarrer
const live = ref(false); // ensuite seulement, les pilules suivent la créature en douceur
let last = null;
let raf = 0;
let live0 = 0;

function setBtn(key, el) {
  if (el) btnEls.set(key, el);
  else btnEls.delete(key);
}
const num = (v, d) => (Number.isFinite(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const estW = (a) => Math.max(86, Math.round(a.label.length * 7.4 + 42));
const widthOf = (a) => btnEls.get(a.key)?.offsetWidth || estW(a);

function sideOf(a) {
  return posMap.value[a.key]?.side || "l";
}
function slotStyle(a, i) {
  const p = posMap.value[a.key];
  const an = props.anchor || {};
  return {
    left: (p ? p.x : num(an.x, 0)) + "px",
    top: (p ? p.y : num(an.y, 0)) + "px",
    "--dx": (p ? p.dx : 0) + "px",
    "--dy": (p ? p.dy : 0) + "px",
    "--i": i,
  };
}
const haloStyle = computed(() => ({ left: num(props.anchor?.x, 0) + "px", top: num(props.anchor?.y, 0) + "px" }));

function overlaps(pts, ws, hs) {
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = Math.abs(pts[i].x - pts[j].x), dy = Math.abs(pts[i].y - pts[j].y);
      if (dx < (ws[i] + ws[j]) / 2 + 20 && dy < (hs[i] + hs[j]) / 2 + 4) return true;
    }
  }
  return false;
}

function layout() {
  const root = rootEl.value;
  if (!root) return;
  const W = root.clientWidth, H = root.clientHeight;
  if (!W) return;
  const list = ordered.value;
  const n = list.length;
  if (!n) { posMap.value = {}; return; }
  const an = props.anchor || {};
  const ax = num(an.x, W / 2), ay = num(an.y, H * 0.45), ar = num(an.r, 80);
  const top = num(an.top, ay - ar), bottom = num(an.bottom, ay + ar);
  const minTop = props.minTop;
  const zoom = num(props.zoom, 1);
  last = { ax, ay, ar, top, bottom, zoom };

  const ws = list.map(widthOf);
  const hs = list.map(() => (n === 1 ? 48 : 38));
  const yMin = (i) => minTop + hs[i] / 2;
  const yMax = (i) => Math.max(yMin(i), bottom - 20 - hs[i] / 2);
  const xClamp = (x, i, side) => (side === "l" ? clamp(x, ws[i] / 2 + 28, W - 8 - ws[i] / 2) : clamp(x, 8 + ws[i] / 2, W - 28 - ws[i] / 2));

  let pts = [];
  let sides = list.map(() => "l");
  let fan = false;

  if (n === 1) {
    pts = [{ x: xClamp(ax, 0, "l"), y: clamp(top - 18 - hs[0] / 2, yMin(0), yMax(0)) }];
  } else {
    const ang = slotAngles(n);
    const R0 = clamp(ar * 1.35 + 52, 120, 190) * Math.min(zoom, 1.3);
    for (let it = 0; it <= 3; it++) {
      const R = R0 + it * 10;
      pts = ang.map((g) => ({ x: ax + R * Math.sin((g * Math.PI) / 180), y: ay - R * Math.cos((g * Math.PI) / 180) }));
      if (!overlaps(pts, ws, hs)) break;
    }
    sides = ang.map((g) => (Math.sin((g * Math.PI) / 180) > 0.2 ? "r" : "l"));
    pts = pts.map((p, i) => {
      if (p.y < yMin(i) - 6) fan = true; // pas assez de place en haut
      return { x: xClamp(p.x, i, sides[i]), y: clamp(p.y, yMin(i), yMax(i)) };
    });
    if (!fan && overlaps(pts, ws, hs)) fan = true;
  }

  if (fan) {
    // éventail latéral : deux colonnes de part et d'autre de la créature
    const nl = Math.ceil(n / 2);
    const cols = [
      { idx: Array.from({ length: nl }, (_, k) => nl - 1 - k), side: "l" }, // de haut en bas : la pile se lit du bas vers le haut
      { idx: Array.from({ length: n - nl }, (_, k) => nl + k), side: "r" },
    ];
    const off = clamp(ar * 1.05 + 18, 70, 170); // bord intérieur des pilules au-delà du corps
    const rowH = 48;
    pts = new Array(n);
    sides = new Array(n);
    for (const col of cols) {
      const k = col.idx.length;
      if (!k) continue;
      let ys = col.idx.map((_, j) => ay + (j - (k - 1) / 2) * rowH);
      const first = ys[0], lastY = ys[k - 1];
      const lo = minTop + 19, hi = Math.max(lo, bottom - 20 - 19);
      let dy = 0;
      if (first < lo) dy = lo - first;
      else if (lastY > hi) dy = -Math.min(lastY - hi, first - lo);
      ys = ys.map((y) => y + dy);
      col.idx.forEach((i, j) => {
        const x = col.side === "l" ? ax - off - ws[i] / 2 : ax + off + ws[i] / 2;
        pts[i] = { x: xClamp(x, i, col.side), y: ys[j] };
        sides[i] = col.side;
      });
    }
  }

  const map = {};
  list.forEach((a, i) => {
    map[a.key] = { x: Math.round(pts[i].x), y: Math.round(pts[i].y), side: sides[i], dx: Math.round(ax - pts[i].x), dy: Math.round(ay - pts[i].y) };
  });
  posMap.value = map;
}

function scheduleLayout() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; layout(); });
}

// pas de recalcul sur le tick du store : seulement ouverture, redimensionnement, déplacement > 2 px, contenu qui change
watch(
  () => [props.anchor?.x, props.anchor?.y, props.anchor?.r, props.anchor?.top, props.anchor?.bottom, props.zoom],
  ([x, y, r, t, b, z]) => {
    if (!last || !ready.value) return;
    const moved = Math.abs(num(x, last.ax) - last.ax) > 2 || Math.abs(num(y, last.ay) - last.ay) > 2 || Math.abs(num(r, last.ar) - last.ar) > 2
      || Math.abs(num(t, last.top) - last.top) > 2 || Math.abs(num(b, last.bottom) - last.bottom) > 2 || Math.abs(num(z, last.zoom) - last.zoom) > 0.02;
    if (moved) scheduleLayout();
  }
);
const signature = computed(() => ordered.value.map((a) => a.key + ":" + a.label).join("|"));
watch(signature, () => { if (ready.value) nextTick(layout); }, { flush: "post" });

let ro = null;

// ---------------------------------------------------------------- fermeture et minuteries
const closing = ref(false);
let idleTimer = 0;
let closeTimer = 0;
let afterPick = false;

function requestClose() {
  if (closing.value) return;
  closing.value = true;
  clearTimeout(idleTimer);
  closeTimer = setTimeout(() => emit("close"), 150);
}
function arm(ms = 6000, force = false) {
  clearTimeout(idleTimer);
  afterPick = force;
  idleTimer = setTimeout(onIdle, ms);
}
function onIdle() {
  // une pilule en recharge se remplit sous les yeux du joueur : on attend, sauf après un choix
  if (!afterPick && ordered.value.some((a) => a.cool)) return arm(1000);
  requestClose();
}

const STAY = new Set(["calin", "chatouiller", "laver"]);
function pick(a) {
  if (closing.value) return;
  // catégorie : on ouvre ses choix ; « Retour » : on revient aux catégories
  if (a.cat) { level.value = a.cat; arm(6000); return; }
  if (a.back) { level.value = null; arm(6000); return; }
  if (a.reason) {
    press(a); // gameSay(raison) + secousse, le menu reste ouvert
    arm(6000);
    return;
  }
  press(a);
  emit("picked", a.key);
  if (STAY.has(a.key) && !store.isSleeping) arm(4000, true);
  else requestClose();
}

function onWindowPointer(e) {
  const r = rootEl.value;
  if (r && !r.contains(e.target)) requestClose();
  else arm(6000);
}
function onKey(e) {
  if (e.key === "Escape") requestClose();
}

watch(
  () => !!(gameBus.activity || activeActivity.value || gameBus.sheet || gameBus.page),
  (busy) => { if (busy) requestClose(); },
  { immediate: true }
);

onMounted(async () => {
  window.addEventListener("pointerdown", onWindowPointer, true);
  window.addEventListener("keydown", onKey);
  if (typeof ResizeObserver !== "undefined" && rootEl.value) {
    ro = new ResizeObserver(() => { if (ready.value) scheduleLayout(); });
    ro.observe(rootEl.value);
  }
  await nextTick();
  layout();
  ready.value = true;
  live0 = setTimeout(() => (live.value = true), 450);
  arm(6000);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", onWindowPointer, true);
  window.removeEventListener("keydown", onKey);
  ro?.disconnect();
  cancelAnimationFrame(raf);
  clearTimeout(idleTimer);
  clearTimeout(closeTimer);
  clearTimeout(live0);
});
</script>

<style scoped>
.ring {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none; /* le canvas reste touchable ; seules les pilules captent */
  overflow: hidden;
}

/* voile léger + halo blanc doux derrière la créature */
.veil {
  position: absolute;
  inset: 0;
  background: rgba(44, 79, 158, 0.1);
  animation: veil-in 0.2s ease-out both;
}
.ring.closing .veil { animation: veil-out 0.14s ease-in both; }
@keyframes veil-in { from { opacity: 0; } }
@keyframes veil-out { to { opacity: 0; } }
.halo {
  position: absolute;
  width: 320px;
  height: 320px;
  margin: -160px 0 0 -160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.28) 45%, rgba(255, 255, 255, 0) 70%);
  transition: left 0.12s linear, top 0.12s linear;
  animation: halo-pulse 2.4s ease-in-out infinite;
}
.ring.closing .halo { opacity: 0; transition: opacity 0.14s; }
@keyframes halo-pulse {
  0%, 100% { transform: scale(0.92); opacity: 0.85; }
  50% { transform: scale(1.06); opacity: 1; }
}

/* point d'ancrage d'une pilule (0x0) : le bouton est centré dessus */
.slot {
  position: absolute;
  width: 0;
  height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  visibility: hidden;
}
.slot.live { transition: left 0.12s linear, top 0.12s linear; }
.ring.ready .slot {
  visibility: visible;
  animation: ring-in 0.26s var(--spring-strong) calc(var(--i, 0) * 40ms) both;
}
.ring.closing .slot { animation: ring-out 0.14s ease-in both; pointer-events: none; }
@keyframes ring-in {
  0% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.4); }
  60% { opacity: 1; transform: translate(0, 0) scale(1.06); }
  100% { opacity: 1; transform: none; }
}
@keyframes ring-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.4); }
}

/* une pilule blanche, l'objet 3D déborde du côté extérieur */
.pill-btn {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 86px;
  height: 38px;
  padding: 0 14px 0 26px;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  scale: 1;
  transition: scale 0.3s var(--spring-strong);
}
.pill-btn.is-right { padding: 0 26px 0 14px; }
.pill-btn.is-primary { scale: 1.08; }
.pill-btn.is-big { min-width: 140px; height: 48px; padding: 0 18px 0 34px; }
.body {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 999px;
  background: var(--hud-pill);
  box-shadow: var(--hud-pill-shadow), inset 0 1px 0 #fff, inset 0 0 0 1px var(--hud-line);
  transition: transform 0.4s var(--spring-strong), background 0.2s, box-shadow 0.2s;
}
.lbl {
  position: relative;
  z-index: 1;
  font: 800 12.5px/1 var(--font-text);
  color: var(--hud-ink);
  white-space: nowrap;
}
.is-big .lbl { font-size: 14px; }
.obj {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin-top: -18px;
  pointer-events: none;
  transition: transform 0.45s var(--spring-strong);
}
.is-left .obj, .pill-btn:not(.is-right) .obj { left: -16px; }
.is-right .obj { right: -16px; }
.is-big .obj { width: 44px; height: 44px; margin-top: -22px; left: -20px; }
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
.ic { width: 34px; height: 34px; color: var(--c2); filter: drop-shadow(0 0 2px #fff) drop-shadow(0 2px 2px rgba(30, 55, 100, 0.25)); }
.ic :deep([opacity]) { opacity: 1; color: var(--c1); }

.pill-btn:active .body { transform: scale(0.94); transition-duration: 0.08s; }
.pill-btn:active .obj { transform: scale(1.15) rotate(-8deg); transition-duration: 0.1s; }
@media (hover: hover) {
  .pill-btn:hover .body { background: linear-gradient(180deg, #fff, #eef5ff 60%, #dde9f7); }
  .pill-btn:hover .obj { transform: translateY(-2px) rotate(-5deg); }
}

/* recharge : la pilule se remplit de bleu clair, en continu */
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

/* conseillée : liseré bleu ciel, sans pulsation lourde */
.pill-btn.is-best .body { box-shadow: 0 0 0 2.5px var(--sky-hi), var(--hud-pill-shadow), inset 0 1px 0 #fff; }
/* envie de la créature : fond rose, liseré rose, point */
.pill-btn.is-wanted .body {
  background: #fff5f8;
  box-shadow: 0 0 0 2.5px #ff9ab8, 0 4px 10px rgba(255, 79, 134, 0.22), inset 0 1px 0 #fff;
}
.is-wanted .lbl { color: var(--love-ink); }
.dot { position: absolute; z-index: 3; top: 1px; right: 8px; width: 12px; height: 12px; border-radius: 50%; background: var(--love); box-shadow: 0 0 0 2px #fff; }
.is-right .dot { right: auto; left: 8px; }
.pill-btn.is-glow .body { box-shadow: 0 0 0 2.5px #ffc21a, 0 0 12px rgba(255, 194, 26, 0.6), inset 0 1px 0 #fff; }
/* tutoriel : la seule pilule pulse pour appeler le premier toucher */
.pill-btn.is-pulse { animation: ring-pulse 1.1s ease-in-out infinite; }
@keyframes ring-pulse { 50% { transform: scale(1.07); } }

/* indisponible : fond gris-bleu, texte pâle, objet grisé */
.pill-btn.is-off .body { background: #eef3f8; }
.is-off .lbl { color: var(--hud-ink-2); }
.is-off .obj { filter: grayscale(0.7) opacity(0.7); }

/* petits « +N » qui montent depuis la pilule */
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
.pill-btn.is-wiggle { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-5deg); }
  40% { transform: rotate(4deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(2deg); }
}

/* mouvement réduit : simple fondu */
@media (prefers-reduced-motion: reduce) {
  .ring.ready .slot { animation: ring-fade 0.12s linear both; }
  .ring.closing .slot { animation: ring-fade-out 0.12s linear both; }
  .halo, .pill-btn.is-pulse, .pill-btn.is-wiggle, .veil { animation: none; }
  .slot.live, .pill-btn, .body, .obj, .halo { transition: none; }
  @keyframes ring-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ring-fade-out { to { opacity: 0; } }
}
</style>
