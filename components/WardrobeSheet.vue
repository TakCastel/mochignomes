<template>
  <!-- Garde-robe : onglet « Tenues » du Sac. Tout se porte tout de suite, c'est gratuit. -->
  <div class="ui-stack wardrobe">
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

    <!-- sa réaction au dernier essayage -->
    <Transition name="pop">
      <p v-if="said" :key="said.id" class="ui-note" :class="said.mood === 'love' ? 'ui-note--love' : said.mood === 'dislike' ? '' : 'ui-note--accent'">
        <Icon :name="MOOD_ICON[said.mood] || 'solar:chat-round-dots-bold-duotone'" class="ic" />
        <span>« {{ said.line }} »</span>
      </p>
    </Transition>

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
      <button v-if="hasShop" class="ui-btn ui-btn--soft ui-btn--sm" @click="emit('shop', null)">
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

// 'shop' : ouvrir la Boutique (itemId = l'objet dont on veut d'autres couleurs, ou null)
const emit = defineEmits(["shop"]);
const props = defineProps({
  // emplacement ouvert au départ (ex. depuis une envie de tenue)
  initialSlot: { type: String, default: "" },
  // vêtement à mettre en avant (id) : ouvre son emplacement et le sélectionne
  focus: { type: String, default: "" },
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

const hasShop = computed(() => !!store.features?.boutique);
const ownedCount = computed(() => V1_ITEMS.filter((i) => inv.ownsItem(i.id)).length);
const items = computed(() => mine(slot.value));
const wornId = computed(() => inv.outfit[slot.value]?.id || null);
const wornColor = computed(() => inv.outfit[slot.value]?.color || null);
const selItem = computed(() => (selId.value ? items.value.find((i) => i.id === selId.value) || null : null));

watch(() => props.initialSlot, (s) => { if (SLOTS.includes(s)) pickSlot(s); });
watch(() => props.focus, () => {
  const s = focusSlot();
  if (s) { slot.value = s; selId.value = props.focus; }
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
    gameSay(store.stage === "bebe" ? "Tout nu !" : "Hop, enlevé.");
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
    showSaid({ mood: "like", line: Object.values(next).some(Boolean) ? "Ta-da ! Nouvelle tenue !" : "Tenue légère aujourd'hui !" });
  }
}
</script>

<style scoped>
/* en-tête : compteur à gauche (s'il existe), « Au hasard » toujours à droite */
.top { display: flex; align-items: center; justify-content: flex-end; gap: 10px; min-width: 0; }
.count { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--s-2); color: var(--ink-2); }
.count-ic { flex: none; width: 32px; height: 32px; color: var(--accent); }
.count b { font-size: 20px; font-weight: 700; color: var(--ink); }
.count span { font-weight: 800; color: var(--ink-3); }
.count small { display: block; margin-top: -2px; }
.shuffle { flex: none; }
.shuffle .ic { color: var(--violet); }

.slots { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--s-2); }
.slot { padding: 8px 2px 7px; }
.slot-badge {
  display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px;
  background: var(--surface-3); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.08);
}
.slot.worn .slot-badge { box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15), 0 0 0 2px #fff, 0 2px 6px rgba(40, 55, 80, 0.2); }
.slot-ic { width: 22px; height: 22px; color: var(--ink-2); filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.7)); }
.slot.worn .slot-ic { color: rgba(255, 255, 255, 0.95); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
.slot-lbl { font-size: var(--t-xs); }

.pop-enter-active { transition: transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.2s; }
.pop-leave-active { transition: opacity 0.2s; }
.pop-enter-from { transform: scale(0.85); opacity: 0; }
.pop-leave-to { opacity: 0; }

.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.card.sel { box-shadow: inset 0 0 0 2px var(--knob-side), 0 4px 10px rgba(40, 55, 80, 0.1); }
.swatch {
  display: grid; place-items: center; width: 52px; height: 52px; border-radius: var(--r-md);
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.14), inset 0 2px 0 rgba(255, 255, 255, 0.35), 0 2px 6px rgba(40, 55, 80, 0.15);
}
.card-ic { width: 30px; height: 30px; color: rgba(255, 255, 255, 0.92); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
.card .ui-tile-label { margin-top: 4px; }
.worn-ic { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; color: var(--accent); }
.heart { position: absolute; top: 6px; left: 6px; width: 18px; height: 18px; color: var(--love); }

.colors { display: flex; flex-wrap: wrap; gap: var(--s-3); align-items: center; }
.new-dot { top: -2px; right: -2px; }
.more .ui-tag { margin-right: -6px; }
</style>
