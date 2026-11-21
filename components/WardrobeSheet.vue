<template>
  <!-- Barre étroite (volet latéral du Sac) : on descend emplacement > vêtement > couleur,
       une flèche remonte d'un cran. Elle se voit en grand à gauche. -->
  <div v-if="compact" class="rail-wrap">
    <!-- changement de sous-menu : on glisse vers la droite en descendant, vers la gauche en remontant -->
    <Transition :name="`rail-${railDir}`" mode="out-in">
    <div :key="level" class="rail">
    <!-- 1. les emplacements -->
    <template v-if="level === 'slots'">
      <button
        v-for="s in SLOTS"
        :key="s"
        class="r-btn"
        :class="{ worn: !!inv.outfit[s] }"
        :aria-label="SLOT_LABELS[s]"
        @click="openSlot(s)"
      >
        <span class="r-badge" :style="slotSwatch(s)">
          <Icon :name="SLOT_ICONS[s]" class="r-ic" />
          <span v-if="slotHasNew(s)" class="ui-dot r-dot" />
        </span>
        <span class="r-lbl">{{ SLOT_LABELS[s] }}</span>
      </button>
      <span v-if="ownedCount >= 3 || collection" class="r-sep" />
      <button v-if="ownedCount >= 3" class="r-btn" aria-label="Tenue au hasard" @click="shuffle">
        <span class="r-badge r-soft"><Icon name="solar:magic-stick-3-bold-duotone" class="r-ic violet" /></span>
        <span class="r-lbl">Hasard</span>
      </button>
      <button v-if="collection" class="r-btn" aria-label="Collection" @click="emit('collection')">
        <span class="r-badge r-soft">
          <Icon name="solar:album-bold-duotone" class="r-ic accent" />
          <span v-if="inv.setsReady.length" class="ui-badge r-count">{{ inv.setsReady.length }}</span>
        </span>
        <span class="r-lbl">Collection</span>
      </button>
    </template>

    <!-- 2. les vêtements de l'emplacement -->
    <template v-else-if="level === 'items'">
      <button class="r-back" :aria-label="`Retour aux emplacements (${SLOT_LABELS[slot]})`" @click="level = 'slots'">
        <Icon name="solar:alt-arrow-left-bold" class="r-back-ic" />
        <Icon :name="SLOT_ICONS[slot]" class="r-back-slot" />
      </button>
      <button
        v-for="it in items"
        :key="it.id"
        class="r-btn"
        :class="{ on: wornId === it.id }"
        :aria-label="it.label"
        @click="openItem(it)"
      >
        <span class="r-badge" :style="swatchStyle(cardColor(it))">
          <Icon :name="SLOT_ICONS[it.slot]" class="r-ic white" />
          <span v-if="inv.isNew(it.id)" class="ui-dot r-dot" />
          <span v-if="wornId === it.id" class="r-check"><Icon name="ph:check-bold" class="r-check-ic" /></span>
        </span>
        <span class="r-lbl">{{ it.label }}</span>
      </button>
      <p v-if="!items.length" class="r-empty">Rien ici</p>
      <span v-if="wornId || hasShop" class="r-sep" />
      <button v-if="wornId" class="r-btn" aria-label="Retirer" @click="takeOff">
        <span class="r-badge r-soft"><Icon name="solar:close-circle-bold" class="r-ic" /></span>
        <span class="r-lbl">Retirer</span>
      </button>
      <button v-if="hasShop" class="r-btn" :aria-label="`Acheter : rayon ${SLOT_LABELS[slot]} de la Boutique`" @click="emit('shop', null, slot)">
        <span class="r-badge r-shop"><Icon name="solar:cart-large-2-bold" class="r-ic white" /></span>
        <span class="r-lbl r-lbl-shop">Acheter</span>
      </button>
    </template>

    <!-- 3. les couleurs du vêtement -->
    <template v-else-if="selItem">
      <button class="r-back" :aria-label="`Retour aux vêtements (${selItem.label})`" @click="level = 'items'">
        <Icon name="solar:alt-arrow-left-bold" class="r-back-ic" />
        <Icon :name="SLOT_ICONS[selItem.slot]" class="r-back-slot" />
      </button>
      <span class="r-title">{{ selItem.label }}</span>
      <button
        v-for="c in ownedOf(selItem.id)"
        :key="c"
        class="ui-swatch r-sw"
        :class="{ 'is-on': wornId === selItem.id && wornColor === c }"
        :aria-label="COLORS[c]?.label"
        :title="COLORS[c]?.label"
        :style="swatchStyle(c)"
        @click="wear(selItem, c)"
      >
        <span v-if="inv.isNew(selItem.id, c)" class="ui-dot new-dot" />
        <Icon v-else-if="lovedColor(c)" name="solar:heart-bold-duotone" class="ui-swatch-mark is-tl" />
      </button>
      <span v-if="wornId === selItem.id || (hasShop && missingColors(selItem) > 0)" class="r-sep" />
      <button v-if="wornId === selItem.id" class="r-btn" aria-label="Retirer" @click="takeOff">
        <span class="r-badge r-soft"><Icon name="solar:close-circle-bold" class="r-ic" /></span>
        <span class="r-lbl">Retirer</span>
      </button>
      <button v-if="hasShop && missingColors(selItem) > 0" class="r-btn" :aria-label="`${missingColors(selItem)} autres couleurs en Boutique`" @click="emit('shop', selItem.id)">
        <span class="r-badge r-shop">
          <Icon name="solar:palette-bold" class="r-ic white" />
          <span class="ui-badge r-count">+{{ missingColors(selItem) }}</span>
        </span>
        <span class="r-lbl r-lbl-shop">Couleurs</span>
      </button>
    </template>
    </div>
    </Transition>
  </div>

  <!-- Garde-robe : onglet « Tenues » du Sac. Tout se porte tout de suite, c'est gratuit. -->
  <div v-else class="ui-stack wardrobe">
    <div v-if="store.features?.collection || ownedCount >= 3" class="top">
      <!-- le compte de la collection n'apparaît qu'avec la Collection -->
      <div v-if="store.features?.collection" class="count">
        <Icon name="solar:hanger-bold-duotone" class="count-ic" />
        <div>
          <b class="ui-num">{{ inv.collected }}</b><span> / {{ inv.totalVariants }}</span>
          <small class="ui-caption">coloris dans ta collection</small>
        </div>
      </div>
      <button v-if="ownedCount >= 3" class="ui-chip shuffle" @click="shuffle">
        <Icon name="solar:magic-stick-3-bold-duotone" class="ic" />
        Au hasard
      </button>
    </div>

    <!-- emplacements -->
    <div class="slots" role="tablist" aria-label="Emplacements">
      <button
        v-for="s in SLOTS"
        :key="s"
        class="ui-tile slot"
        role="tab"
        :aria-selected="slot === s"
        :class="{ 'is-on': slot === s, worn: !!inv.outfit[s] }"
        @click="pickSlot(s)"
      >
        <span v-if="slotHasNew(s)" class="ui-dot" />
        <span class="slot-badge" :style="slotSwatch(s)">
          <Icon :name="SLOT_ICONS[s]" class="slot-ic" />
        </span>
        <span class="ui-tile-label slot-lbl">{{ SLOT_LABELS[s] }}</span>
      </button>
    </div>

    <!-- objets possédés pour cet emplacement -->
    <div v-if="items.length" class="grid">
      <button
        v-for="it in items"
        :key="it.id"
        class="ui-tile card"
        :class="{ 'is-on': wornId === it.id, sel: selId === it.id && wornId !== it.id }"
        @click="pickItem(it)"
      >
        <span v-if="inv.isNew(it.id)" class="ui-tag ui-tag--love ui-tag--solid ui-tag--corner">Nouveau</span>
        <Icon v-else-if="lovedItem(it.id)" name="solar:heart-bold-duotone" class="heart" />
        <span class="swatch big" :style="swatchStyle(cardColor(it))">
          <Icon :name="SLOT_ICONS[it.slot]" class="card-ic" />
        </span>
        <span class="ui-tile-label">{{ it.label }}</span>
        <span class="ui-tile-sub">{{ ownedOf(it.id).length }} / {{ itemColors(it).length }} coloris</span>
        <Icon v-if="wornId === it.id" name="solar:check-circle-bold" class="worn-ic" />
      </button>
    </div>
    <div v-else class="ui-empty">
      <Icon :name="SLOT_ICONS[slot]" class="ic" />
      <p>Rien à mettre ici pour l'instant.</p>
      <button v-if="hasShop" class="ui-btn ui-btn--soft ui-btn--sm" @click="emit('shop', null, slot)">
        <Icon name="solar:shop-bold-duotone" class="ic" />Voir la Boutique
      </button>
    </div>

    <!-- couleurs de l'objet choisi -->
    <div v-if="selItem" class="ui-card">
      <div class="ui-section-head">
        <h3 class="ui-section-title"><Icon name="solar:palette-bold-duotone" class="ic" />{{ selItem.label }}</h3>
        <button v-if="wornId === selItem.id" class="ui-btn ui-btn--secondary ui-btn--sm" @click="takeOff">
          <Icon name="solar:close-circle-bold" class="ic" />Retirer
        </button>
      </div>
      <div class="colors">
        <button
          v-for="c in ownedOf(selItem.id)"
          :key="c"
          class="ui-swatch"
          :class="{ 'is-on': wornId === selItem.id && wornColor === c }"
          :aria-label="COLORS[c]?.label"
          :title="COLORS[c]?.label"
          :style="swatchStyle(c)"
          @click="wear(selItem, c)"
        >
          <span v-if="inv.isNew(selItem.id, c)" class="ui-dot new-dot" />
          <Icon v-else-if="lovedColor(c)" name="solar:heart-bold-duotone" class="ui-swatch-mark is-tl" />
        </button>
        <button v-if="hasShop && missingColors(selItem) > 0" class="ui-chip more" @click="emit('shop', selItem.id)">
          <Icon name="solar:shop-bold-duotone" class="ic" />
          Plus de couleurs
          <span class="ui-tag ui-tag--accent">+{{ missingColors(selItem) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { gameCommand, gameSay } from "~/composables/useCreatureMood";
import { COLORS, SLOTS, SLOT_LABELS, SLOT_ICONS, V1_ITEMS, itemById, itemColors } from "~/lib/catalog";

// 'shop' : ouvrir la Boutique (itemId = l'objet dont on veut d'autres couleurs, ou null ; slot = rayon à ouvrir)
// 'collection' : ouvrir la Collection (depuis la barre étroite)
const emit = defineEmits(["shop", "collection"]);
const props = defineProps({
  // emplacement ouvert au départ (ex. depuis une envie de tenue)
  initialSlot: { type: String, default: "" },
  // vêtement à mettre en avant (id) : ouvre son emplacement et le sélectionne
  focus: { type: String, default: "" },
  // barre verticale étroite (volet latéral) au lieu de la grille
  compact: { type: Boolean, default: false },
  // la Collection est débloquée : bouton dans la barre étroite
  collection: { type: Boolean, default: false },
});

const inv = useInventoryStore();
const store = useTamagotchiStore();

const MOOD_ICON = {
  love: "solar:heart-bold-duotone",
  like: "solar:emoji-funny-circle-bold-duotone",
  meh: "solar:chat-round-dots-bold-duotone",
  dislike: "solar:chat-round-dots-bold-duotone",
};
const MOOD_RANK = { love: 3, dislike: 2, like: 1, meh: 0 };

const focusSlot = () => {
  const it = props.focus ? itemById(props.focus) : null;
  return it && inv.ownsItem(it.id) ? it.slot : "";
};
const firstSlot = () => {
  if (focusSlot()) return focusSlot();
  if (SLOTS.includes(props.initialSlot)) return props.initialSlot;
  return SLOTS.find((s) => mine(s).length) || "tete";
};
const mine = (s) => V1_ITEMS.filter((i) => i.slot === s && inv.ownsItem(i.id));

const slot = ref(firstSlot());
const selId = ref(focusSlot() ? props.focus : inv.outfit[slot.value]?.id || null);
const said = ref(null);
let saidTimer = null;
// barre étroite : niveau de sous-menu (un vêtement mis en avant ouvre directement ses couleurs)
const level = ref(focusSlot() ? "colors" : "slots");
// sens de l'animation entre sous-menus (lu au rendu : le watch « pre » passe avant)
const LEVEL_DEPTH = { slots: 0, items: 1, colors: 2 };
const railDir = ref("in");
watch(level, (n, o) => { railDir.value = LEVEL_DEPTH[n] >= LEVEL_DEPTH[o] ? "in" : "out"; });

const hasShop = computed(() => !!store.features?.boutique);
const ownedCount = computed(() => V1_ITEMS.filter((i) => inv.ownsItem(i.id)).length);
const items = computed(() => mine(slot.value));
const wornId = computed(() => inv.outfit[slot.value]?.id || null);
const wornColor = computed(() => inv.outfit[slot.value]?.color || null);
const selItem = computed(() => (selId.value ? items.value.find((i) => i.id === selId.value) || null : null));

watch(() => props.initialSlot, (s) => { if (SLOTS.includes(s)) pickSlot(s); });
watch(() => props.focus, () => {
  const s = focusSlot();
  if (s) { slot.value = s; selId.value = props.focus; level.value = "colors"; }
});

const ownedOf = (id) => {
  const it = itemById(id);
  const avail = it ? itemColors(it) : [];
  return (inv.owned[id] || []).filter((c) => avail.includes(c));
};
const missingColors = (it) => itemColors(it).length - ownedOf(it.id).length;
const slotHasNew = (s) => mine(s).some((i) => inv.isNew(i.id));
const cardColor = (it) => (wornId.value === it.id ? wornColor.value : ownedOf(it.id)[0]);

// ses goûts déjà découverts (jamais de spoiler)
const tastes = computed(() => store.tastes || {});
const lovedColor = (c) => inv.isTasteSeen("color") && tastes.value.color === c;
const lovedItem = (id) => inv.isTasteSeen("itemLove") && tastes.value.itemLove === id;

function swatchStyle(key) {
  const c = COLORS[key];
  if (!c) return { background: "#e9edf2" };
  if (key === "or") return { background: "linear-gradient(135deg, #fff3b0, #ffcc33 45%, #b8860b)" };
  if (key === "galaxie") {
    return { background: "radial-gradient(circle at 30% 30%, #fff 0 1.5px, transparent 2px), radial-gradient(circle at 70% 60%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 60% 30%, #b06bff, #2a1b5e 70%)" };
  }
  return { background: c.hex };
}
function slotSwatch(s) {
  const e = inv.outfit[s];
  return e ? swatchStyle(e.color) : {};
}

function pickSlot(s) {
  slot.value = s;
  selId.value = inv.outfit[s]?.id || null;
}
// barre étroite : on descend d'un cran
function openSlot(s) {
  pickSlot(s);
  level.value = "items";
}
function openItem(it) {
  pickItem(it);
  // une seule couleur : rien à choisir de plus, on reste sur la liste
  if (ownedOf(it.id).length > 1 || wornId.value === it.id) level.value = "colors";
}
function pickItem(it) {
  selId.value = it.id;
  if (wornId.value === it.id) return;
  // on enfile la couleur qu'elle préfère si on la connaît, sinon la première
  const colors = ownedOf(it.id);
  const c = colors.find((k) => lovedColor(k)) || colors.find((k) => inv.isNew(it.id, k)) || colors[0];
  if (c) wear(it, c);
}

function showSaid(r) {
  if (!r?.line) return;
  clearTimeout(saidTimer);
  said.value = { id: Math.random(), mood: r.mood, line: r.line };
  saidTimer = setTimeout(() => (said.value = null), 3200);
}

// équipe tout de suite ; la réaction (yeux cœur si elle adore, bouderie si elle déteste)
// est jouée par le store via onEquip (react + réplique)
function wear(it, color) {
  const res = inv.equip(it.slot, it.id, color);
  if (res && res.reaction) showSaid(res.reaction);
  try { navigator.vibrate?.(12); } catch { /* pas de vibreur */ }
}

function takeOff() {
  if (inv.unequip(slot.value)) {
    said.value = null;
    gameSay(store.stage === "bebe" ? "Hop, parti !" : "Hop, enlevé.");
  }
}

// tenue surprise : sa réaction la plus forte (adore ou boude) parmi les pièces tirées
function shuffle() {
  const next = inv.randomOutfit();
  selId.value = next[slot.value]?.id || null;
  let best = null;
  for (const s of SLOTS) {
    const e = next[s];
    if (!e) continue;
    const r = store.tasteReactionFor("item", e.id, e.color);
    if (!best || MOOD_RANK[r.mood] > MOOD_RANK[best.mood]) best = r;
  }
  // une seule réplique : dans la bulle du panneau (la créature réagit sans la répéter)
  if (best && (best.mood === "love" || best.mood === "dislike")) {
    store.showReaction(best, { say: false });
    gameCommand("react", best.mood === "love" ? "adore" : "deteste");
    showSaid(best);
  } else {
    const line = Object.values(next).some(Boolean) ? "Ta-da ! Nouvelle tenue !" : "On reste simple aujourd'hui !";
    showSaid({ mood: "like", line });
  }
}
</script>

<style scoped>
/* ---------- barre étroite ---------- */
.rail-wrap { overflow-x: hidden; margin: -6px -8px 0; padding: 6px 8px 4px; }
.rail { display: flex; flex-direction: column; align-items: stretch; gap: 6px; }
/* entre sous-menus : glissement + fondu, puis les boutons arrivent en cascade */
.rail-in-enter-active, .rail-out-enter-active { transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease-out; }
.rail-in-leave-active, .rail-out-leave-active { transition: transform 0.14s ease-in, opacity 0.14s ease-in; }
.rail-in-enter-from, .rail-out-leave-to { transform: translateX(36px); opacity: 0; }
.rail-in-leave-to, .rail-out-enter-from { transform: translateX(-36px); opacity: 0; }
.rail-in-enter-active > *, .rail-out-enter-active > * { animation: r-pop 0.32s cubic-bezier(0.3, 1.5, 0.5, 1) both; }
.rail-in-enter-active > :nth-child(2), .rail-out-enter-active > :nth-child(2) { animation-delay: 0.03s; }
.rail-in-enter-active > :nth-child(3), .rail-out-enter-active > :nth-child(3) { animation-delay: 0.06s; }
.rail-in-enter-active > :nth-child(4), .rail-out-enter-active > :nth-child(4) { animation-delay: 0.09s; }
.rail-in-enter-active > :nth-child(5), .rail-out-enter-active > :nth-child(5) { animation-delay: 0.12s; }
.rail-in-enter-active > :nth-child(n + 6), .rail-out-enter-active > :nth-child(n + 6) { animation-delay: 0.15s; }
@keyframes r-pop { from { transform: scale(0.7); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .rail-in-enter-active, .rail-out-enter-active, .rail-in-leave-active, .rail-out-leave-active { transition: none; }
  .rail-in-enter-active > *, .rail-out-enter-active > * { animation: none; }
}
.r-btn {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  width: 100%; padding: 4px 0; border: 0; border-radius: 16px;
  background: transparent; color: var(--ink-2); cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.r-btn:active .r-badge { transform: scale(0.94); }
.r-badge {
  position: relative;
  display: grid; place-items: center; width: 50px; height: 50px; border-radius: 16px;
  background: var(--surface); transition: transform 0.12s;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.08), 0 2px 6px rgba(40, 55, 80, 0.14);
}
.r-btn.worn .r-badge, .r-btn.on .r-badge { box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.14), 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.r-soft { background: var(--surface-3); }
/* Boutique : rouge et blanc, avec un petit store rayé en haut */
.r-shop {
  overflow: visible;
  background:
    repeating-linear-gradient(90deg, #fff 0 7px, #ff6b6b 7px 14px) top / 100% 12px no-repeat,
    linear-gradient(180deg, #ff5a5f, #d9263a);
  box-shadow: inset 0 -3px 0 rgba(120, 0, 20, 0.25), inset 0 12px 0 -10px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(217, 38, 58, 0.35);
}
.r-shop .r-ic { margin-top: 8px; width: 24px; height: 24px; }
.r-lbl-shop { color: #d9263a; }
.r-ic { width: 28px; height: 28px; color: var(--ink-2); }
.r-btn.worn .r-ic, .r-ic.white { color: rgba(255, 255, 255, 0.95); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
.r-ic.violet { color: var(--violet); }
.r-ic.accent { color: var(--accent); }
.r-lbl {
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font: 800 10px/1.1 var(--font-text); color: var(--ink-2);
}
.r-dot { position: absolute; top: -3px; right: -3px; }
.r-count { position: absolute; top: -6px; right: -8px; }
.r-check { position: absolute; right: -5px; bottom: -5px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); color: #fff; box-shadow: 0 0 0 2px var(--surface); }
.r-check-ic { width: 12px; height: 12px; }
.r-sep { align-self: center; width: 32px; height: 2px; margin: 2px 0; border-radius: 2px; background: var(--knob-side); }
.r-back {
  display: flex; align-items: center; justify-content: center; gap: 2px;
  height: 40px; margin-bottom: 2px; padding: 0; border: 0; border-radius: 999px;
  background: var(--surface); color: var(--sky-ink, var(--ink)); cursor: pointer;
  box-shadow: 0 3px 0 var(--knob-side), 0 4px 10px rgba(30, 55, 100, 0.1);
}
.r-back-ic { width: 20px; height: 20px; }
.r-back-slot { width: 20px; height: 20px; color: var(--ink-3); }
.r-title { text-align: center; font: 800 11px/1.15 var(--font-text); color: var(--ink); overflow-wrap: anywhere; }
.r-sw { align-self: center; width: 44px; height: 44px; }
.r-empty { margin: 4px 0; text-align: center; font: 700 11px/1.2 var(--font-text); color: var(--ink-3); }

/* en-tête : compteur à gauche (s'il existe), « Au hasard » toujours à droite */
.top { display: flex; align-items: center; justify-content: flex-end; gap: 10px; min-width: 0; }
.count { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--s-2); color: var(--ink-2); }
.count-ic { flex: none; width: 32px; height: 32px; color: var(--accent); }
.count b { font-size: 20px; font-weight: 700; color: var(--ink); }
.count span { font-weight: 800; color: var(--ink-3); }
.count small { display: block; margin-top: -2px; }
.shuffle { flex: none; }
.shuffle .ic { color: var(--violet); }

.slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); gap: var(--s-2); }
.slot { padding: 8px 2px 7px; }
.slot-badge {
  display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px;
  background: var(--surface-3); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.08);
}
.slot.worn .slot-badge { box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15), 0 0 0 2px var(--surface), 0 2px 6px rgba(40, 55, 80, 0.2); }
.slot-ic { width: 22px; height: 22px; color: var(--ink-2); filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.7)); }
.slot.worn .slot-ic { color: rgba(255, 255, 255, 0.95); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
.slot-lbl { font-size: var(--t-xs); }

.pop-enter-active { transition: transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.2s; }
.pop-leave-active { transition: opacity 0.2s; }
.pop-enter-from { transform: scale(0.85); opacity: 0; }
.pop-leave-to { opacity: 0; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.card.sel { box-shadow: inset 0 0 0 2px var(--knob-side), 0 4px 10px rgba(40, 55, 80, 0.1); }
.swatch {
  display: grid; place-items: center; width: 52px; height: 52px; border-radius: var(--r-md);
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.14), inset 0 2px 0 rgba(255, 255, 255, 0.35), 0 2px 6px rgba(40, 55, 80, 0.15);
}
.card-ic { width: 30px; height: 30px; color: rgba(255, 255, 255, 0.92); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
.card .ui-tile-label { margin-top: 4px; }
.worn-ic { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; color: #fff; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25)); }
.heart { position: absolute; top: 6px; left: 6px; width: 18px; height: 18px; color: var(--love); }

.colors { display: flex; flex-wrap: wrap; gap: var(--s-3); align-items: center; }
.new-dot { top: -2px; right: -2px; }
.more .ui-tag { margin-right: -6px; }
</style>
