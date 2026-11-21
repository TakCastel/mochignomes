<template>
  <nav ref="nav" class="nav" aria-label="Navigation">
    <!-- fond en relief : la barre droite et son onglet (bouton actif + humeur), l'ombre suit l'onglet -->
    <svg class="shape" :width="size.w" :height="size.h + BUMP_H" :viewBox="`0 0 ${size.w} ${size.h + BUMP_H}`" aria-hidden="true">
      <defs>
        <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--surface, #ffffff)" />
          <stop offset="0.55" style="stop-color: var(--surface, #f7faff)" />
          <stop offset="1" style="stop-color: var(--panel-bottom, #e9f0fa)" />
        </linearGradient>
      </defs>
      <path :d="path" fill="url(#navFill)" stroke="#dbe5f2" stroke-width="1" />
    </svg>

    <!-- bouton principal : le pavé 3D de l'onglet actif, logé dans l'onglet -->
    <span v-if="activeItem && size.w" class="orb-track" :style="orbStyle" aria-hidden="true" @click="activeItem.run()">
      <span :key="activeItem.key" class="orb">
        <Icon :name="activeItem.icon" class="orb-ic" />
        <span v-if="activeItem.badge" class="badge" />
      </span>
    </span>

    <!-- l'humeur, à l'accueil seulement, calée dans l'onglet à côté du bouton -->
    <Transition name="side">
      <span v-if="size.w && showMood" :key="side" ref="moodEl" class="mood" :style="moodStyle" aria-live="polite">
        <span class="mood-dot" :style="{ '--d': moodInfo[1] }" />
        <span :key="moodInfo[0]" class="mood-v">{{ moodInfo[0] }}</span>
      </span>
    </Transition>

    <button
      v-for="t in items"
      :key="t.key"
      ref="btns"
      :data-key="t.key"
      class="item"
      :class="{ on: active === t.key }"
      :aria-current="active === t.key ? 'page' : undefined"
      @click="t.run"
    >
      <span class="icwrap">
        <Icon :name="t.icon" class="ic" />
        <span v-if="t.badge" class="badge" />
      </span>
      <span class="label">{{ t.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from "vue";
import { navOrb, tabHeight } from "~/composables/useNavOrb";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { MOOD_LABELS } from "~/lib/creatureLook";

// 5 destinations au plus : Maison, Sac, Boutique, Cuisine, Elle (Jours et Album s'ouvrent depuis Elle)
const { store, mood } = useCreatureMood();
const inv = useInventoryStore();
const pages = computed(() => store.unlockedPages || ["maison", "elle"]);
const has = (k) => !!store.features?.[k];
const moodInfo = computed(() => MOOD_LABELS[mood.value] || ["Sereine", "#4fc3a1"]);

const active = computed(() => {
  if (gameBus.sheet === "cuisine") return "cuisine";
  const p = gameBus.page;
  if (!p) return "maison";
  if (p === "jours" || p === "album") return "elle";
  return p;
});

// Pastille : UNE seule à la fois dans la barre, pour la chose la plus utile à faire
// (récompense à prendre > nouveau vêtement ou set complet > coffre gratuit). Une envie de plat
// se voit déjà dans sa bulle et sur la tuile Manger : pas de pastille en plus.
// Seulement pour ce qui est réellement à faire, jamais pour une nouveauté pas encore découverte.
const questReady = computed(() =>
  pages.value.includes("jours") && (
    (has("defis") && (store.quests?.list || []).some((q) => q.progress >= q.target && !q.claimed))
    || store.pendingBonus > 0 || !!store.questBonusReady
  ));
const sacBadge = computed(() => has("sac") && (inv.unseenCount > 0 || (has("collection") && inv.setsReady.length > 0)));
const shopBadge = computed(() => has("boutique") && !!inv.chestReady);
const badgeKey = computed(() =>
  (questReady.value && "elle") || (sacBadge.value && "sac") || (shopBadge.value && "boutique") || "");

function goHome() {
  closePage();
  closeSheet();
}

const ALL = [
  { key: "maison", label: "Maison", icon: "solar:home-2-bold-duotone", run: goHome },
  { key: "sac", label: "Sac", icon: "solar:bag-4-bold-duotone", feature: "sac", run: () => openPage("sac") },
  { key: "boutique", label: "Boutique", icon: "solar:shop-bold-duotone", feature: "boutique", run: () => openPage("boutique") },
  { key: "cuisine", label: "Cuisine", icon: "solar:chef-hat-bold-duotone", feature: "cuisine", run: () => openKitchen() },
  { key: "elle", label: "Elle", icon: "solar:heart-bold-duotone", run: () => openPage("elle") },
];
// les entrées pas encore débloquées n'apparaissent pas
const items = computed(() =>
  ALL.filter((t) => !t.feature || has(t.feature)).map((t) => ({ ...t, badge: badgeKey.value === t.key })));

// ---- barre droite à onglet : l'onglet (bouton actif + humeur) glisse d'une entrée à l'autre,
// s'élargit selon l'humeur et change de côté en douceur (ressorts sur sa position et ses deux bords) ----
const BUMP_H = 28; // hauteur de l'onglet au-dessus de la barre
const SLOPE = 14; // largeur d'un flanc (petit = flanc plus droit)
const ORB = 54; // côté du pavé
const PAD = 6; // marge entre le pavé et le flanc
const MOOD_GAP = 7; // entre le pavé et l'humeur
const MOOD_END = 10; // après l'humeur, avant le flanc
const nav = ref(null);
const btns = ref([]);
const moodEl = ref(null);
const size = ref({ w: 0, h: 0 });
const centers = ref({});
const moodW = ref(0);
const navBox = ref({ left: 0, top: 0 });
// valeurs animées : centre du pavé, étendues gauche et droite de l'onglet
const cur = ref({ x: 0, l: 0, r: 0 });
const speed = ref(0);
const vel = { x: 0, l: 0, r: 0 };
let raf = 0;
let last = 0;
let ready = false;

const activeItem = computed(() => items.value.find((t) => t.key === active.value) || items.value[0]);
const targetX = computed(() => centers.value[activeItem.value?.key] ?? size.value.w / 2);
const near = ORB / 2 + PAD + SLOPE; // côté sans humeur
// l'humeur ne s'affiche qu'à l'accueil ; ailleurs l'onglet se resserre autour du seul bouton
const showMood = computed(() => active.value === "maison");
const moodFar = computed(() => ORB / 2 + MOOD_GAP + moodW.value + MOOD_END + SLOPE);
const far = computed(() => (showMood.value ? moodFar.value : near)); // côté de l'humeur
// l'humeur va à droite du bouton, sauf si elle déborderait de l'écran
const side = computed(() => (targetX.value + moodFar.value > size.value.w - 4 ? "left" : "right"));
const target = computed(() => ({
  x: targetX.value,
  l: side.value === "left" ? far.value : near,
  r: side.value === "left" ? near : far.value,
}));

function measureMood() {
  const el = moodEl.value;
  if (el) moodW.value = el.offsetWidth;
}
function measure() {
  const el = nav.value;
  if (!el) return;
  size.value = { w: el.clientWidth, h: el.clientHeight };
  const r = el.getBoundingClientRect();
  navBox.value = { left: r.left, top: r.top };
  const c = {};
  for (const b of btns.value) if (b) c[b.dataset.key] = b.offsetLeft + b.offsetWidth / 2;
  centers.value = c;
  measureMood();
  if (!ready && size.value.w) {
    ready = true;
    cur.value = { ...target.value };
  }
}

const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function step(t) {
  const dt = Math.min(0.032, (t - (last || t)) / 1000) || 0.016;
  last = t;
  const T = target.value;
  const next = { ...cur.value };
  let settled = true;
  for (const k of ["x", "l", "r"]) {
    const d = T[k] - next[k];
    vel[k] += (d * 320 - vel[k] * 24) * dt; // ressort un peu rebondissant
    next[k] += vel[k] * dt;
    if (Math.abs(d) >= 0.3 || Math.abs(vel[k]) >= 4) settled = false;
  }
  if (settled) {
    cur.value = { ...T };
    speed.value = vel.x = vel.l = vel.r = 0;
    raf = 0;
    last = 0;
    return;
  }
  cur.value = next;
  speed.value = vel.x;
  raf = requestAnimationFrame(step);
}
watch(target, () => {
  if (!ready) return;
  if (reduced) { cur.value = { ...target.value }; return; }
  if (!raf) raf = requestAnimationFrame(step);
});

// l'onglet s'aplatit un peu quand il file
const bump = computed(() => {
  const s = Math.min(Math.abs(speed.value) / 1800, 0.4);
  return { cx: cur.value.x, bh: BUMP_H * (1 - s * 0.35), l: cur.value.l, r: cur.value.r };
});
// on publie la forme de l'onglet (coordonnées écran) pour que le panneau des jauges l'épouse
watchEffect(() => {
  const b = bump.value;
  navOrb.on = !!size.value.w;
  navOrb.x = navBox.value.left + b.cx;
  navOrb.top = navBox.value.top;
  navOrb.bh = b.bh;
  navOrb.l = b.l;
  navOrb.r = b.r;
  navOrb.s = SLOPE;
});
const path = computed(() => {
  const { w, h } = size.value;
  if (!w) return "";
  const top = BUMP_H;
  const total = top + h;
  const { cx, bh, l, r } = bump.value;
  const pts = [];
  for (let px = 0; px <= w; px += 1) pts.push(`${px},${(top - tabHeight(px, cx, l, r, bh, SLOPE)).toFixed(1)}`);
  return `M0,${total} L${pts.join(" L")} L${w},${total} Z`;
});

const orbStyle = computed(() => ({ transform: `translateX(${cur.value.x}px) translateX(-50%)` }));
// l'humeur suit le pavé, du côté choisi, et descend avec l'onglet quand il s'aplatit
const moodStyle = computed(() => {
  const x = side.value === "left"
    ? cur.value.x - ORB / 2 - MOOD_GAP - moodW.value
    : cur.value.x + ORB / 2 + MOOD_GAP;
  return { transform: `translate(${x.toFixed(1)}px, ${(BUMP_H - bump.value.bh).toFixed(1)}px)` };
});
watch(() => moodInfo.value[0], () => nextTick(measureMood));
watch([side, showMood], () => nextTick(measureMood));

let ro;
onMounted(() => {
  measure();
  ro = new ResizeObserver(measure);
  ro.observe(nav.value);
  window.addEventListener("resize", measure);
  // la police du titre peut arriver après le montage : on remesure l'humeur
  document.fonts?.ready.then(() => measureMood());
});
// un onglet qui se débloque décale les autres
watch(() => items.value.map((t) => t.key).join(), () => nextTick(measure));
onBeforeUnmount(() => {
  ro?.disconnect();
  window.removeEventListener("resize", measure);
  navOrb.on = false;
  cancelAnimationFrame(raf);
});
</script>

<style scoped>
/* barre droite ; l'onglet actif monte dans un pavé 3D logé dans un onglet qui glisse, avec l'humeur */
.nav {
  --orb: 54px; /* = ORB */
  --tab: 28px; /* = BUMP_H */
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  height: var(--nav-h, 64px);
  box-sizing: content-box;
  padding: 0 10px env(safe-area-inset-bottom, 0px);
}
.shape {
  position: absolute;
  left: 0;
  top: calc(-1 * var(--tab));
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 -3px 6px rgba(30, 55, 100, 0.08)) drop-shadow(0 -10px 22px rgba(30, 55, 100, 0.12));
}
.orb-track {
  position: absolute;
  z-index: 2;
  left: 0;
  top: calc(6px - var(--tab));
  width: var(--orb);
  height: var(--orb);
  cursor: pointer;
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
}
/* pavé à coins doux, plus droit qu'une bulle */
.orb {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  color: #fff;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.45), transparent 45%),
    linear-gradient(160deg, #6cc3ff 0%, #2f95e8 48%, #1d6fd0 100%);
  box-shadow:
    inset 0 -5px 8px rgba(10, 50, 130, 0.32),
    inset 0 2px 3px rgba(255, 255, 255, 0.45),
    0 6px 14px rgba(29, 111, 208, 0.36),
    0 2px 4px rgba(29, 111, 208, 0.3);
  animation: orb-in 0.55s var(--spring-strong);
}
/* reflet sur le haut du pavé */
.orb::before {
  content: "";
  position: absolute;
  top: 4px;
  left: 7px;
  right: 7px;
  height: 14px;
  border-radius: 9px 9px 4px 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
  pointer-events: none;
}
.orb-ic {
  position: relative;
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 2px 2px rgba(10, 50, 130, 0.35));
  animation: ic-in 0.5s var(--spring-strong);
}
.orb-track:active .orb { transform: scale(0.92); transition: transform 0.08s; }
.orb .badge { top: 3px; right: 3px; box-shadow: 0 0 0 2px #fff; }
/* l'humeur posée sur l'onglet : pastille de couleur + mot, sans fond à elle */
.mood {
  position: absolute;
  z-index: 2;
  left: 0;
  top: calc(-1 * var(--tab));
  height: var(--tab);
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform;
}
.mood-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 4px;
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.55), var(--d) 65%);
  background-color: var(--d);
  box-shadow: 0 1px 2px rgba(40, 60, 90, 0.3);
  transition: background-color 0.4s;
}
.mood-v {
  font: 700 14px/1 var(--font-title);
  color: var(--hud-ink);
  animation: mood-in 0.4s var(--spring-strong);
}
.side-enter-active, .side-leave-active { transition: opacity 0.18s; }
.side-enter-from, .side-leave-to { opacity: 0; }
.item {
  position: relative;
  z-index: 1;
  flex: 1;
  max-width: 120px;
  min-width: 60px;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--hud-ink-2);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: pop 0.45s var(--spring-strong) backwards;
  transition: transform 0.4s var(--spring-strong), color 0.2s;
}
.item:nth-child(4) { animation-delay: 0.04s; }
.item:nth-child(5) { animation-delay: 0.08s; }
.item:nth-child(6) { animation-delay: 0.12s; }
.item:nth-child(7) { animation-delay: 0.16s; }
.item:nth-child(8) { animation-delay: 0.2s; }
.item:active { transform: scale(0.9); transition-duration: 0.08s; }
.icwrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 34px;
  transition: opacity 0.2s, transform 0.45s var(--spring-strong);
}
.ic {
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 2px 1.5px rgba(30, 55, 100, 0.18));
  transition: transform 0.45s var(--spring-strong);
}
.label { font: 800 12px/1 var(--font-text); transition: transform 0.45s var(--spring-strong); }
@media (hover: hover) { .item:not(.on):hover .ic { transform: translateY(-2px); } }
/* l'onglet actif : son icône est partie dans le pavé, son libellé descend un peu et prend la couleur */
.item.on { color: #1f73c2; }
.item.on .icwrap { opacity: 0; transform: translateY(-14px) scale(0.6); }
.item.on .label { transform: translateY(6px); }
.badge {
  position: absolute;
  top: 0;
  right: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dot, #ff3b3b);
  box-shadow: 0 0 0 2px #fff;
  animation: badge 0.9s ease-in-out 3;
}
@keyframes badge { 50% { transform: scale(1.35); } }
@keyframes pop { from { transform: scale(0.4); opacity: 0; } }
@keyframes orb-in { 0% { transform: scale(0.7); } 60% { transform: scale(1.08, 0.94); } }
@keyframes ic-in { from { transform: translateY(10px) scale(0.5); opacity: 0; } }
@keyframes mood-in { from { transform: translateY(6px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .item, .badge, .orb, .orb-ic, .mood-v { animation: none; }
  .item, .ic, .icwrap, .label, .mood-dot { transition: none; }
  .side-enter-active, .side-leave-active { transition: none; }
}
</style>
