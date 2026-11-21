<template>
  <nav ref="nav" class="nav" aria-label="Navigation">
    <!-- fond en relief : la forme (coins + bosse) est dessinée, l'ombre suit la bosse -->
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

    <!-- bouton principal : la bulle 3D de l'onglet actif, logée dans la bosse -->
    <span v-if="activeItem && size.w" class="orb-track" :style="orbStyle" aria-hidden="true" @click="activeItem.run()">
      <span :key="activeItem.key" class="orb">
        <Icon :name="activeItem.icon" class="orb-ic" />
        <span v-if="activeItem.badge" class="badge" />
      </span>
    </span>

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
import { navOrb } from "~/composables/useNavOrb";
import { useInventoryStore } from "~/stores/useInventoryStore";

// 5 destinations au plus : Maison, Sac, Boutique, Cuisine, Elle (Jours et Album s'ouvrent depuis Elle)
const { store } = useCreatureMood();
const inv = useInventoryStore();
const pages = computed(() => store.unlockedPages || ["maison", "elle"]);
const has = (k) => !!store.features?.[k];

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

// ---- barre en relief : une bosse lisse sous l'onglet actif, qui glisse (ressort) d'un onglet à l'autre ----
const BUMP_H = 24; // hauteur de la bosse au-dessus de la barre
const BUMP_W = 44; // demi-largeur caractéristique de la bosse
const RADIUS = 0; // barre droite, sans coins arrondis
const nav = ref(null);
const btns = ref([]);
const size = ref({ w: 0, h: 0 });
const centers = ref({});
const x = ref(0); // centre courant de la bosse (animé)
const speed = ref(0);
let v = 0;
let raf = 0;
let last = 0;
let ready = false;

const activeItem = computed(() => items.value.find((t) => t.key === active.value) || items.value[0]);
const target = computed(() => centers.value[activeItem.value?.key] ?? size.value.w / 2);

function measure() {
  const el = nav.value;
  if (!el) return;
  size.value = { w: el.clientWidth, h: el.clientHeight };
  const r = el.getBoundingClientRect();
  navBox.value = { left: r.left, top: r.top };
  const c = {};
  for (const b of btns.value) if (b) c[b.dataset.key] = b.offsetLeft + b.offsetWidth / 2;
  centers.value = c;
  if (!ready && size.value.w) {
    ready = true;
    x.value = target.value;
  }
}

const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function step(t) {
  const dt = Math.min(0.032, (t - (last || t)) / 1000) || 0.016;
  last = t;
  const d = target.value - x.value;
  v += (d * 320 - v * 24) * dt; // ressort un peu rebondissant
  x.value += v * dt;
  speed.value = v;
  if (Math.abs(d) < 0.3 && Math.abs(v) < 4) {
    x.value = target.value;
    speed.value = v = 0;
    raf = 0;
    last = 0;
    return;
  }
  raf = requestAnimationFrame(step);
}
watch(target, () => {
  if (!ready) return;
  if (reduced) { x.value = target.value; return; }
  if (!raf) raf = requestAnimationFrame(step);
});

// le bord haut = coins arrondis + bosse en cloche (qui s'aplatit et s'étire avec la vitesse)
const bump = computed(() => {
  const s = Math.min(Math.abs(speed.value) / 1800, 0.4);
  return { cx: x.value, bh: BUMP_H * (1 - s * 0.55), bw: BUMP_W * (1 + s * 0.6) };
});
// on publie la forme de la bosse (coordonnées écran) pour que le panneau des jauges l'épouse
const navBox = ref({ left: 0, top: 0 });
watchEffect(() => {
  const b = bump.value;
  navOrb.on = !!size.value.w;
  navOrb.x = navBox.value.left + b.cx;
  navOrb.top = navBox.value.top;
  navOrb.bh = b.bh;
  navOrb.bw = b.bw;
});
const path = computed(() => {
  const { w, h } = size.value;
  if (!w) return "";
  const top = BUMP_H;
  const total = top + h;
  const { cx, bh, bw } = bump.value;
  const pts = [];
  for (let px = 0; px <= w; px += 2) {
    const xx = Math.min(px, w);
    let y = top;
    if (RADIUS && xx < RADIUS) y += RADIUS - Math.sqrt(RADIUS * RADIUS - (RADIUS - xx) ** 2);
    else if (RADIUS && xx > w - RADIUS) y += RADIUS - Math.sqrt(RADIUS * RADIUS - (xx - (w - RADIUS)) ** 2);
    const t = (xx - cx) / bw;
    y -= bh * Math.exp(-t * t * 1.15);
    pts.push(`${xx.toFixed(1)},${y.toFixed(1)}`);
  }
  if (w % 2) pts.push(`${w},${top + RADIUS}`);
  return `M0,${total} L${pts.join(" L")} L${w},${total} Z`;
});

const orbStyle = computed(() => ({ transform: `translateX(${x.value}px) translateX(-50%)` }));

let ro;
onMounted(() => {
  measure();
  ro = new ResizeObserver(measure);
  ro.observe(nav.value);
  window.addEventListener("resize", measure);
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
/* barre en relief arrondie ; l'onglet actif monte dans une bulle 3D logée dans une bosse qui glisse */
.nav {
  --orb: 54px;
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
  top: -24px; /* = BUMP_H */
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 -3px 6px rgba(30, 55, 100, 0.08)) drop-shadow(0 -10px 22px rgba(30, 55, 100, 0.12));
}
.orb-track {
  position: absolute;
  z-index: 2;
  left: 0;
  top: -19px;
  width: var(--orb);
  height: var(--orb);
  cursor: pointer;
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
}
.orb {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  color: #fff;
  background:
    radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.55), transparent 42%),
    linear-gradient(160deg, #6cc3ff 0%, #2f95e8 48%, #1d6fd0 100%);
  box-shadow:
    inset 0 -5px 10px rgba(10, 50, 130, 0.35),
    inset 0 3px 4px rgba(255, 255, 255, 0.45),
    0 8px 16px rgba(29, 111, 208, 0.38),
    0 2px 4px rgba(29, 111, 208, 0.3);
  animation: orb-in 0.55s var(--spring-strong);
}
/* reflet en arc sur le haut de la bulle */
.orb::before {
  content: "";
  position: absolute;
  top: 5px;
  left: 12px;
  right: 12px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
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
.orb .badge { top: 2px; right: 2px; box-shadow: 0 0 0 2px #fff; }
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
/* l'onglet actif : son icône est partie dans la bulle, son libellé descend un peu et prend la couleur */
.item.on { color: #1f73c2; }
.item.on .icwrap { opacity: 0; transform: translateY(-14px) scale(0.6); }
.item.on .label { transform: translateY(4px); }
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
@media (prefers-reduced-motion: reduce) {
  .item, .badge, .orb, .orb-ic { animation: none; }
  .item, .ic, .icwrap, .label { transition: none; }
}
</style>
